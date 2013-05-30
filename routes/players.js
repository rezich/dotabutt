exports.index = function(req, res) {
	var butt = res.locals.butt;
	butt.getRecentPlayers(108, function(players) {
		butt.getPlayerCount(function(total_players) {
			res.locals.total_players = total_players;
			res.locals.players = players;
			res.render('players', { title: 'Players', user: req.user });
		});
	});
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	butt.getPlayer(req.params.id, function(player) {
		butt.getPlayerMatches(player.account_id, function(matches) {
			player.matches = matches
			res.locals.player = player;
			res.render('player', { title: player.personaname, user: req.user });
		});
	});
}