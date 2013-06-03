var async = require('async');

exports.index = function(req, res, next) {
	var butt = res.locals.butt;
	async.series([
		function(callback) {
			butt.getRecentMatches(10, function(matches, err) {
				if (err) return callback(err);
				res.locals.matches = matches;
				callback();
			});
		},
		function(callback) {
			butt.getMatchCount(function(total_matches, err) {
				if (err) return callback(err);
				res.locals.total_matches = total_matches;
				callback();
			});
		}
	], function(err) {
		if (err) return next(err);
		res.locals.behind = res.locals.moment(butt.lastTime.toString(), 'X');
		res.locals.heroes = butt.heroes();
		res.render('matches', { title: 'Matches' });
	});
};

exports.view = function(req, res, next) {
	var butt = res.locals.butt;
	var steamapi = res.locals.steamapi;
	var lookup_ids = [];
	var changed_players = [];
	
	async.series([
		function(callback) {
			butt.getMatch(req.params.id, function(match, err) {
				if (err) return callback(err);
				for (var i = 0; i < match.players.length; i++) {
					if (match.players[i].account_id != butt.anon) {
						changed_players.push(i);
						lookup_ids.push(match.players[i].account_id);
					}
				}
				match.duration = res.locals.moment.duration(match.duration, 'seconds');
				res.locals.match = match;
				callback();
			});
		},
		function(callback) {
			butt.getPlayers(lookup_ids, function(player_summaries, err) {
				if (err) return callback(err);
				for (var i = 0; i < changed_players.length; i++) {
					res.locals.match.players[changed_players[i]].summary = player_summaries[i];
				}
				callback();
			});
		}
	],
	function(err) {
		if (err) return next(err);
		res.locals.heroes = butt.heroes();
		res.locals.items = butt.items();
		res.render('match', { title: 'Match #' + res.locals.match.match_id });
	});
};