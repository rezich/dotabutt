exports.index = function(req, res) {
	if (req.user) console.log(req.user.player.personaname);
	res.render('index', { title: 'classy Dota 2 statistics', user: req.user });
};