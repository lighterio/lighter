var Class = require('./Class');

/**
 * A Model deals with data.
 */
var Model = module.exports = Class.extend({

  init: function init(app, asset) {
    this.app = app;
    this.asset = asset;
    this.formatTable = Model[this.tableFormat || app.config.dbTableFormat];
    this.formatField = Model[this.fieldFormat || app.config.dbFieldFormat];
    this.setup();
  },

  setup: function setup() {
    var app = this.app;
    var pair = this.asset.location
      .replace(/^.*\/([^\/]+\/[^\/]+)\.[^\/]+$/, '$1')
      .split('/');
    var dbKey = pair[0];
    var name = pair[1].replace(/[-_]?(model)?$/i, '');
    var db = app.dbs[dbKey] || this.apps.db;
    if (!db) {
      app.logger.error('Cannot add "' + name + '" model to ' +
        (dbKey ? '"' + dbKey + '"' : '') + '.');
      app.logger.warn('Database does not exist.');
    }

    // TODO: Support other ORMs?
    var orm = require('sequelize');
    var tableName = this.formatTable(pair[1]);
    var fields = {};
    for (var field in this.fields) {
      fields[this.formatField(field)] = orm[this.fields[field]];
    }
    fields.deleted = orm.DATE;
    db.define(tableName, fields, {
      createdAt: 'created',
      updatedAt: 'updated'
    });
    db
      .sync()
      .complete(function (err) {
         if (!!err) {
           app.logger.error('Failed to sync "' + name + '" model.', err);
         } else {
           app.logger.info('Synced "' + name + '" model.');
         }
      });
  }

});

Model.underscored = function (string) {
  return string.replace(/([a-z]*)([A-Z])/g, function (match, lower, upper) {
    return lower + (lower ? '_' : '') + upper.toLowerCase();
  });
};
