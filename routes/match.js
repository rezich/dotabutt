
/*
 * GET match results page.
 */

exports.view = function(req, res) {
	var butt = res.locals.butt;
	butt.getMatchDetails(req.params.id, function(match) {
		var changed_players = [];
		var lookup_ids = [];
		for (var i = 0; i < match.players.length; i++) {
			if (match.players[i].account_id != '4294967295') {
				changed_players.push(i);
				lookup_ids.push(butt.convertIDTo64(match.players[i].account_id));
			}
		}
		
		butt.getPlayerSummaries(lookup_ids, function(player_summaries) {
			for (var i = 0; i < changed_players.length; i++) {
				match.players[changed_players[i]].summary = player_summaries[i];
			}
			res.locals.match = match;
			res.locals.heroes = butt.heroes();
			res.render('match', { title: 'match #' + match.match_id });
		});
	});
};