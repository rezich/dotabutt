var http = require('http');

function DotaButt(key) {
	this.APIKey = key;
	this.Heroes = [];
	
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
	console.log('Making API call...');
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
	
	this.APICall('/IEconDOTA2_570/GetHeroes/v0001/?key=#APIKEY#&language=en_us', function(data) {
		console.log('  Loaded heroes sucessfully!');
		data.result.heroes.forEach(function(hero) {
			self.Heroes.push(new DotaHero(hero.name, hero.id, hero.localized_name));
		});
	});
}

DotaButt.prototype.GetMatch = function(match_id, callback) {
	var self = this;
	console.log("Getting match data...");
	this.APICall('/IDOTA2Match_570/GetMatchDetails/V001/?key=#APIKEY#&match_id=' + match_id, function(data) {
		console.log('  Loaded match successfully!');
		callback(data.result);
	});
}

function DotaHero(name, id, localizedName) {
	this.Name = name;
	this.ID = id;
	this.LocalizedName = localizedName;
}

exports.DotaButt = DotaButt;
exports.DotaHero = DotaHero;