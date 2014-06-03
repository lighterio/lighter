var shellify = require('shellify');
var spawn = require('child_process').spawn;

module.exports = function (env) {

  /**
   * Start a Lighter app.
   */
  function start() {

    // Keep track of our start time.
    var started = new Date();

    // Spawn a child process and make it output to stdout.
    var child = spawn(process.execPath, ['app'], {env: {NODE_ENV: env}});
    child.stderr.pipe(process.stdout);
    child.stdout.pipe(process.stdout);

    // Restart once a second at most.
    child.on('close', function () {
      var elapsed = new Date() - started;
      delay = Math.max(1e3 - elapsed, 0);
      setTimeout(start, delay);
    });
  }

  start();

};
