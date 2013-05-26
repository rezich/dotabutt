exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.locals.items = butt.items();
	res.render('items', { title: 'Items', user: req.user });
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	res.locals.item = butt.items()[req.params.id];
	res.render('item', { title: res.locals.item.localized_name, user: req.user });
}