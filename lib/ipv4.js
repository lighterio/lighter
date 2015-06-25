var os = require('os')

module.exports = function () {
  var interfaces = os.networkInterfaces()
  for (var key in interfaces) {
    var list = interfaces[key]
    for (var i = 0; i < list.length; i++) {
      var interface = list[i]
      if ((interface.family === 'IPv4') && !interface.internal) {
        return interface.address
      }
    }
  }
  return '127.0.0.1'
}
