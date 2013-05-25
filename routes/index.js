exports.index = function(req, res) {
	res.render('index', { title: 'classy Dota 2 statistics', user: req.user });
};