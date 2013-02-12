var express = require('express'),
routes = require('./routes'),
user = require('./routes/user'),
http = require('http'),
path = require('path'),
fs = require('fs'),
//async = require('async'),
DotaButt = require('./dotabutt.js').DotaButt,
DotaHero = require('./dotabutt.js').DotaHero;

var DB = null;

if (process.env.STEAM_API_KEY != null) {
	console.log("STEAM_API_KEY environment variable found, initializing DotaButt...");
	DB = new DotaButt(process.env.STEAM_API_KEY);
}
else {
	console.log("No STEAM_API_KEY environment variable set, checking for api_key file...");
	fs.exists('api_key', function (exists) {
		if (exists) {
			fs.readFile('api_key', function (err, data) {
				if (err) throw err;
				else {
					console.log("Found api_key file, initializing DotaButt...");
					DB = new DotaButt(data);
				}
			});
		}
		else {
			console.log("ERROR: Couldn't find api_key file. No Steam API key to set.");
		}
	});
}

var app = express();

app.configure(function() {
	app.use(function(req, res, next) {
		res.locals.DotaButt = function() { return DB; };
		next();
	});
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(require('stylus').middleware(__dirname + '/public'));
	app.use(express.static(path.join(__dirname, 'public')));
});


app.configure('development', function() {
	app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/match/:id', function(req, res) {
	DB.GetMatchDetails(req.params.id, function(match) {
		var changed_players = [];
		var lookup_ids = [];
		for (var i = 0; i < match.players.length; i++) {
			if (match.players[i].account_id != '4294967295') {
				changed_players.push(i);
				lookup_ids.push(DB.ID64(match.players[i].account_id));
			}
		}
		console.log(changed_players);
		
		DB.GetPlayerSummaries(lookup_ids, function(player_summaries) {
			for (var i = 0; i < changed_players.length; i++) {
				match.players[changed_players[i]].summary = player_summaries[i];
			}
			res.locals.match = match;
			res.locals.heroes = DB.Heroes;
			//res.locals.DotaButt = function() { return DB; }
			res.render('match', { title: 'match #' + match.match_id });
		});
	});
});
app.get('/player/:id', function(req, res) {
	DB.GetPlayerSummary(DB.ID64(req.params.id), function(player) {
		res.locals.player = player;
		res.render('player', { title: player.personaname });
	});
});

http.createServer(app).listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});
