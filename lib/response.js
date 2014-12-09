var http = require('http');
var proto = http.ServerResponse.prototype;
var codes = http.STATUS_CODES;

proto.view =
proto.render = function (name, context) {
  var res = this;
  var req = res.request;
  var App = res.app;

  // Default to empty template context.
  context = context || {};

  // Decorate the context with things like cacheBust.
  App.decorateContext(context, req, res);

  var d6 = req.query.d6;
  if (d6) {
    // Tell D6 which view to render.
    context.d6 = name;
    // If we're redirecting, tell the browser where we redirected to.
    if (d6 == 'r') {
      context.d6u = req.url.replace(/[&\?]d6=r/, '');
    }
    res.setHeader('content-type', 'application/json');
    res.zip(JSON.stringify(context));
  }
  else {
    context.request = req;
    context.response = res;
    res.setHeader('content-type', 'text/html');
    var view = App.views[name];
    if (view) {
      var template = view.getMinifiedContent();
      var html = template.call(template.cache, context);
      try {
        res[res.statusCode > 200 ? 'end' : 'zip'](html);
      }
      catch (e) {
        res.error('Failed while rendering view.');
      }
    }
    else {
      res.error('View not found.');
    }
  }
};

proto.error404 = function () {
  this.error(404);
};

proto.error500 =
proto.error = function (err) {
  var res = this;
  var App = res.app;
  var num = err;
  var msg = codes[num];
  if (!msg) {
    num = 500;
    msg = codes[num];
  }
  if (typeof err == 'string') {
    msg = err;
    err = new Error(msg);
  }
  if (err instanceof Error) {
    if (App.logger.error)
    App.logger.error(err);
  }
  res.statusCode = num;
  var key = 'error' + num;
  var view = App.views[key] || App.views.error;
  if (App.views[key]) {
    var context = {message: msg};
    if (App.isDev) {
      context.stack = err.stack;
      if (err.sql) {
        context.sql = err.sql;
      }
    }
    res.render(key, context);
  }
  else {
    res.setHeader('content-type', 'text/html');
    res.end('<h1>' + msg + '</h1>');
  }
};
