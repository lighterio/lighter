var http = require('http')
var proto = http.ServerResponse.prototype
var codes = http.STATUS_CODES

proto.view =
proto.render = function (name, state) {
  var response = this
  var request = response.request
  var app = response.app
  var url = request.url

  // Default to empty template state.
  state = state || {}

  // Decorate the state with things like cacheBust.
  app.decorateState(state, request, response)
  state.view = name

  // If JSON was requested, indicate it.
  if (url.indexOf('.json') > -1) {
    state.isJson = 1
    response.setHeader('content-type', 'application/json')
    response.setHeader('access-control-allow-origin', '*')
    response.zip(JSON.stringify(state))
  } else {
    state.request = request
    state.response = response
    response.setHeader('content-type', 'text/html')
    var view = app.views[name]
    if (view) {
      var template = view.getMinifiedContent()
      var html
      try {
        html = template.call(template.cache, state)
        response[response.statusCode > 200 ? 'end' : 'zip'](html)
      } catch (e) {
        console.log(e)
        response.error('Failed while rendering view.', e)
      }
    } else {
      response.error('View not found: "' + name + '".')
    }
  }
}

/**
 * Expect one of the following:
 * - response.error(Integer errorNumber) // (e.g. 404)
 * - response.error(String errorMessage)
 * - response.error(String errorMessage, Error errorObject)
 */
proto.error = function (code, message, error) {
  var response = this
  var request = response.request
  var app = response.app

  // The numeric error code is optional.
  if (isNaN(code)) {
    error = message
    message = code
    code = 500
  }

  // The message is optional.
  if (message instanceof Error) {
    error = message
    message = error.message
  } else if (!message) {
    message = codes[code] || 'Server Error'
  }

  if (code === 404) {
    message += ': ' + request.url
  }

  // If there isn't an error, instantiate one.
  if (!(error instanceof Error)) {
    var stack = (error || 0).stack
    error = new Error(message)
    if (stack) {
      error.stack = stack
    }
  } else if (message) {
    error.message = message + '\n' + error.message
  }

  // Respond with the error.
  response.statusCode = code
  var key = 'error' + code
  var view = app.views[key] || app.views.error
  var sent = false
  if (view) {
    var state = {message: message}
    if (app.isDev) {
      state.stack = error.stack
      state.sql = error.sql
    }
    try {
      response.view(key, state)
      sent = true
    } catch (ignore) {
    }
  }
  if (!sent) {
    response.end('<h1>' + message + '</h1>')
  }

  // Log the error.
  app.log.error(error)
}
