var Class = require('./Class');

/**
 * A Controller handles requests and sends responses.
 */
module.exports = Class.extend({

  init: function init(app, path) {
    var controller = this;
    controller.app = app;

    if (path.indexOf(app.config.dir) === 0) {
      path = path.substr(app.config.dir.length);
    }
    if (path.indexOf('controllers/') === 0) {
      path = path.substr(12);
    }
    path = path.replace(/(|[iI]ndex)(|_?[cC]ontroller)\.[a-z]+$/, '');
    Object.each(function (property, action) {
        if (typeof action == 'function') {
            if (/(GET|PUT|POST|DELETE)/.test(action.name)) {
              var url = path + (property == 'index' ? '' : '/' + property);
              if (typeof app.config.formatControllerPath == 'function') {
                url = app.config.formatControllerPath(url);
              }
              var methods = action.name.match(/(GET|PUT|POST|DELETE)/g);
              methods.forEach(function (method) {
                method = method.toLowerCase();
                app.server[method](url, function () {
                  action.apply(controller, arguments);
                });
              });
            }
        }
    });
    for (var property in controller) {
    }
  }

});
