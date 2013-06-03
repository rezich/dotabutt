exports.index = function(req, res, next) {
	res.render('settings', { title: 'Settings' });
}