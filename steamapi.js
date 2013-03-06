var http = require('http'),
bignum = require('bignum');

module.exports = {
	_key: '',
	_requests: [],
	_interval: 1000,
	_timeout: null,
	_last: new Date(),
	_checking: false,
	init: function(key) {
		this._key = key;
		
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
	_call: function(call, callback) {
		this._requests.push({ call: call, callback: callback });
		if (!this._checking) this._checkRequests();
	},
	_makeCall: function(call, callback) {
		console.log('Making API call: %s', call);
		http.get({
			host: 'api.steampowered.com',
			port: 80,
			path: call.replace('API_KEY', this._key)
		}, function(response) {
			var data = '';
			response.on('data', function(chunk) {
				data += chunk;
			});
			response.on('error', function(e) {
				console.log('ERROR: %s', e.message);
				// callback?
			});
			response.on('end', function() {
				callback(JSON.parse(data));
				console.log('API call complete!');
			});
		});
	},
	dota2: {
		heroes: {},
		getHeroes: function(callback) {
			var self = this;
			console.log("Getting heroes...");
			this._api._call('/IEconDOTA2_570/GetHeroes/v0001/?key=API_KEY&language=en_us', function(data) {
				console.log('Loaded heroes sucessfully!');
				data.result.heroes.forEach(function(hero) {
					//self.heroes.push(new DotaHero(hero.name, hero.id, hero.localized_name));
					//self.Heroes[hero.id] = new DotaHero(hero.name, hero.id, hero.localized_name);
					self.heroes[hero.id] = { name: hero.name, id: hero.id, localizedName: hero.localized_name };
				});
				callback();
			});
		},
		getMatchDetails: function(match_id, callback) {
		},
		getTeamInfoByTeamID: function(team_id, teams_requested, callback) {
		}
	},
	getPlayerSummaries: function(players, callback) {
	},
	getPlayerSummary: function(player, callback) {
	},
	convertIDTo64: function(id) {
	}
}