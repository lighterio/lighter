// Core dependencies.
var fs = require('fs');
var os = require('os');
var cluster = require('cluster');

// Package dependencies.
var colors = require('colors');
var chip = require('chip');

// Module dependencies.
var Class = require('./Class');

// Decorate the Object prototype with some helpful methods.
require('./decorations/object');

/**
 * An App is an application that uses the lighter framework.
 *
 * The Lighter API returns a new app:
 *
 * ```javascript
 * var app = require('lighter')(options);
 * ```
 */
module.exports = Class.extend({

  init: function init(options) {

    var app = this;
    var env = process.env.NODE_ENV || 'prod';

    app.config = {
      env: env,
      dir: process.cwd(),
      server: null,
      hostName: '127.0.0.1',
      httpPort: 8888,
      dbs: {},
      httpsPort: null,
      httpsKey: null,
      httpsCert: null,
      controllers: ['controllers'],
      publics: ['public'],
      scripts: {'/all.js': ['scripts']},
      styles: {'/all.css': ['styles']},
      views: ['views'],
      logger: null,
      logLevel: (env == 'prod' ? 'info' : 'trace'),
      asciiArt: ['',
        '     .A.     '.red.bold + ("  _    _       _     _      v" + require('../package.json').version).grey,
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
      enableSplode: true,
      enableCluster: (env != 'dev'),
      formatControllerPath: function (path) { return path; }
    };

    // Override the default config with the options argument.
    app.decorateConfig(options, 'option');

    // Override the default config and options with overrides.json content.
    app.decorateConfig(app.requireJson('overrides'), 'overrides');

    // Set up logging.
    app.initLogger();

    // Enable uncaughtException handling.
    app.initSplode();

    // Assume this process will serve.
    var isServer = true;

    // Only show the welcome message from one process.
    if (cluster.isMaster) {
      app.welcome();

      // If clustering, the master should fork, not serve.
      if (app.config.enableCluster) {
        var isServer = false;
        app.fork();
      }
    }

    // If this process is meant to serve, start the server.
    if (isServer) {
      app.serve();

      // Load assets and such.
      if (app.config.enableChug) {
        app.initChug();
      }
    }
  },

  requireJson: function requireJson(path) {
    var app = this;
    try {
      var json = require(app.config.dir + '/' + path);
      return json;
    }
    catch (e) {
      return {};
    }
  },

  decorateConfig: function decorateConfig(decorations, type) {
    var app = this;
    Object.each(decorations, function decorateConfigKey(key, value) {
      if (typeof app.config[key] == 'undefined') {
        console.error('Unknown Lighter ' + type + ': "' + key + '".');
      }
      else {
        app.config[key] = decorations[key];
      }
    });
  },

  initLogger: function initLogger() {
    var app = this;
    app.logger = app.config.logger || chip('console');
    if (app.logger.setLevel) {
      app.logger.setLevel(app.config.logLevel);
    }
  },

  initSplode: function initSplode() {
    var app = this;
    if (app.config.enableSplode) {
      var splode = require('splode');
      splode.setLogger(app.logger);
    }
  },

  welcome: function welcome() {
    var app = this;
    var appName = '';
    var asciiArt = app.config.asciiArt;
    var hostName = app.config.hostName;
    var httpPort = app.config.httpPort;
    var httpsPort = app.config.httpsPort;

    var json = app.requireJson('package');
    if (json.name) {
      appName += json.name;
    }
    if (json.version) {
      appName += ' v' + json.version;
    }

    var line = asciiArt.length - 3;
    asciiArt[line++] += 'App: '.grey + appName;

    if (httpPort || httpsPort) {
      asciiArt[line] += 'URL: '.grey;
    }
    if (httpPort) {
      asciiArt[line] += 'http://' + hostName + ':' + httpPort + '/';
    }
    if (httpPort && httpsPort) {
      asciiArt[line] += ' or ';
    }
    if (httpsPort) {
      asciiArt[line] += 'https://' + hostName + ':' + httpsPort + '/';
    }
    console.log(asciiArt.join('\n'));
  },

  fork: function fork() {
    var app = this;
    os.cpus().forEach(function () {
      cluster.fork();
    });
    // When a worker dies unexpectedly, kill the master.
    cluster.on('exit', function (worker, code, signal) {
      app.logger.error('Worker ' + worker.process.pid + ' died. Killing master.');
      process.exit();
    });
  },

  serve: function serve() {
    var app = this;

    app.server = app.config.server || require('za')();
    app.server.listen(app.config.httpPort, app.config.httpsPort);

  },

  chugBeams: function chugBeams() {
    var app = this;
    app.beams = require('beams');
    app.beams.setServer(app.server);

    var allScripts = app.config.scripts['/all.js'] = app.config.scripts['/all.js'] || [];
    allScripts.push('node_modules/lighter/node_modules/jymin/jymin.js');
    allScripts.push('node_modules/lighter/node_modules/beams/scripts/beams-jymin.js');

    // Allow Chug to watch for changes.
    if (app.config.env == 'dev') {
      allScripts.push('node_modules/lighter/scripts/lighter-beams.js');
      app.chug.onReady(function () {
        app.beams.emit('chug:change', 'ready');
      });
    }
  },

  initChug: function initChug() {
    var app = this;

    // Pass the lighter server to Chug so it can route static assets.
    app.chug = require('chug');
    app.chug.setServer(app.server);
    app.chug.enableShrinking();

    if (app.config.enableBeams) {
      app.chugBeams();
    }

    app.controllers = app.chug(app.config.controllers)
      .require(function (Controller) {
        var controller = new Controller();
        var path = this.location
          .substr(app.config.dir.length + 12)
          .replace(/(|[iI]ndex)(|_?[cC]ontroller)\.[a-z]+$/, '');
        for (var property in controller) {
          if (typeof controller[property] == 'function') {
            (function (action) {
              if (/(GET|PUT|POST|DELETE)/.test(action.name)) {
                var url = path + (property == 'index' ? '' : '/' + property);
                if (typeof app.config.formatControllerPath == 'function') {
                  url = app.config.formatControllerPath(url);
                }
                var methods = action.name.match(/(GET|PUT|POST|DELETE)/g);
                methods.forEach(function (method) {
                  method = method.toLowerCase();
                  app.server[method](url, function () {
                    action.apply(controller, arguments);
                  });
                });
              }
            })(controller[property]);
          }
        }
      });
    verbosify(app.controllers, "Controller");

    app.publics = app.chug(app.config.publics).compile().route().watch();
    verbosify(app.publics, "Public file");

    app.views = app.chug(app.config.views).compile().watch();
    verbosify(app.views, "View");

    var types = {scripts: 'Script', styles: 'Style'};
    for (var key in types) {
      var singular = types[key];
      var resources = app.config[key];
      var loads = app[key] = {};
      for (var url in resources) {
        var files = resources[url];
        var load = app.chug(files).compile().watch();
        loads[url] = load.concat(url).route();
        verbosify(load, singular, url);
      }
    }

    app.chug.onceReady(function () {

      app.views.assets.forEach(function (asset) {
        var name = asset.location.replace(/(^.*\/views\/|\.[a-z]+$)/g, '');
        app.views[name] = asset;
      });

      if (app.config.env == 'dev') {

        // Watch server directories that aren't already being watched.
        watchAndExit(app.config.dir, /^(\..*|controllers|coverage|node_modules|public|scripts|styles|test|views)$/);

        // Watch lighter for now, for framework development.
        watchAndExit(app.config.dir + '/node_modules/lighter', /^node_modules$/);

      }
      else {
        app.logger.warn("Blocking while loading assets... " + "(to disable, run with \"NODE_ENV=dev node server\")".grey);
        app.views.minify();
        [app.scripts, app.styles].forEach(function (loads) {
          for (var url in loads) {
            loads[url].minify();
          }
        });
        app.chug.onceReady(function () {
          app.logger.info("Views, scripts and styles minified.");
        });

      }

    });

    // TODO: Once we're using bunyan or something, make these go in as verbose logs?
    function verbosify(load, singular, url) {
      load
        .onceReady(function () {
          app.logger.info(singular + "s " + (url ? 'routed to "' + url + '"' : "loaded") + ". " + ("x" + load.assets.length).grey);
        })
        .watch(function () {
          app.logger.info(singular + "s reloaded.");
        });
    }

    // TODO: Maybe move this to Chug and implement Windows-compatible watching there.
    var watchCount = 0;
    function watchAndExit(dir, ignorePattern) {
      try {
        watchCount++;
        if (watchCount < 4e2) {
          fs.watch(dir, function () {
            app.logger.info("Exiting due to core file change.");
            app.logger.info("To run indefinitely, use:\n  " + '"while true; do NODE_ENV=dev node server; done"');
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

    app.dbs = {};
    for (var dbKey in app.config.dbs) {
        var Database = require('sequelize');
        var db = app.config.dbs[dbKey];
        db = new Database(
          db.name || dbKey,
          db.user,
          db.pass,
          {
            dialect: db.type || 'mysql',
            host: db.host || '127.0.0.1',
            port: db.port,
            logging: app.logger.trace
          }
        );
        db
          .authenticate()
          .complete(function (err) {
            if (!!err) {
              app.logger.error('Unable to connect to db: "' + dbKey + '"');
            } else {
              app.logger.info('Connected to db: "' + dbKey + '"');
            }
          });
        app.dbs[dbKey] = db;

        // Expose the first database as "db".
        if (!app.db) {
          app.db = db;
        }
    }
  }

});
