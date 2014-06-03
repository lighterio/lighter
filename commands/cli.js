#!/usr/bin/env node
var shellify = require('shellify');

shellify({
  root: require.resolve('lighter').replace(/\/lighter\.js$/, '/'),
  commands: {
    dev: {
      note: 'Starts the app in development mode',
      options: {
      },
      alias: 'd'
    },
    prod: {
      note: 'Starts the app in production mode',
      options: {
      },
      alias: 'p'
    }
  }
});
