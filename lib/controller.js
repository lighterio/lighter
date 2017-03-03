var Type = require('lighter-type')

/**
 * A Controller handles transfers.
 */
module.exports = Type.extend(function Controller (app) {
  var self = this
  for (var key in this) {
    var fn = this[key]
    if (typeof fn === 'function') {
      if (/(GET|PUT|POST|DELETE)/.test(fn.name)) {
        key = (key === 'index' ? '' : '/' + key)
        var url = (this._path + key).replace(/[/\\][/\\]/, '/')
        var methods = fn.name.match(/(GET|PUT|POST|DELETE)/g)
        methods.forEach(function (method) {
          method = method.toLowerCase()
          app.server[method](url, function () {
            fn.apply(self, arguments)
          })
        })
      }
    }
  }
}, {

})
