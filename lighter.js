var fs = require('fs');
var colors = require('colors');
var chip = require('chip');
var cwd = process.cwd();

/**
 * Start a Lighter server with some options.
 */
var lighter = module.exports = function (options) {

	var settings = lighter.settings = {
		env: process.env.NODE_ENV || 'prod',
		dir: cwd,
		server: null,
		hostName: '127.0.0.1',
		httpPort: 8888,
		httpsPort: null,
		httpsKey: null,
		httpsCert: null,
		controllers: ['controllers'],
		publics: ['public'],
		scripts: {'/all.js': ['scripts']},
		styles: {'/all.css': ['styles']},
		views: ['views'],
		logger: null,
		asciiArt: ['',
			'     .A.     '.red.bold + ("  _    _       _     _      v" + lighter.version).grey,
			'    /@@@\\    '.red.bold + " | |  (_) __ _| |__ | |_ ___ _ __".grey.bold,
			'  ./@@'.red.bold + 'A'.yellow.bold + '@@\\.  '.red.bold + " | |  | |/ _` | '_ \\| __/ _ \\ '__|".grey.bold,
			' /@@'.red.bold + '/@@@\\'.yellow.bold + '@@\\ '.red.bold + " | |__| | (_| | | | | ||  __/ |".grey.bold,
			'/@@'.red.bold + '/@@'.yellow.bold + 'A'.white.bold + '@@\\'.yellow.bold + '@@\\'.red.bold + " |____|_|\\__, |_| |_|\\__\\___|_|".grey.bold,
			'#@@'.red.bold + '#@'.yellow.bold + '/@\\'.white.bold + '@#'.yellow.bold + '@@#'.red.bold + "          |___/".grey.bold,
			'#@@'.red.bold + '#@'.yellow.bold + '@@@'.white.bold + '@#'.yellow.bold + '@@#  '.red.bold,
			'"#@@'.red.bold + '\\@@@/'.yellow.bold + '@@#"  '.red.bold,
			' \'"#######"\'   '.red.bold,
			''],
		enableChug: true,
		enableBeams: true,
		rewriteControllerPath: false
	};

	for (var key in options) {
		if (typeof settings[key] == 'undefined') {
			console.error('Unknown Lighter option: "' + key + '".');
		}
		else {
			settings[key] = options[key];
		}
	}
	options = null;

	var log = lighter.logger = settings.logger || chip('console');
	lighter.env = settings.env;

	if (settings.dir != cwd) {
		cwd = settings.dir;
	}

	if (settings.server) {
		lighter.server = settings.server;
	} else {
		var Server = require('./lib/Server')
		lighter.server = new Server();
		require('./lib/http');
	}
	lighter.server.listen(settings.httpPort, settings.httpsPort);

	// Announce the server.
	var serverName;
	var asciiArt = settings.asciiArt;
	var hostName = settings.hostName;
	var httpPort = settings.httpPort;
	var httpsPort = settings.httpsPort;
	try {
		var json = require(cwd + '/package.json');
		serverName = json.name + ' v' + json.version;
	}
	catch (e) {
		throw 'A package.json must exist in the directory Lighter is called from.';
	}
	asciiArt[asciiArt.length - 3] += 'server: '.grey + serverName;
	if (httpPort || httpsPort) {
		asciiArt[asciiArt.length - 2] += 'URL: '.grey;
	}
	if (httpPort) {
		asciiArt[asciiArt.length - 2] += 'http://' + hostName + ':' + httpPort + '/';
	}
	if (httpPort && httpsPort) {
		asciiArt[asciiArt.length - 2] += ' or ';
	}
	if (httpsPort) {
		asciiArt[asciiArt.length - 2] += 'https://' + hostName + ':' + httpsPort + '/';
	}
	console.log(asciiArt.join('\n'));


	if (settings.enableChug) {

		// Pass the lighter server to Chug so it can route static assets.
		lighter.chug = require('chug');
		lighter.chug.setServer(lighter.server);
		lighter.chug.enableShrinking();

		if (settings.enableBeams) {

			var allScripts = settings.scripts['/all.js'] = settings.scripts['/all.js'] || [];
			allScripts.push('node_modules/lighter/node_modules/jymin/jymin.js');

			lighter.beams = require('beams');
			lighter.beams.setServer(lighter.server);
			allScripts.push('node_modules/lighter/node_modules/beams/scripts/beams-jymin.js');

			// Allow Chug to watch for changes.
			if (lighter.env == 'dev') {
				allScripts.push('node_modules/lighter/scripts/lighter-beams.js');
				lighter.chug.onReady(function () {
					lighter.beams.emit('chug:change', 'ready');
				});
			}
		}

		lighter.controllers = lighter.chug(settings.controllers).require(function (Controller) {
			var controller = new Controller();
			var path = this.location.substr(cwd.length + 12).replace(/(|[iI]ndex)(|_?[cC]ontroller)\.[a-z]+$/, '');
			for (var property in controller) {
				if (typeof controller[property] == 'function') {
					(function (action) {
						if (/(GET|PUT|POST|DELETE)/.test(action.name)) {
							var url = path + (property == 'index' ? '' : '/' + property);
							if (typeof settings.rewriteControllerPath == 'function') {
								url = settings.rewriteControllerPath(url);
							}
							var methods = action.name.match(/(GET|PUT|POST|DELETE)/g);
							methods.forEach(function (method) {
								method = method.toLowerCase();
								lighter.server[method](url, function () {
									action.serverly(controller, arguments);
								});
							});
						}
					})(controller[property]);
				}
			}
		});
		verbosify(lighter.controllers, "Controller");

		lighter.publics = lighter.chug(settings.publics).compile().route().watch();
		verbosify(lighter.publics, "Public file");

		lighter.views = lighter.chug(settings.views).compile().watch();
		verbosify(lighter.views, "View");

		var types = {scripts: 'Script', styles: 'Style'};
		for (var key in types) {
			var singular = types[key];
			var setting = settings[key];
			var loads = lighter[key] = {};
			for (var url in setting) {
				var files = setting[url];
				var load = lighter.chug(files).compile().watch();
				loads[url] = load.concat(url).route();
				verbosify(load, singular, url);
			}
		}

		lighter.chug.onceReady(function () {

			lighter.views.assets.forEach(function (asset) {
				var name = asset.location.replace(/(^.*\/views\/|\.[a-z]+$)/g, '');
				lighter.views[name] = asset;
			});

			if (lighter.env == 'dev') {

				// Watch server directories that aren't already being watched.
				watchAndExit(cwd, /^(\..*|controllers|coverage|node_modules|public|scripts|styles|test|views)$/);

				// For lighter development (for now, for framework development).
				watchAndExit(cwd + '/node_modules/lighter', /^node_modules$/);

			}
			else {
				log.info("Minifying assets... " + "(to disable, run with \"NODE_ENV=dev node server\")".grey);
				lighter.views.minify();
				[lighter.scripts, lighter.styles].forEach(function (loads) {
					for (var url in loads) {
						loads[url].minify();
					}
				});
				lighter.chug.onceReady(function () {
					log.info("Views, scripts and styles minified.");
				});

			}

		});

		// TODO: Once we're using bunyan or something, make these go in as verbose logs?
		function verbosify(load, singular, url) {
			load
				.onceReady(function () {
					log.info(singular + "s " + (url ? 'routed to "' + url + '"' : "loaded") + ". " + ("x" + load.assets.length).grey);
				})
				.watch(function () {
					log.info(singular + "s reloaded.");
				});
		}

		// TODO: Maybe move this to Chug and implement Windows-compatible watching there.
		var watchCount = 0;
		function watchAndExit(dir, ignorePattern) {
			try {
				watchCount++;
				if (watchCount < 4e2) {
					fs.watch(dir, function () {
						log.info("Exiting due to core file change.");
						log.info("To run indefinitely, use:\n  " + '"while true; do NODE_ENV=dev node server; done"');
						process.exit();
					});
				}
			}
			catch (e) {
				// Fail silently for now.
				// fs.watch is not stable, particularly on Mac OS.
			}
			fs.readdir(dir, function (err, files) {
				if (err) {
					// If we can't watch this dir, it probably doesn't matter.
					return;
				}
				files.forEach(function (file) {
					if (!ignorePattern.test(file)) {
						var path = dir + '/' + file;
						fs.stat(path, function (err, stat) {
							if (stat.isDirectory()) {
								watchAndExit(path, ignorePattern);
							}
						});
					}
				});
			});
		}
	}
};

/**
 * Expose the version to module users.
 */
lighter.version = require('./package.json').version;
