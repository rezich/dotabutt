exports.about = function(req, res) {
	res.render('about', { title: 'about' });
};
exports.privacy = function(req, res) {
	res.render('privacy', { title: 'privacy' });
};
exports.faq = function(req, res) {
	res.render('faq', { title: 'faq' });
};
exports.donate = function(req, res) {
	res.render('donate', { title: 'donate' });
};