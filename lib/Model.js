var OrmyModel = require('ormy/lib/Model');

/**
 * A Model deals with data.
 */
var Model = module.exports = OrmyModel.extend({

  init: function init(app, asset) {
    var self = this;
    self.app = app;
    self.asset = asset;
    // TODO: Allow this to be configured & support camel case.
    self.nameTable = Model.underscored;
    self.nameColumn = Model.underscored;

    var dbAndModel = asset.location
      .replace(/^.*[\/\\]([^\/\\]+[\/\\][^\/\\]+)\.[^\/\\]+$/, '$1')
      .split(/[\/\\]/);
    var dbKey = dbAndModel[0];
    var name = dbAndModel[1].replace(/[-_]?(model)?$/i, '');
    self.db = app.dbs[dbKey] || app.db;
    if (!self.db) {
      app.logger.error('Cannot add "' + name + '" model to ' +
        (dbKey ? '"' + dbKey + '"' : '') + '.');
    }
    self.table = self.table || self.nameTable(name);
    OrmyModel.call(self, self.db, self);
  }

});

Model.underscored = function (string) {
  return string.replace(/([a-z]*)([A-Z])/g, function (match, lower, upper) {
    return lower + (lower ? '_' : '') + upper.toLowerCase();
  });
};
