var express = require('express'),
stylus = require('stylus'),
nib = require('nib'),
routes = require('./routes'),
http = require('http'),
path = require('path'),
fs = require('fs'),
moment = require('moment'),
//mongo = require('mongodb'),
butt = require('./dotabutt.js');

//var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/mydb';

var db = require('mongojs').connect(
	process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'dotabutt',
	['players', 'matches', 'teams']
);

moment().format();

routes.matches = require('./routes/matches');
routes.players = require('./routes/players');
routes.items = require('./routes/items');
routes.heroes = require('./routes/heroes');
routes.teams = require('./routes/teams');

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
app.configure('development', function() {
	var stylusMiddleware = stylus.middleware({
		src: __dirname + '/public/',
		/*dest: __dirname + '/public/',*/
		debug: true,
		compile: function(str, path) {
		return stylus(str)
			.set('filename', path)
			.set('warn', true)
			.set('compress', true)
			.use(nib());
		}
	});
	app.use(stylusMiddleware);  
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});
app.configure('production', function(){
	app.use(express.errorHandler());
});
app.configure(function() {
	app.use(function(req, res, next) {
		res.locals.butt = butt;
		res.locals.moment = moment;
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
	/*app.use(stylus.middleware({
		src: __dirname + '/public',
		compile: function(str, path) {
			return stylus(str).use(nib());
		}
	}));*/
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
	app.use(express.errorHandler());
});

app.get('/', routes.index);

app.get('/matches', routes.matches.index);
app.get('/matches/:id', routes.matches.view);

app.get('/players', routes.players.index);
app.get('/players/:id', routes.players.view);

app.get('/heroes', routes.heroes.index);

app.get('/items', routes.items.index);

app.get('/teams', routes.teams.index);
app.get('/teams/:id', routes.teams.view);

http.createServer(app).listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});
