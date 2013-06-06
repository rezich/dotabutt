var http = require('http'),
bignum = require('bignum'),
fs = require('fs'),
slug = require('slug');

module.exports = {
	_key: '',
	_requests: [],
	_interval: 1000,
	_timeout: null,
	_last: new Date(),
	_checking: false,
	_lang: 'en_us',
	down: false,
	init: function(key, lang) {
		this._key = key;
		if (lang) this._lang = lang;
		
		this.dota2._api = this;
	},
	_checkRequests: function() {
		var self = this;
		if (this._requests.length > 0) {
			console.log('Request queue: %s', this._requests.length.toString());
			this._checking = true;
			var now = new Date();
			if (now - this._last >= this._interval) {
				this._last = now;
				var req = this._requests.shift();
				this._makeCall(req.call, req.callback, req.expect404);
				this._timeout = setTimeout(function() { self._checkRequests(); }, this._interval);
			}
			else {
				this._timeout = setTimeout(function() { self._checkRequests(); }, this._interval - (now - this._last));
			}
		}
		else {
			clearTimeout(this._timeout);
			this._checking = false;
		}
	},
	_call: function(call, options, callback) {
		var params = '';
		var expect404 = false;
		for (var opt in options) {
			if (opt == '_expect404') {
				expect404 = true;
				continue;
			}
			params += '&' + opt + '=' + options[opt].toString();
		}
		this._requests.push({ call: call + '?key=' + this._key + params, callback: callback, expect404: expect404 });
		if (!this._checking) this._checkRequests();
	},
	_makeCall: function(call, callback, expect404) {
		var self = this;
		call = call.replace('API_KEY', this._key) + '&language=' + this._lang;
		//console.log('Making API call: %s', call.replace(this._key, 'API_KEY'));
		http.get({
			host: 'api.steampowered.com',
			port: 80,
			path: call
		}, function(response) {
			var err = false;
			if (response.statusCode != 200 && !(response.statusCode == 404 && expect404)) {
				err = true;
				self.down = true;
			}
			else self.down = false;
			var data = '';
			response.on('data', function(chunk) {
				data += chunk;
			});
			response.on('error', function(e) {
				console.log('ERROR: %s', e.message);
				// callback?
			});
			response.on('end', function() {
				var parsedData = false;
				try {
					parsedData = JSON.parse(data);
				}
				catch(e) {
					err = e;
					self.down = true;
				}
				finally {
					if (callback) callback(parsedData, err);
				}
				//console.log('API call %s completed', call.replace(self._key, 'API_KEY'));
			});
		}).on('error', function(err) {
			if (callback) callback(false, err);
		});
	},
	dota2: {
		appID: 570,
		gameMode: {
			allPick: 1,
			captainsMode: 2,
			randomDraft: 3,
			singleDraft: 4,
			allRandom: 5,
			diretide: 7,
			reverseCaptainsMode: 8,
			greeviling: 9,
			tutorial: 10,
			midOnly: 11,
			leastPlayed: 12,
			newPlayerPool: 13
		},
		tower: {
			tier1: {
				bottom: 64,
				middle: 8,
				top: 1
			},
			tier2: {
				bottom: 128,
				middle: 16,
				top: 2
			},
			tier3: {
				bottom: 256,
				middle: 32,
				top: 4
			},
			ancient: {
				bottom: 512,
				top: 1024
			}
		},
		barracks: {
			bottom: {
				melee: 16,
				ranged: 32
			},
			middle: {
				melee: 4,
				ranged: 8
			},
			top: {
				melee: 1,
				ranged: 2
			}
		},
		heroes: {},
		items: {},
		// IDOTA2Match
		getLeagueListing: function(callback) { // callback(leagues, err)
			this._api._call('/IDOTA2Match_570/GetLeagueListing/v0001/', options, function(data, err) {
				if (callback) callback((data.result && data.result.leagues ? data.result.leagues : false), err);
			});
		},
		getLiveLeagueGames: function(callback) { // callback(games, err)
			this._api._call('/IDOTA2Match_570/GetLiveLeagueGames/v0001/', options, function(data, err) {
				if (callback) callback((data.result && data.result.games ? data.result.games : false), err);
			});
		},
		getMatchDetails: function(match_id, callback) { // callback(matchDetails, err)
			this._api._call('/IDOTA2Match_570/GetMatchDetails/V001/', { match_id: match_id }, function(data, err) {
				if (callback) callback(data.result || false, err);
			});
		},
		getMatchHistory: function(options, callback) { // callback(matches, status, num_results, total_results, results_remaining, err)
			// player_name, hero_id, game_mode, skill, date_min, date_max, min_players, account_id, league_id, start_at_match_id, matches_requested, tournament_games_only
			this._api._call('/IDOTA2Match_570/GetMatchHistory/v001/', options, function(data, err) {
				if (callback) callback(data.matches || false, data.status || false, data.num_results || false, data.total_results || false, data.results_remaining || false, err);
			});
		},
		getMatchHistoryBySequenceNum: function(options, callback) { // callback(matches, status, err)
			// start_at_match_seq_num, matches_requested
			this._api._call('/IDOTA2Match_570/GetMatchHistoryBySequenceNum/v1/', options, function(data, err) {
				if (callback) callback((data.result && data.result.matches ? data.result.matches : false), (data.result && data.result.status ? data.result.status : false), err);
			});
		},
		getScheduledLeagueGames: function(options, callback) { // callback(games, err)
			// date_min, date_max
			this._api._call('/IDOTA2Mathc_570/GetScheduledLeagueGames/v1/', options, function(data, err) {
				if (callback) callback(data.result || false, err);
			});
		},
		getTeamInfoByTeamID: function(options, callback) { // callback(teams, status, err)
			// start_at_team_id, teams_requested
			this._api._call('/IDOTA2Match_570/GetTeamInfoByTeamID/v001/', options, function(data, err) {
				if (callback) callback((data.result && data.result.teams ? data.result.teams : false), err);
			});
		},
		// IDOTA2
		getRarities: function(callback) { // callback(rarities, count, err)
			this._api._call('/IEconDOTA2_570/GetRarities/v1', function(data, err) {
				if (callback) callback((data.result && data.result.rarities ? data.result.rarities : false), (data.result && data.result.count ? data.result.count : false), err);
			});
		},
		getHeroes: function(callback) { // callback(heroes, err)
			delete this.heroes;
			this.heroes = {};
			var self = this;
			this._api._call('/IEconDOTA2_570/GetHeroes/v0001/', {}, function(data, err) {
				if (err) console.log("ERROR GETTING HEROES!");
				else {
					data.result.heroes.forEach(function(hero) {
						hero.short_name = hero.name.replace('npc_dota_hero_', '');
						self.heroes[hero.id] = hero;
						self.heroes[hero.id].slug = slug(hero.localized_name).toLowerCase();
					});
				}
				if (callback) callback((data.result && data.result.heroes ? data.result.heroes : null), err);
			});
		},
		getTicketSaleStatus: function(callback) { // TODO
			if (callback) callback();
		},
		// Custom
		getItems: function(callback) { // callback(items, err)
			var self = this;
			delete this.items;
			this.items = {};
			fs.readFile('data/items.json', function(err, data) {
				if (err) console.log('!!! ITEM FILE WAS MISSING OR CORRUPT !!!')
				else {
					console.log('Loaded items successfully.');
					var parsedItems = JSON.parse(data);
					Object.keys(parsedItems).forEach(function(key) {
						self.items[parseInt(key)] = parsedItems[key];
						self.items[parseInt(key)].slug = slug(self.items[parseInt(key)].localized_name).toLowerCase();
					});
				}
				callback(self.items, err);
			});
		}

	},
	tf2: {
		// TODO
	},
	// ISteamUser
	getPlayerSummaries: function(players, callback) { // callback(players, err)
		var self = this;
		var steamids = '';
		for (var i = 0; i < players.length; i++) {
			steamids += (steamids != '' ? ',' : '') + players[i];
		}
		this._call('/ISteamUser/GetPlayerSummaries/v0002/', { steamids: steamids }, function(data, err) {
			// we have to sort the results to make them the same order that we requested them in because the Steam API is a piece of shit
			var sorted = [];
			for (var i = 0; i < players.length; i++) {
				for (var j = 0; j < data.response.players.length; j++) {
					if (data.response.players[j].steamid == players[i]) {
						sorted.push(data.response.players[j]);
						continue;
					}
				}
			}
			if (callback) callback(sorted, err);
		});
	},
	// ISteamUserStats
	getNumberOfCurrentPlayers: function(appid, callback) { // callback(count, err);
		this._call('/ISteamUserStats/GetNumberOfCurrentPlayers/v1/', { appid: appid }, function(data, err) {
			if (data.response && data.response.result == 1 && !err) {
				callback(data.response.player_count, false);
			}
			else if (callback) callback(false, err || data.response.result);
		});
	},
	getUGCFileDetails: function(options, callback) { // callback(data, err)
		options._expect404 = true;
		this._call('/ISteamRemoteStorage/GetUGCFileDetails/v1/', options, function (data, err) {
			if (data.status.code == 9) return callback(false);
			if (err) console.log('ERROR GETTING FILE');
			callback(data.data, err);
		});
	},
	appID: { // TODO: move to individual objects
		CounterStrike: 10,
		TeamFortressClassic: 20,
		DayOfDefeat: 30,
		DeathmatchClassic: 40,
		OpposingForce: 50,
		Ricochet: 60, // lol
		HalfLife: 70,
		ConditionZero: 80,
		ConditionZeroDeletedScenes: 100,
		HalfLifeBlueShift: 130,
		HalfLife2: 220,
		CounterStrikeSource: 240,
		HalfLifeSource: 280,
		DayOfDefeatSource: 300,
		HalfLife2Deathmatch: 320,
		HalfLife2LostCoast: 340,
		HalfLifeDeathmatchSource: 360,
		HalfLife2EpisodeOne: 380,
		Portal: 400,
		HalfLife2EpisodeTwo: 420,
		TeamFortress2: 440,
		Left4Dead: 500,
		Left4Dead2: 550,
		Dota2: 570,
		Portal2: 620,
		AlienSwarm: 630
	},
	getAppByID: function(id) {
		// TODO
	},
	convertIDTo64Bit: function(id) {
		// convert a 32-bit Steam ID into a 64-bit one
		return bignum(id).add('76561197960265728').toString();
	},
	convertIDTo32Bit: function(id) {
		// convert a 64-bit Steam ID into a 32-bit one
		return parseInt(bignum(id.toString()).sub('76561197960265728'));
	}
}