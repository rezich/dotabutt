var async = require('async');

exports.index = function(req, res, next) {
	res.render('teams', { title: 'Teams' });
};

exports.view = function(req, res, next) {
	var butt = res.locals.butt;
	var lookup_ids = [];
	async.series([
		function(callback) {
			butt.getTeam(req.params.id, function(team, err) {
				console.log('getting team');
				if (err) return callback(err);
				console.log('got team');
				res.locals.team = team;
				lookup_ids = [
					team.player_0_account_id,
					team.player_1_account_id,
					team.player_2_account_id,
					team.player_3_account_id,
					team.player_4_account_id,
				];
				callback();
			});
		},
		function(callback) {
			butt.getPlayers(lookup_ids, function(player_summaries, err) {
				if (err) return callback(err);
				res.locals.team.players = player_summaries;
				res.locals.team.players[0].account_id = res.locals.team.player_0_account_id;
				res.locals.team.players[1].account_id = res.locals.team.player_1_account_id;
				res.locals.team.players[2].account_id = res.locals.team.player_2_account_id;
				res.locals.team.players[3].account_id = res.locals.team.player_3_account_id;
				res.locals.team.players[4].account_id = res.locals.team.player_4_account_id;
				callback();
			});
		}
	],
	function(err) {
		if (err) return next(err);
		res.render('team', { title: res.locals.team.tag + ' - ' + res.locals.team.name });
	});
};