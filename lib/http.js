var http = require('http');
var zlib = require('zlib');

http.ServerResponse.prototype.view =
http.ServerResponse.prototype.render = function (name, context) {
  var res = this;
  var req = res.request;
  var app = res.app;

  // Default to empty template context.
  context = context || {};

  // Decorate the context with things like cacheBust.
  app.decorateContext(context, req, res);

  res.statusCode = 200;
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
        res.error500('Failed while rendering view.');
        app.logger.error('Failed while rendering view: ' + name);
        app.logger.error(e);
      }
    }
    else {
      res.error500('View not found.');
      app.logger.error('View not found: ' + name);
    }
  }
};

http.ServerResponse.prototype.error404 = function () {
  var res = this;
  var app = res.app;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html');
  if (app.views.error404) {
    res.render('error404');
  }
  else {
    res.end('<h1>Page Not Found</h1>');
  }
};

http.ServerResponse.prototype.error500 = function (err) {
  var res = this;
  var app = res.app;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html');
  if (app.views.error500) {
    res.render('error500', {err: err});
  }
  else {
    res.end('<h1>Server Error</h1>' + (err ? err : ''));
  }
};
