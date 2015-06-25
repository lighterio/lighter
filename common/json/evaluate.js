/**
 * Evaluate a non-strict JSON string and return its value.
 *
 * @origin https://github.com/lighterio/lighter-common/common/json/evaluate.js
 * @version 0.0.1
 */

var evaluate = module.exports = JSON.evaluate = function (js, fallback) {
  delete evaluate.error
  try {
    eval('JSON.evaluate.value=' + js); // jshint ignore:line
    return evaluate.value
  } catch (error) {
    error.message += '\nJS: ' + js
    evaluate.error = error
    return fallback
  }
}
