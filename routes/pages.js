exports.about = function(req, res) {
	res.render('about', { title: 'About' });
};
exports.privacy = function(req, res) {
	res.render('privacy', { title: 'Privacy Policy' });
};
exports.faq = function(req, res) {
	res.render('faq', { title: 'FAQ' });
};
exports.donate = function(req, res) {
	res.render('donate', { title: 'Donate' });
};