/**
 * Listen to a stream's data, and emit objects.
 *
 * @origin https://github.com/lighterio/lighter-common/common/json/write-stream.js
 * @version 0.0.3
 * @import json/scriptify
 */

// Ensure that we can generate non-strict JSON.
var scriptify = require(__dirname + '/scriptify');

/**
 * Write non-strict JSON objects to a stream.
 */
JSON.writeStream = function (stream) {
  var write = stream.write;
  stream.write = function (object) {
    var js = scriptify(object);
    if (stream.writable) {
      write.call(stream, js + '\n');
    }
    else {
      stream.once('drain', function () {
        write.call(stream, js + '\n');
      });
    }
  };
  return stream;
};
