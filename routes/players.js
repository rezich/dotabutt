var async = require('async');

exports.index = function(req, res, next) {
	var butt = res.locals.butt;
	async.series([
		function(callback) {
			butt.getRecentPlayers(30, function(players, err) {
				if (err) return callback(err);
				res.locals.players = players;
				callback();
			});
		},
		function(callback) {
			butt.getPlayerCount(function(total_players, err) {
				if (err) return callback(err);
				res.locals.total_players = total_players;
				callback();
			});
		}
	],
	function(err) {
		if (err) return next(err);
		res.render('players', { title: 'Players' });
	});
};

exports.view = function(req, res, next) {
	var butt = res.locals.butt;
	if (req.params.id && isNaN(req.params.id)) {
		res.redirect('/players/');
		return;
	}
	async.series([
		function(callback) {
			butt.getPlayer(req.params.id, function(player, err) {
				if (err) return callback(err);
				res.locals.player = player;
				callback();
			});
		},
		function(callback) {
			butt.getPlayerMatches(res.locals.player.account_id, 10, 0, function(matches, err) {
				if (err) return callback(err);
				res.locals.player.matches = matches;
				callback();
			});
		},
		function(callback) {
			butt.getPlayerMatchCount(res.locals.player.account_id, function(count, err) {
				if (err) return callback(err);
				res.locals.player.matches.count = count;
				callback();
			});
		}
	],
	function(err) {
		if (err) return next(err);
		res.locals.heroes = butt.heroes(req.locale);
		res.render('player', { title: res.locals.player.personaname });
	});
}

exports.matches = function(req, res, next) {
	var butt = res.locals.butt;
	res.locals.previous = false;
	res.locals.next = false;
	async.series([
		function(callback) {
			butt.getPlayer(req.params.id, function(player, err) {
				if (err) return callback(err);
				res.locals.player = player;
				callback();
			});
		},
		function(callback) {
			if (req.params.page === undefined) res.locals.page = 1;
			else res.locals.page = parseInt(req.params.page);
			if (res.locals.page < 1) res.locals.page = 1;
			var skip = (parseInt(res.locals.page) - 1) * 10;
			if (res.locals.page > 1) res.locals.previous = res.locals.page - 1;
			res.locals.skip = skip;
			butt.getPlayerMatches(res.locals.player.account_id, 10, skip, function(matches, err) {
				if (err) return callback(err);
				res.locals.player.matches = matches;
				callback();
			});
		},
		function(callback) {
			butt.getPlayerMatchCount(res.locals.player.account_id, function(count, err) {
				if (err) return callback(err);
				res.locals.player.matches.count = count;
				if (res.locals.player.matches.count > res.locals.page * 10) res.locals.next = res.locals.page + 1;
				callback();
			});
		}
	],
	function(err) {
		if (err) return next(err);
		res.locals.heroes = butt.heroes(req.locale);
		res.render('player_matches', { title: res.locals.player.personaname });
	});
}