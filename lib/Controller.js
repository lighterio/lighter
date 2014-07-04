var Class = require('./Class');

/**
 * A Controller handles requests and sends responses.
 */
module.exports = Class.extend({

  // Set up a controller that's been chugged in.
  init: function init(app, asset) {
    this.app = app;
    this.asset = asset;
    this.url = this._getUrl();
    this._addRoutes();
  },

  // Get the base URL for this controller based on its file location.
  _getUrl: function () {
    return this.asset.location
      .replace(/^.*\/controllers\//, '/')
      .replace(/(|[iI]ndex)(|_?[cC]ontroller)\.[a-z]+$/, '');
  },

  // Iterate over this controller's methods and set up routes.
  _addRoutes: function () {
    var controller = this;
    for (var property in controller) {
      (function (action) {
        if (typeof action == 'function') {
          if (/(GET|PUT|POST|DELETE)/.test(action.name)) {
            property = (property == 'index' ? '' : '/' + property);
            var url = (controller.url + property).replace(/\/\//, '/');
            var methods = action.name.match(/(GET|PUT|POST|DELETE)/g);
            methods.forEach(function (method) {
              method = method.toLowerCase();
              controller.app.server[method](url, function () {
                action.apply(controller, arguments);
              });
            });
          }
        }
      })(controller[property]);
    }
  }

});
