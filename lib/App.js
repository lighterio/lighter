var fs = require('fs');
var os = require('os');
var cluster = require('cluster');
var assert = require('assert');

var libDir = __dirname;
var lighterDir = libDir.replace(/\/lib$/, '');
var modulesDir = lighterDir + '/node_modules';
var lighter = require(lighterDir + '/lighter');
var Type = require(lighterDir + '/common/object/type');
var Emitter = require(lighterDir + '/common/event/emitter');
var Flagger = require(lighterDir + '/common/event/flagger');
var Model = require(libDir + '/Model');
var Controller = require(libDir + '/Controller');
require(libDir + '/Response');

var capitalize = function (word) {
  return word[0].toUpperCase() + word.substr(1);
};

var bold = '\u001b[1m';
var normal = '\u001b[22m';
var base = '\u001b[39m';
var grey = '\u001b[90m';
var red = '\u001b[31m';
var yellow = '\u001b[33m';
var white = '\u001b[37m';
var cyan = '\u001b[36m';
var green = '\u001b[32m';

var ipv4 = require(libDir + '/ipv4');
var env = process.env;

/**
 * An App is an application that uses the lighter framework.
 *
 * The Lighter API returns a new app:
 *
 * ```javascript
 * var app = require('lighter')(options);
 * ```
 */
module.exports = Type.extend({

  init: function (options) {

    var app = this;

    // Make the app into an event emitter.
    Flagger.decorate(app);

    // Expect one of: "debug", "dev", "test", "stage", "new", "beta", "canary", "prod".
    var nodeEnv = env.NODE_ENV || 'prod';

    // Load the default configuration which can be overriden with `configPath` contents.
    app.config = {
      env: nodeEnv,
      dir: process.cwd(),
      chdir: false,
      configPath: null,
      server: null,
      hostName: ipv4() || '127.0.0.1',
      httpPort: env.PORT || 8888,
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
      logger: [
        {transport: 'console', level: 'log', worker: 0},
        {transport: 'file', level: 'info', pattern: 'log/app_${YYYY}-${MM}-${DD}_${HOST}.log'}
      ],
      asciiArt: null,
      cullEnv: true,
      maxMiddlewareQueueSize: 1e3,
      enableCache: true,
      enableChug: true,
      enableD6: true,
      enableBeams: true,
      enableSplode: true,
      enableCluster: true,
      exposeGlobals: true,
      namespaceWarnings: false,
      watchIgnorePattern: /^(\..*|node_modules|controllers|models|public|scripts|styles|views|test|coverage|uploads|logs?|.*\.pid|.*\.swp)$/,
      refreshIgnorePattern: /[\/\\](uploads)[\/\\]/
    };

    // Initialize app-dependent components from an app delegate.
    if (options.onInit && typeof options.onInit === 'function') {
      options.onInit.call(null, app);
    }

    var onReady = options.onReady;

    // Delete onInit and onReady from the options before hitting `decorateConfig`.
    delete options.onInit;
    delete options.onReady;

    // Record the server start time.
    app.started = new Date();

    // Override the default config with the options argument.
    app.decorateConfig(options);

    // Override the default config and options with (e.g.) "config/${ENV}.json" content.
    var configPath = app.config.configPath || app.config.overridesPath;
    if (configPath) {
      configPath = configPath.replace(/\$\{ENV\}/g, app.config.env);
      app.decorateConfig(app.readJson(configPath));
    }

    // If running from another directory, you can enter the desired directory.
    if (app.config.chdir) {
      try {
        process.chdir(app.config.dir);
      }
      catch (error) {
        console.error('[Lighter] Failed to change directory to "' + app.config.dir + '".', error);
        process.exit();
      }
    }

    // Expose booleans that group environments together.
    app.isDev = /(dev|debug)/.test(app.config.env);
    app.isStage = /(test|stage|beta|new)/.test(app.config.env);
    app.isProd = /(canary|prod)/.test(app.config.env);

    // Set up logging.
    app.initLogger();

    // In dev mode, watch for IP address changes.
    if (app.isDev && (app.config.hostName == ipv4())) {
      app.watchIp();
    }

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

    // Any decoration after server initialize.
    if (onReady && typeof onReady === 'function') {
      onReady.call(null, app);
    }
  },

  /**
   * Require JSON from a file path.
   */
  readJson: function (path) {
    try {
      var json = fs.readFileSync(path);
      return JSON.parse(json);
    }
    catch (error) {
      setImmediate(function () {
        (app.logger || console).warn('[Lighter] Config file not found: "' + path + '".');
      });
      return {};
    }
  },

  /**
   * Decorate app.config with key-value pairs from another "decorations" object.
   */
  decorateConfig: function (decorations) {
    var app = this;
    for (var key in decorations) {
      var value = decorations[key];
      if (value !== undefined) {
        app.config[key] = decorations[key];
      }
    }
  },

  /**
   * Create a Cedar logger if the config is array-like.
   */
  initLogger: function () {
    var app = this;
    var logger = app.config.logger;
    if (logger instanceof Array) {
      logger = require(modulesDir + '/cedar/cedar')(logger);
    }
    else {
      try {
        assert(typeof logger.trace == 'function');
        assert(typeof logger.log == 'function');
        assert(typeof logger.info == 'function');
        assert(typeof logger.warn == 'function');
        assert(typeof logger.error == 'function');
      }
      catch (error) {
        console.error('[Lighter] Custom loggers must have ' +
          '"trace", "log", "info", "warn" and "error" methods.');
        process.exit();
      }
    }
    app.logger = logger;
  },

  /**
   * Watch for changes to the host IP (for dev boxes on WiFi).
   */
  watchIp: function () {
    setInterval(function () {
      var old = app.config.hostName;
      var ip = ipv4();
      if (ip != old) {
        app.config.hostName = ip;
        app.logger.info('[Lighter] Now serving at: ' + app.getUrl(true));
      }
    }, 1e3);
  },

  /**
   * Initialize the "mc" module as a memcache client.
   */
  initCache: function () {
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

      var mc = require(modulesDir + '/mc/lib/memcache-client');
      var client = new mc.Client(cache.servers, cache.adapter, cache.strategy);
      client.connect(function (error) {
        if (error) {
          app.logger.error('[Lighter] Failed to connect to memcache.', error);
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

  /**
   * If `exposeGlobals` is true, some objects get exposed globally.
   */
  initGlobals: function () {
    var app = this;
    global.app = app;
    global.config = app.config;
    global.log = app.logger;
    global.Type = Type;
    global.Emitter = Emitter;
    global.Flagger = Flagger;
    global.Model = require(libDir + '/Model');
    global.Controller = require(libDir + '/Controller');
    // app.db, app.dbs, and all Models and Controllers also get exposed.
  },

  initSplode: function () {
    var app = this;
    if (app.config.enableSplode) {
      var splode = app.splode = require(modulesDir + '/splode/splode');
      splode.setLogger(app.logger);

      splode.listen(function (error) {
        if (/Can't set headers after they are sent./.test(error.message)) {
          splode.recover();
        }
      });
    }
  },

  getUrl: function (colorize) {
    var app = this;
    var host = app.config.hostName;
    var parts = [];
    function push(protocol, port, standard) {
      if (port) {
        parts.push(
          (colorize ? cyan : '') +
          protocol + '//' + host + (port == standard ? '' : ':' + port) + '/' +
          (colorize ? base : '')
        );
      }
    }
    push('http:', app.config.httpPort, 80);
    push('https:', app.config.httpsPort, 443);
    return parts.join(' or ');
  },

  welcome: function () {
    var app = this;

    var art = app.config.asciiArt || ['',
      red + bold + '     .A.     ' + grey + ("   _    _       _     _     " + normal + "v" + lighter.version),
      red + bold + '    /@@@\\    ' + grey + "  | |  (_) __ _| |__ | |_ ___ _ __",
      red + '  ./@@' + yellow + 'A' + red + '@@\\.   ' + grey + " | |  | |/ _` | '_ \\| __/ _ \\ '__)",
      red + ' /@@' + yellow + '/@@@\\' + red + '@@\\  ' + grey + " | |__| | (_| | | | | ||  __/ |",
      red + '/@@' + yellow + '/@@' + white + 'A' + yellow + '@@\\' + red + '@@\\' + grey + "  |____|_|\\__, |_| |_|\\__\\___|_|",
      red + '#@@' + yellow + '#@' + white + '/@\\' + yellow + '@#' + red + '@@#' + grey + "           (___/",
      red + '#@@' + yellow + '#@' + white + '@@@' + yellow + '@#' + red + '@@#   ',
      '"#@@' + yellow + '\\@@@/' + red + '@@#"   ' + normal,
      red + bold + ' \'"#######"\'    ' + normal,
      '                ',
      ''];

    var appName = '';

    var json = app.readJson(app.config.dir + '/package.json');
    if (json.name) {
      appName += json.name;
    }
    if (json.version) {
      appName += ' v' + json.version;
    }

    var line = art.length - 4;
    art[line++] += grey + 'App: ' + base + appName + ' ' + app.config.env;

    var url = app.getUrl(true);
    if (url) {
      art[line++] += grey + 'URL: ' + url;
    }
    art[line++] += grey + 'Now: ' + green + app.started + base;
    console.log(art.join('\n'));
  },

  fork: function () {
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

  /**
   * Set Lighter up to handle HTTP requests with Za (or a specified server).
   */
  serve: function () {
    var app = this;
    app.server = app.config.server || require(modulesDir + '/za/za')();
    app.server.listen({
      http: app.config.httpPort,
      https: app.config.httpsPort,
      ssl: {
        key: app.config.httpsKey,
        cert: app.config.httpsCert
      }
    });

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

    app.server._cacheBust = app.server._cacheBust || app.started.getTime();
    app.decorateContext = app.config.decorateContext || function (context) {
      // Allow far-future expires header on assets.
      context.cacheBust = app.server._cacheBust;

      // In dev mode, make it easier to debug individual files.
      if (app.isDev) {
        context.styleTags = app.styles['/a.css'].sourceLoad.getTags();
        context.scriptTags = app.scripts['/a.js'].sourceLoad.getTags();
      }
    };

    // Add a middleware to queue requests until the app is loaded.
    if (app.config.maxMiddlewareQueueSize && app.server.unuse && app.config.enableChug) {
      var queue = [];
      var queuer = function (request, response, next) {
        if (queue.length <= app.config.maxMiddlewareQueueSize) {
          app.logger.log('[Lighter] Queued a request: "' + request.url + '".');
          queue.push(next);
        }
        else {
          app.logger.error('[Lighter] Middleware queue size limit exceeded.');
        }
      };
      app.server.use(queuer);
      app.when('loaded', function () {
        app.server.unuse(queuer);
        var l = queue.length;
        if (l) {
          for (var i = 0; i < l; i++) {
            queue[i]();
          }
          app.logger.log('[Lighter] Handled ' + l + ' queued request' + (l > 1 ? 's' : '') + '.');
        }
        queue.length = 0;
      });
    }
  },

  initChug: function () {
    var app = this;
    app.autoScripts = [];

    // Pass the lighter server to Chug so it can route static assets.
    app.chug = require(modulesDir + '/chug/chug');
    app.chug.setServer(app.server);
    app.chug.enableShrinking();
    app.chug.setCompiler('ltl', modulesDir + '/ltl/ltl');

    // By default, cull code down to what's offered in the current environment.
    if (app.config.cullEnv === true) {
      app.config.cullEnv = app.config.env;
    }

    var constructors = {models: Model, controllers: Controller};
    ['models', 'controllers'].forEach(function (key) {
      var Constructor = constructors[key];
      var namePattern = /^.*[\/\\]([^\/\\]+)\.[^\/\\]+$/;
      var load = app[key] = app.chug(app.config[key])
        .require(function (Type) {
          if (!Type.extend) {
            Type = this.module = Constructor.extend(Type);
          }
          Type.instance = new Type(app, this);
        })
        .each(function registerType(asset) {
          var instance = asset.module.instance;
          var name = asset.location.replace(namePattern, '$1');
          instance.className = name;
          if (load[name]) {
            if (load[name].isReady && load[name].onUnload) {
              load[name].onUnload();
              load[name] = instance;
            }
            if (app.config.namespaceWarnings) {
              log.warn("[Lighter] Cannot set " + name + " " + key + " reference - app." + key + "." + name + " already exists.");
            }
          }
          else {
            load[name] = instance;
          }
          if (app.config.exposeGlobals) {
            if (global[name]) {
              if (app.config.namespaceWarnings) {
                log.warn("[Lighter] Cannot set " + name + " globally because it already exists.");
              }
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
      [app.models, app.controllers].forEach(function (collection) {
        collection.each(function callReady(asset) {
          var instance = asset.module.instance;
          if (instance.onReady) {
            instance.isReady = true;
            setImmediate(function () {
              instance.onReady(app);
            });
          }
        });
      });

      app.views.assets.forEach(function (asset) {
        var name = asset.location.replace(/(^.*[\/\\]views[\/\\]|\.[a-z]+$)/g, '');
        app.views[name] = asset;
      });

      // Signal that the app has loaded all of its assets.
      app.chug.onceReady(function () {
        app.setFlag('loaded');
      });

      if (app.isDev) {

        // Watch server directories that aren't already being watched or ignored.
        app.watchAndExit(app.config.dir, app.config.watchIgnorePattern);

        // Watch additional paths if specified.
        if (app.config.watchPaths) {
          app.config.watchPaths.forEach(function (path) {
            app.watchAndExit(path, app.config.watchIgnorePattern);
          });
        }

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

    // Allow databases to be exposed globally.
    if (app.config.exposeGlobals) {
      global.db = app.db;
      global.dbs = app.dbs;
    }
  },

  initBeams: function () {
    var app = this;
    app.initJymin();

    app.beams = require(modulesDir + '/beams/beams');
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
      require(modulesDir + '/d6/d6')(app);
    });
  },

  initJymin: function () {
    var app = this;
    if (!app.config.hasJymin) {
      app.autoScripts.push('node_modules/lighter/node_modules/jymin/jymin.js');
      app.autoScripts.push('node_modules/lighter/node_modules/jymin/plugins/ready.js');
      app.config.hasJymin = true;
    }
  },

  logWhenLoadIsFinished: function (load, type, url) {
    var app = this;
    type = capitalize(type);
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
  watchAndExit: function (dir, ignorePattern) {
    var watchCount = 0;
    if (++watchCount < 2e2) {
      try {
        fs.watch(dir, function (operation, filename) {
          if (!ignorePattern.test(filename)) {
            var path = dir + '/' + filename;
            app.logger.warn('[Lighter] Exiting due to file ' + operation + ' in "' + path + '".');
            process.exit();
          }
        });
      }
      catch (error) {
        app.logger.error('[Lighter] Failed to watch directory: "' + dir + '".', error);
        return;
      }
    }
    fs.readdir(dir, function (error, files) {
      if (error) {
        app.logger.error('[Lighter] Failed to read directory for watching: "' + dir + '".', error);
      }
      else {
        files.forEach(function (file) {
          if (!ignorePattern.test(file)) {
            var path = dir + '/' + file;
            fs.stat(path, function (error, stat) {
              if (error) {
                app.logger.error('[Lighter] Failed stat path for watching: "' + path + '".', error);
              }
              else if (stat.isDirectory()) {
                app.watchAndExit(path, ignorePattern);
              }
            });
          }
        });
      }
    });
  }

});
