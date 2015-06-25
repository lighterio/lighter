/**
 * Listen to a stream's data, and emit objects.
 *
 * @origin https://github.com/lighterio/lighter-common/common/json/write-stream.js
 * @version 0.0.4
 * @import json/scriptify
 */

// Ensure that we can generate non-strict JSON.
var scriptify = require(__dirname + '/scriptify')

/**
 * Write non-strict JSON objects to a stream.
 */
JSON.writeStream = function (stream, fn) {
  var write = stream.write
  stream.write = function (object) {
    var js = scriptify(object)
    return write.call(stream, js + '\n', 'utf-8', fn)
  }
  return stream
}
