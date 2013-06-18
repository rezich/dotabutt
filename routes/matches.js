var async = require('async');

exports.index = function(req, res, next) {
	var butt = res.locals.butt;
	if (req.params.page && isNaN(req.params.page)) {
		res.redirect('/matches/');
		return;
	}
	res.locals.page = parseInt(req.params.page) || 1;
	async.series([
		function(callback) {
			if (res.locals.page < 1) return callback('invalid page number');
			butt.getRecentMatches(10, (res.locals.page - 1) * 10, function(matches, err) {
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
		res.locals.previous = false;
		if (res.locals.page > 1) res.locals.previous = res.locals.page - 1;
		res.locals.next = res.locals.page + 1;
		res.locals.behind = res.locals.moment(butt.lastTime.toString(), 'X');
		res.locals.heroes = butt.heroes(req.locale);
		res.render('matches', { title: 'Matches' });
	});
};

exports.view = function(req, res, next) {
	var butt = res.locals.butt;
	var steamapi = res.locals.steamapi;
	var lookup_ids = [];
	var changed_players = [];
	
	if (isNaN(req.params.id)) {
		res.redirect('/matches/');
		return;
	}
	
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
		}/*,
		function(callback) {
			if (!res.locals.match.radiant_logo) return callback();
			butt.getTeamLogo(res.locals.match.radiant_logo, function(data, err) {
				if (err) return callback(err);
				res.locals.match.radiant_logo_url = data.url;
				callback();
			});
		},
		function(callback) {
			if (!res.locals.match.dire_logo) return callback();
			butt.getTeamLogo(res.locals.match.dire_logo, function(data, err) {
				if (err) return callback(err);
				res.locals.match.dire_logo_url = data.url;
				callback();
			});
		}*/
	],
	function(err) {
		if (err) return next(err);
		res.locals.heroes = butt.heroes(req.locale);
		res.locals.items = butt.items(req.locale);
		//if (res.locals.match) res.locals.match.json = JSON.stringify(res.locals.match, null, '\t');
		res.render('match', { title: 'Match #' + res.locals.match.match_id });
	});
};