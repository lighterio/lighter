#!/usr/bin/env node
var shellify = require('shellify');

shellify({
  root: require.resolve('lighter').replace(/\/lighter\.js$/, '/'),
  commands: {
    debug: {
      note: 'Starts the app as a "debug" environment',
      options: {
      }
    },
    dev: {
      note: 'Starts the app as a "dev" environment',
      options: {
      },
      alias: 'd'
    },
    test: {
      note: 'Starts the app as a "test" environment',
      options: {
      }
    },
    stage: {
      note: 'Starts the app as a "stage" environment',
      options: {
      }
    },
    new: {
      note: 'Starts the app as a "new" environment',
      options: {
      }
    },
    canary: {
      note: 'Starts the app as a "canary" environment',
      options: {
      }
    },
    prod: {
      note: 'Starts the app as a "prod" environment',
      options: {
      },
      alias: 'p'
    }
  }
});
