exports.index = function(req, res) {
	var butt = res.locals.butt;
	butt.getAllPlayers(function(players) {
		res.locals.players = players;
		res.render('players', { title: 'Players', user: req.user });
	});
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	butt.getPlayer(req.params.id, function(player) {
		butt.getPlayerMatches(player.account_id, function(players) {
			console.log(players);
			player.players = players;
			res.locals.player = player;
			res.render('player', { title: player.personaname, user: req.user });
		});
	});
}