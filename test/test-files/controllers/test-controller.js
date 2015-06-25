var Controller = require('../../../lib/controller')

module.exports = Controller.extend({

  index: function GET (request, response) {
    response.view('index')
  }

})
