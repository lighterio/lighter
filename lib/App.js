// Core dependencies.
var fs = require('fs');
var os = require('os');
var cluster = require('cluster');

// Module dependencies.
var mc = require('mc');

// TODO: Determine whether this works on more than just Mac OS.
var bold = '\u001b[1m';
var normal = '\u001b[22m';
var base = '\u001b[39m';
var grey = '\u001b[90m';
var red = '\u001b[31m';
var yellow = '\u001b[33m';
var white = '\u001b[37m';
var cyan = '\u001b[36m';

// Internal dependencies.
var Class = require('./Class');

// Decorate http request and response prototypes.
require('./http');

var camel = function (string) {
  return string[0].toUpperCase() + string.substr(1);
};

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

    // Expect one of "debug", "dev", "test", "stage", "new", "canary", "prod".
    var env = process.env.NODE_ENV || 'prod';

    // TODO: Determine whether we can
    process.lighterApp = app;

    app.config = {
      env: env,
      dir: process.cwd(),
      server: null,
      hostName: '127.0.0.1',
      httpPort: 8888,
      decorateContext: null,
      orm: require('ormy'),
      dbs: {},
      dbTableFormat: 'underscored',
      dbFieldFormat: 'underscored',
      httpsPort: null,
      httpsKey: null,
      httpsCert: null,
      models: ['models'],
      views: ['views'],
      controllers: ['controllers'],
      publics: ['public'],
      scripts: {'/a.js': ['scripts']},
      styles: {'/a.css': ['styles']},
      cache: null,
      logger: null,
      logLevel: ((env == 'canary' || env == 'prod') ? 'info' : 'debug'),
      asciiArt: null,
      cullEnv: true,
      enableCache: true,
      enableChug: true,
      enableD6: true,
      enableBeams: true,
      enableSplode: true,
      enableCluster: (env[0] != 'd'),
      exposeGlobals: true,
      watchBeams: false,
      watchCedar: false,
      watchChug: false,
      watchD6: false,
      watchJymin: false,
      watchLighter: false,
      watchLtl: false,
      watchOrmy: false,
      watchSplode: false,
      watchZa: false,
      watchIgnorePattern: /^(\..*|controllers|coverage|node_modules|public|scripts|styles|test|uploads|views)$/,
      refreshIgnorePattern: /\/(uploads)\//
    };

    // Initialize app-dependent components from a app delegate
    if (options.onInit && typeof options.onInit === 'function') {
      options.onInit.call(null, app);
    }

    var onReady = options.onReady;

    // delete onInit and onReady from an options before hitting decoreateConfig
    delete options.onInit;
    delete options.onReady;

    // Override the default config with the options argument.
    app.decorateConfig(options, 'option');

    // Override the default config and options with overrides.json content.
    app.decorateConfig(app.requireJson('overrides'), 'overrides');

    // If the environment is "dev" or "debug", we're in delopment mode.
    app.isDev = (app.config.env[0] == 'd');

    // Set up logging.
    app.initLogger();

    // Set up global variables if globalize is on.
    if (app.config.exposeGlobals) {
      app.initGlobals();
    }

    // Enable uncaughtException handling.
    app.initSplode();

    // Assume this process will serve.
    var isServer = true;

    // Only show the welcome message from one process.
    if (cluster.isMaster) {
      app.welcome();

      // If clustering, the master should fork, not serve.
      if (app.config.enableCluster) {
        isServer = false;
        app.fork();
      }
    }

    // Expose methods that can make all workers or one worker perform a task.
    app.work = app.one = function () {};

    // If this process is meant to serve, start the server.
    if (isServer) {

      app.work = function (callback) {
        if (isServer) {
          callback();
        }
      };

      app.one = function (callback) {
        if (cluster.isMaster || (cluster.worker.id == 1)) {
          callback();
        }
      };

      app.serve();

      // Load assets and such.
      if (app.config.enableChug) {
        app.initChug();
      }

      if (app.config.enableCache) {
        app.initCache();
      }
    }

    // Decorate server forks Za/Express methods.
    ['use', 'get', 'post'].forEach(function (methodName) {
      app[methodName] = isServer ?
        function () {
          app.server[methodName].apply(app.server, arguments);
        }
        : function () {};
    });

    // Any decoration after server initialize
    if (onReady && typeof onReady === 'function') {
      onReady.call(null, app);
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
    for (var key in decorations) {
      if (typeof app.config[key] == 'undefined') {
        console.error('Unknown Lighter ' + type + ': "' + key + '".');
      }
      else {
        app.config[key] = decorations[key];
      }
    }
  },

  initLogger: function initLogger() {
    var app = this;
    app.logger = app.config.logger;
    if (!app.logger) {
      app.usingDefaultLogger = true;
      app.logger = require('cedar')('console');
    }
    if (app.logger.setLevel) {
      app.logger.setLevel(app.config.logLevel);
    }
  },

  initCache: function initCache() {
    var app = this;

    // A cache can be passed in, and if it exposes .get, use it.
    var cache = app.cache = app.config.cache || {};

    // If it doesn't expose .get, connect to memcache with mc.
    if (!cache.get) {

      // Expose a queue pusher until the client connects.
      var queue = [];
      app.cache = {
        get: function() { queue.push(['get', arguments]); },
        set: function() { queue.push(['set', arguments]); },
        cas: function() { queue.push(['cas', arguments]); },
        find: function() { queue.push(['find', arguments]); },
        gets: function() { queue.push(['gets', arguments]); },
        incr: function() { queue.push(['incr', arguments]); },
        decr: function() { queue.push(['decr', arguments]); },
        stats: function() { queue.push(['stats', arguments]); },
        version: function() { queue.push(['version', arguments]); },
        setAdapter: function() { queue.push(['setAdapter', arguments]); }
      };

      var client = new mc.Client(cache.servers, cache.adapter, cache.strategy);
      client.connect(function (err) {
        if (err) {
          app.logger.error('[Lighter] Failed to connect to memcache.');
        }
        else {
          app.logger.info('[Lighter] Connected to memcache.');

          // Monkey-patch the get method to get and return a single item.
          // The mc module is awesome, but cache.get should work like others.
          client.find = client.get;
          client.get = function (key, callback) {
            this.find(key, function (err, object) {
              callback(err, object ? object[key] : object);
            });
          };

          // Replace the queue pusher with the actual client.
          app.cache = client;

          // Execute any calls that the queue pusher received.
          queue.forEach(function (pair) {
            client[pair[0]].apply(client, pair[1]);
          });
        }
      });
    }
  },

  initGlobals: function initLogger() {
    var app = this;
    global.app = app;
    global.log = app.logger;
    global.Class = require('./Class');
    global.Model = require('./Model');
    global.Controller = require('./Controller');
  },

  initSplode: function initSplode() {
    var app = this;
    if (app.config.enableSplode) {
      var splode = require('splode');
      splode.setLogger(app.logger);

      splode.listen(function (error) {
        if (/Can't set headers after they are sent./.test(error.message)) {
          splode.recover();
        }
      });
    }
  },

  welcome: function welcome() {
    var app = this;

    var art = app.config.asciiArt || ['',
      red + bold + '     .A.     ' + grey + ("  _    _       _     _     " + normal + "v" + require('../package.json').version),
      red + bold + '    /@@@\\    ' + grey + " | |  (_) __ _| |__ | |_ ___ _ __",
      red + '  ./@@' + yellow + 'A' + red + '@@\\.  ' + grey + " | |  | |/ _` | '_ \\| __/ _ \\ '__|",
      red + ' /@@' + yellow + '/@@@\\' + red + '@@\\ ' + grey + " | |__| | (_| | | | | ||  __/ |",
      red + '/@@' + yellow + '/@@' + white + 'A' + yellow + '@@\\' + red + '@@\\' + grey + " |____|_|\\__, |_| |_|\\__\\___|_|",
      red + '#@@' + yellow + '#@' + white + '/@\\' + yellow + '@#' + red + '@@#' + grey + "          |___/",
      red + '#@@' + yellow + '#@' + white + '@@@' + yellow + '@#' + red + '@@#  ',
      '"#@@' + yellow + '\\@@@/' + red + '@@#"  ' + normal,
      red + bold + ' \'"#######"\'   ' + normal,
      ''];

    var hostName = app.config.hostName;
    var httpPort = app.config.httpPort;
    var httpsPort = app.config.httpsPort;
    var appName = '';

    var json = app.requireJson('package');
    if (json.name) {
      appName += json.name;
    }
    if (json.version) {
      appName += ' v' + json.version;
    }

    var line = art.length - 3;
    art[line++] += grey + 'App: ' + base + appName + ' ' + app.config.env;

    if (httpPort || httpsPort) {
      art[line] += grey + 'URL: ' + base;
    }
    if (httpPort) {
      art[line] += cyan + 'http://' + hostName + ':' + httpPort + '/' + base;
    }
    if (httpPort && httpsPort) {
      art[line] += ' or ';
    }
    if (httpsPort) {
      art[line] += blue + 'https://' + hostName + ':' + httpsPort + '/' + base;
    }
    console.log(art.join('\n'));
  },

  fork: function fork() {
    var app = this;
    os.cpus().forEach(function () {
      cluster.fork();
    });
    // When a worker dies unexpectedly, kill the master.
    cluster.on('exit', function (worker, code, signal) {
      app.logger.error('Worker ' + worker.process.pid + ' died.');
      app.logger.warn('Exiting master.');
      process.exit();
    });
  },

  serve: function serve() {
    var app = this;
    app.server = app.config.server || require('za')();
    app.server.listen(app.config.httpPort, app.config.httpsPort);

    // Decorate the app with some Za/Express methods.
    ['use', 'get', 'post'].forEach(function (methodName) {
      app[methodName] = function () {
        app.server[methodName].apply(app.server, arguments);
      };
    });

    // Za allows us to inject the app.
    if (app.server.setApp) {
      app.server.setApp(app);
    }
    app.server._cacheBust = app.server._cacheBust || (new Date()).getTime();
    app.decorateContext = app.config.decorateContext || function (context) {
      // Allow far-future expires header on assets.
      context.cacheBust = app.server._cacheBust;

      if (app.isDev) {
        var getTags = function (load) {
          var tags = load.sourceLoad.getTags();
          return tags.replace(/">/g, '?v=' + app.server._cacheBust + '">');
        };
        context.scriptTags = getTags(app.scripts['/a.js']);
        context.styleTags = getTags(app.styles['/a.css']);
      }
    };
  },

  initChug: function initChug() {
    var app = this;
    app.autoScripts = [];

    // Pass the lighter server to Chug so it can route static assets.
    app.chug = require('chug');
    app.chug.setServer(app.server);
    app.chug.enableShrinking();

    // By default, cull code down to what's offered in the current environment.
    if (app.config.cullEnv === true) {
      app.config.cullEnv = app.config.env;
    }

    ['models', 'controllers'].forEach(function (key) {
      var Parent = require('./' + camel(key).substr(0, key.length - 1));
      var namePattern = /^.*[\\\/]([^\\\/]+)\.[^\\\/]+$/;
      var load = app[key] = app.chug(app.config[key])
        .require(function (Class) {
          if (!Class.extend) {
            Class = this.module = Parent.extend(Class);
          }
          Class.instance = new Class(app, this);
          this.location.replace();
        })
        .each(function registerClass(asset) {
          var instance = asset.module.instance;
          var name = asset.location.replace(namePattern, '$1');
          instance.className = name;
          if (load[name]) {
            //log.warn("[Lighter] Cannot set " + name + " " + key + " reference - app." + key + "." + name + " already exists.");
          }
          else {
            load[name] = instance;
          }
          if (app.config.exposeGlobals) {
            if (global[name]) {
              //log.warn("[Lighter] Cannot set " + name + " globally because it already exists.");
            }
            else {
              global[name] = instance;
            }
          }
        });
      app.logWhenLoadIsFinished(load, key);
    });

    ['publics', 'views'].forEach(function (dir) {
      var load = app[dir] = app.chug(app.config[dir]);
      load.cull('env', app.config.cullEnv);
      if (dir == 'publics') {
        load.route();
      }
      else {
        var options = {enableDebug: app.isDev};
        load.compile(options);
      }
      load.watch();
      app.logWhenLoadIsFinished(app[dir], dir);
    });

    if (app.config.enableBeams) {
      app.initBeams();
    }
    if (app.config.enableD6) {
      app.initD6();
    }

    var configScripts = app.config.scripts;
    var autoScripts = configScripts['/a.js'] || [];
    autoScripts.forEach(function (script) {
      app.autoScripts.push(script);
    });
    configScripts['/a.js'] = app.autoScripts;

    ['scripts', 'styles'].forEach(function (dir) {
      var resources = app.config[dir];
      var loads = app[dir] = {};
      for (var url in resources) {
        var files = resources[url];
        var load = app.chug(files)
          .cull('env', app.config.cullEnv)
          .compile()
          .watch();
        // In dev environments, route the individual files.
        if (app.isDev) {
          load.route();
        }
        loads[url] = load.concat(url).route();
        app.logWhenLoadIsFinished(loads[url], dir, url);
      }
    });

    app.chug.onceReady(function () {

      // If we're not in a development environment, switch to file logging.
      if (app.isDev && app.usingDefaultLogger) {
        app.logger = require('cedar')('file');
      }

      [app.models, app.controllers].forEach(function (collection) {
        collection.each(function callReady(asset) {
          var instance = asset.module.instance;
          if (instance.onReady) {
            setImmediate(function () {
              instance.onReady(app);
            });
          }
        });
      });

      app.views.assets.forEach(function (asset) {
        var name = asset.location.replace(/(^.*\/views\/|\.[a-z]+$)/g, '');
        app.views[name] = asset;
      });

      if (app.isDev) {

        // Watch server directories that aren't already being watched or ignored.
        app.watchAndExit('.', app.config.watchIgnorePattern);

        // Watch Lighter and some of its sub-projects if you want.
        var ignorePattern = /^(\..*|coverage|node_modules)$/;
        if (app.config.watchLighter) {
          app.watchAndExit('./node_modules/lighter', ignorePattern);
        }
        var projects = ['Beams', 'Cedar', 'Chug', 'D6', 'Jymin', 'Ltl', 'Ormy', 'Splode', 'Za'];
        projects.forEach(function (name) {
          if (app.config['watch' + name]) {
            var dir = './node_modules/lighter/node_modules/' + name.toLowerCase();
            app.watchAndExit(dir, ignorePattern);
          }
        });

      }
      else if (app.config.env != 'test') {
        app.logger.warn("[Lighter] Minifying assets... ");
        app.views.minify();
        [app.scripts, app.styles].forEach(function (loads) {
          for (var url in loads) {
            loads[url].wrap().minify().gzip().route();
          }
        });
        app.chug.onceReady(function () {
          app.logger.info("[Lighter] Views, scripts and styles minified.");
        });

      }

    });

    app.dbs = {};
    for (var dbKey in app.config.dbs) {
      var dbConfig = app.config.dbs[dbKey];
      dbConfig.name = dbConfig.name || dbKey;
      dbConfig.logger = app.logger;
      var db = app.config.orm(dbConfig);
      app.dbs[dbKey] = db;
      // Expose the first (and possibly the only) database as "db".
      if (!app.db) {
        app.db = db;
      }
    }
  },

  initBeams: function chugBeams() {
    var app = this;
    app.initJymin();

    app.beams = require('beams');
    app.beams.setServer(app.server);

    app.autoScripts.push('node_modules/lighter/node_modules/beams/scripts/beams-jymin.js');

    // In dev mode, notify clients that we have restarted.
    if (app.isDev) {
      app.autoScripts.push('node_modules/lighter/scripts/lighter-beams.js');
      app.chug.onReady(function () {
        if (!app.config.refreshIgnorePattern.test(app.chug.changedLocation)) {
          app.beams.emit('chug:change', app.chug.changedLocation);
        }
      });
    }
  },

  initD6: function () {
    var app = this;
    app.initJymin();
    app.autoScripts.push('node_modules/lighter/node_modules/d6/scripts/d6-jymin.js');

    // Require d6 later so minification can begin before it uses chug.onReady.
    setImmediate(function () {
      require('d6')(app);
    });
  },

  initJymin: function () {
    var app = this;
    if (!app.config.hasJymin) {
      app.autoScripts.push('node_modules/lighter/node_modules/jymin/jymin.js');
      app.config.hasJymin = true;
    }
  },

  logWhenLoadIsFinished: function logWhenLoadIsFinished(load, type, url) {
    var app = this;
    type = camel(type);
    load
      .onceReady(function () {
        app.logger.info("[Lighter] " +
          type + " " + (url ? 'routed to "' + url + '"' : "loaded") + ". " +
          grey + "x" + load.assets.length + base);
      })
      .watch(function () {
        app.logger.info("[Lighter] " + type + " reloaded.");
        if (app.beams) {
          app.beams.emit('chug:change', 'ready');
        }
      });
  },

  // TODO: Maybe move this to Chug and implement Windows-compatible watching there.
  watchAndExit: function watchAndExit(dir, ignorePattern) {
    var watchCount = 0;
    try {
      watchCount++;
      if (watchCount < 2e2) {
        fs.watch(dir, function () {
          app.logger.warn("Exiting due to backend file change.");
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

});
