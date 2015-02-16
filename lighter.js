#!/usr/bin/env node

if (process.mainModule == module) {
  require('./common/process/cli')({
    aliases: {
      n: 'new',
      d: 'debug', v: 'dev',
      t: 'test', s: 'stage',
      c: 'canary', p: 'prod'
    }
  });
  return;
}

require(__dirname + '/common/string/colors');

/**
 * Lighter exports an App factory function.
 */
var lighter = module.exports = function (options) {
  return new lighter.App(options);
};

/**
 * Expose Lighter's App type for instantiating apps.
 */
lighter.App = require(__dirname + '/lib/app');

/**
 * Expose the Lighter version via package.json lazy loading.
 */
Object.defineProperty(lighter, 'version', {
  get: function () {
    return require(__dirname + '/package.json').version;
  }
});

/**
 * Do nothing.
 */
lighter.no = function () {
};

/**
 * Do something.
 * @param {Function} fn  Something to do.
 */
lighter.go = function (fn) {
  fn.call(this);
};
