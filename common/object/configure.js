/**
 * Add non-enumerable config, app, and logger properties to an object.
 *
 * @origin lighter-common/common/object/configure.js
 * @version 0.0.1
 */
var configure = module.exports = function (object) {
  object = object || {};
  for (var i = 1, n = arguments.length; i < n; i++) {
    var config = arguments[i] || NOTHING;
    var app = config.app || NOTHING;
    var logger = config.logger || app.logger || NOTHING;
    define(object, 'config', config);
    define(object, 'app', app);
    define(object, 'logger', logger);
  }
  return object;
};

// Zero is falsy, yet propertiable.
var NOTHING = 0;

/**
 * Define or redefine a non-enumerable property.
 */
function define(object, key, value) {
  if (object.hasOwnProperty(key)) {
    object[key] = object[key] || value;
  }
  else {
    Object.defineProperty(object, key, {
      value: value,
      enumerable: false
    });
  }
}