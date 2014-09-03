var http = require('http');
var zlib = require('zlib');

var res = http.ServerResponse.prototype;
var codes = http.STATUS_CODES;

res.view =
res.render = function (name, context) {
  var res = this;
  var req = res.request;
  var app = res.app;

  // Default to empty template context.
  context = context || {};

  // Decorate the context with things like cacheBust.
  app.decorateContext(context, req, res);

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
    var view = app.views[name];
    if (view) {
      var template = view.getMinifiedContent();
      try {
        var html = template.call(template.cache, context);
        res.zip(html);
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

res.error404 = function () {
  this.error(404);
};

res.error500 =
res.error = function (err) {
  var res = this;
  var app = res.app;
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
    app.logger.error(err);
  }
  res.statusCode = num;
  res.setHeader('content-type', 'text/html');
  var key = 'error' + num;
  if (app.views[key]) {
    res.render(key, {error: err});
  }
  else {
    res.end('<h1>' + msg + '</h1>');
  }
};
