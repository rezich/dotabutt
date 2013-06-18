exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.locals.heroes = butt.heroes(req.locale);
	res.render('heroes', { title: 'Heroes' });
};
exports.view = function(req, res) {
	var butt = res.locals.butt;
	var heroes = butt.heroes(req.locale);
	var found = false;
	Object.keys(heroes).forEach(function(id) {
		if (heroes[id].slug == req.params.slug) {
			console.log('FOUND HERO');
			res.locals.hero = heroes[id];
			found = true;
			res.render('hero', { title: 'Hero - ' + res.locals.hero.localized_name });
		}
	});
	if (!found) res.redirect('/heroes/');
};