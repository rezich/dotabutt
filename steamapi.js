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
	init: function(key, lang) {
		this._key = key;
		if (lang) this._lang = lang;
		
		this.dota2._api = this;
	},
	_checkRequests: function() {
		var self = this;
		if (this._requests.length > 0) {
			console.log('%s request%s left in queue', this._requests.length.toString(), (this._requests.length != 1 ? 's' : ''));
			this._checking = true;
			var now = new Date();
			if (now - this._last >= this._interval) {
				this._last = now;
				var req = this._requests.shift();
				this._makeCall(req.call, req.callback);
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
			for (var opt in options) {
			params += '&' + opt + '=' + options[opt].toString();
		}
		this._requests.push({ call: call + '?key=' + this._key + params, callback: callback });
		if (!this._checking) this._checkRequests();
	},
	_makeCall: function(call, callback) {
		var self = this;
		call = call.replace('API_KEY', this._key) + '&language=' + this._lang;
		console.log('Making API call: %s', call.replace(this._key, 'API_KEY'));
		http.get({
			host: 'api.steampowered.com',
			port: 80,
			path: call
		}, function(response) {
			var err = false;
			if (response.statusCode != 200) err = true;
			var data = '';
			response.on('data', function(chunk) {
				data += chunk;
			});
			response.on('error', function(e) {
				console.log('ERROR: %s', e.message);
				// callback?
			});
			response.on('end', function() {
				if (callback) callback(JSON.parse(data), err);
				console.log('API call %s completed', call.replace(self._key, 'API_KEY'));
			});
		});
	},
	dota2: {
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
		getMatchHistory: function(options, callback) {
			// player_name, hero_id, game_mode, skill, date_min, date_max, min_players, account_id, league_id, start_at_match_id, matches_requested, tournament_games_only
			this._api._call('/IDOTA2Match_570/GetMatchHistory/v001/', options, function(data) {
				if (callback) callback(data.matches, data.status, data.num_results, data.total_results, data.results_remaining);
			});
		},
		getMatchHistoryBySequenceNum: function(options, callback) {
			// start_at_match_seq_num, matches_requested
			this._api._call('/IDOTA2Match_570/GetMatchHistoryBySequenceNum/v0001/', options, function(data) {
				if (callback) callback(data.result.matches, data.result.status);
			});
		},
		getLeagueListing: function(callback) {
			this._api._call('/IDOTA2Match_570/GetLeagueListing/v0001/', options, function(data) {
				if (callback) callback(data.result.leagues);
			});
		},
		getHeroes: function(callback) {
			delete this.heroes;
			this.heroes = {};
			var self = this;
			this._api._call('/IEconDOTA2_570/GetHeroes/v0001/', {}, function(data, err) {
				if (err) console.log("ERROR GETTING HEROES!");
				data.result.heroes.forEach(function(hero) {
					hero.short_name = hero.name.replace('npc_dota_hero_', '');
					self.heroes[hero.id] = hero;
					self.heroes[hero.id].slug = slug(hero.localized_name).toLowerCase();
				});
				if (callback) callback(data.result.heroes, err);
			});
		},
		getItems: function() {
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
			});
		},
		getMatchDetails: function(match_id, callback) {
			this._api._call('/IDOTA2Match_570/GetMatchDetails/V001/', { match_id: match_id }, function(data, err) {
				if (callback) callback(data.result, err);
			});
		},
		getTeamInfoByTeamID: function(options, callback) {
			// start_at_team_id, teams_requested
			this._api._call('/IDOTA2Match_570/GetTeamInfoByTeamID/v001/', options, function(data) {
				if (callback) callback(data.result.teams, data.result.status);
			});
		},
		getLiveLeagueGames: function(callback) {
			this._api._call('/IDOTA2Match_570/GetLiveLeagueGames/v0001/', options, function(data) {
				if (callback) callback(data.result.games);
			});
		}
	},
	getPlayerSummaries: function(players, callback) {
		var self = this;
		var steamids = '';
		for (var i = 0; i < players.length; i++) {
			steamids += (steamids != '' ? ',' : '') + players[i];
		}
		this._call('/ISteamUser/GetPlayerSummaries/v0002/', { steamids: steamids }, function(data) {
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
			if (callback) callback(sorted);
		});
	},
	getUGCFileDetails: function(ugcid, appid, callback) {
		this._call('/ISteamRemoteStorage/GetUGCFileDetails/v1/', { ugcid: ugcid, appid: appid }, function (data) {
			callback(data);
		});
	},
	appID: {
		CounterStrike: 10,
		TeamFortressClassic: 20,
		DayOfDefeat: 30,
		DeathmatchClassic: 40,
		OpposingForce: 50,
		Ricochet: 60, //lol
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
	convertIDTo64Bit: function(id) {
		// convert a 32-bit Steam ID into a 64-bit one
		return bignum(id).add('76561197960265728').toString();
	},
	convertIDTo32Bit: function(id) {
		// convert a 64-bit Steam ID into a 32-bit one
		return parseInt(bignum(id.toString()).sub('76561197960265728'));
	}
}