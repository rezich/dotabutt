exports.index = function(req, res) {
	res.render('settings', { title: 'Settings', user: req.user });
}