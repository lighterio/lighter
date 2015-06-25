var fs = require('fs')
var path = require('path')
var chug = require('chug')
var plans = require('plans')
var log = require('cedar')()
var cwd = process.cwd()
var dirs = [
  'controllers',
  'data',
  'log',
  'models',
  'public',
  'scripts',
  'styles',
  'tags',
  'test',
  'views'
]

module.exports = {

  description: 'Import lighter-common modules into the current directory',

  options: [
    '-p, --port     Set the new application up to run on a specific port.'
  ],

  extras: 'properties',

  run: function (options) {
    var self = this
    self.name = options.properties[0] || 'project'
    self.port = options.properties[1] || 9999
    self.boilerplates = path.resolve(__dirname, '../boilerplates/new-app')
    self.load = chug(self.boilerplates)
    self.dir = cwd + '/' + self.name
    self.load
      .replace(/<<name>>/g, self.name)
      .replace(/<<port>>/g, self.port)
    self.makeDirectories()
  },

  newPath: function (oldPath) {
    var self = this
    return self.dir + oldPath.substr(self.boilerplates.length)
  },

  makeDirectories: function () {
    var self = this
    var fns = []
    self.load.then(function () {
      self.load.watchablePaths.forEach(function (watchablePath) {
        fns.push(function (done) {
          var newPath = self.newPath(watchablePath)
          fs.mkdir(newPath, done)
        })
      })
      plans.each(fns).then(function () {
        self.copyFiles()
      })
    })
  },

  copyFiles: function () {
    var self = this
    var fns = []
    self.load.each(function (asset) {
      fns.push(function (done) {
        var file = asset.location.substr(self.boilerplates.length + 1)
        asset.write(self.dir, file).onceReady(done)
      })
    })
    plans.each(fns).then(function () {
      log('DONE!')
    })
  }

}
