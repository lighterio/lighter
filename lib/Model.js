var Class = require('./Class');

/**
 * A Model deals with data.
 */
module.exports = Class.extend({

  init: function init(app, path) {
    var model = this;
    model.app = app;

    app.logger.debug('New model: ' + path);
  }

});
