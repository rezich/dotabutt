var steamapi = require('./steamapi.js');
var fs = require('fs');
module.exports = {
	db: null,
	ready: false,
	anon: '4294967295',
	init: function() {
		var self = this;
		this._getKey(function(key) {
			steamapi.init(key);
			steamapi.dota2.getHeroes(function() {
				self.ready = true;
			});
		});
		//var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/mydb';
		var db = require('mongojs').connect(
			process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'dotabutt',
			['players', 'matches', 'teams']
		);
	},
	_getKey: function(callback) {
		var key = null;
		if (process.env.STEAM_API_KEY != null) {
			console.log("STEAM_API_KEY environment variable found, initializing DotaButt...");
			callback(process.env.STEAM_API_KEY);
		}
		else {
			console.log("No STEAM_API_KEY environment variable set, checking for api_key file...");
			fs.exists('api_key', function (exists) {
				if (exists) {
					fs.readFile('api_key', function (err, data) {
						if (err) throw err;
						else {
							console.log("Found api_key file, initializing DotaButt...");
							callback(data);
						}
					});
				}
				else {
					console.log("ERROR: Couldn't find api_key file. No Steam API key to set.");
				}
			});
		}
	},
	heroes: function() {
		return steamapi.dota2.heroes;
	},
	getMatch: function(id, callback) {
		steamapi.dota2.getMatchDetails(id, callback);
	},
	getPlayers: function(ids, callback) {
		for (var i = 0; i < ids.length; i++) ids[i] = steamapi.convertIDTo64Bit(ids[i]);
		steamapi.getPlayerSummaries(ids, callback);
	},
	getPlayer: function(id, callback) {
		this.getPlayers([id], function(players) { callback(players[0]) });
	},
	getTeam: function(id, callback) {
		steamapi.dota2.getTeamInfoByTeamID({ start_at_team_id: id, teams_requested: 1 }, callback);
	}
}