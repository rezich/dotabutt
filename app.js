var express = require('express'),
stylus = require('stylus'),
nib = require('nib'),
routes = require('./routes'),
http = require('http'),
path = require('path'),
fs = require('fs'),
moment = require('moment'),
passport = require('passport'),
steamstrat = require('passport-steam').Strategy,
steamapi = require('./steamapi.js'),
butt = require('./dotabutt.js');

butt.init();

moment().format();

baseUrl = 'http://nukle.us:80';
if (process.env.DOMAIN) baseUrl = process.env.DOMAIN

routes.matches = require('./routes/matches');
routes.players = require('./routes/players');
routes.items = require('./routes/items');
routes.heroes = require('./routes/heroes');
routes.teams = require('./routes/teams');
routes.pages = require('./routes/pages');
routes.search = require('./routes/search');

var app = express();

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	//butt.getPlayer(
	if (obj.identifier && !obj.id) obj.id = parseInt(steamapi.convertIDTo32Bit(obj.identifier.match(/\b[0-9]+\b/)[0]));
	if (!obj.player) {
		butt.getPlayer(obj.id, function(player) {
			obj.player = player;
			done(null, obj);
		});
	}
	else done(null, obj);
});

passport.use(
	new steamstrat({
		returnURL: baseUrl + '/auth/return',
		realm: baseUrl + '/'
	},
	function(identifier, profile, done) {
		process.nextTick(function () {
		profile.identifier = identifier;
		//profile.id = identifier.match(/\b[0-9]+\b/)[1];
		return done(null, profile);
	});
	}
));

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
	app.set('port', process.env.PORT || 80);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use (express.cookieParser());
	app.use(express.session({ secret: 'asdfasdfasdfasdf' }));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
	/*app.use(stylus.middleware({
		src: __dirname + '/public',
		compile: function(str, path) {
			return stylus(str).use(nib());
		}
	}));*/
	app.use(express.static(path.join(__dirname, 'public')));
});

app.get('/', routes.index);

app.get('/matches', routes.matches.index);
app.get('/matches/:id', routes.matches.view);

app.get('/players', routes.players.index);
app.get('/players/:id', routes.players.view);

app.get('/heroes', routes.heroes.index);

app.get('/items', routes.items.index);
app.get('/items/:id', routes.items.view);

app.get('/teams', routes.teams.index);
app.get('/teams/:id', routes.teams.view);

app.get('/search', routes.search.index);
//app.get('/search/:query', routes.search.results);

app.get('/about', routes.pages.about);
app.get('/privacy', routes.pages.privacy);
app.get('/faq', routes.pages.faq);
app.get('/donate', routes.pages.donate);

app.get('/auth',
	passport.authenticate('steam', {failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/');
	}
);

app.get('/auth/return',
	passport.authenticate('steam', {failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/');
	}
);

app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/login')
}

http.createServer(app).listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});
