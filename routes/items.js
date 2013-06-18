exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.locals.items = butt.items(req.locale);
	res.render('items', { title: 'Items' });
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	var items = butt.items(req.locale);
	var found = false;
	Object.keys(items).forEach(function(id) {
		if (items[id].slug == req.params.slug) {
			res.locals.item = items[id];
			if (res.locals.item.duplicate) {
				res.locals.duplicate = items[res.locals.item.duplicate];
			}
			/*if (res.locals.item.recipe) {
				res.locals.recipe_for = items[res.locals.item.recipe];
			}*/
			found = true;
			res.render('item', { title: 'Item - ' + res.locals.item.localized_name });
		}
	});
	if (!found) res.redirect('/items/');
}