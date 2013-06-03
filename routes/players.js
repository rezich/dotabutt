var async = require('async');

exports.index = function(req, res) {
	var butt = res.locals.butt;
	async.series([
		function(callback) {
			butt.getRecentPlayers(30, function(players) { res.locals.players = players; callback(); });
		},
		function(callback) {
			butt.getPlayerCount(function(total_players) { res.locals.total_players = total_players; callback(); });
		}
	],
	function(err) {
		res.render('players', { title: 'Players', user: req.user });
	});
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	async.series([
		function(callback) {
			butt.getPlayer(req.params.id, function(player) { res.locals.player = player; callback(); });
		},
		function(callback) {
			butt.getPlayerMatches(res.locals.player.account_id, 10, 0, function(matches) { res.locals.player.matches = matches; callback(); });
		},
		function(callback) {
			butt.getPlayerMatchCount(res.locals.player.account_id, function(count) { res.locals.player.matches.count = count; callback(); });
		}
	],
	function(err) {
		res.locals.heroes = butt.heroes();
		res.render('player', { title: res.locals.player.personaname, user: req.user });
	});
}

exports.matches = function(req, res) {
	var butt = res.locals.butt;
	res.locals.previous = false;
	res.locals.next = false;
	async.series([
		function(callback) {
			butt.getPlayer(req.params.id, function(player) { res.locals.player = player; callback(); });
		},
		function(callback) {
			if (req.params.page === undefined) res.locals.page = 1;
			else res.locals.page = parseInt(req.params.page);
			if (res.locals.page < 1) res.locals.page = 1;
			var skip = (parseInt(res.locals.page) - 1) * 10;
			if (isNaN(skip)) skip = 0;
			if (res.locals.page > 1) res.locals.previous = res.locals.page - 1;
			res.locals.skip = skip;
			butt.getPlayerMatches(res.locals.player.account_id, 10, skip, function(matches) { res.locals.player.matches = matches; callback(); });
		},
		function(callback) {
			if (true) res.locals.next = res.locals.page + 1;
			butt.getPlayerMatchCount(res.locals.player.account_id, function(count) { res.locals.player.matches.count = count; callback(); });
		}
	],
	function(err) {
		res.locals.heroes = butt.heroes();
		res.render('player_matches', { title: res.locals.player.personaname, user: req.user });
	});
}