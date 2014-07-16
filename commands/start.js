var shellify = require('shellify');
var spawn = require('child_process').spawn;
var Duplex = require('stream').Duplex;
var util = require('util');
var previousStart = new Date(0);

// TODO: Make these thresholds configurable.
var restartDelay = 500; // Try to restart in half a second
var okTime = 2e3; // Call a restart "ok" if it goes 2 seconds without failing.

module.exports = function (env) {

  /**
   * Start a Lighter app.
   */
  function start() {

    var now = new Date();
    var elapsed = now - previousStart;
    previousStart = now;

    // If it's been a while since we restarted, call this a clean start.
    var isCleanStart = elapsed > okTime;

    // Spawn a child process and make it output to stdout.
    var child = spawn(process.execPath, ['app'], {env: {NODE_ENV: env}});

    var pipeToStdout = function () {
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stdout);
    };

    // When starting cleanly, pipe child process output directly to stdout.
    if (isCleanStart) {
      pipeToStdout();
    }

    // After a fast failure, use a buffer in case we fail again.
    else {
      var isBuffering = true;
      var data = '\n';

      var append = function (chunk) {
        data += chunk;
      };

      child.on('data', append);

      // When we've started ok, write data to stdout and start piping.
      var okTimer = setTimeout(function () {
        process.stdout.write(data);
        pipeToStdout();
        child.removeListener('data', append);
        data = null;
      }, okTime);
    }

    // Restart once a second at most.
    child.on('close', function () {
      process.stdout.write('\u001b[31m.\u001b[39m');
      clearTimeout(okTimer);
      setTimeout(start, restartDelay);
    });
  }

  start();

};
