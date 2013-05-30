exports.index = function(req, res) {
	var butt = res.locals.butt;
	butt.getRecentMatches(36, function(matches) {
		butt.getMatchCount(function(total_matches) {
			res.locals.matches = matches;
			res.locals.behind = butt.lastTime;
			res.locals.total_matches = total_matches;
			res.render('matches', { title: 'Matches', user: req.user });
		});
	});
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	var steamapi = res.locals.steamapi;
	butt.getMatch(req.params.id, function(match, err) {
		var changed_players = [];
		var lookup_ids = [];
		if (!err) {
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
				res.locals.items = butt.items();
				res.render('match', { title: 'Match #' + match.match_id, user: req.user });
			});
		}
		else {
			res.locals.match = false;
			res.render('match', { title: 'invalid match', user: req.user });
		}
	});
};