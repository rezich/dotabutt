exports.index = function(req, res) {
	res.render('heroes', { title: 'Heroes' });
};