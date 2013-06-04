exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.locals.heroes = butt.heroes();
	res.render('heroes', { title: 'Heroes' });
};
exports.view = function(req, res) {
	var butt = res.locals.butt;
	var heroes = butt.heroes();
	Object.keys(heroes).forEach(function(id) {
		if (heroes[id].slug == req.params.slug) {
			res.locals.hero = heroes[id];
			res.render('hero', { title: 'Hero - ' + res.locals.hero.localized_name });
			return;
		}
	});
	res.redirect('/heroes/');
};