
/*
 * GET match results page.
 */

exports.view = function(req, res) {
	var butt = res.locals.butt;
	butt.getPlayerSummary(butt.convertIDTo64(req.params.id), function(player) {
		res.locals.player = player;
		res.render('player', { title: player.personaname });
	});
}