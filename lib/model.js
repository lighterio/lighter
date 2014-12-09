var OrmyModel = require('ormy/lib/model');
var caser = require('../common/string/caser');

/**
 * A Model deals with data.
 */
var Model = module.exports = OrmyModel.extend({

  // When the model is initialized, add it to its database.
  init: function (app, asset) {
    var self = this;

    var parts = asset.location
      .substr(app.config.dir.length + 7)
      .replace(/[-_]?(model)?\.[a-z]+$/i, '')
      .split('/');

    var modelName = parts.pop();
    var dbKey = parts.pop();
    var db = app.dbs[dbKey] || app.db;

    if (!db) {
      app.logger.error('Cannot add "' + modelName + '" model to ' +
        (dbKey ? '"' + dbKey + '"' : '') + '.');
    }

    self.db = db;
    self.tableCase = self.tableCase || db.config.tableCase;
    self.columnCase = self.columnCase || db.config.columnCase;
    self.table = self.table || caser[self.tableCase](modelName);

    OrmyModel.call(self, self.db, self);
  }

});
