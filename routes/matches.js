exports.index = function(req, res) {
	var butt = res.locals.butt;
	res.render('matches', { title: 'matches' });
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	var steamapi = res.locals.steamapi;
	butt.getMatch(req.params.id, function(match) {
		var changed_players = [];
		var lookup_ids = [];
		for (var i = 0; i < match.players.length; i++) {
			if (match.players[i].account_id != butt.anon) {
				changed_players.push(i);
				lookup_ids.push(match.players[i].account_id);
			}
		}
		match.duration = res.locals.moment.duration(match.duration, 'seconds');
		
		butt.getPlayers(lookup_ids, function(player_summaries) {
			for (var i = 0; i < changed_players.length; i++) {
				match.players[changed_players[i]].summary = player_summaries[i];
			}
			res.locals.match = match;
			res.locals.heroes = butt.heroes();
			res.render('match', { title: 'match #' + match.match_id });
		});
	});
};