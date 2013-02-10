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

fs.exists('api_key', function (exists) {
	if (exists) {
		fs.readFile('api_key', function (err, data) {
			if (err) throw err;
			DB = new DotaButt(data);
		});
	}
	else {
		console.log('ERROR: no api_key file found. Make a file called api_key and put your key in it');
	}
});

console.log(DB);

var app = express();

app.configure(function() {
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
app.locals.DotaButt = function() { return DB; };

app.configure('development', function() {
	app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});
