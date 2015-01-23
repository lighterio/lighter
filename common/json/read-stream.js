/**
 * Listen to a stream's data, and emit events like "object" and "string".
 *
 * @origin lighter-common/common/json/read-stream.js
 * @version 0.0.3
 * @import json/eval
 */

// Ensure that we can eval non-strict JSON.
require(__dirname + '/eval');

/**
 * Get lines from a stream, and fire events when they are parsed.
 */
JSON.readStream = function (stream, event) {
  var data = '';
  stream.on('data', function (chunk) {
    data += chunk;
    var end = data.indexOf('\n');
    while (end > 0) {
      var line = data.substr(0, end);
      data = data.substr(end + 1);
      var object = JSON.eval(line);
      var error = JSON.eval.error;
      if (error) {
        stream.emit('error', error);
      }
      else {
        stream.emit(event || (typeof object), object);
      }
      end = data.indexOf('\n');
    }
  });
  return stream;
};
