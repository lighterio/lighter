#!/usr/bin/env node

/**
 * Watch for changes on all directories under a given directory.
 *
 * @origin lighter-common/common/fs/deep-watch.js
 * @version 0.0.2
 * @import event/emitter
 */

var fork = require('child_process').fork;
var fs = require('fs');
var Emitter = require('../event/emitter');

/**
 * Fork a child process, and return an emitter that fires "change" events.
 */
var deepWatch = module.exports = function (dir, options) {
  options = options || {};
  options.dir = dir || process.cwd();
  var watcher = new Emitter();
  var child = fork(__filename, [JSON.stringify(options)], {
    silent: true
  });
  // When a change occurs, make sure the new version of the file gets loaded.
  child.on('message', function (path) {
    delete require.cache[path];
    watcher.emit('change', path);
  });
  return watcher;
};

// Remember options and watched files.
var dir;
var ignoreDir = /\/(logs?|data|\.[^\/]+)$/;
var ignoreFile = /\/(\.subl[\w\d]+\.tmp|[^\/]+\.swp)$/;
var maxFsWatches;
var maxListSize;
var checkInterval;
var notifyInterval;
var okToNotifyAfter;
var started = Date.now();
var map = {};
var list = [];

/**
 * If this is being called directly, start watching.
 */
if (process.mainModule == module) {
  var options = JSON.parse(process.argv[2]);
  dir = options.dir.replace(/\\/g, '/');
  ignoreDir = options.ignoreDir || ignoreDir; // Don't watch logs or leading-dot directories.
  maxFsWatches = options.maxFsWatches || 1e2; // Only call fs.watch on up to 100 files.
  maxListSize = options.maxListSize || 1e4; // Only set up 10K paths for periodic checks.
  fsWatchDelay = options.fsWatchDelay || 1e3; // Wait 1 second before starting watches.
  checkInterval = options.checkInterval || 1e2; // Check a modified date every 100ms.
  notifyInterval = options.notifyInterval || 1e3; // Don't notify more than once a second.
  okToNotifyAfter = Date.now() + notifyInterval; // Remember when it's ok to notify.
  ignoreFile = options.ignoreFile || ignoreFile; // Don't send changes for swap files, etc.
  ignoreDir = new RegExp(ignoreDir);
  ignoreFile = new RegExp(ignoreFile);
  watch(dir);
  if (checkInterval) {
    setInterval(checkDir, checkInterval);
  }
  setTimeout(startWatches, fsWatchDelay);
}

/**
 * Recurse to find directories we can watch.
 */
function watch(dir) {
  if (!ignoreDir.test(dir) && !map[dir]) {
    fs.lstat(dir, function (e, stat) {
      if (!e) {
        if (stat.isSymbolicLink()) {
          var source = dir;
          fs.readlink(source, function (e, link) {
            if (!e) {
              var dest = link;
              if (dest[0] != '/') {
                while (dest.substr(0, 3) == '../') {
                  dest = dest.substr(3);
                  source = source.replace(/\/[^\/]+$/, '');
                }
                if (dest.substr(0, 2) == './') {
                  dest = dest.substr(2);
                }
                dest = source + '/' + dest;
              }
              watch(dest);
            }
          });
        }
        else if (stat.isDirectory()) {
          addDir(dir, stat);
        }
      }
    });
  }
}

/**
 * Add a watchable directory to the map and list of directories we're watching.
 */
function addDir(dir, stat) {
  var mtime = stat.mtime.getTime();
  if (!map[dir] && list.length <= maxListSize) {
    map[dir] = mtime;
    list.push(dir);
    clearTimeout(sortList.timer);
    sortList.timer = setTimeout(sortList, checkInterval);
    fs.readdir(dir, function (e, files) {
      if (!e) {
        files.forEach(function (file) {
          watch(dir + '/' + file);
        });
      }
    });
  }
}

/**
 * Sort the list of watched files by age.
 */
function sortList() {
  list.sort(function (a, b) {
    return map[a] > map[b] ? -1 : 1;
  });
}

/**
 * Iterate over the age-prioritized list, and start fs watches.
 */
function startWatches() {
  list.forEach(function (dir, i) {
    if (i < maxFsWatches) {
      try {
        fs.watch(dir, function (op, file) {
          notify(dir + '/' + file);
        });
      }
      catch (e) {
        // fs.watch is known to be unstable.
      }
    }
  });
}

var i = 0;
var indexes = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  0, 1, 2, 3, 4, 10, 11, 12, 13, 14,
  0, 1, 2, 3, 4, 15, 16, 17, 18, 19,
  0, 1, 2, 3, 4, 20, 21, 22, 23, 24,
  0, 1, 2, 3, 4, 25, 26, 27, 28, 29
];

/**
 * Check a directory for changes.
 */
function checkDir() {
  var n = indexes[i];
  if (i > 44) {
    indexes[i] = (indexes[i] + 5) % list.length;
  }
  i = (i + 1) % indexes.length;
  var dir = list[n];
  if (dir) {
    fs.stat(dir, function (e, stat) {
      if (!e && (stat.mtime > okToNotifyAfter)) {
        fs.readdir(dir, function (e, files) {
          if (!e) {
            files.forEach(function (file) {
              var path = dir + '/' + file;
              fs.stat(path, function (e, stat) {
                if (!e && (stat.mtime > okToNotifyAfter)) {
                  notify(path);
                }
              });
            });
          }
        });
      }
    });
  }
}

/**
 * Notify the master process that something changed.
 */
function notify(path) {
  var now = Date.now();
  if ((now > okToNotifyAfter) && !ignoreFile.test(path)) {
    process.send(path);
    okToNotifyAfter = now + notifyInterval;
    sortList();
  }
}
