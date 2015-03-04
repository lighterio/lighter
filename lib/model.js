var Type = require('../common/object/type');

/**
 * A Model deals with data.
 */
var Model = module.exports = Type.extend({

  /**
   * Instantiate a model using Ormy.
   */
  init: function (app, asset) {
    var self = this;
    self.app = app;
    self.asset = asset;

    var parts = asset.location
      .substr(app.dir.length + 7)
      .replace(/[-_]?(model)?\.[a-z]+$/i, '')
      .split('/');

    var name = parts.pop();
    var dbKey = parts.pop();
    var db = app.dbs[dbKey] || app.db;

    if (!db) {
      throw new Error('Cannot add "' + name + '" model to "' +
        (dbKey || 'db') + '".\nDatabase does not exist.');
    }

    var proto = db.Model.prototype;
    self.__proto__ = proto;
    proto.init.call(self, db, name);
  }

});
