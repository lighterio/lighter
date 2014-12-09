/**
 * Listen to a stream's data, and emit objects.
 *
 * @origin lighter-common/common/json/write-stream.js
 * @version 0.0.2
 * @import json/scriptify
 */

// Ensure that we can eval non-strict JSON.
require(__dirname + '/scriptify');

/**
 * Write non-strict JSON objects to a stream.
 */
JSON.writeStream = function (stream) {
  var write = stream.write;
  stream.write = function (object) {
    var js = JSON.scriptify(object);
    write.call(stream, js + '\n');
  };
  return stream;
};
