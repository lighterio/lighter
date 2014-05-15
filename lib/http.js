var http = require('http');
var lighter = require('../lighter');
var logger = lighter.logger;

if (lighter.settings.enableSplode) {
	var splode = require('splode');
	splode.listen(function (error) {
		if (err.message == "Can't set headers after they are sent.") {
			splode.recover();
		}
	});
}

http.ServerResponse.prototype.json = function (object) {
	try {
		this.statusCode = 200;
		this.setHeader('content-type', 'text/json');
	}
	catch (e) {
		logger.warn(e);
	}
	var json = JSON.stringify(object);
	this.end(json);
};

http.ServerResponse.prototype.view = function (name, context) {
	// Default to an empty template rendering context.
	context = context || {};
	// _cacheBust is expected to be set by Chug.
	context.cacheBust = lighter.server._cacheBust;
	try {
		this.statusCode = 200;
		this.setHeader('content-type', 'text/html');
	}
	catch (e) {
		logger.warn(e);
	}
	var view = lighter.views[name];
	if (view) {
		var template = view.getMinifiedContent();
		try {
			var html = template.call(template.cache, context);
			this.end(html);
		}
		catch (e) {
			this.error500('Failed while rendering view.');
			logger.error('Failed while rendering view: ' + name);
			logger.error(e);
		}
	}
	else {
		this.error500('View not found.');
		logger.error('View not found: ' + name);
	}
};

http.ServerResponse.prototype.error404 = function () {
	try {
		this.statusCode = 200;
		this.setHeader('content-type', 'text/html');
	}
	catch (e) {
		logger.warn(e);
	}
	if (lighter.views.error404) {
		this.view('error404');
	}
	else {
		this.end('<h1>Page Not Found</h1>');
	}
};

http.ServerResponse.prototype.error500 = function (message) {
	try {
		this.statusCode = 200;
		this.setHeader('content-type', 'text/html');
	}
	catch (e) {
		logger.warn(e);
	}
	if (lighter.views.error500) {
		this.view('error500', {message: message});
	}
	else {
		this.end('<h1>Server Error</h1>' + (message ? message : ''));
	}
};

http.ServerResponse.prototype.cookie = function (name, value, options) {
	this.setHeader('set-cookie', name + '=' + escape(value));
};
