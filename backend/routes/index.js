/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:19:37
 * @Last Modified by: stupid cat
 * @Last Modified time: 2017-07-05 22:24:57
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const router = dep.express.Router();

router.get('/', (req, res) => {
    res.locals.user = req.user;
    req.session.returnTo = req.path;
    let date = new Date(Date.now());
    if (date.getMonth() === 6 && date.getDay() === 11)
        res.render('bsod-netneut')
    else
        res.render('index');
});

router.get('/netneut', (req, res) => {
    res.locals.user = req.user;
    req.session.returnTo = req.path;

    res.render('bsod-netneut');
})

router.get('/main', (req, res) => {
    res.locals.user = req.user;
    req.session.returnTo = req.path;

    res.render('index');
})

router.get('/editor', (req, res) => {
    res.redirect('/tags/editor');
});
module.exports = router;