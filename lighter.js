#!/usr/bin/env node

if (process.mainModule === module) {}

var fs = require('fs')
var os = require('os')
var cluster = require('cluster')
var dirname = require('path').dirname
var Flagger = require('lighter-flagger')
var Load = require('lighter-load')
var config = require('lighter-config')
var http = require('lighter-http')
var chug = require('chug')
var cedar = require('cedar')
var ltl = require('ltl')
var omen = require('omen')
var lighter = require('./package')
var Model = require('./lib/model')
var Controller = require('./lib/controller')
var lighterDir = __dirname
var dir = dirname(__dirname)
var env = process.env

require('lighter-colors')

/**
 * Export an App factory function so the Lighter API can return a new App:
 *
 * ```javascript
 * var app = require('lighter')(options)
 * ```
 */
module.exports = function (options) {
  var app = new App(options)
  return app
}

var App = Flagger.extend({

  dir: dirname(process.mainModule.filename),

  host: os.hostname(),

  port: env.PORT || 8888,

  cpus: 1, // os.cpus().length,

  dbs: null,

  art: ['',
    ('     .A.      '.red + ('  _    _      _   _      v' + lighter.version).gray).bold,
    ('    /@@@\\     '.red + ' | |  (_)__ _| |_| |_ ___ _ _'.gray).bold,
    ('  ./@@'.red + 'A'.yellow + '@@\\.   '.red + ' | |__| / _` | \' \\  _/ -_) \'_|'.gray).bold,
    (' /@@'.red + '/@@@\\'.yellow + '@@\\  '.red + ' |____|_\\__, |_||_\\__\\___|_|'.gray).bold,
    ('/@@'.red + '/@@'.yellow + 'A'.white + '@@\\'.yellow + '@@\\'.red + '         |___/'.gray).bold,
    ('#@@'.red + '#@'.yellow + '/@\\'.white + '@#'.yellow + '@@# '.red).bold,
    ('#@@'.red + '#@'.yellow + '@@@'.white + '@#'.yellow + '@@#  '.red).bold,
    ('"#@@'.red + '\\@@@/'.yellow + '@@#"  '.red).bold,
    (' \'"#######"\'   '.red).bold, ''],

  init: function (overrides) {
    Flagger.call(this)
    Flagger.decorate(this, overrides, true)
    this.started = new Date()
    this.config = config
    this.log = this.log || cedar(config.cedar)
    this.monitor()
    this.chdir()
    var dir = this.dir

    // Start the cluster.
    this.fork()
    this.onMaster(this.welcome)
    this.onMaster(this.fake)
    this.onWorker(this.listen)
    this.onWorker(function () {
      this.initChug()
      this.addDir(dir)
      this.addScripts()
      this.build()
      this.initDb()
    })
  },

  /**
   * Read JSON from a file path.
   */
  initDb: function (path) {
    var config = this.config
    var first = this.port + this.cpus
    var last = first + this.cpus - 1
    this.db = omen({
      port: first + cluster.worker.id - 1,
      hostPattern: config.hostPattern || this.host,
      portPattern: '(' + first + '-' + last + ')',
      log: this.log
    })
  },

  /**
   * Read JSON from a file path.
   */
  readJson: function (path) {
    var self = this
    try {
      var json = fs.readFileSync(path)
      return JSON.parse(json)
    } catch (error) {
      setImmediate(function () {
        self.log.warn('[Lighter] Cannot read JSON: "' + path + '".')
      })
      return {}
    }
  },

  /**
   * If running from another directory, you can enter the desired directory.
   */
  chdir: function () {
    var dir = this.dir
    if (dir !== process.cwd()) {
      try {
        process.chdir(dir)
      } catch (error) {
        this.log.error('[Lighter] Failed to change to "' + dir + '".', error)
        process.exit()
      }
    }
    this.home = new Load()
  },

  /**
   * Fork as many workers as are specified by the process count.
   * The process count defaults to as many CPUs as the host has.
   */
  fork: function () {
    var self = this
    var cpus = this.cpus

    this.isMaster = cluster.isMaster
    this.isWorker = cpus < 2 || !this.isMaster
    this.workerIndex = this.isMaster ? 0 : cluster.worker.id - 1

    if (this.isMaster && cpus > 1) {
      for (var i = 0; i < cpus; i++) {
        cluster.fork()
      }

      // When a worker dies, kill the master or fork a new one.
      cluster.on('exit', function (worker, code) {
        self.log.error('[Lighter] Worker ' + worker.id +
          ' exited with code ' + code + '.')
        if (code >= 0) {
          self.log.warn('[Lighter] Exiting master.')
          setTimeout(function () {
            process.exit()
          }, 1)
        } else {
          self.log.warn('[Lighter] Forking a new worker.')
          cluster.fork()
        }
      })
    }

    // Set up methods for running functions one or more workers.
    this.onMaster = this.workerIndex ? no : go
    this.onWorker = this.isWorker ? go : no
  },

  /**
   * Show ASCII art on the console as a sort of "welcome" message.
   */
  welcome: function () {
    var art = this.art
    if (cluster.isMaster) {
      var pkg = this.pkg = this.readJson(this.dir + '/package.json')
      var name = pkg.name || this.dir.replace(/^.*\//, '')
      var app = name.yellow + ' v' + (pkg.version || '0.0.0')
      var line = art.length - 4
      art[line++] += 'App: '.gray + app + ' ' + this.config.environment.red
      var time = this.started.toString()
      art[line++] += time.replace(/(^.*) GMT.*\(([A-Z]+)\)$/, function (a, dt, tz) {
        return (tz + ': ').gray + dt.green
      }).green
      var port = this.port
      var url = 'http://' + this.host + (port === 80 ? '' : ':' + port) + '/'
      art[line++] += 'URL: '.gray + url.cyan
      console.log(art.join('\n').replace('LIGHTER_VERSION', lighter.version))
    }
  },

  /**
   * Set Lighter up to handle HTTP requests.
   */
  listen: function () {
    this.port *= 1
    var server = this.server = new http.Server({
      port: this.port + this.workerIndex,
      isWorker: true
    })
    Flagger.decorate(server.views, ltl.cache)
    this.log.info('Listening on port ' + server.port + '.')
  },

  /**
   * Set Lighter up to handle HTTP requests.
   */
  fake: function fake () {
    this.server = {
      use: no,
      unuse: no,
      get: no,
      post: no,
      put: no,
      delete: no,
      io: no
    }
  },

  /**
   * Load frontend and backend assets with Chug.
   */
  initChug: function () {
    // Connect Chug with Ltl and Za templating and routing.
    chug.setLog(this.log)
    chug.setCompiler('ltl', 'ltl')
    chug.setServer(this.server)
    chug.enableShrinking()
    chug.enableUse = true
    this.cullEnv = this.config.env
    this.uiAssets = chug()
    this.uiLoads = []
  },

  addDir: function (dir, prefix) {
    var self = this
    prefix = prefix || this.home.relative(dir)

    var types = {models: Model, controllers: Controller}
    Object.keys(types).forEach(function (key) {
      var Type = types[key]
      self[key] = chug(dir + '/' + key)
        .require(function (Module) {
          Module = Module.extend ? Module : Type.extend(Module)
          var instance = new Module(self)
          var name = this.path.replace(/\.[^/\\]+$/g, '')
          instance._path = prefix + '/' + (name === 'index' ? '' : name)
          if (instance.init) {
            instance.init(self)
          }
        })
    })

    var names = ['public', 'scripts', 'styles', 'views']
    names.forEach(function (name) {
      var load = self[name] = chug(dir + '/' + name)
      self.uiLoads.push(load)
    })
  },

  addScripts: function () {
    this.scripts.add(lighterDir + '/scripts/head.js')
  },

  build: function () {
    var self = this
    var config = this.config

    this.uiLoads.forEach(function (load) {
      load
        .compile({
          cache: self.server.views,
          space: config.isDebug ? '  ' : ''
        })

      // For publics and dev environments, route individual files.
      if (dir === 'publics' || config.isDevelopment) {
        load.replace(/CACHE_BUST/g, self.cacheBust).route()
      }

      // Assemble everything except publics into one front-end load.
      if (dir !== 'publics') {
        load.each(function (asset) {
          self.uiAssets.add(asset)
        })
      }
    })

    chug.ready(function () {
      // Route all external assets to "/a.js".
      var js = ''
      var css = ''

      var libPattern = /(\n?)(Cute|Porta)\.([$_a-zA-Z0-9]+)(\s*=)?/g
      self.uiAssets
        .use().sort()
        .each(function (asset) {
          asset.eachTarget('compiled', function (target, content) {
            if (target === 'js') {
              js += content + '\n'
            } else if (target === 'css') {
              css += content
            }
          })
        })
        .then(function () {
          var style = new chug.Asset('/a.css')
          style.setContent(css)
          if (config.isProduction) {
            style.minify()
          }
          css = style.getMinifiedContent()
          js = js
            .replace(/['"]CSS_TEXT['"]/g, JSON.stringify(css))
            .replace(/CACHE_BUST/g, self.cacheBust)
          var script = new chug.Asset('/a.js')
          script
            .setContent(js)
            .cull('env', config.env)
            .cull('browser', 'ok')
            .wrap()
            .replace(libPattern, function (match, br, lib, key, equals) {
              var name = lib + '_' + key
              var word = br ? 'var ' : ''
              return br + (equals ? word + name + ' =' : name)
            })
          if (config.isProduction) {
            script
              .minify()
              .gzip()
          }
          var url = '/a.js'
          script.route(url)
          self.log.info('[Lighter] UI routed to ' + url.cyan + '.')
          self.ui = js
          self.emit('ui', js)
        })

      // In stage and prod environments, minify assets.
      if (config.isProduction) {
        var wait = 1
        var unwait = function () {
          if (!--wait) {
            self.set('loaded')
          }
        }
        self.uiLoads.forEach(function (load) {
          wait++
          load.minify().gzip()
          load.then(unwait)
        })
        wait--
      // Otherwise, just signal that they're already loaded.
      } else {
        self.set('loaded')
      }
    })
  },

  /**
   * Listen for errors and changes.
   */
  monitor: function () {
    var self = this

    process.on('uncaughtException', function (error) {
      self.log.error(error)
      process.exit()
    })

    process.stdin.on('data', function (json) {
      var data = JSON.parse('' + json)
      var path = data.path
      var asset = chug.cache.get(path)
      if (!asset) {
        return process.exit()
      }
      asset.load.handleChange(path)
      self.server.io('refresh')
    })

    process.on('exit', function () {
      self.server.io('exit')
    })
  },

  /**
   * Add to the response state before sending.
   *
   * @param  {Object} state  Provided state object.
   */
  decorateState: function (state, request, response) {
    var self = this

    // Allow far-future expires header on assets.
    state.cacheBust = self.cacheBust

    // In dev mode, make it easier to debug individual files.
    if (self.isDev) {
      state.headTags = self.uiAssets.getTags()
    }

    var userAgent = request.headers['user-agent']
    state.device = /mobile/i.test(userAgent) ? 'mobile' : ''
  }
})

function go (fn) {
  fn.apply(this)
  return this
}

function no () {
  return this
}
