var http = require('http');
var proto = http.ServerResponse.prototype;
var codes = http.STATUS_CODES;

proto.view =
proto.render = function (name, context) {
  var response = this;
  var request = response.request;
  var app = response.app;

  // Default to empty template context.
  context = context || {};

  // Decorate the context with things like cacheBust.
  app.decorateContext(context, request, response);

  var d6 = request.query.d6;
  if (d6) {
    // Tell D6 which view to render.
    context.d6 = name;
    // If we're redirecting, tell the browser where we redirected to.
    if (d6 == 'r') {
      context.d6u = request.url.replace(/[&\?]d6=r/, '');
    }
    response.setHeader('content-type', 'application/json');
    response.zip(JSON.stringify(context));
  }
  else {
    context.request = request;
    context.response = response;
    response.setHeader('content-type', 'text/html');
    var view = app.views[name];
    if (view) {
      var template = view.getMinifiedContent();
      var html;
      try {
        html = template.call(template.cache, context);
        response[response.statusCode > 200 ? 'end' : 'zip'](html);
      }
      catch (e) {
        response.error('Failed while rendering view.', e);
      }
    }
    else {
      response.error('View not found.');
    }
  }
};

/**
 * Expect one of the following:
 * - response.error(Integer errorNumber) // (e.g. 404)
 * - response.error(String errorMessage)
 * - response.error(String errorMessage, Error errorObject)
 */
proto.error = function (code, message, error) {
  var response = this;
  var request = response.request;
  var app = response.app;

  // Ensure the code is numeric.
  if (isNaN(code)) {
    error = message;
    message = code;
    code == 500;
  }

  // Ensure there's a message.
  if (!message) {
    message = codes[code];
    if (code == 404) {
      message += '\n' + request.url;
    }
  }
  // If the message is an error, take it as a message.
  else if (message instanceof Error) {
    error = message;
    message = error.message;
  }
  // If the error is an error, and there's also a message, prepend it.
  else if (error instanceof Error) {
    error.message = message + '\n' + error.message;
  }

  // If there isn't an error, instantiate one.
  if (!(error instanceof Error)) {
    error = new Error(message);
  }

  // Respond with the error.
  response.statusCode = code;
  var key = 'error' + code;
  var view = app.views[key] || app.views.error;
  if (view) {
    var context = {message: message};
    if (app.isDev) {
      context.stack = error.stack;
      context.sql = error.sql;
    }
    response.render(key, context);
  }
  else {
    response.setHeader('content-type', 'text/html');
    response.end('<h1>' + message + '</h1>');
  }

  // Log the error.
  app.logger.error(error);
};
