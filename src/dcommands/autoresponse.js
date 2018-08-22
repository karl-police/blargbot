const BaseCommand = require('../structures/BaseCommand');

class autoresponseCommand extends BaseCommand {
    constructor() {
        super({
            name: 'autoresponse',
            aliases: ['ar'],
            category: bu.CommandType.ADMIN,
            usage: 'autoresponse < add | remove | edit | list>',
            info: 'Creates autoresponses. You can create up to 20 autoresponses to certain phrases, and 1 autoresponse that responds to everything.\n\nAutoresponses will be checked in the order they\'re added, and only one will be executed (excluding the everything autoresponse). Rather than specifying the code in this command, autoresponses will execute a hidden custom command that you can modify on the IDE. The everything autoresponse will not automatically output the execution result.\nCommands:\n   ADD <text> [flags] - Adds a autoresponse with for the provided text.\n   REMOVE - Brings up a menu to remove a autoresponse\n   INFO - Displays information about autoresponses.',
            flags: [{
                flag: 'R',
                word: 'regex',
                desc: 'If specified, parse as /regex/ rather than plaintext.'
            }, {
                flag: 'e',
                word: 'everything',
                desc: 'Makes the added autoresponse respond to everything. Only one is allowed.'
            }]
        });

        this._hss;
    }
    get letters() {
        return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }

    get numbers() {
        return '0123456790';
    }

    get symbols() {
        return '!@#$%^&*()_+{}|\\[]-=:";\'<>?,./';
    }

    get holyShitSymbols() {
        if (!this.hss) {
            this.hss = '';
            for (let i = 0xf0ff; i < 0xffff; i++) { // get 255 characters
                this.hss += String.fromCharCode(i);
            }
        }
        return this.hss;
    }

    getRandomInt(min = 0, max = 10) {
        return Math.floor(Math.random() * max) + min;
    }

    getRandomChar(str) {
        return str[this.getRandomInt(0, str.length)];
    }

    async regexTest(regex) {
        let testPhrases = [];
        for (const set of [this.letters, this.numbers, this.symbols, this.holyShitSymbols]) {
            for (let i = 0; i < 5; i++) {
                let str = '';
                for (let ii = 0; ii < this.getRandomInt(5, 25); ii++) {
                    str += this.getRandomChar(set);
                }
                testPhrases.push(str);
            }
        }
        console.log('Testing the regex', regex, 'with the following phrases:\n', testPhrases);
        let res = testPhrases.map(p => regex.test(p)).filter(p => p === true).length;
        return res !== testPhrases.length;
    }

    async add(msg, input, guild) {
        let ar = {
            weight: 1,
            regex: false,
            term: null,
            executes: null
        };
        let term = input.undefined.slice(1).join(' ');
        if (term == '' && !input.e) {
            bu.send(msg, `If you want to respond to everything, you need to use the \`-e\` flag.`);
            return;
        }
        if (input.e && guild.autoresponse.everything !== null)
            return await bu.send(msg, `An autoresponse that responds to everything already exists! It executes the following ccommand: \`${guild.autoresponse.everything.executes}\``);
        if (guild.autoresponse.list.length >= 20)
            return await bu.send(msg, `You already have 20 autoresponses!`);

        if (input.R && !input.e) {
            try {
                let exp = bu.createRegExp(term);
                if (!await this.regexTest(exp))
                    return await bu.send(msg, 'Your regex cannot match everything!');
                ar.regex = true;
            } catch (err) {
                bu.send(msg, 'Unsafe or invalid regex! Terminating.');
                return;
            }
        } else ar.regex = false;
        ar.term = term;

        let name = '';
        do {
            name = '_autoresponse_' + (guild.autoresponse.index++);
        } while (guild.ccommands[name]);

        guild.ccommands[name] = {
            content: '',
            author: msg.author.id,
            hidden: true
        };

        ar.executes = name;

        if (input.e) guild.autoresponse.everything = ar;
        else guild.autoresponse.list.push(ar);

        await this.save(guild);

        return await bu.send(msg, `Your autoresponse has been added! It will execute the hidden ccommand: \`${ar.executes}\``);
    }

    generateList(guild, suffix) {
        let autoresponseList = "Autoresponses:\n```prolog\n";
        for (let i = 0; i < guild.autoresponse.list.length; i++) {
            let phrase = `${i + 1}. ${guild.autoresponse.list[i].term}${guild.autoresponse.list[i].regex ? ' (regex)' : ''} - \`${guild.autoresponse.list[i].executes}\`\n`;
            if (autoresponseList.length + phrase.length + suffix.length > 1500) {
                autoresponseList += `...and ${guild.autoresponse.list.length - i} more.\n`;
                break;
            } else {
                autoresponseList += phrase;
            }
        }
        return autoresponseList + suffix;
    }

    async edit(msg, input, guild) {
        if (!guild.autoresponse.list || guild.autoresponse.list.length == 0) {
            bu.send(msg, `There are no autoresponses on this guild!`);
            return;
        }
        if (!input.e) {
            let autoresponseList = this.generateList(guild, "```\nPlease type the number of the autoresponse you wish to remove, or type 'c' to cancel. This prompt will expire in 5 minutes.");
            let response = await bu.awaitQuery(msg, autoresponseList, m => {
                if (m.content.toLowerCase() == 'c') return true;
                let choice = parseInt(m.content);
                return !isNaN(choice) && choice > 0 && choice <= guild.autoresponse.list.length;
            });
            if (response.content.toLowerCase() == 'c') {
                bu.send(msg, 'Query canceled.');
                return;
            }

            let ar = guild.autoresponse.list[parseInt(response.content) - 1];
            if (!ar) {
                return await bu.send(msg, `You didn't select a valid autoresponse.`);
            }
            let term = input.undefined.slice(1).join(' ');
            if (term !== '') {
                if (input.R) {
                    try {
                        let exp = bu.createRegExp(term);
                        if (!await this.regexTest(exp))
                            return await bu.send(msg, 'Your regex cannot match everything!');
                    } catch (err) {
                        bu.send(msg, 'Unsafe or invalid regex! Terminating.');
                        return;
                    }
                }
                ar.term = term;
            }
            ar.regex = !!input.R

            await this.save(guild);

            bu.send(msg, `Autoresponse \`${ar.term}\` has been edited!`);
        } else {
            bu.send(msg, `You can't edit the everything autoresponse.`);
        }
    }

    async remove(msg, input, guild) {
        if (!guild.autoresponse.list || guild.autoresponse.list.length == 0) {
            bu.send(msg, `There are no autoresponses on this guild!`);
            return;
        }
        if (!input.e) {
            let autoresponseList = this.generateList(guild, "```\nPlease type the number of the autoresponse you wish to remove, or type 'c' to cancel. This prompt will expire in 5 minutes.");
            let response = await bu.awaitQuery(msg, autoresponseList, m => {
                if (m.content.toLowerCase() == 'c') return true;
                let choice = parseInt(m.content);
                return !isNaN(choice) && choice > 0 && choice <= guild.autoresponse.list.length;
            });
            if (response.content.toLowerCase() == 'c') {
                bu.send(msg, 'Query canceled.');
                return;
            }
            let removed = guild.autoresponse.list.splice(parseInt(response.content) - 1, 1);
            console.log(removed);
            if (removed[0]) {
                delete guild.ccommands[removed[0].executes];
            }
            await this.save(guild);
            bu.send(msg, `Autoresponse \`${removed[0].term}\` removed!`);
        } else {
            guild.autoresponse.everything = null;
            bu.send(msg, `The everything autoresponse has been removed!`);
        }
    }

    async list(msg, input, guild) {
        let out = this.generateList(guild, '```') + '\n';
        if (guild.autoresponse.everything) {
            out += 'Everything Autoresponse: `' + guild.autoresponse.everything.executes + '`';
        }
        await bu.send(msg, out);
    }

    async save(guild) {
        return await r.table('guild').get(guild.guildid).update({
            autoresponse: r.literal(guild.autoresponse),
            ccommands: r.literal(guild.ccommands)
        });
    }

    async execute(msg, words) {
        let input = bu.parseInput(this.flags, words, true);
        if (!msg.guild) return;
        if (input.undefined.length == 0) {
            input.undefined[0] = '';
        }
        let storedGuild = await bu.getGuild(msg.guild.id);

        let whitelist = await r.table('vars').get('arwhitelist');

        if (!storedGuild.autoresponse) {
            storedGuild.autoresponse = {
                index: 0,
                list: [],
                everything: null
            };
            await this.save(storedGuild);
        }
        switch (input.undefined[0].toLowerCase()) {
            case 'create':
            case 'add':
                if (!whitelist.values.includes(msg.guild.id))
                    return await bu.send(msg, 'Sorry, autoresponses are currently whitelisted. To request access, do `b!ar request [reason]`');
                await this.add(msg, input, storedGuild);
                break;
            case 'delete':
            case 'remove':
                if (!whitelist.values.includes(msg.guild.id))
                    return await bu.send(msg, 'Sorry, autoresponses are currently whitelisted. To request access, do `b!ar request [reason]`');
                await this.remove(msg, input, storedGuild);
                break;
            case 'edit':
                if (!whitelist.values.includes(msg.guild.id))
                    return await bu.send(msg, 'Sorry, autoresponses are currently whitelisted. To request access, do `b!ar request [reason]`');
                await this.edit(msg, input, storedGuild);
                break;
            case 'request': {
                if (whitelist.values.includes(msg.guild.id))
                    return await bu.send(msg, 'You are already whitelisted!');
                let reason = input.undefined.slice(1).join(' ');
                let code = Buffer.from(msg.channel.id).toString('base64');
                await bu.send('481857751891443722', `New AR request from **${bu.getFullName(msg.author)}** (${msg.author.id}):\n**Guild**: ${msg.guild.name} (${msg.guild.id})\n**Channel**: ${msg.channel.id}\n**Members**: ${msg.guild.memberCount}${reason ? '\n\n' + reason : ''}\n\n\`b!ar whitelist ${code}\``);
                await bu.send(msg, 'Your request has been sent. Please don\'t spam this command.');
                break;
            }
            case 'whitelist': {
                if (msg.author.id !== bu.CAT_ID) break;
                let channel = Buffer.from(input.undefined[1], 'base64').toString('utf8');
                let c = await bot.getRESTChannel(channel);
                let guild = c.guild.id;
                let g = await bot.getRESTGuild(guild);
                if (!channel) await bu.send(msg, 'Please specify the channel as the second argument so I know where to send the confirmation message.');
                let index = whitelist.values.indexOf(guild);
                if (index > -1)
                    whitelist.values.splice(index, 1);
                else whitelist.values.push(guild);
                await r.table('vars').get('arwhitelist').update({
                    values: whitelist.values
                });
                if (index == -1)
                    await bu.send(channel, 'Congratz, your guild has been whitelisted for autoresponses! 🎉');
                return await bu.send(msg, `${g.name} is ${index > -1 ? 'no longer' : 'now'} whitelisted.`);
                break;
            }
            case 'info':
            case 'list':
                await this.list(msg, input, storedGuild);
                break;
            default:
                await bu.send(msg, 'Invalid command! Please do `b!help autoresponse` for usage instructions.');
                break;
        }
    }
}

module.exports = autoresponseCommand;
