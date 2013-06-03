exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.locals.items = butt.items();
	res.render('items', { title: 'Items' });
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	var items = butt.items();
	Object.keys(items).forEach(function(id) {
		if (items[id].slug == req.params.slug) {
			res.locals.item = items[id];
			res.render('item', { title: 'Item - ' + res.locals.item.localized_name });
		}
	});
}