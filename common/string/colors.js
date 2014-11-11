/**
 * Extend the String prototype with terminal color methods.
 *
 * @origin lighter-common/common/string/colors.js
 * @version 0.0.1
 */

// Export strings for direct modification.
module.exports = {
  reset: '\u001b[0m',
  base: '\u001b[39m',
  bgBase: '\u001b[49m',
  bold: '\u001b[1m',
  normal: '\u001b[2m',
  italic: '\u001b[3m',
  underline: '\u001b[4m',
  inverse: '\u001b[7m',
  hidden: '\u001b[8m',
  strike: '\u001b[9m',
  black: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
  gray: '\u001b[90m',
  bgBlack: '\u001b[40m',
  bgRed: '\u001b[41m',
  bgGreen: '\u001b[42m',
  bgYellow: '\u001b[43m',
  bgBlue: '\u001b[44m',
  bgMagenta: '\u001b[45m',
  bgCyan: '\u001b[46m',
  bgWhite: '\u001b[47m'
};

// When re-required, don't redefine.
if (String.prototype.red) {
  return;
}

// Enable colors by default.
var colors = true;

// Allow colors to be disabled by setting `String.colors = false`.
Object.defineProperty(String, 'colors', {
  enumerable: false,
  get: function () {
    return colors;
  },
  set: function (value) {
    colors = value;
    return colors;
  }
});

// Define non-enumerable properties on the String prototype.
function define(name, fn) {
  Object.defineProperty(String.prototype, name, {
    enumerable: false,
    get: fn
  });
};

define('reset', function () { return colors ? '\u001b[0m' + this + '\u001b[0m' : this; });
define('bold', function () { return colors ? '\u001b[1m' + this + '\u001b[22m' : this; });
define('normal', function () { return colors ? '\u001b[2m' + this + '\u001b[22m' : this; });
define('italic', function () { return colors ? '\u001b[3m' + this + '\u001b[23m' : this; });
define('underline', function () { return colors ? '\u001b[4m' + this + '\u001b[24m' : this; });
define('inverse', function () { return colors ? '\u001b[7m' + this + '\u001b[27m' : this; });
define('hidden', function () { return colors ? '\u001b[8m' + this + '\u001b[28m' : this; });
define('strike', function () { return colors ? '\u001b[9m' + this + '\u001b[29m' : this; });
define('black', function () { return colors ? '\u001b[30m' + this + '\u001b[39m' : this; });
define('red', function () { return colors ? '\u001b[31m' + this + '\u001b[39m' : this; });
define('green', function () { return colors ? '\u001b[32m' + this + '\u001b[39m' : this; });
define('yellow', function () { return colors ? '\u001b[33m' + this + '\u001b[39m' : this; });
define('blue', function () { return colors ? '\u001b[34m' + this + '\u001b[39m' : this; });
define('magenta', function () { return colors ? '\u001b[35m' + this + '\u001b[39m' : this; });
define('cyan', function () { return colors ? '\u001b[36m' + this + '\u001b[39m' : this; });
define('white', function () { return colors ? '\u001b[37m' + this + '\u001b[39m' : this; });
define('gray', function () { return colors ? '\u001b[90m' + this + '\u001b[39m' : this; });
define('bgBlack', function () { return colors ? '\u001b[40m' + this + '\u001b[49m' : this; });
define('bgRed', function () { return colors ? '\u001b[41m' + this + '\u001b[49m' : this; });
define('bgGreen', function () { return colors ? '\u001b[42m' + this + '\u001b[49m' : this; });
define('bgYellow', function () { return colors ? '\u001b[43m' + this + '\u001b[49m' : this; });
define('bgBlue', function () { return colors ? '\u001b[44m' + this + '\u001b[49m' : this; });
define('bgMagenta', function () { return colors ? '\u001b[45m' + this + '\u001b[49m' : this; });
define('bgCyan', function () { return colors ? '\u001b[46m' + this + '\u001b[49m' : this; });
define('bgWhite', function () { return colors ? '\u001b[47m' + this + '\u001b[49m' : this; });
