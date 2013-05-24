exports.index = function(req, res) {
	console.log(req.user);
	res.render('index', { title: 'classy Dota 2 statistics', user: req.user });
};