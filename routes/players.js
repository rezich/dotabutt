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
			butt.getPlayerMatches(res.locals.player.account_id, function(matches) { res.locals.player.matches = matches; callback(); });
		}
	],
	function(err) {
		res.render('player', { title: res.locals.player.personaname, user: req.user });
	});
}