exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.locals.heroes = butt.heroes();
	res.render('heroes', { title: 'Heroes', user: req.user });
};
exports.view = function(req, res) {
	var butt = res.locals.butt;
	var heroes = butt.heroes();
	res.locals.hero = heroes[req.params.id];
	res.render('hero', { title: 'Hero - ' + res.locals.hero.localized_name, user: req.user });
};