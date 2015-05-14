/**
 * The Common Cache saves lighter-common module references by category/name
 * rather than path, so only one copy of a module is loaded, regardless of
 * dependency graph structure. Versioning will be added in the future to
 * mitigate possible incompatibilities.
 *
 * This implementation also has the advantage of shortcutting the directory
 * discovery process at the `require` method, saving disk IO at startup time.
 *
 * @origin https://github.com/lighterio/lighter-common/common/module/common-cache.js
 * @version 0.0.1
 */

var Module = require('module');
var key = '_lighterCommonCache_0_0_1';
var cache = Module[key];

// If the cache doesn't exist yet, create it.
if (!cache) {

  cache = Module[key] = {};

  // TODO: Test this with older versions of Node.
  Module.prototype.require = function (path) {
    var module;
    var key;
    path.replace(/^.*\/common\/([^\/]+\/[^\/]+)$/, function (match, name) {
      key = name;
      module = cache[key];
    });
    if (!module) {
      module = Module._load(path, this);
      if (key) {
        cache[key] = module;
      }
    }
    return module;
  };
}

module.exports = cache;
