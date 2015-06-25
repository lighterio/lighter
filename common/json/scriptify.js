/**
 * Convert an object to non-strict JSON, complete with JS code
 * for re-constructing Date, Error, Function and RegExp values.
 *
 * The JSON.scriptify method also has options, attached as properties:
 * - scriptify.ownPropertiesOnly: false
 * - scriptify.maxDepth: 5
 *
 * @origin https://github.com/lighterio/lighter-common/common/json/scriptify.js
 * @version 0.0.3
 */

var scriptify = module.exports = JSON.scriptify = function (value, stack) {
  var type = typeof value
  if (type === 'function') {
    return value.toString()
  }
  if (type === 'string') {
    return JSON.stringify(value)
  }
  if (type === 'object' && value) {
    if (value instanceof Date) {
      return 'new Date(' + value.getTime() + ')'
    }
    if (value instanceof Error) {
      return '(function(){var e=new Error(' + scriptify(value.message) + ');' +
        'e.stack=' + scriptify(value.stack) + ';return e})()'
    }
    if (value instanceof RegExp) {
      return '/' + value.source + '/' + (value.global ? 'g' : '') + (value.ignoreCase ? 'i' : '') + (value.multiline ? 'm' : '')
    }
    var i, length
    if (stack) {
      length = stack.length
      for (i = 0; i < length; i++) {
        if (stack[i] === value) {
          return '{"^":' + (length - i) + '}'
        }
      }
    }
    stack = stack || []
    stack.push(value)
    var string
    if (stack.length > scriptify.maxDepth) {
      value = (value instanceof Array) ? '"[Array]"' : '"[Object]"'
    } else if (value instanceof Array) {
      string = '['
      length = value.length
      for (i = 0; i < length; i++) {
        string += (i ? ',' : '') + scriptify(value[i], stack)
      }
      stack.pop()
      return string + ']'
    } else {
      i = 0
      string = '{'
      for (var key in value) {
        if (scriptify.ownPropertiesOnly || value.hasOwnProperty(key)) {
          string += (i ? ',' : '') + (/^[$_a-z][\w$]*$/i.test(key) ? key : '"' + key + '"') + ':' + scriptify(value[key], stack)
          i++
        }
      }
      stack.pop()
      return string + '}'
    }
  }
  return '' + value
}

scriptify.maxDepth = 5
scriptify.ownPropertiesOnly = false
