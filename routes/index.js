exports.index = function(req, res) {
	res.render('index', { title: req.i18n.t('layout.slogan') });
};