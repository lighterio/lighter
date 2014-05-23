var http = require('http');

http.ServerResponse.prototype.view = function (name, context) {
  var app = this.app;
  // Default to an empty template rendering context.
  context = context || {};
  context.cacheBust = app.server ? app.server._cacheBust : (new Date).getTime();
  this.statusCode = 200;
  this.setHeader('content-type', 'text/html');
  var view = app.views[name];
  if (view) {
    var template = view.getMinifiedContent();
    try {
      var html = template.call(template.cache, context);
      this.end(html);
    }
    catch (e) {
      this.error500('Failed while rendering view.');
      app.logger.error('Failed while rendering view: ' + name);
      app.logger.error(e);
    }
  }
  else {
    this.error500('View not found.');
    app.logger.error('View not found: ' + name);
  }
};

http.ServerResponse.prototype.error404 = function () {
  var app = this.app;
  this.statusCode = 200;
  this.setHeader('content-type', 'text/html');
  if (app.views.error404) {
    this.view('error404');
  }
  else {
    this.end('<h1>Page Not Found</h1>');
  }
};

http.ServerResponse.prototype.error500 = function (message) {
  this.statusCode = 200;
  this.setHeader('content-type', 'text/html');
  if (app.views.error500) {
    this.view('error500', {message: message});
  }
  else {
    this.end('<h1>Server Error</h1>' + (message ? message : ''));
  }
};
