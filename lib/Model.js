var OrmyModel = require('ormy/lib/Model');

/**
 * A Model deals with data.
 */
var Model = module.exports = OrmyModel.extend({

  init: function init(app, asset) {
    var model = this;
    this.app = app;
    this.asset = asset;
    // TODO: Allow this to be configured & support camel case.
    this.nameTable = Model.underscored;
    this.nameColumn = Model.underscored;

    var dbAndModel = asset.location
      .replace(/^.*\/([^\/]+\/[^\/]+)\.[^\/]+$/, '$1')
      .split('/');
    var dbKey = dbAndModel[0];
    var name = dbAndModel[1].replace(/[-_]?(model)?$/i, '');
    this.db = app.dbs[dbKey] || app.db;
    if (!this.db) {
      app.logger.error('Cannot add "' + name + '" model to ' +
        (dbKey ? '"' + dbKey + '"' : '') + '.');
    }
    this.table = this.table || this.nameTable(name);
    this._super(this.db, this);
  }

});

Model.underscored = function (string) {
  return string.replace(/([a-z]*)([A-Z])/g, function (match, lower, upper) {
    return lower + (lower ? '_' : '') + upper.toLowerCase();
  });
};
