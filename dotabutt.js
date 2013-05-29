var steamapi = require('./steamapi.js');
var fs = require('fs');
var mongojs = require('mongojs');
var moment = require('moment');
module.exports = {
	_player_update_interval: 60 * 60,
	_items: {},
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
		fs.readFile('data/items.json', function(err, data) {
			if (err) console.log('!!! ITEM FILE WAS MISSING OR CORRUPT !!!')
			else {
				console.log('Loaded items successfully.');
				var parsedItems = JSON.parse(data);
				Object.keys(parsedItems).forEach(function(key) {
					self._items[parseInt(key)] = parsedItems[key];
				});
			}
		});
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
	items: function() {
		return this._items;
	},
	getMatch: function(id, callback) { // callback(match, err)
		var self = this;
		id = parseInt(id);
		this.db.matches.find({ match_id: id }, function(err, matches) {
			if (err) console.log('Error finding match! ' + err);
			if (matches.length == 0) {
				console.log('Match %s not found in db, querying API...', id);
				var err = false;
				steamapi.dota2.getMatchDetails(id, function(match, api_err) {
					if (err) {
						self.db.matches.save(match, function(db_err, saved) {
							if (db_err) console.log('Error saving match! ' + db_err);
							if (saved) console.log('Match %s saved to db.', match.match_id);
							else console.log('Match %s not saved to db.', match.match_id);
						});
					}
					else err = false;
					if (err) console.log('match is invalid!');
					callback(match, err);
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
		for (var i = 0; i < ids.length; i++) ids[i] = parseInt(ids[i]);
		
		// make a map of the requested players
		var players = {};
		for (var i = 0; i < ids.length; i++) {
			players[ids[i]] = {};
		}
		
		// look the ids up in the database
		this.db.players.find( { account_id: { $in: ids } }, function(err, db_players) {
			var api_ids = [];
			for (var key in players) {
				var found = false;
				for (var i = 0; i < db_players.length; i++) {
					if (db_players[i].account_id == key) {
						console.log('Player %s found in db', key);
						players[key] = db_players[i];
						found = true;
					}
				}
				if (!found) api_ids.push(steamapi.convertIDTo64Bit(key));
			}
			if (api_ids.length == 0) {
				var return_players = [];
				for (var i = 0; i < ids.length; i++) {
					for (var key in players) {
						if (key == ids[i]) {
							return_players.push(players[key]);
							break;
						}
					}
				}
				callback(return_players);
			}
			else {
				steamapi.getPlayerSummaries(api_ids, function(api_players) {
					// save these new players
					for (var i = 0; i < api_players.length; i++) {
						api_players[i].account_id = steamapi.convertIDTo32Bit(api_ids[i]);
						api_players[i].updated = moment().unix();
						self.db.players.save(api_players[i], function(err, saved) {
							if (saved) console.log('Saved player!');
							else console.log('Saving player failed!');
						});
					}
					for (var key in players) {
						for (var i = 0; i < api_players.length; i++) {
							if (key == api_players[i].account_id) {
								players[key] = api_players[i];
								break;
							}
						}
					}
					var return_players = [];
					for (var i = 0; i < ids.length; i++) {
						for (var key in players) {
							if (key == ids[i]) {
								return_players.push(players[key]);
								break;
							}
						}
					}
					callback(return_players);
				});
			}
		});
	},
	getPlayerMatches: function(id, callback) {
		this.db.matches.find({ players: { $elemMatch: { 'account_id': parseInt(id) } } }, function(err, matches) {
			callback(matches);
		});
	},
	getPlayer: function(id, callback) {
		this.getPlayers([parseInt(id)], function(players) { callback(players[0]) });
	},
	getTeam: function(id, callback) {
		steamapi.dota2.getTeamInfoByTeamID({ start_at_team_id: id, teams_requested: 1 }, callback);
	},
	getRecentMatches: function(callback) {
		this.db.matches.find({}, function(err, matches) {
			callback(matches);
		});
	},
	getAllPlayers: function(callback) {
		this.db.players.find({}, function(err, players) {
			callback(players);
		});
	},
	search: function(query, callback) {
		var again = function(query, callback, butt, tried, results) {
			if (!tried) tried = { times: 0 };
			if (!results) results = { count: 0 };
			tried.times++;
			console.log(tried);
			console.log(results);
			if (!tried.number) {
				if (!isNaN(query)) { // is a number
					if (!tried.match) {
						butt.getMatch(parseInt(query), function(match, err) {
							if (!err) {
								if (!results.matches) results.matches = [];
								results.matches.push(match);
								results.count++;
								results.last = '/matches/' + match.match_id;
							}
							tried.match = true;
							again(query, callback, butt, tried, results);
						});
					}
					else {
						tried.number = true;
						again(query, callback, butt, tried, results);
					}
				}
				else {
					tried.number = true;
					again(query, callback, butt, tried, results);
				}
			}
			if (tried.number) {
				callback(results);
			}
		};
		again(query, callback, this);
	},
}