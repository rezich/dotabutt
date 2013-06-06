var steamapi = require('./steamapi.js');
var fs = require('fs');
var mongojs = require('mongojs');
var moment = require('moment');
var async = require('async');

module.exports = {
	_player_update_interval: 60 * 60,
	db: null,
	ready: false,
	anon: '4294967295',
	config: { id: 0, backfill: 0 },
	lastBackfillMatch: 0,
	backfillWriteThreshold: 500,
	backfillTimeout: 0,
	backfillReady: true,
	backfillNotReadyTimes: 0,
	lastTime: 0,
	_backfillInterval: false,
	backfillEnabled: true,
	startupFailed: false,
	startupTime: 0,
	verifiedPlayers: [],
	init: function() {
		var self = this;
		async.series([
			function(callback) { self._getKey(function(key) {
				steamapi.init(key);
				callback();
			}); },
			function(callback) { steamapi.dota2.getHeroes(function(heroes, err) {
				if (err) callback(err);
				callback();
			}); },
			function(callback) { steamapi.dota2.getItems(function(items, err) {
				if (err) callback(err);
				callback();
			}); },
			function(callback) { self.getVerifiedPlayers(function(players, err) {
				if (err) callback(err);
				callback();
			}); },
			function(callback) { self.loadConfig(function(err) {
				callback();
			}); }
		],
		function(err) {
			if (err) {
				console.log('!!! STARTUP FAILED !!!');
				self.startupFailed = true;
				return;
			}
			self.lastBackfillMatch = self.config.backfill;
			console.log('Starting backfill from seq# ' + self.config.backfill.toString());
			self.startupTime = moment();
			self.ready = true;
			if (self.backfillEnabled) self.startBackfill();
		});
		this.backfillTimeout = process.env.BACKFILL_TIMEOUT || 500;
		this.db = mongojs(
			process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'test',
			['players', 'matches', 'teams', 'config']
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
			if (err) {
				console.log('Error finding match! ' + err);
				callback(false, err);
				return;
			}
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
				callback(matches[0], err);
			}
		});
	},
	checkPlayers: function(ids, callback) { // callback(match, err)
		this.db.players.find( { account_id: { $in: ids } }, function(err, players) {
			callback(players, err);
		});
	},
	insertPlayer: function(player, callback) { // callback(saved, err)
		this.db.players.insert(player, function(err, inserted) {
			if (err) console.log('Error inserting players! ' + err);
			if (callback) callback(inserted, err);
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
			if (!err) {
				for (var key in players) {
					var found = false;
					for (var i = 0; i < db_players.length; i++) {
						if (db_players[i].account_id == key) {
							//console.log('Player %s found in db', key);
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
								/*if (saved) console.log('Saved player!');
								else console.log('Saving player failed!');*/
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
			}
			else callback(false, err);
		});
	},
	getPlayerMatches: function(id, number, startAt, callback) { // callback(matches, err)
		this.db.matches.find({ players: { $elemMatch: { 'account_id': parseInt(id) } } }).sort({ start_time: -1 }).limit(number).skip(startAt, function(err, matches) {
			callback(matches, err);
		});
	},
	getPlayerMatchCount: function(id, callback) { // callback(count, err)
		this.db.matches.find({ players: { $elemMatch: { 'account_id': parseInt(id) } } }).count(function(err, count) {
			callback(count, err);
		});
	},
	getPlayer: function(id, callback) { // callback(player, err)
		this.getPlayers([parseInt(id)], function(players, err) { callback(players[0], err); });
	},
	getTeams: function(ids, callback) {
		// TODO: IMPLEMENT
		callback();
	},
	getTeam: function(id, callback) { // callback(team, err)
		steamapi.dota2.getTeamInfoByTeamID({ start_at_team_id: id, teams_requested: 1 }, function(teams, err) { callback(teams[0], err); });
	},
	getTeamLogo: function(logo_id, callback) { // callback(data, err)
		steamapi.getUGCFileDetails({ appid: steamapi.dota2.appID, ugcid: logo_id }, function(data, err) { callback(data, err); });
	},
	getRecentMatches: function(number, startAt, callback) { // callback(matches, err)
		this.db.matches.find().sort({ start_time: -1 }).limit(number).skip(startAt, function(err, matches) {
			callback(matches, err);
		});
	},
	getMatchCount: function(callback) { // callback(count, err)
		this.db.matches.find().count(function(err, count) {
			callback(count, err);
		});
	},
	getRecentPlayers: function(number, callback) { // callback(players, err)
		this.db.players.find().sort({ lastlogoff: -1 }).limit(number, function(err, players) {
			callback(players, err);
		});
	},
	getPlayerCount: function(callback) { // callback(count, err)
		this.db.players.find().count(function(err, count) {
			callback(count, err);
		});
	},
	getGlobalPlayerCount: function(callback) { // callback(count, err)
		steamapi.getNumberOfCurrentPlayers(steamapi.dota2.appID, function(count, err) { callback(count, err); });
	},
	search: function(query, callback) { // callback(results) (results.err for errors)
		var again = function(query, callback, butt, tried, results) {
			var regex = new RegExp(query, 'i');
			if (!tried) tried = { times: 0 };
			if (!results) results = { err: [] };
			if (results.err.length > 0) {
				callback(results);
				return;
			}
			tried.times++;
			if (!tried.number) {
				if (!isNaN(query) && parseInt(query).toString() == query) { // is a number
					query = parseInt(query);
					if (!tried.match) { // match id
						butt.getMatch(query, function(match, err) {
							if (err) results.err.push(err);
							if (!err) {
								if (!results.matches) results.matches = {};
								results.matches[match.match_id] = match;
								results.last = '/matches/' + match.match_id;
							}
							tried.match = true;
							again(query, callback, butt, tried, results);
						});
					}
					else if (!tried.account_id) { // player id
						butt.getPlayer(query, function(player, err) {
							if (err) results.err.push(err);
							if (!err) {
								if (!results.players) results.players = {};
								player._searchedBy = 'account ID';
								results.players[player.account_id] = player;
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
							results.last = '/heroes/' + heroes[query].slug;
						}
						tried.hero_id = true;
						again(query, callback, butt, tried, results);
					}
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
									results.last = '/players/' + db_players[i].account_id;
								}
								tried.personaname = true;
								again(query, callback, butt, tried, results);
							}
							else {
								results.err.push(err);
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
									results.last = '/players/' + db_players[i].account_id;
								}
								tried.realname = true;
								again(query, callback, butt, tried, results);
							}
							else {
								results.err.push(err);
							}
						});
					}
					else if (!tried.verifiedname) {
						var found = false;
						var foundName = '';
						for (var i = 0; i < butt.verifiedPlayers.length; i++) {
							for (var j = 0; j < butt.verifiedPlayers[i].names.length; j++) {
								if (query.toLowerCase() == butt.verifiedPlayers[i].names[j].toLowerCase()) {
									found = butt.verifiedPlayers[i].id;
									foundName = butt.verifiedPlayers[i].names[j];
								}
								if (found) break;
							}
							if (found) break;
						}
						if (found) {
							butt.db.players.find({ account_id: found }, function(err, db_players) {
								if (!err && db_players.length == 1) {
									db_players[0]._searchedBy = 'verified player: ' + foundName;
									if (!results.players) results.players = {};
									results.players[db_players[0].account_id] = db_players[0];
									results.last = '/players/' + db_players[0].account_id;
								}
								else {
									results.err.push(err);
								}
								tried.verifiedname = true;
								again(query, callback, butt, tried, results);
							});
						}
						else {
							tried.verifiedname = true;
							again(query, callback, butt, tried, results);
						}
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
				if (results.err.length == 0) {
					var count = 0;
					delete results.err;
					Object.keys(results).forEach(function(key) {
						if (typeof results[key] === 'object') count += Object.keys(results[key]).length;
					});
					results.count = count;
				}
				callback(results);
			}
		};
		again(query, callback, this);
	},
	startBackfill: function() {
		var self = this;
		this._backfillInterval = setInterval(function() { self.backfill(); }, this.backfillTimeout);
	},
	backfill: function() { // callback(saved, err)
		if (!this.backfillReady) {
			this.backfillNotReadyTimes++;
			if (this.backfillNotReadyTimes > 10) console.log('!! BACKFILL TAKEN ' + (this.backfillNotReadyTimes * this.backfillTimeout / 1000).toString());
			return;
		}
		this.backfillNotReadyTimes = 0;
		this.backfillReady = false;
		var self = this;
		var players = [];
		var matches = [];
		async.series([
			function(callback) { steamapi.dota2.getMatchHistoryBySequenceNum({ start_at_match_seq_num: self.lastBackfillMatch }, function(_matches, status, err) {
				if (err || status != 1) {
					console.log('BACKFILL ERROR: Error getting data from API. REMAINING AT seq# %s', self.lastBackfillMatch);
					return callback(err || status);
				}
				matches = _matches;
				self.lastTime = matches[0].start_time;
				for (var i = 0; i < Object.keys(matches); i++) {
					for (var j = 0; j < matches[Object.keys(matches)[i]].players.length; j++) {
						var found = false;
						for (var k = 0; k < players.length; k++) {
							if (players[k].account_id == matches[Object.keys(matches)[i]].players[j].account_id) {
								found = true;
								break;
							}
						}
						if (!found) players.push(matches[Object.keys(matches)[i]].players[j].account_id);
					}
				}
				callback();
			}); },
			function(callback) { self.checkMatches(Object.keys(matches), function(existingMatches, err) {
				if (err) return callback(err);
				for (var i = 0; i < Object.keys(existingMatches); i++) {
					delete matches[Object.keys(existingMatches)[i]];
				}
				callback();
			}); },
			function(callback) { self.insertMatch(matches, function(saved, err) {
				if (err) return callback(err);
				callback();
			}); },
			function(callback) { self.checkPlayers(players, function(existingPlayers, err) {
				if (err) return callback(err);
				for (var i = 0; i < Object.keys(existingPlayers); i++) {
					players.splice(players.indexOf(Object.keys(existingPlayers)[i]), 1);
				}
				callback();
			}); },
			function(callback) { self.getPlayers(players, function(inserted, err) {
				if (err) return callback(err);
				callback();
			}); }
		],
		function(err) {
			if (err) {
				self.backfillReady = true;
				console.log('BACKFILL ERROR: REMAINING AT seq# %s', self.lastBackfillMatch);
				return;
			}
			var prevBackfill = self.lastBackfillMatch;
			self.lastBackfillMatch = matches[matches.length - 1].match_seq_num + 1;
			if (self.lastBackfillMatch - self.config.backfill > self.backfillWriteThreshold) {
				self.config.backfill = self.lastBackfillMatch;
				self.saveConfig(function(saved, err) {
					if (err) {
						self.lastBackfillMatch = prevBackfill;
						console.log('ERROR SAVING BACKFILL');
					}
					else console.log('Backfill saved up to seq# ' + self.config.backfill);
					self.backfillReady = true;
				});
			}
			self.backfillReady = true;
		});
	},
	saveConfig: function(callback) {
		this.db.config.save(this.config, function(err, saved) {
			callback(saved, err);
		});
	},
	loadConfig: function(callback) { // callback(err)
		var self = this;
		this.db.config.find(function(err, configs) {
			if (configs.length > 0) {
				self.config = configs[0];
				if (callback) callback(err);
			}
			else {
				self.saveConfig(function(saved, err) {
					if (callback) callback(err);
				});
			}
		});
	},
	getVerifiedPlayers: function(callback) {
		var self = this;
		delete this.verifiedPlayers;
		this.verifiedPlayers = [];
		fs.readFile('data/verified_players.json', function(err, data) {
			if (err) console.log('!!! VERIFIED PLAYERS FILE WAS MISSING OR CORRUPT !!!')
			else {
				console.log('Loaded verified players successfully.');
				var parsedItems = JSON.parse(data);
				for (i = 0; i < parsedItems.length; i++) {
					self.verifiedPlayers.push(parsedItems[i]);
				}
			}
			if (callback) callback(self.items, err);
		});
	}
}