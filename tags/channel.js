var e = module.exports = {};

e.init = () => {
    e.category = bu.TagType.COMPLEX;
};

e.requireCtx = require;

e.isTag = true;
e.name = `channel`;
e.args = `&lt;channel&gt;`;
e.usage = `{channel;#channel}`;
e.desc = `Sends the output to a specific channel. Only works in custom commands.`;
e.exampleIn = `{channel;#channel}Hello!`;
e.exampleOut = `In #channel: Hello!`;


e.execute = async function(params) {
    for (let i = 1; i < params.args.length; i++) {
        params.args[i] = await bu.processTagInner(params, i);
    }
    var replaceString = '';
    var replaceContent = false;
    if (params.tagName) {
        replaceString = await bu.tagProcessError(params, params.fallback, '`Can only set channel in CCommands`');
    } else {
        if (/([0-9]{17,23})/.test(params.args[1])) {
            let channelid = params.args[1].match(/([0-9]{17,23})/)[1];
            let channel = bot.getChannel(channelid);
            if (channel) {
                if (channel.guild.id == params.msg.guild.id) {
                    params.msg.channel = channel;
                } else {
                    replaceString = await bu.tagProcessError(params, params.fallback, '`Channel must be in guild`');
                }
            } else {
                replaceString = await bu.tagProcessError(params, params.fallback, '`Channel not found`');
            }
        } else {
            replaceString = await bu.tagProcessError(params, params.fallback, '`Invalid channel`');
        }
    }
    params.fallback = params.args[1];

    return {
        replaceString: replaceString,
        replaceContent: replaceContent
    };
};