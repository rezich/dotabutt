var express = require('express'),
stylus = require('stylus'),
nib = require('nib'),
routes = require('./routes'),
http = require('http'),
path = require('path'),
fs = require('fs'),
butt = require('./dotabutt.js');

routes.match = require('./routes/match');
routes.player = require('./routes/player');

var key = null;
if (process.env.STEAM_API_KEY != null) {
	console.log("STEAM_API_KEY environment variable found, initializing DotaButt...");
	butt.init(process.env.STEAM_API_KEY);
}
else {
	console.log("No STEAM_API_KEY environment variable set, checking for api_key file...");
	fs.exists('api_key', function (exists) {
		if (exists) {
			fs.readFile('api_key', function (err, data) {
				if (err) throw err;
				else {
					console.log("Found api_key file, initializing DotaButt...");
					butt.init(data);
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
		res.locals.butt = butt;
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
	app.use(stylus.middleware({
		src: __dirname + '/public',
		compile: function(str, path) {
			return stylus(str).use(nib());
		}
	}));
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
	app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/matchs/:id', routes.match.view);
app.get('/players/:id', routes.player.view);

http.createServer(app).listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});
