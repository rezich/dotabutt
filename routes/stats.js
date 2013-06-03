var async = require('async');
var moment = require('moment');

exports.index = function(req, res, next) {
	var butt = res.locals.butt;
	res.locals.matches = {};
	res.locals.players = {}
	async.series([
		function(callback) {
			butt.getMatchCount(function(count, err) {
				if (err) return callback(err);
				res.locals.matches.count = count;
				res.locals.matches.size = Number(count * 0.00000343099).toFixed(2); //3684 / 1024 / 1024 / 1024;
				callback();
			});
		},
		function(callback) {
			butt.getPlayerCount(function(count, err) {
				if (err) return callback(err);
				res.locals.players.count = count;
				callback();
			});
		}
	],
	function(err) {
		if (err) return next(err);
		res.locals.matches.latest = moment(butt.lastTime.toString(), 'X');
		res.locals.matches.behind = moment(res.locals.matches.latest).fromNow(true);
		res.render('stats', { title: 'Stats' });
	});
}