/**
 * Extend the String prototype with terminal color methods.
 *
 * @origin https://github.com/lighterio/lighter-common/common/string/colors.js
 * @version 0.0.3
 */

// Export strings for direct modification.
var colors = module.exports = {
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
}

// When re-required, don't redefine.
if (String.prototype.red) {
  return
}

// Enable colors by default.
var enableColors = true

// Allow colors to be disabled by setting `String.colors = false`.
Object.defineProperty(String, 'colors', {
  enumerable: false,
  get: function () {
    return enableColors
  },
  set: function (value) {
    enableColors = value
    for (var key in colors) {
      if (value) {
        colors[key] = colors['_' + key] || colors[key]
      } else {
        colors['_' + key] = colors[key]
        colors[key] = ''
      }
    }
    return enableColors
  }
})

// Define non-enumerable properties on the String prototype.
function define (name, fn) {
  Object.defineProperty(String.prototype, name, {
    enumerable: false,
    get: fn
  })
}

define('plain', function () { return this.replace(/\u001b\[\d+m/g, ''); })
define('reset', function () { return enableColors ? '\u001b[0m' + this : this; })
define('base', function () { return enableColors ? '\u001b[39m' + this : this; })
define('bold', function () { return enableColors ? '\u001b[1m' + this + '\u001b[22m' : this; })
define('normal', function () { return enableColors ? '\u001b[2m' + this + '\u001b[22m' : this; })
define('italic', function () { return enableColors ? '\u001b[3m' + this + '\u001b[23m' : this; })
define('underline', function () { return enableColors ? '\u001b[4m' + this + '\u001b[24m' : this; })
define('inverse', function () { return enableColors ? '\u001b[7m' + this + '\u001b[27m' : this; })
define('hidden', function () { return enableColors ? '\u001b[8m' + this + '\u001b[28m' : this; })
define('strike', function () { return enableColors ? '\u001b[9m' + this + '\u001b[29m' : this; })
define('black', function () { return enableColors ? '\u001b[30m' + this + '\u001b[39m' : this; })
define('red', function () { return enableColors ? '\u001b[31m' + this + '\u001b[39m' : this; })
define('green', function () { return enableColors ? '\u001b[32m' + this + '\u001b[39m' : this; })
define('yellow', function () { return enableColors ? '\u001b[33m' + this + '\u001b[39m' : this; })
define('blue', function () { return enableColors ? '\u001b[34m' + this + '\u001b[39m' : this; })
define('magenta', function () { return enableColors ? '\u001b[35m' + this + '\u001b[39m' : this; })
define('cyan', function () { return enableColors ? '\u001b[36m' + this + '\u001b[39m' : this; })
define('white', function () { return enableColors ? '\u001b[37m' + this + '\u001b[39m' : this; })
define('gray', function () { return enableColors ? '\u001b[90m' + this + '\u001b[39m' : this; })
define('bgBlack', function () { return enableColors ? '\u001b[40m' + this + '\u001b[49m' : this; })
define('bgRed', function () { return enableColors ? '\u001b[41m' + this + '\u001b[49m' : this; })
define('bgGreen', function () { return enableColors ? '\u001b[42m' + this + '\u001b[49m' : this; })
define('bgYellow', function () { return enableColors ? '\u001b[43m' + this + '\u001b[49m' : this; })
define('bgBlue', function () { return enableColors ? '\u001b[44m' + this + '\u001b[49m' : this; })
define('bgMagenta', function () { return enableColors ? '\u001b[45m' + this + '\u001b[49m' : this; })
define('bgCyan', function () { return enableColors ? '\u001b[46m' + this + '\u001b[49m' : this; })
define('bgWhite', function () { return enableColors ? '\u001b[47m' + this + '\u001b[49m' : this; })
