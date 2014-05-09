var chug = require('chug');
var colors = require('colors');
var log = console.log;
var cwd = process.cwd();

var httpPort = 9080;
var httpsPort = 9443;
var httpsKey = null;
var httpsCert = null;

var app;

var controllers = [];

var publics = [];
var scripts = [];
var styles = [];
var views = [];

var lighter = module.exports = function () {
	var App = require('./lib/App');
	app = app || new App();
	return app;
};

var rewritePath = function (path) {
	return path;
};

/**
 * Expose the version to module users.
 */
lighter.version = require('./package.json').version;

/**
 * Allow external public files to be added.
 */
lighter.addPublics = function (item) {
	publics.push(item);
};

/**
 * Allow external scripts to be added.
 */
lighter.addScripts = function (item) {
	scripts.push(item);
};

/**
 * Allow external styles to be added.
 */
lighter.addStyles = function (item) {
	styles.push(item);
};

/**
 * Allow external views to be added.
 */
lighter.addViews = function (item) {
	views.push(item);
};

/**
 * Swap out the app server for a different one (like Express).
 */
lighter.setApp = function (value) {
	app = value;
};

/**
 * Set the port to be used for HTTP.
 */
lighter.setHttpPort = function (value) {
	httpPort = value;
};

/**
 * Set the port to be used for HTTPS.
 */
lighter.setHttpsPort = function (value) {
	httpsPort = value;
};

/**
 * Ascii art to be shown on startup.
 */
var art = ['',
	'     .A.     '.red,
	'    /@@@\\    '.red,
	'  ./@@'.red + 'A'.yellow + '@@\\.  '.red,
	' /@@'.red + '/@@@\\'.yellow + '@@\\ '.red,
	'/@@'.red + '/@@'.yellow + 'A'.white + '@@\\'.yellow + '@@\\'.red,
	'#@@'.red + '#@'.yellow + '/@\\'.white + '@#'.yellow + '@@#'.red,
	'#@@'.red + '#@'.yellow + '@@@'.white + '@#'.yellow + '@@#'.red,
	'"#@@'.red + '\\@@@/'.yellow + '@@#"'.red,
	' \'"#######"\' '.red,
	''];

log(art.join('\n'));

/**
 * Initialize the framework after the calling module has had a chance to
 * add assets and modify defaults using the API.
 */
setImmediate(function () {

	// Mitigate circular dependency.
	var App = require('./lib/App');

	if (!(httpsKey && httpsCert)) {
		httpsPort = null;
	}
	app = app || new App();
	app.listen(httpPort, httpsPort);
	log('App listening at ' + httpPort + (httpsPort ? ' and ' + httpsPort : '') + '.');

	chug.setApp(app);
	chug.enableShrinking();

	controllers.push('controllers');
	controllers = chug(controllers).require(function (Controller) {
		var controller = new Controller();
		var path = rewritePath(this.location.substr(cwd.length + 12).replace(/(|[_]?[cC]ontroller)\.[a-z]+$/, ''));
		for (var property in controller) {
			if (typeof controller[property] == 'function') {
				(function (action) {
					if (/(GET|PUT|POST|DELETE)/.test(action.name)) {
						var url = path + (property == 'index' ? '' : '/' + rewritePath(property));
						var methods = action.name.match(/(GET|PUT|POST|DELETE)/g);
						methods.forEach(function (method) {
							method = method.toLowerCase();
							app[method](url, function () {
								action.apply(controller, arguments);
							});
						});
					}
				})(controller[property]);
			}
		}
	});

	publics.push('public');
	publics = chug(publics).compile().route().watch();

	views.push('views');
	views = chug(views).compile().watch();

	scripts.push('scripts');
	scripts = chug(scripts).compile().watch().concat('/all.js').route();

	styles.push('styles');
	styles = chug(styles).compile().watch().concat('/all.css').route();

	chug.onceReady(function () {
		console.log('Assets loaded.');
		if (process.env.NODE_ENV != 'dev') {
			views.minify();
			scripts.minify();
			styles.minify();
			chug.onceReady(function () {
				console.log('Assets minified.');
			});
		}
	});
});
