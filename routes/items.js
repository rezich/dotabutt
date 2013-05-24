exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.locals.items = butt.items();
	res.render('items', { title: 'Items', user: req.user });
};