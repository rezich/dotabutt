var async = require('async');

exports.index = function(req, res) {
	res.render('teams', { title: 'Teams', user: req.user });
};

exports.view = function(req, res) {
	var butt = res.locals.butt;
	var lookup_ids = [];
	async.series([
		function(callback) {
			butt.getTeam(req.params.id, function(team) {
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
			butt.getPlayers(lookup_ids, function(player_summaries) {
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
		res.render('team', { title: res.locals.team.tag + ' - ' + res.locals.team.name, user: req.user });
	});
	/*
	butt.getTeam(req.params.id, function(teams) {
		var team = teams[0];
		team.players = [];
		var lookup_ids = [
			team.player_0_account_id,
			team.player_1_account_id,
			team.player_2_account_id,
			team.player_3_account_id,
			team.player_4_account_id,
		];
		butt.getPlayers(lookup_ids, function(player_summaries) {
			team.players = player_summaries;
			team.players[0].account_id = team.player_0_account_id;
			team.players[1].account_id = team.player_1_account_id;
			team.players[2].account_id = team.player_2_account_id;
			team.players[3].account_id = team.player_3_account_id;
			team.players[4].account_id = team.player_4_account_id;
			res.locals.team = team;
			res.render('team', { title: team.tag + ' - ' + team.name, user: req.user });
		});
	});
	*/
};