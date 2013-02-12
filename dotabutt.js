var http = require('http'),
bignum = require('bignum');

function DotaButt(key) {
	this.APIKey = key;
	this.Heroes = {};
	
	this.APIRequests = [];
	this.APIInterval = 1000;
	this.APITimeout = null;
	this.lastAPITime = new Date();
	this.checkingRequests = false;
	
	this.GetHeroes();
}

DotaButt.prototype.CheckRequests = function() {
	var self = this;
	if (this.APIRequests.length > 0) {
		console.log(this.APIRequests.length.toString() + ' request' + (this.APIRequests.length != 1 ? 's' : '') + ' left in queue');
		this.checkingRequests = true;
		var now = new Date();
		if (now - this.lastAPITime >= this.APIInterval) {
			this.lastAPITime = now;
			var req = this.APIRequests.shift();
			this.MakeAPICall(req.call, req.callback);
			this.APITimeout = setTimeout(function() { self.CheckRequests(); }, this.APIInterval);
		}
		else {
			this.APITimeout = setTimeout(function() { self.CheckRequests(); }, this.APIInterval - (now - this.lastAPITime));
		}
	}
	else {
		clearTimeout(this.APITimeout);
		this.checkingRequests = false;
	}
}

DotaButt.prototype.APICall = function(call, callback) {
	this.APIRequests.push({ call: call, callback: callback });
	if (!this.checkingRequests) this.CheckRequests();
}

DotaButt.prototype.MakeAPICall = function (call, callback) {
	console.log('Making API call: ' + call.replace('#APIKEY#', 'KEY'));
	http.get({
		host: 'api.steampowered.com',
		port: 80,
		path: call.replace('#APIKEY#', this.APIKey)
	}, function(response) {
		var data = '';
		response.on('data', function(chunk) {
			data += chunk;
		});
		response.on('error', function(e) {
			console.log('ERROR: ' + e.message);
			// callback?
		});
		response.on('end', function() {
			callback(JSON.parse(data));
			console.log('API call complete!');
		});
	});
}

DotaButt.prototype.GetHeroes = function() {
	var self = this;
	console.log("Getting heroes...");
	this.APICall('/IEconDOTA2_570/GetHeroes/v0001/?key=#APIKEY#&language=en_us', function(data) {
		console.log('Loaded heroes sucessfully!');
		data.result.heroes.forEach(function(hero) {
			//self.heroes.push(new DotaHero(hero.name, hero.id, hero.localized_name));
			self.Heroes[hero.id] = new DotaHero(hero.name, hero.id, hero.localized_name);
		});
	});
}

DotaButt.prototype.GetMatchDetails = function(match_id, callback) {
	var self = this;
	console.log("Getting match details...");
	this.APICall('/IDOTA2Match_570/GetMatchDetails/V001/?key=#APIKEY#&match_id=' + match_id, function(data) {
		console.log('Loaded match details successfully!');
		callback(data.result);
	});
}

DotaButt.prototype.GetPlayerSummaries = function(players, callback) {
	var self = this;
	console.log("Getting player summaries...");
	var steamids = '';
	for (var i = 0; i < players.length; i++) {
		steamids += (steamids != '' ? ',' : '') + players[i];
	}
	this.APICall('/ISteamUser/GetPlayerSummaries/v0002/?key=#APIKEY#&steamids=' + steamids, function(data) {
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
		console.log('Loaded player summaries successfully!');
		callback(sorted);
	});
}

DotaButt.prototype.GetPlayerSummary = function(player, callback) {
	this.GetPlayerSummaries([player], function(players) {
		callback(players[0]);
	});
}

DotaButt.prototype.ID64 = function(id) {
	return bignum(id).add('76561197960265728').toString();
}

function DotaHero(name, id, localizedName) {
	this.Name = name;
	this.ID = id;
	this.LocalizedName = localizedName;
}

exports.DotaButt = DotaButt;
exports.DotaHero = DotaHero;