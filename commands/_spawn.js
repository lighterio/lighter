/**
 * Spawn an App in a child process, and restart the child process on close.
 */
var spawn = require('child_process').spawn;
var watch = require('../common/fs/deep-watch');
require('../common/json/write-stream');

// TODO: Make these thresholds configurable.
var RESTART_TIME = 500; // Try to restart in half a second.
var OK_TIME = 1e3; // Call a restart "ok" after 2 seconds without failing.

// Keep a reference to the child process.
var child;

module.exports = function (env) {

  // Spawn a child process and make it output to stdout.
  var appPath = process.env.LIGHTER_APP || 'app';

  // Allow the directory and environment to be fed into the command.
  var dir = process.env.LIGHTER_DIR || process.cwd();
  process.env.NODE_ENV = env;

  //if (/^(dev|debug)/.test(env)) {
    var watcher = watch(dir, {
      maxListSize: 1e4,
      notifyInterval: 1
    });
    watcher.on('change', function (path) {
      if (child) {
        child.stdin.write({
          type: 'change',
          path: path
        });
      }
    });
  //}

  var previousStart = new Date(0);
  var failureOutput;

  /**
   * Get a string of numberless ordered lines for deduping logs.
   */
  function munge(text) {
    var lines = ('' + text).split('\n');
    lines.forEach(function (line, index) {
      lines[index] = lines[index].replace(/\d+/, '');
    });
    lines.sort();
    text = lines.join('\n');
    return text;
  }

  /**
   * Start a Lighter app.
   */
  function start() {
    var output;
    var now = new Date();
    var elapsed = now - previousStart;
    previousStart = now;

    // If it's been a while since we restarted, call this a clean start.
    var isCleanStart = elapsed > OK_TIME;

    // Pass arguments to spawned processes.
    var args = process.argv.slice(3);
    args.unshift(appPath);

    child = spawn(process.execPath, args, {
      cwd: dir,
      env: process.env
    });

    var pipeToStdout = function () {
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stdout);
    };

    // When starting cleanly, pipe child process output directly to stdout.
    if (isCleanStart) {
      pipeToStdout();
    }

    // After a fast failure, buffer the output in case we fail again.
    else {
      output = '\n';
      var append = function (chunk) {
        output += chunk;
      };
      child.stdout.on('data', append);
      child.stderr.on('data', append);

      // When we've started ok, write output to stdout and start piping.
      var okTimer = setTimeout(function () {
        if (output) {
          process.stdout.write(output);
          pipeToStdout();
          child.stdout.removeListener('output', append);
          child.stderr.removeListener('output', append);
        }
        output = '';
      }, OK_TIME);
    }

    // Set the child's stdin to accept objects.
    JSON.writeStream(child.stdin);

    // When a child process dies, restart it.
    child.on('close', function () {

      // Dereference the child.
      child = undefined;

      // If we failed differently, log the new output.
      if (failureOutput && (munge(output) != munge(failureOutput))) {
        write(output);
      }
      // If we failed the same way, just show another red dot.
      else {
        write('\u001b[31m.\u001b[39m');
      }
      failureOutput = output;
      clearTimeout(okTimer);
      setTimeout(start, RESTART_TIME);
    });
  }

  /**
   * Try writing to `stdout`, and ignore failures.
   */
  function write(data) {
    try {
      if (data) {
        process.stdout.write(data);
      }
    }
    catch (e) {
      // TODO: Debug "TypeError: invalid data" at WriteStream.Socket.write
    }
  }

  start();

};
