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