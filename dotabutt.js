var steamapi = require('./steamapi.js');
var fs = require('fs');
var mongojs = require('mongojs');
var moment = require('moment');
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
		this.db = mongojs(
			process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'test',
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
		var self = this;
		id = parseInt(id);
		this.db.matches.find({ match_id: id }, function(err, matches) {
			if (err) console.log('Error finding match! ' + err);
			if (matches.length == 0) {
				console.log('Match %s not found in db, querying API...', id);
				steamapi.dota2.getMatchDetails(id, function(match) {
					self.db.matches.save(match, function(err, saved) {
						if (err) console.log('Error saving match! ' + err);
						if (saved) console.log('Match %s saved to db.', match.match_id);
						else console.log('Match %s not saved to db.', match.match_id);
					});
					callback(match);
				});
			}
			else {
				console.log('Match %s found in db', id);
				callback(matches[0]);
			}
		});
	},
	getPlayers: function(ids, callback) {
		var self = this;
		this.db.players.find({ account_id: { $in: ids } }, function(err, db_players) {
			var lookup_ids = [];
			for (var i = 0; i < ids.length; i++) {
				var found = false;
				for (var j = 0; j < db_players.length; j++) {
					if (db_players[j].account_id == ids[i]) {
						console.log('Player %s found in db', db_players[j].account_id);
						found = true;
						break;
					}
				}
				if (!found) lookup_ids.push(steamapi.convertIDTo64Bit(ids[i]));
			}
			if (lookup_ids.length == 0) {
				callback(db_players);
			}
			else {
				steamapi.getPlayerSummaries(lookup_ids, function(api_players) {
					for (var i = 0; i < api_players.length; i++) {
						var new_player = api_players[i];
						new_player.account_id = steamapi.convertIDTo32Bit(lookup_ids[i]);
						new_player.updated = moment().unix();
						self.db.players.save(new_player, function(err, saved) {
							if (saved) console.log('Saved player!');
							else console.log('Saving player failed!');
						});
					}
					var players = [];
					for (var i = 0; i < ids.length; i++) {
						for (var j = 0; j < db_players.length; j++) {
							if (ids[i] == db_players[j].account_id) players.push(db_players[j]);
						}
						for (var j = 0; j < api_players.length; j++) {
							if (steamapi.convertIDTo64Bit(ids[i]) == api_players[j].steamid) players.push(api_players[j]);
						}
					}
					for (var i = 0; i < players.length; i++) {
						console.log(players[i].personaname + '|' + players[i].account_id);
					}
					callback(players);
				});
			}
		});
		/*for (var i = 0; i < ids.length; i++) ids[i] = steamapi.convertIDTo64Bit(ids[i]);
		steamapi.getPlayerSummaries(ids, callback);*/
	},
	getPlayer: function(id, callback) {
		this.getPlayers([id], function(players) { callback(players[0]) });
	},
	getTeam: function(id, callback) {
		steamapi.dota2.getTeamInfoByTeamID({ start_at_team_id: id, teams_requested: 1 }, callback);
	}
}