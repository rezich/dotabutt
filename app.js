var express = require('express'),
stylus = require('stylus'),
nib = require('nib'),
routes = require('./routes'),
http = require('http'),
path = require('path'),
fs = require('fs'),
moment = require('moment'),
steamapi = require('./steamapi.js'),
butt = require('./dotabutt.js');

butt.init();

moment().format();

routes.matches = require('./routes/matches');
routes.players = require('./routes/players');
routes.items = require('./routes/items');
routes.heroes = require('./routes/heroes');
routes.teams = require('./routes/teams');
routes.pages = require('./routes/pages');

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
		res.locals.steamapi = steamapi;
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

app.get('/about', routes.pages.about);
app.get('/privacy', routes.pages.privacy);
app.get('/faq', routes.pages.faq);
app.get('/donate', routes.pages.donate);

http.createServer(app).listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});
