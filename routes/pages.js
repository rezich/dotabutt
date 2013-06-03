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
exports._404 = function(req, res) {
	var messages = [
		{
			hero: 'axe',
			header: 'AXE REPORTS PAGE IS MISSING',
			content: 'Axe is disappointed in your inability to correctly load the page.'
		},
		{
			hero: 'axe',
			header: 'PAGE IS MISSING, ACCORDING TO AXE',
			content: 'Even Axe could have loaded the page better than this!'
		},
		{
			hero: 'axe',
			header: 'AXE SAYS PAGE IS MISSING',
			content: 'Axe does not know how you managed to screw up such a simple task as loading the correct page.'
		}
	];
	res.locals.message = messages[Math.floor(Math.random() * (messages.length))];
	res.status(404).render('404', { title: 'Page not found' });
}