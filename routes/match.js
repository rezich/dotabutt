
/*
 * GET match results page.
 */

exports.view = function(req, res) {
	var butt = req.locals.butt;
	butt.GetMatchDetails(req.params.id, function(match) {
		var changed_players = [];
		var lookup_ids = [];
		for (var i = 0; i < match.players.length; i++) {
			if (match.players[i].account_id != '4294967295') {
				changed_players.push(i);
				lookup_ids.push(butt.ID64(match.players[i].account_id));
			}
		}
		console.log(changed_players);
		
		butt.GetPlayerSummaries(lookup_ids, function(player_summaries) {
			for (var i = 0; i < changed_players.length; i++) {
				match.players[changed_players[i]].summary = player_summaries[i];
			}
			res.locals.match = match;
			res.locals.heroes = butt.Heroes;
			//res.locals.DotaButt = function() { return butt; }
			res.render('match', { title: 'match #' + match.match_id });
		});
	});
};