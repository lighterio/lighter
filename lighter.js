var App = require('./lib/App');

/**
 * Start a Lighter server with some options.
 */
var lighter = module.exports = function (options) {
  return new App(options);
};

/**
 * Expose the version to module users.
 */
lighter.version = require('./package.json').version;
