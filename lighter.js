#!/usr/bin/env node

/**
 * When running directly, start the Lighter CLI.
 * The CLI can be used to
 */
if (process.mainModule == module) {

  // The Lighter CLI accepts a set of commands.
  var commands = {};

  // Each environment has its own command.
  // For example: `lighter dev` starts Lighter in development mode.
  var envs = ['debug', 'dev', 'test', 'stage', 'beta', 'new', 'canary', 'prod'];
  var aliases = {};
  envs.forEach(function (env) {
    commands[env] = {
      note: 'Starts the app as a "' + env + '" environment.',
      options: {},
      alias: env == 'debug' ? 'e' : env[0]
    };
  });

  // Run the CLI with `shellify`.
  require('shellify')({
    root: __dirname,
    commands: commands
  });
}


/**
 * Expose a function that starts a Lighter server.
 */
var lighter = module.exports = function (options) {
  var App = require('./lib/App');
  return new App(options);
};

/**
 * Expose the Lighter version via package.json lazy loading.
 */
Object.defineProperty(lighter, 'version', {
  get: function () {
    return require('./package.json').version;
  }
});
