exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.locals.heroes = butt.heroes();
	console.log(res.locals.heroes);
	res.render('heroes', { title: 'Heroes' });
};