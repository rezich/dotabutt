var steamapi = require('./steamapi.js');
var fs = require('fs');
var mongojs = require('mongojs');
var moment = require('moment');
module.exports = {
	_player_update_interval: 60 * 60,
	db: null,
	ready: false,
	anon: '4294967295',
	lastBackfillMatch: 0,
	lastBackfillMatchSaved: 0,
	backfillWriteThreshold: 1000,
	backfillTimeout: 1,
	backfillReady: true,
	init: function() {
		var self = this;
		this._getKey(function(key) {
			steamapi.init(key);
			steamapi.dota2.getHeroes(function() {
				steamapi.dota2.getItems(function() {
					fs.exists('backfill', function(exists) {
						if (exists) {
							fs.readFile('backfill', function(err, data) {
								self.lastBackfillMatch = parseInt(data);
								self.ready = true;
								self.startBackfill();
							});
						}
						else {
							self.ready = true;
							self.startBackfill();
						}
					});
				});
			});
		});
		this.backfillTimeout = process.env.BACKFILL_TIMEOUT || 1000;
		this.db = mongojs(
			process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'test',
			['players', 'matches', 'teams']
		);
	},
	_getKey: function(callback) {
		var key = null;
		if (process.env.STEAM_API_KEY != null) {
			console.log("STEAM_API_KEY environment variable found, initializing Dotabutt...");
			callback(process.env.STEAM_API_KEY);
		}
		else {
			console.log("No STEAM_API_KEY environment variable set, checking for api_key file...");
			fs.exists('api_key', function (exists) {
				if (exists) {
					fs.readFile('api_key', function (err, data) {
						if (err) throw err;
						else {
							console.log("Found api_key file, initializing Dotabutt...");
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
		return steamapi.dota2.items;
	},
	saveMatch: function(match, callback) { // callback(saved, err)
		this.db.matches.save(match, function(err, saved) {
			if (err) console.log('Error saving match! ' + err);
			//if (saved) console.log('Match %s saved to db.', match.match_id);
			//else console.log('Match %s not saved to db.', match.match_id);
			if (callback) callback(saved, err);
		});
	},
	insertMatch: function(match, callback) { // callback(saved, err)
		this.db.matches.insert(match, function(err, inserted) {
			if (err) console.log('Error inserting match! ' + err);
			if (callback) callback(inserted, err);
		});
	},
	checkMatch: function(id, callback) { // callback(match, err)
		this.db.matches.find({ match_id: id }, function(err, matches) {
			callback((matches.length == 0 ? false : matches[0]), err);
		});
	},
	checkMatches: function(ids, callback) { // callback(match, err)
		this.db.matches.find( { match_id: { $in: ids } }, function(err, matches) {
			callback(matches, err);
		});
	},
	getMatch: function(id, callback) { // callback(match, err)
		var self = this;
		id = parseInt(id);
		this.db.matches.find({ match_id: id }, function(err, matches) {
			if (err) console.log('Error finding match! ' + err);
			if (matches.length == 0) {
				console.log('Match %s not found in db, querying API...', id);
				steamapi.dota2.getMatchDetails(id, function(match, err) {
					if (!err) {
						self.saveMatch(match);
					}
					//if (err) console.log('match is invalid!');
					callback(match, err);
				});
			}
			else {
				console.log('Match %s found in db', id);
				callback(matches[0]);
			}
		});
	},
	getPlayers: function(ids, callback) { // callback(players, err)
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
					callback(return_players, err);
				});
			}
		});
	},
	getPlayerMatches: function(id, callback) {
		this.db.matches.find({ players: { $elemMatch: { 'account_id': parseInt(id) } } }, function(err, matches) {
			callback(matches);
		});
	},
	getPlayer: function(id, callback) { // callback(player, err)
		this.getPlayers([parseInt(id)], function(players, err) { callback(players[0], err) });
	},
	getTeam: function(id, callback) {
		steamapi.dota2.getTeamInfoByTeamID({ start_at_team_id: id, teams_requested: 1 }, callback);
	},
	getRecentMatches: function(number, callback) {
		this.db.matches.find().sort({ start_time: -1 }).limit(number, function(err, matches) {
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
			var regex = new RegExp(query, 'i');
			if (!tried) tried = { times: 0 };
			if (!results) results = { count: 0 };
			tried.times++;
			if (!tried.number) {
				if (!isNaN(query) && parseInt(query).toString() == query) { // is a number
					query = parseInt(query);
					if (!tried.match) { // match id
						butt.getMatch(query, function(match, err) {
							if (!err) {
								if (!results.matches) results.matches = {};
								results.matches[match.match_id] = match;
								results.count++;
								results.last = '/matches/' + match.match_id;
							}
							tried.match = true;
							again(query, callback, butt, tried, results);
						});
					}
					else if (!tried.account_id) { // player id
						butt.getPlayer(query, function(player, err) {
							if (!err) {
								if (!results.players) results.players = {};
								player._searchedBy = 'account ID';
								results.players[player.account_id] = player;
								results.count++;
								results.last = '/players/' + player.account_id;
							}
							tried.account_id = true;
							again(query, callback, butt, tried, results);
						});
					}
					else if (!tried.item_id) {
						var items = butt.items();
						if (items[query]) {
							if (!results.items) results.items = {};
							items[query]._searchedBy = 'item ID';
							results.items[query] = items[query];
							results.count++;
							results.last = '/items/' + items[query].slug;
						}
						tried.item_id = true;
						again(query, callback, butt, tried, results);
					}
					else if (!tried.hero_id) {
						var heroes = butt.heroes();
						if (heroes[query]) {
							if (!results.heroes) results.heroes = {};
							heroes[query]._searchedBy = 'hero ID';
							results.heroes[query] = heroes[query];
							results.count++;
							results.last = '/heroes/' + heroes[query].slug;
						}
						tried.hero_id = true;
						again(query, callback, butt, tried, results);
					}
					/*else if (!tried.steam_id) { // steam id
						butt.getPlayer(parseInt(steamapi.convertIDTo32Bit(query)), function(player, err) {
							if (!err) {
								if (!results.players) results.players = {};
								player._searchedBy = 'Steam ID';
								results.players[player.account_id] = player;
								results.count++;
								results.last = '/players/' + player.account_id;
							}
							tried.steam_id = true;
							again(query, callbac0, butt, tried, results);
						});
					}*/
					else { // none of the above
						tried.number = true;
						again(query, callback, butt, tried, results);
					}
				}
				else { // not a number
					tried.number = true;
					again(query, callback, butt, tried, results);
				}
			}
			else if (!tried.string) {
				query = query.toString();
				if (query.length < 3) tried.long_string = true;
				if (!tried.long_string) {
					if (!tried.personaname) {
						butt.db.players.find({ personaname: { $regex: regex } }, function(err, db_players) {
							if (!err) {
								for (var i = 0; i < db_players.length; i++) {
									if (!results.players) results.players = {};
									results.players[db_players[i].account_id] = db_players[i];
									results.count++;
									results.last = '/players/' + db_players[i].account_id;
								}
								tried.personaname = true;
								again(query, callback, butt, tried, results);
							}
							else {
								// TODO: error handling?
							}
						});
					}
					else if (!tried.realname) {
						butt.db.players.find({ realname: { $regex: regex } }, function(err, db_players) {
							if (!err) {
								for (var i = 0; i < db_players.length; i++) {
									if (!results.players) results.players = {};
									db_players[i]._searchedBy = 'real name: ' + db_players[i].realname;
									results.players[db_players[i].account_id] = db_players[i];
									results.count++;
									results.last = '/players/' + db_players[i].account_id;
								}
								tried.realname = true;
								again(query, callback, butt, tried, results);
							}
							else {
								// TODO: error handling?
							}
						});
					}
					else {
						tried.long_string = true;
						again(query, callback, butt, tried, results);
					}
				}
				else if (!tried.short_string) {
					if (!tried.item_name) {
						var items = butt.items();
						keys = Object.keys(items);
						for (var i = 0; i < keys.length; i++) {
							if (items[keys[i]].localized_name && items[keys[i]].localized_name.match(regex)) {
								if (!results.items) results.items = {};
								if (!results.items[keys[i]]) {
									results.items[keys[i]] = items[keys[i]];
									results.count++;
									results.last = '/items/' + items[keys[i]].slug;
								}
							}
						}
						tried.item_name = true;
						again(query, callback, butt, tried, results);
					}
					else if (!tried.item_aliases) {
						var items = butt.items();
						keys = Object.keys(items);
						for (var i = 0; i < keys.length; i++) {
							if (items[keys[i]].aliases) {
								var aliases = items[keys[i]].aliases;
								for (var j = 0; j < aliases.length; j++) {
									if (aliases[j].match(regex)) {
										if (!results.items) results.items = {};
										if (!results.items[keys[i]]) {
											results.items[keys[i]] = items[keys[i]];
											results.items[keys[i]]._searchedBy = 'item alias';
											results.count++;
											results.last = '/items/' + items[keys[i]].slug;
										}
									}
								}
							}
						}
						tried.item_aliases = true;
						again(query, callback, butt, tried, results);
					}
					else if (!tried.hero_name) {
						var heroes = butt.heroes();
						keys = Object.keys(heroes);
						for (var i = 0; i < keys.length; i++) {
							if (heroes[keys[i]].localized_name && heroes[keys[i]].localized_name.match(regex)) {
								if (!results.heroes) results.heroes = {};
								if (!results.heroes[keys[i]]) {
									results.heroes[keys[i]] = heroes[keys[i]];
									results.count++;
									results.last = '/heroes/' + heroes[keys[i]].slug;
								}
							}
						}
						tried.hero_name = true;
						again(query, callback, butt, tried, results);
					}
					else {
						tried.short_string = true;
						again(query, callback, butt, tried, results);
					}
				}
				else {
					tried.string = true;
					again(query, callback, butt, tried, results);
				}
			}
			else {
				callback(results);
			}
		};
		again(query, callback, this);
	},
	startBackfill: function() {
		var self = this;
		setInterval(function() { self.backfill(); }, this.backfillTimeout);
	},
	backfill: function() {
		if (!this.backfillReady) return;
		this.backfillReady = false;
		var self = this;
		steamapi.dota2.getMatchHistoryBySequenceNum({ start_at_match_seq_num: this.lastBackfillMatch }, function(matches) {
		
			self.checkMatches(Object.keys(matches), function(existingMatches, err) {
				for (var i = 0; i < Object.keys(existingMatches); i++) {
					delete matches[Object.keys(existingMatches)[i]];
				}
				/*var newMatches = [];
				for (var key in matches) newMatches.push(matches[key]);*/
				self.insertMatch(matches, function(saved, err) {
					self.lastBackfillMatch = matches[matches.length - 1].match_seq_num + 1;
					self.backfillReady = true;
					if (self.lastBackfillMatch - self.lastBackfillMatchSaved > self.backfillWriteThreshold) {
						self.lastBackfillMatchSaved = self.lastBackfillMatch;
						fs.writeFile('backfill', self.lastBackfillMatch.toString(), function(err) {
							// ???
						});
					}
					console.log(self.lastBackfillMatch);
				});
			});
		});
	}
}