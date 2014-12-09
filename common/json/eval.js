/**
 * Evaluate a non-strict JSON string and return its value.
 *
 * @origin lighter-common/common/json/eval.js
 * @version 0.0.1
 */

JSON.eval = function (js, fallback) {
  delete JSON.eval.error;
  try {
    eval('JSON.eval.value=' + js);
    return JSON.eval.value;
  }
  catch (error) {
    error.message += '\nJS: ' + js;
    JSON.eval.error = error;
    return fallback;
  }
};
