exports.index = function(req, res) {
	if (req.query.q) {
		var butt = res.locals.butt;
		var query = decodeURIComponent(req.query.q);
		res.locals.query = query;
		butt.search(query, function(results) {
			if (results.count == 1) {
				res.redirect(results.last);
			}
			else {
				res.locals.results = results;
				res.render('search', { title: 'search - ' + req.params.query, user: req.user });
			}
		});
	}
	else res.redirect(301, '/');
}