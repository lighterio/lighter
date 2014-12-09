#!/usr/bin/env node
if (process.mainModule == module) {
  require(__dirname + '/common/process/cli')({
    aliases: {
      n: 'new',
      d: 'debug',
      v: 'dev',
      s: 'stage',
      t: 'test',
      c: 'canary',
      p: 'prod'
    }
  });
}

/**
 * Expose a function that starts a Lighter server.
 */
var lighter = module.exports = function (options) {
  var App = require(__dirname + '/lib/app');
  return new App(options);
};

/**
 * Expose the Lighter version via package.json lazy loading.
 */
Object.defineProperty(lighter, 'version', {
  get: function () {
    return require(__dirname + '/package.json').version;
  }
});
