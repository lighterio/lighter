/**
 * Allow paths to be shortened with "./" and "~/" where appropriate.
 * // TODO: Detect when "../" can be used.
 *
 * @origin https://github.com/lighterio/lighter-common/common/fs/shorten-path.js
 * @version 0.0.1
 */

var shortenPath = module.exports = function (path) {
  var dirs = shortenPath.dirs;
  for (var i = 0; i < 2; i++) {
    var dir = dirs[i];
    if (dir[0] && (path.indexOf(dir[0]) === 0)) {
      return dir[1] + path.substr(dir[0].length);
    }
  }
  return path;
};

/**
 * Preload cwd and home, but expose them so they can be changed upon chdir.
 */
shortenPath.dirs = [
  [process.cwd() + '/', './'],
  [process.env.HOME + '/', '~/']
];
