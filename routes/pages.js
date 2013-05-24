exports.about = function(req, res) {
	res.render('about', { title: 'About', user: req.user });
};
exports.privacy = function(req, res) {
	res.render('privacy', { title: 'Privacy Policy', user: req.user });
};
exports.faq = function(req, res) {
	res.render('faq', { title: 'FAQ', user: req.user });
};
exports.donate = function(req, res) {
	res.render('donate', { title: 'Donate', user: req.user });
};