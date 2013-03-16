exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.render('players', { title: 'matches' });
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	butt.getPlayer(req.params.id, function(player) {
		butt.getPlayerMatches(player.account_id, function(matches) {
			console.log(matches);
			player.matches = matches;
			res.locals.player = player;
			res.render('player', { title: player.personaname });
		});
	});
}