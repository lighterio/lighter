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

        function iterate_middleware (cur, others, final, args) {

          if (cur === final ) {
            return final.apply(controller, args);
          }

          cur.call(controller, args[0], args[1], function next (err) {
              if (err) {
                throw err;
              }
              iterate_middleware(others[0], others.slice(1), final, args);
            });
        }

        var allActions;

        if (Array.isArray(action)) {
          allActions = action;
          action = action[action.length-1];
        } else {
          allActions = [action];
        }

        if (typeof action == 'function') {
          if (/(GET|PUT|POST|DELETE)/.test(action.name)) {
            property = (property == 'index' ? '' : '/' + property);
            var url = (controller.url + property).replace(/\/\//, '/');
            var methods = action.name.match(/(GET|PUT|POST|DELETE)/g);
            methods.forEach(function (method) {
              method = method.toLowerCase();
              controller.app.server[method](url, function () {

                // action.apply(controller, arguments);

                // Middleware support on controller level
                iterate_middleware(allActions[0], allActions.slice(1), action, arguments);
              });
            });
          }
        }
      })(controller[property]);
    };
  }

});
