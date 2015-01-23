var fs = require('fs');
var os = require('os');
var cluster = require('cluster');
var assert = require('assert');
var dirname = require('path').dirname;
var lighterDir = dirname(__dirname);
var lighter = require(lighterDir + '/lighter');
var Type = require(lighterDir + '/common/object/type');
var Emitter = require(lighterDir + '/common/event/emitter');
var Flagger = require(lighterDir + '/common/event/flagger');
var Model = require(lighterDir + '/lib/model');
var Controller = require(lighterDir + '/lib/controller');
var shorten = require(lighterDir + '/common/fs/shorten-path');
var caser = require(lighterDir + '/common/string/caser');
require(lighterDir + '/lib/response');
require(lighterDir + '/common/json/read-stream');
var ipv4 = require(lighterDir + '/lib/ipv4');
var env = process.env;
var cwd = process.cwd();

/**
 * An App is an application that uses the Lighter framework.
 *
 * The Lighter API returns a new App:
 *
 * ```javascript
 * var App = require('lighter')(options);
 * ```
 */
var App = module.exports = Flagger.extend({

  init: function (options) {

    var self = this;

    // Load the default configuration which can be overriden with `configPath` contents.
    var config = self.config = {
      env: env.NODE_ENV || 'prod',
      dir: cwd,
      chdir: true,
      configPath: null,
      server: null,
      hostName: ipv4() || '127.0.0.1',
      processCount: os.cpus().length,
      decorateContext: null,
      orm: 'ormy',
      dbs: null,
      rings: null,
      dbTableFormat: 'underscored',
      dbFieldFormat: 'underscored',
      httpPort: env.PORT || 8888,
      httpsPort: null,
      httpsKey: null,
      httpsCert: null,
      urlCase: 'spinal',
      typeCase: 'title',
      models: ['models'],
      views: ['views'],
      controllers: ['controllers'],
      publics: ['public'],
      scripts: {'/a.js': ['scripts']},
      styles: {'/a.css': ['styles']},
      cache: null,
      logger: [
        {transport: 'console', level: 'log', worker: 0},
        {transport: 'file', level: 'info', pattern: 'log/self_${YYYY}-${MM}-${DD}_${HOST}.log'}
      ],
      asciiArt: null,
      cullEnv: true,
      maxMiddlewareQueueSize: 1e3,
      enableCache: true,
      enableChug: true,
      enableD6: true,
      enableBeams: true,
      enableSplode: true,
      exposeGlobals: false,
      globalCase: 'title',
      namespaceWarnings: false,
      watchIgnorePattern: /^(\..*|node_modules|controllers|models|public|scripts|styles|views|test|coverage|uploads|logs?|.*\.pid|.*\.swp)$/,
      refreshIgnorePattern: /[\/\\](uploads)[\/\\]/
    };

    // Record the server start time.
    self.started = new Date();

    // Override the default config with the options argument.
    self.decorateConfig(options);

    // Override the default config and options with (e.g.) "config/${ENV}.json" content.
    var configPath = config.configPath || config.overridesPath;
    if (configPath) {
      configPath = configPath.replace(/\$\{ENV\}/g, config.env);
      self.decorateConfig(self.readJson(configPath));
    }

    // Globalize values if exposeGlobals is true.
    self.globalize('App', self);
    self.globalize('Config', self.config);
    self.globalize('Type', Type);
    self.globalize('Emitter', Emitter);
    self.globalize('Flagger', Flagger);
    self.globalize('Model', Model);
    self.globalize('Controller', Controller);

    // Signal that the App has a configuration.
    self.setFlag('config');

    // If running from another directory, you can enter the desired directory.
    if (config.chdir && (config.dir != cwd)) {
      try {
        process.chdir(config.dir);
      }
      catch (error) {
        console.error('[Lighter] Failed to change directory to "' + config.dir + '".', error);
        process.exit();
      }
    }

    // Expose booleans that group environments together.
    self.isDev = /(dev|debug)/.test(config.env);
    self.isStage = /(test|stage|beta|new)/.test(config.env);
    self.isProd = /(canary|prod)/.test(config.env);

    // Set up logging.
    self.initLogger();

    // In dev mode, watch for IP address changes.
    if (self.isDev && (config.hostName == ipv4())) {
      self.watchIp();
    }

    // Enable uncaughtException handling.
    self.initSplode();

    // Assume this process will serve.
    var isServer = true;

    // Only show the welcome message from one process.
    if (cluster.isMaster) {
      self.welcome();

      // If clustering, the master should fork, not serve.
      if (config.processCount > 1) {
        isServer = false;
        self.fork();
      }
    }

    // Perform a task.
    function op(fn) {
      fn();
    }

    // Don't perform a task.
    function noop() {}

    // Expose methods that can make all workers or one worker perform a task.
    self.work = self.one = noop;

    // If this process is meant to serve, start the server.
    if (isServer) {

      self.work = op;

      if (cluster.isMaster || (cluster.worker.id == 1)) {
        self.one = op;
      }

      self.serve();

      // Load assets and such.
      if (config.enableChug) {
        self.initChug();
      }

      if (config.enableCache) {
        self.initCache();
      }

      if (config.db || config.dbs) {
        self.initDbs();
      }
      if (config.ring || config.rings) {
        self.initRings();
      }
    }

    // Decorate server forks Za/Express methods.
    ['use', 'get', 'post'].forEach(function (methodName) {
      self[methodName] = isServer ?
        function () {
          self.server[methodName].apply(self.server, arguments);
        }
        : noop;
    });

  },

  /**
   * Require JSON from a file path.
   */
  readJson: function (path) {
    var self = this;
    try {
      var json = fs.readFileSync(path);
      return JSON.parse(json);
    }
    catch (error) {
      setImmediate(function () {
        (self.logger || console).warn('[Lighter] Config file not found: "' + path + '".');
      });
      return {};
    }
  },

  /**
   * Decorate self.config with key-value pairs from another "decorations" object.
   */
  decorateConfig: function (decorations) {
    var self = this;
    var config = self.config;
    for (var key in decorations) {
      var value = decorations[key];
      if (value !== undefined) {
        config[key] = decorations[key];
      }
    }
  },

  /**
   * Create a Cedar logger if the config is array-like.
   */
  initLogger: function () {
    var self = this;
    var config = self.config;
    var logger = config.logger;
    if (logger instanceof Array) {
      logger = require(lighterDir + '/node_modules/cedar/cedar')(logger);
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
    self.logger = logger;
    self.globalize('Log', logger);
  },

  /**
   * Watch for changes to the host IP (for dev boxes on WiFi).
   */
  watchIp: function () {
    var self = this;
    var config = self.config;
    setInterval(function () {
      var old = config.hostName;
      var ip = ipv4();
      if (ip != old) {
        config.hostName = ip;
        self.logger.info('[Lighter] Now serving at: ' + self.getUrl(true));
      }
    }, 1e3);
  },

  /**
   * Initialize the "mc" module as a memcache client.
   */
  initCache: function () {
    var self = this;
    var config = self.config;

    // A cache can be passed in, and if it exposes .get, use it.
    var cache = self.cache = config.cache || {};

    // If it doesn't expose .get, connect to memcache with mc.
    if (!cache.get) {

      // Expose a queue pusher until the client connects.
      var queue = [];
      self.cache = {
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

      var mc = require(lighterDir + '/node_modules/mc/lib/memcache-client');
      var client = new mc.Client(cache.servers, cache.adapter, cache.strategy);
      client.connect(function (error) {
        if (error) {
          self.logger.error('[Lighter] Failed to connect to memcache.', error);
        }
        else {
          self.logger.info('[Lighter] Connected to memcache.');

          // Monkey-patch the get method to get and return a single item.
          // The mc module is awesome, but cache.get should work like others.
          client.find = client.get;
          client.get = function (key, callback) {
            this.find(key, function (err, object) {
              callback(err, object ? object[key] : object);
            });
          };

          // Replace the queue pusher with the actual client.
          self.cache = client;

          // Execute any calls that the queue pusher received.
          queue.forEach(function (pair) {
            client[pair[0]].apply(client, pair[1]);
          });
        }
      });
    }
  },

  /**
   * Use Splode to let listeners whitelist recoverable uncaught exceptions.
   */
  initSplode: function () {
    var self = this;
    var config = self.config;
    if (config.enableSplode) {
      var splode = self.splode = require(lighterDir + '/node_modules/splode/splode');
      splode.setLogger(self.logger);
      splode.listen(function (error) {
        if (/Can't set headers after they are sent./.test(error.message)) {
          splode.recover();
        }
      });
      self.globalize('Splode', splode);
    }
  },

  /**
   * Get the URL or URLs of the application, based on hostname and port.
   */
  getUrl: function (colorize) {
    var self = this;
    var config = self.config;
    var host = config.hostName;
    var parts = [];
    function push(protocol, port, standard) {
      if (port) {
        var url = protocol + '//' + host + (port == standard ? '' : ':' + port) + '/';
        parts.push(colorize ? url.cyan : url);
      }
    }
    push('http:', config.httpPort, 80);
    push('https:', config.httpsPort, 443);
    return parts.join(' or ');
  },

  /**
   * Show ASCII art in the console as a sort of "welcome" message.
   */
  welcome: function () {
    var self = this;
    var config = self.config;

    var art = config.asciiArt || ['',
      ('     .A.     '.red + "   _    _       _     _     ".gray).bold + ("v" + lighter.version).gray,
      ('    /@@@\\    '.red + "  | |  (_) __ _| |__ | |_ ___ _ __".gray).bold,
      ('  ./@@'.red + 'A'.yellow + '@@\\.   '.red + " | |  | |/ _` | '_ \\| __/ _ \\ '__)".gray).bold,
      (' /@@'.red + '/@@@\\'.yellow + '@@\\  '.red + " | |__| | (_| | | | | ||  __/ |".gray).bold,
      ('/@@'.red + '/@@'.yellow + 'A'.white + '@@\\'.yellow + '@@\\'.red + "  |____|_|\\__, |_| |_|\\__\\___|_|".gray).bold,
      ('#@@'.red + '#@'.yellow + '/@\\'.white + '@#'.yellow + '@@#'.red + "           (___/".gray).bold,
      ('#@@'.red + '#@'.yellow + '@@@'.white + '@#'.yellow + '@@#   '.red).bold,
      ('"#@@'.red + '\\@@@/'.yellow + '@@#"   '.red).bold,
      (' \'"#######"\'    '.red).bold,
      '                ',
      ''];

    var selfName = '';

    var json = self.readJson(config.dir + '/package.json');
    if (json.name) {
      selfName += json.name;
    }
    if (json.version) {
      selfName += ' v' + json.version;
    }

    var line = art.length - 4;
    art[line++] += 'App: '.gray + selfName + ' ' + config.env;

    var url = self.getUrl(true);
    if (url) {
      art[line++] += 'URL: '.gray + url;
    }
    art[line++] += 'Now: '.gray + (self.started).toString().green;
    console.log(art.join('\n'));
  },

  /**
   * Fork as many workers as are specified by the process count.
   */
  fork: function () {
    var self = this;
    var config = self.config;
    for (var i = 0; i < config.processCount; i++) {
      cluster.fork();
    }
    // When a worker dies unexpectedly, kill the master.
    cluster.on('exit', function (worker, code, signal) {
      self.logger.error('Worker ' + worker.process.pid + ' died.');
      self.logger.warn('Exiting master.');
      process.exit();
    });
  },

  /**
   * Set Lighter up to handle HTTP requests with Za (or a specified server).
   */
  serve: function () {
    var self = this;
    var config = self.config;
    var index = cluster.isMaster ? 0 : (cluster.worker.id - 1);
    var http = config.httpPort;
    var https = config.httpsPort;
    self.server = config.server || require(lighterDir + '/node_modules/za/za')({
      app: self,
      autoJson: true,
      http: http ? http * 1 + index : undefined,
      https: https ? https * 1 + index : undefined,
      ssl: {
        key: config.httpsKey,
        cert: config.httpsCert
      }
    });

    // Decorate the app with some Za/Express methods.
    ['use', 'get', 'post'].forEach(function (methodName) {
      self[methodName] = function () {
        self.server[methodName].apply(self.server, arguments);
      };
    });

    // Za allows us to inject the app.
    if (self.server.setself) {
      self.server.setself(self);
    }

    self.server._cacheBust = self.server._cacheBust || self.started.getTime();
    self.decorateContext = config.decorateContext || function (context) {
      // Allow far-future expires header on assets.
      context.cacheBust = self.server._cacheBust;

      // In dev mode, make it easier to debug individual files.
      if (self.isDev) {
        context.styleTags = self.styles['/a.css'].sourceLoad.getTags();
        context.scriptTags = self.scripts['/a.js'].sourceLoad.getTags();
      }
    };

    // Add a middleware to queue requests until the app is loaded.
    if (config.maxMiddlewareQueueSize && self.server.unuse && config.enableChug) {
      var queue = [];
      var queuer = function (request, response, next) {
        if (queue.length <= config.maxMiddlewareQueueSize) {
          self.logger.log('[Lighter] Queued a request: "' + request.url + '".');
          queue.push(next);
        }
        else {
          self.logger.error('[Lighter] Middleware queue size limit exceeded.');
        }
      };
      self.server.use(queuer);
      self.when('loaded', function () {
        self.server.unuse(queuer);
        var l = queue.length;
        if (l) {
          for (var i = 0; i < l; i++) {
            queue[i]();
          }
          self.logger.log('[Lighter] Handled ' + l + ' queued request' + (l > 1 ? 's' : '') + '.');
        }
        queue.length = 0;
      });
    }
  },

  /**
   * Load frontend and backend assets with Chug.
   */
  initChug: function () {
    var self = this;
    var config = self.config;
    self.autoScripts = [];

    // Pass the lighter server to Chug so it can route static assets.
    var chug = self.chug = require(lighterDir + '/node_modules/chug/chug');
    chug.setServer(self.server);
    chug.enableShrinking();
    chug.setCompiler('ltl', lighterDir + '/node_modules/ltl/ltl');
    self.globalize('Chug', chug);

    // By default, cull code down to what's offered in the current environment.
    if (config.cullEnv === true) {
      config.cullEnv = config.env;
    }

    var app = self;
    var constructors = {models: Model, controllers: Controller};
    ['models', 'controllers'].forEach(function (key) {
      var Constructor = constructors[key];
      var namePattern = /^.*[\/\\]([^\/\\]+)\.[^\/\\]+$/;
      var load = self[key] = chug(self.config[key])
        .require(function (Type) {
          var asset = this;
          if (!Type.extend) {
            Type = asset.module = Constructor.extend(Type);
          }
          var instance = Type.instance = new Type(app, asset);
          if (!instance.app) {
            Constructor.call(instance, app, asset);
          }
          instance.emit('init', instance, app, asset);
        })
        .each(function (asset) {
          var instance = asset.module.instance;
          var name = caser[config.typeCase](asset.location.replace(namePattern, '$1'));
          instance.className = name;
          if (load[name]) {
            load[name].emit('end');
          }
          else {
            load[name] = instance;
          }
          if (config.exposeGlobals) {
            if (global[name]) {
              if (config.namespaceWarnings) {
                log.warn("[Lighter] Cannot set " + name + " globally because it already exists.");
              }
            }
            else {
              global[name] = instance;
            }
          }
        });
      self.logWhenLoadIsFinished(load, key);
    });

    ['publics', 'views'].forEach(function (dir) {
      var load = self[dir] = chug(self.config[dir]);
      load.cull('env', config.cullEnv);
      if (dir == 'publics') {
        load.route();
      }
      else {
        var options = {enableDebug: self.isDev};
        load.compile(options);
      }
      self.logWhenLoadIsFinished(self[dir], dir);
    });

    if (config.enableBeams) {
      self.initBeams();
    }
    if (config.enableD6) {
      self.initD6();
    }

    var configScripts = config.scripts;
    var autoScripts = configScripts['/a.js'] || [];
    autoScripts.forEach(function (script) {
      self.autoScripts.push(script);
    });
    configScripts['/a.js'] = self.autoScripts;

    ['scripts', 'styles'].forEach(function (dir) {
      var resources = self.config[dir];
      var loads = self[dir] = {};
      for (var url in resources) {
        var files = resources[url];
        var load = chug(files)
          .cull('env', config.cullEnv)
          .compile();
        // In dev environments, route the individual files.
        if (self.isDev) {
          load.route();
        }
        loads[url] = load.concat(url).route();
        self.logWhenLoadIsFinished(loads[url], dir, url);
      }
    });

    chug.onceReady(function () {

      [self.models, self.controllers].forEach(function (collection) {
        collection.each(function callReady(asset) {
          var instance = asset.module.instance;
          instance.setFlag('ready');
        });
      });

      self.views.assets.forEach(function (asset) {
        var name = asset.location.replace(/(^.*[\/\\]views[\/\\]|\.[a-z]+$)/g, '');
        self.views[name] = asset;
      });

      // In dev and debug environments, watch for changes.
      if (self.isDev) {
        var watchStream = process.stdin;
        JSON.readStream(watchStream, 'event');
        watchStream.on('event', function (event) {
          if (event.type == 'change') {
            var path = event.path;
            var asset = chug.cache.get(path);
            self.logger.warn('[Lighter] Changed ' + shorten(path).cyan + '.');
            if (asset) {
              asset.parents.forEach(function (load) {
                load.handleChange(path);
              });
              self.beams.emit('chug:change', path);
            }
            else {
              process.exit();
            }
          }
        });
      }

      // In stage and prod environments, minify assets.
      if (self.isProd) {
        self.logger.warn("[Lighter] Minifying assets... ");
        var wait = 1;
        var unwait = function () {
          if (!--wait) {
            self.logger.info("[Lighter] Views, scripts and styles minified.");
            self.setFlag('loaded');
          }
        };
        [self.scripts, self.styles].forEach(function (loads) {
          for (var url in loads) {
            wait++;
            loads[url].wrap().minify().gzip().route().then(unwait);
          }
        });
        self.views.minify().then(unwait);
      }
      // Otherwise, just signal that they're already loaded.
      else {
        self.setFlag('loaded');
      }

    });
  },

  /**
   * Connect to one or more databases.
   */
  initDbs: function () {
    var self = this;
    var config = self.config;
    self.orm = require(config.orm);
    self.dbs = {};
    config.dbs = config.dbs || {db: config.db};
    for (var dbKey in config.dbs) {
      var dbConfig = config.dbs[dbKey];
      dbConfig.name = dbConfig.name || dbKey;
      dbConfig.app = self;
      dbConfig.logger = self.logger;
      var db = self.orm(dbConfig, self);
      self.dbs[dbKey] = db;

      // Expose the first (and possibly the only) database as "db".
      if (!self.db) {
        self.db = db;
      }
    }

    // Allow databases to be exposed globally.
    if (config.exposeGlobals) {
      global.Db = self.db;
      global.Dbs = self.dbs;
    }
  },

  /**
   * Connect to one or more host cluster rings.
   */
  initRings: function () {
    var self = this;
    var config = self.config;
    var ringer = require('ringer');
    var webPort = (config.httpsPort || config.httpPort) * 1;
    self.rings = {};
    config.rings = config.rings || {ring: config.ring};
    for (var ringKey in config.rings) {
      var ringConfig = config.rings[ringKey];
      ringConfig.app = self;
      ringConfig.processCount = config.processCount;
      ringConfig.basePort = webPort + config.processCount;
      ringConfig.logger = self.logger;
      var ring = ringer(ringConfig);
      self.rings[ringKey] = ring;
      if (!self.ring) {
        self.ring = ring;
      }
    }
    self.globalize('Ring', self.ring);
    self.globalize('Rings', self.rings);
  },

  /**
   * Set up Beams for long-polling AJAX communication.
   */
  initBeams: function () {
    var self = this;
    var config = self.config;
    var chug = self.chug;
    self.initJymin();

    var beams = self.beams = require(lighterDir + '/node_modules/beams/beams');
    beams.setServer(self.server);
    self.globalize('Beams', beams);

    self.autoScripts.push('node_modules/lighter/node_modules/beams/scripts/beams-jymin.js');

    // In dev mode, notify clients that we have restarted.
    if (self.isDev) {
      self.autoScripts.push('node_modules/lighter/scripts/lighter-beams.js');
      chug.onReady(function () {
        if (!config.refreshIgnorePattern.test(chug.changedLocation)) {
          beams.emit('chug:change', chug.changedLocation);
        }
      });
    }
  },

  /**
   * Set up D6 as an isomorphic transport layer for views and data.
   */
  initD6: function () {
    var self = this;
    self.initJymin();
    self.autoScripts.push('node_modules/lighter/node_modules/d6/scripts/d6-jymin.js');

    // Require d6 later so minification can begin before it uses chug.onReady.
    setImmediate(function () {
      require(lighterDir + '/node_modules/d6/d6')(self);
    });
  },

  /**
   * Add Jymin to the `autoScripts`, which route to `/a.js`.
   */
  initJymin: function () {
    var self = this;
    var config = self.config;
    if (!config.hasJymin) {
      self.autoScripts.push('node_modules/lighter/node_modules/jymin/jymin.js');
      self.autoScripts.push('node_modules/lighter/node_modules/jymin/plugins/ready.js');
      config.hasJymin = true;
    }
  },

  /**
   * If `exposeGlobals` is true, some objects get exposed globally.
   */
  globalize: function (key, value) {
    var self = this;
    var config = self.config;
    if (config.exposeGlobals) {
      var globalCase = config.globalCase;
      if (globalCase != 'title') {
        key = caser[globalCase](key);
      }
      global[key] = value;
    }
  },

  /**
   * When controllers/models/publics/scripts/styles/views load, notify.
   */
  logWhenLoadIsFinished: function (load, type, url) {
    var self = this;
    type = caser.title(type);
    load
      .onceReady(function () {
        self.logger.info("[Lighter] " +
          type + " " + (url ? 'routed to ' + url.cyan : "loaded") + ". " +
          ("x" + load.assets.length).gray);
      });
  }

});
