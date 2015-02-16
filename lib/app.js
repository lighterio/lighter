var Domain = require('domain');
var fs = require('fs');
var os = require('os');
var cluster = require('cluster');
var assert = require('assert');
var dirname = require('path').dirname;

var dir = dirname(__dirname);
var env = process.env;

var lighter = require(dir + '/lighter');
var ipv4 = require(dir + '/lib/ipv4');
require(dir + '/lib/response');

require(dir + '/common/string/colors');
require(dir + '/common/module/common-cache');
require(dir + '/common/json/read-stream');
var shorten = require(dir + '/common/fs/shorten-path');
var caser = require(dir + '/common/string/caser');
var Type = require(dir + '/common/object/type');
var Emitter = require(dir + '/common/event/emitter');
var Flagger = require(dir + '/common/event/flagger');

/**
 * An App is an application that uses the Lighter framework.
 *
 * The Lighter API returns a new App:
 *
 * ```javascript
 * var app = require('lighter')(options);
 * ```
 */
module.exports = Flagger.extend({

  // Expected environments include:
  //  * `debug` - dev mode with additional logging.
  //  * `dev` - watch for changes and restart.
  //  * `test` - same logging as dev, but no file watching.
  //  * `stage` - Performs minification Like prod (with minification), but with additional logging.
  //  * `canary` - Same as prod, intended to be deployed just before prod.
  //  * `prod` - Use non-minified files test < stage < canary < prod
  env: env.NODE_ENV || 'prod',

  dir: dirname(process.mainModule.filename),

  configPath: 'config-${ENV}.json',

  ip: ipv4() || '127.0.0.1',

  port: env.PORT || 8888,

  processCount: os.cpus().length,

  exitDelay: 1e3,

  dbs: null,

  rings: null,

  dbTableFormat: 'underscored',

  dbFieldFormat: 'underscored',

  urlCase: 'spinal',

  typeCase: 'title',

  models: ['models'],

  views: ['views'],

  controllers: ['controllers'],

  publics: ['public'],

  scripts: ['scripts'],

  styles: ['styles'],

  tags: ['tags'],

  logConfig: [
    {transport: 'console', level: 'log', worker: 0},
    {transport: 'file', level: 'info', pattern: 'log/lighter_${YYYY}-${MM}-${DD}_${HOST}.log'}
  ],

  accessLogConfig: null,

  asciiArt: ['',
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
    ''],

  maxMiddlewareQueueSize: 1e3,

  globalCase: 'camel',

  namespaceWarnings: false,

  refreshIgnorePattern: /[\/\\](uploads)[\/\\]/,

  ignoredErrorLimit: 1e3,

  ignoredErrorCount: 0,

  init: function (options) {

    var self = this;

    // Record the server start time.
    self.started = new Date();

    // Allow options to be passed in.
    Type.decorate(self, options);

    // Create a domain to capture errors if there isn't one.
    self.domain = self.domain || Domain.create();

    // Handle domain errors and uncaught exceptions in the same way.
    function handleError(error) {
      self.handleError(error);
    }

    self.domain.on('error', handleError);
    process.on('uncaughtException', handleError);

    self.domain.run(function () {
      self.run();
    });
  },

  /**
   * Run the app initialization inside a domain.
   */
  run: function () {
    var self = this;

    // Override defaults with (e.g.) "config-${ENV}.json".
    var configPath = self.configPath;
    if (configPath) {
      configPath = configPath.replace(/\$\{ENV\}/g, self.env);
      var config = self.readJson(configPath);
      Type.decorate(self, config);
    }

    // Expose values on the app, and globally if globalCase is set.
    self.expose('App', self);
    self.expose('Config', self);
    self.expose('Type', Type);
    self.expose('Emitter', Emitter);
    self.expose('Flagger', Flagger);
    self.expose('Log', console);

    // Expose booleans that group environments together.
    self.isDev = /(debug|dev)/.test(self.env);
    self.isStage = /(test|stage)/.test(self.env);
    self.isProd = /(canary|prod)/.test(self.env);

    // Initialize multi-process items.
    self.initCluster(self.processCount);
    self.welcome(self.asciiArt);
    self.initLog(self.logConfig);
    self.chdir(self.dir);

    // Initialize workers.
    self.work(function () {
      self.watchIp();
      self.initServer();
      self.initCache();
      self.initDbs();
      self.initRings();
      self.initChug();
      self.initJymin();
      self.initD6();
      self.initTat();
      self.initBeams();
    });
  },

  /**
   * Read JSON from a file path.
   */
  readJson: function (path) {
    var self = this;
    try {
      var json = fs.readFileSync(path);
      return JSON.parse(json);
    }
    catch (error) {
      setImmediate(function () {
        self.log.warn('[Lighter] Cannot read JSON: "' + path + '".');
      });
      return {};
    }
  },

  /**
   * If running from another directory, you can enter the desired directory.
   */
  chdir: function (dir) {
    var self = this;
    if (dir != process.cwd()) {
      try {
        process.chdir(dir);
      }
      catch (error) {
        self.log.error('[Lighter] Failed to change directory to "' + dir + '".', error);
        process.exit();
      }
    }
  },

  /**
   * Fork as many workers as are specified by the process count.
   * The process count defaults to as many CPUs as the host has.
   */
  initCluster: function (processCount) {
    var self = this;

    self.isMaster = cluster.isMaster;
    self.isWorker = processCount < 2 || !self.isMaster;
    self.workerIndex = self.isMaster ? 0 : cluster.worker.id - 1;

    if (self.isMaster && processCount > 1) {
      for (var i = 0; i < processCount; i++) {
        cluster.fork();
      }

      // When a worker dies, kill the master or fork a new one.
      cluster.on('exit', function (worker, code) {
        self.log.error('[Lighter] Worker ' + worker.id +
          ' exited with code ' + code + '.');
        if (code >= 0) {
          self.log.warn('[Lighter] Exiting master.');
          setTimeout(function () {
            process.exit();
          }, self.exitDelay);
        }
        else {
          self.log.warn('[Lighter] Forking a new worker.');
          cluster.fork();
        }
      });
    }

    // Set up methods for running functions one or more workers.
    self.work = self.isWorker ? lighter.go : lighter.no;
    self.one = self.workerIndex ? lighter.no : lighter.go;
  },

  /**
   * Get the URL of the application, based on IP and port.
   */
  getUrl: function (colorize) {
    var self = this;
    var ip = self.ip;
    var port = self.port;
    var url = 'http://' + ip + (port == 80 ? '' : ':' + port) + '/';
    return colorize ? url.cyan : url;
  },

  /**
   * Show ASCII art on the console as a sort of "welcome" message.
   */
  welcome: function (asciiArt) {
    var self = this;
    if (cluster.isMaster) {
      var pkg = self.pkg = self.readJson(self.dir + '/package.json');
      var name = (pkg.name ? pkg.name : '') +
        (pkg.version ? ' v' + pkg.version : '');
      var line = asciiArt.length - 4;
      asciiArt[line++] += 'App: '.gray + name + ' ' + self.env;
      var url = self.getUrl(true);
      if (url) {
        asciiArt[line++] += 'URL: '.gray + url;
      }
      asciiArt[line++] += 'Now: '.gray + (self.started).toString().green;
      console.log(asciiArt.join('\n'));
    }
  },

  /**
   * Create a Cedar multi log if the config is an Array.
   */
  initLog: function (config) {
    var self = this;
    var log;
    if (config instanceof Array) {
      log = require('cedar')(config);
    }
    else {
      try {
        assert(typeof log.trace == 'function');
        assert(typeof log.log == 'function');
        assert(typeof log.info == 'function');
        assert(typeof log.warn == 'function');
        assert(typeof log.error == 'function');
      }
      catch (error) {
        console.error('[Lighter] Custom logs must have ' +
          '"trace", "log", "info", "warn" and "error" methods.');
        process.exit();
      }
    }
    self.log = log;
    self.expose('Log', log);
  },

  /**
   * Watch for changes to the host IP (for dev boxes on WiFi).
   */
  watchIp: function () {
    var self = this;
    if (self.isDev && (self.ip == ipv4())) {
      setInterval(function () {
        var ip = ipv4();
        if (ip != self.ip) {
          self.ip = ip;
          self.log.info('[Lighter] Now serving at: ' + self.getUrl(true));
        }
      }, 1e3);
    }
  },

  /**
   * Set Lighter up to handle HTTP requests with a Za server.
   */
  initServer: function () {
    var self = this;
    if (self.isWorker) {

      var za = require('za')({
        app: self,
        port: self.port + self.workerIndex,
        autoJson: true
      });

      self.expose('Server', za);

      // Decorate workers with Za methods.
      ['use', 'get', 'post'].forEach(function (methodName) {
        self[methodName] = self.isWorker ?
          function () {
            self.server[methodName].apply(za, arguments);
          }
          : lighter.no;
      });

      self.cacheBust = self.started.getTime().toString(32);

      // Add a middleware to queue requests until the app is loaded.
      if (self.maxMiddlewareQueueSize && self.server.unuse && self.enableChug) {
        var queue = [];
        var queuer = function (request, response, next) {
          if (queue.length <= self.maxMiddlewareQueueSize) {
            self.log.log('[Lighter] Queued a request: "' + request.url + '".');
            queue.push(next);
          }
          else {
            self.log.error('[Lighter] Middleware queue size limit exceeded.');
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
            self.log.log('[Lighter] Handled ' + l + ' queued request' + (l > 1 ? 's' : '') + '.');
          }
          queue.length = 0;
        });
      }
    }
  },

  /**
   * Add to the response state before sending.
   *
   * @param  {Object} state  Provided state object.
   */
  decorateState: function (state) {
    var self = this;

    // Allow far-future expires header on assets.
    state.cacheBust = self.cacheBust;

    // In dev mode, make it easier to debug individual files.
    if (self.isDev) {
      state.headTags = self.styles.getTags() + self.scripts.getTags();
    }
  },

  /**
   * Initialize the "mc" module as a memcache client.
   */
  initCache: function () {
    var self = this;

    // A cache can be passed in, and if it exposes .get, use it.
    var cache = self.cache = self.cache || {};

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

      var mc = require('mc/lib/memcache-client');
      var client = new mc.Client(cache.servers, cache.adapter, cache.strategy);
      client.connect(function (error) {
        if (error) {
          self.log.error('[Lighter] Failed to connect to memcache.', error);
        }
        else {
          self.log.info('[Lighter] Connected to memcache.');

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
   * Connect to one or more databases with Ormy.
   */
  initDbs: function () {
    var self = this;
    var dbs = self.dbs || {db: self.db};
    for (var dbKey in dbs) {
      var ormy = require('ormy');
      var dbConfig = dbs[dbKey];
      dbConfig.name = dbConfig.name || dbKey;
      dbConfig.app = self;
      dbConfig.log = self.log;
      var db = ormy(dbConfig, self);
      self.dbs[dbKey] = db;

      // Expose the first (and possibly the only) database as "db".
      if (!self.db) {
        self.expose('Db', db);
        self.expose('Ormy', ormy);
      }
    }
    self.expose('Dbs', dbs);
  },

  /**
   * Connect to one or more host clusters with Ringer.
   */
  initRings: function () {
    var self = this;
    var autoPort = self.port;
    self.rings = self.rings || {ring: self.ring};
    for (var ringKey in self.rings) {
      var ringer = require('ringer');
      var ringConfig = self.rings[ringKey];
      ringConfig.app = self;
      ringConfig.processCount = self.processCount;
      ringConfig.log = self.log;
      if (!ringConfig.basePort) {
        autoPort += self.processCount;
        ringConfig.basePort = autoPort;
      }
      var ring = ringer(ringConfig);
      self.rings[ringKey] = ring;

      // Expose the first (and possibly the only) ring as "ring".
      if (!self.ring) {
        self.expose('Ring', ring);
        self.expose('Ringer', ringer);
      }
    }
    self.expose('Rings', self.rings);
  },

  /**
   * Load frontend and backend assets with Chug.
   */
  initChug: function () {
    var self = this;

    // Connect Chug with Ltl and Za templating and routing.
    var chug = require('chug');
    chug.setLog(self.log);
    chug.setCompiler('ltl', 'ltl');
    chug.setServer(self.server);
    chug.enableShrinking();
    self.expose('Chug', chug);

    // Cull code down to what's offered in the current environment.
    self.cullEnv = self.env;

    self.chugBackend();
    self.chugFrontend();
    self.chugReady();
  },

  /**
   * Load backend assets with Chug.
   */
  chugBackend: function () {
    var self = this;
    var app = self;
    ['model', 'controller'].forEach(function (type) {
      var Constructor = require(dir + '/lib/' + type);
      self.expose(type, Constructor);
      var namePattern = /^.*[\/\\]([^\/\\]+)\.[^\/\\]+$/;
      var key = type + 's';
      var load = self.chug(self[key])
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
          var name = caser[self.typeCase](asset.location.replace(namePattern, '$1'));
          instance.className = name;
          if (load[name]) {
            load[name].emit('end');
          }
          else {
            load[name] = instance;
          }
          if (self.globalCase) {
            if (global[name]) {
              if (self.namespaceWarnings) {
                self.log.warn("[Lighter] Cannot set " + name + " globally because it already exists.");
              }
            }
            else {
              global[name] = instance;
            }
          }
        });
      self.expose(key, load);
    });
  },

  /**
   * Load frontend assets with Chug.
   */
  chugFrontend: function () {
    var self = this;
    var chug = self.chug;
    var paths = [];
    self.clientLoads = [];
    ['publics', 'scripts', 'styles', 'tags', 'views'].forEach(function (dir) {
      var load = self[dir] = chug(self[dir]);
      self.clientLoads.push(load);
      load.cull('env', self.cullEnv);
      load.compile(self.isDev ? {enableDebug: self.isDev} : 0);
      if (dir != 'publics') {
        load.each(function (asset) {
          paths.push(asset.path);
        });
      }
      // In dev environments (or for publics), route the individual files.
      if (dir == 'publics' || (self.isDev && dir[0] == 's')) {
        load.route();
      }
    });

    self.views.each(function (asset) {
      var name = asset.location.replace(/(^.*[\/\\]views[\/\\]|\.[a-z]+$)/g, '');
      self.views[name] = asset;
    });

    chug.onceReady(function () {
      var js = '';
      var css = '';
      chug(paths)
        .each(function (asset) {
          if (asset.js || asset.getLanguage() == 'js') {
            js += asset.js || asset.getCompiledContent();
          }
          if (asset.css || asset.getLanguage() == 'css') {
            css += asset.css || asset.getCompiledContent();
          }
        })
        .then(function () {
          var style = new chug.Asset('/a.css');
          css = style.setContent(css).minify().getMinifiedContent();
          var script = new chug.Asset('/a.js');
          script.setContent(js)
            .replace(/['"]LIGHTER_ALL_CSS['"]/, JSON.stringify(css))
            .replace(/LIGHTER_CACHE_BUST/g, self.cacheBust)
            .replace(/Jymin\.([$_a-zA-Z0-9]+)(\s*=)?/g, function (match, name, equals) {
              return equals ? 'var ' + name + ' =' : name;
            })
            .wrap().minify().gzip()
            .route('/a.js');
        });
    });
  },

  /**
   * Set a handler for when Chug has finished loading modules and assets.
   */
  chugReady: function () {
    var self = this;
    self.chug.onceReady(function () {

      [self.models, self.controllers].forEach(function (collection) {
        collection.each(function (asset) {
          var instance = asset.module.instance;
          instance.setFlag('ready');
        });
      });

      // In dev and debug environments, watch for changes.
      if (self.isDev) {
        var watchStream = process.stdin;
        JSON.readStream(watchStream, 'event');
        watchStream.on('event', function (event) {
          if (event.type == 'change') {
            var path = event.path;
            var asset = self.chug.cache.get(path);
            self.log.warn('[Lighter] Changed ' + shorten(path).cyan + '.');
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
        self.log.warn("[Lighter] Minifying client assets... ");
        var wait = 1;
        var unwait = function () {
          if (!--wait) {
            self.log.info("[Lighter] Client assets minified.");
            self.setFlag('loaded');
          }
        };
        self.clientLoads.forEach(function (load) {
          wait++;
          load.minify().gzip().then(unwait);
        });
        wait--;
      }
      // Otherwise, just signal that they're already loaded.
      else {
        self.setFlag('loaded');
      }

    });
  },

  /**
   * Add an item to a specified load.
   */
  addAssets: function (loadName, location) {
    if (!location) {
      location = loadName;
      loadName = /\.(css|less|scss|styl)$/.test(location) ? 'styles' : 'scripts';
    }
    var self = this;
    self[loadName].add(location);
  },

  /**
   * Add Jymin to the scripts, which route to `/a.js`.
   */
  initJymin: function () {
    var self = this;
    self.addAssets('scripts', 'node_modules/lighter/node_modules/jymin/jymin.js');
  },

  /**
   * Set up D6 as an isomorphic transport layer for views and data.
   */
  initD6: function () {
    var self = this;
    var d6 = require('d6');
    self.addAssets('scripts', 'node_modules/lighter/node_modules/d6/scripts/d6-jymin.js');

    // Require d6 later so minification can begin before it uses chug.onReady.
    setImmediate(function () {
      d6(self);
    });
  },

  /**
   * Set up Tat as a custom tag renderer.
   */
  initTat: function () {
    var self = this;
    self.addAssets('scripts', 'node_modules/lighter/node_modules/tat/scripts/tat-jymin.js');
    self.addAssets('scripts', 'node_modules/lighter/scripts/head.js');
  },

  /**
   * Set up Beams for long-polling AJAX communication.
   */
  initBeams: function () {
    var self = this;
    var beams = require('beams');
    beams.setServer(self.server);
    self.expose('Beams', beams);
    self.addAssets('scripts', 'node_modules/lighter/node_modules/beams/scripts/beams-jymin.js');

    // In dev mode, notify clients that we have restarted.
    if (self.isDev) {
      self.addAssets('scripts', 'node_modules/lighter/scripts/lighter-beams.js');
      self.chug.onReady(function () {
        if (!self.refreshIgnorePattern.test(self.chug.changedLocation)) {
          beams.emit('chug:change', self.chug.changedLocation);
        }
      });
    }
  },

  /**
   * Exposed an object as a member, and potentially globally.
   */
  expose: function (key, value) {
    var self = this;
    key = caser.camel(key);
    self[key] = value;
    if (self.globalCase) {
      key = caser[self.globalCase](key);
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
        self.log.info("[Lighter] " +
          type + " " + (url ? 'routed to ' + url.cyan : "loaded") + ". " +
          ("x" + load.assets.length).gray);
      });
  },

  /**
   * Handle domain errors and uncaught exceptions. Errors can be decorated
   * with several optional properties prior to being thrown or passed in:
   *
   * - {String} error.level: Denotes the log method to use (default: "error").
   * - {Boolean} error.ignore: IGNORES AN ERROR, POSSIBLY LEAKING MEMORY!
   * - {Boolean} error.recover: LOGS THE ERROR, BUT DOESN'T EXIT - ALSO LEAKY.
   *
   * @param  {Error}   error  An error that has been thrown or passed in.
   * @return {Boolean}        Whether the process will exit.
   */
  handleError: function (error) {
    var self = this;

    // If we didn't receive an error, throw one so we'll have a stack trace.
    if (!error || !error.stack) {
      try {
        throw new Error('Uncaught error in Lighter app' +
          (error ? ': ' + JSON.stringify(error) : '') + '.');
      }
      catch (e) {
        error = e;
      }
    }

    // Log the error, unless ignored.
    if (!error.ignore) {
      var method = error.level || 'error';
      self.log[method]('[Lighter] ' + error.stack);
    }

    // Allow a process to recover from a limited number of errors.
    var isWithinLimit = self.ignoredErrorCount < self.ignoredErrorLimit;
    var isRecoverable = (error.ignore || error.recover) && isWithinLimit;

    if (isRecoverable) {
      self.ignoredErrorCount++;
    }
    else {
      var role = cluster.isMaster ? 'master' : 'worker';
      self.log.warn('[Lighter] Exiting ' + role +
        ' (pid: ' + process.pid + ')' +
        (self.exitDelay ? ' in ' + self.exitDelay + 'ms...' : '.'));
      setTimeout(function () {
        process.exit();
      }, self.exitDelay);
    }
    return !isRecoverable;
  }

});
