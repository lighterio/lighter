var Flagger = require('../common/event/flagger');
var caser = require('../common/string/caser');
var methodPattern = /(CONNECT|DELETE|GET|HEAD|OPTIONS|POST|PUT|TRACE)/g;

/**
 * A Controller handles requests and sends responses.
 */
module.exports = Flagger.extend({

  /**
   * Construct a controller is by applying its routes.
   */
  init: function (app, asset) {
    var self = this;
    self.app = app;
    self.asset = asset;

    // Get the base URL for this controller based on its file location.
    var parts = asset.location
      .substr(app.config.dir.length + 12)
      .replace(/(index)?[-_]?(controller)?\.[a-z]+$/i, '')
      .split('/');
    parts.forEach(function (part, i) {
      parts[i] = caser[app.config.urlCase](part);
    });
    self.url = parts.join('/');

    // Iterate over the controller's methods, and map routes.
    for (var property in self) {
      (function (fn) {
        if (typeof fn == 'function') {
          var methods = (fn.name || '').match(methodPattern);
          if (methods) {
            fn.self = self;
            var key = (property == 'index' ? '' : '/' + property);
            var url = (self.url + key).replace(/[\/]+/g, '/');
            methods.forEach(function (method) {
              method = method.toLowerCase();
              app.server[method](url, fn);
              app.server[method](url + '.json', fn);
            });
          }
        }
      })(self[property]);
    }
  }

});
