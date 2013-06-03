var async = require('async');

exports.index = function(req, res) {
	var butt = res.locals.butt;
	async.series([
		function(callback) {
			butt.getRecentMatches(10, function(matches) { res.locals.matches = matches; callback(); });
		},
		function(callback) {
			butt.getMatchCount(function(total_matches) { res.locals.total_matches = total_matches; callback(); });
		}
	], function(err) {
		res.locals.behind = res.locals.moment(butt.lastTime.toString(), 'X');
		res.locals.heroes = butt.heroes();
		res.render('matches', { title: 'Matches', user: req.user });
	});
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	var steamapi = res.locals.steamapi;
	var lookup_ids = [];
	var changed_players = [];
	res.locals.error = false;
	
	async.series([
		function(callback) {
			butt.getMatch(req.params.id, function(match, err) {
				if (!err) {
					for (var i = 0; i < match.players.length; i++) {
						if (match.players[i].account_id != butt.anon) {
							changed_players.push(i);
							lookup_ids.push(match.players[i].account_id);
						}
					}
					match.duration = res.locals.moment.duration(match.duration, 'seconds');
					res.locals.match = match;
				}
				else res.locals.error = err;
				callback();
			});
		},
		function(callback) {
			if (res.locals.error) {
				callback();
				return;
			}
			butt.getPlayers(lookup_ids, function(player_summaries, err) {
				if (!err) {
					for (var i = 0; i < changed_players.length; i++) {
						res.locals.match.players[changed_players[i]].summary = player_summaries[i];
					}
				}
				else res.locals.error = err;
				callback();
			});
		}
	],
	function(err) {
		if (res.locals.error) {
			res.status(500).render('500', { title: 'Internal Error', user: req.user });
			return;
		}
		res.locals.heroes = butt.heroes();
		res.locals.items = butt.items();
		res.render('match', { title: 'Match #' + res.locals.match.match_id, user: req.user });
	});
};