var http = require('http');
var lighter = require('../lighter');

// TODO: finish.
http.ClientRequest.prototype.getParams = function () {
	console.log(this);
};

http.ServerResponse.prototype.json = function (object) {
	this.statusCode = 200;
	this.setHeader('content-type', 'text/json');
	var json = JSON.stringify(object);
	this.end(json);
};

http.ServerResponse.prototype.view = function (name, context) {
	context = context || {};
	// _cacheBust is expected to be set by Chug.
	context.cacheBust = lighter.app._cacheBust;
	this.statusCode = 200;
	this.setHeader('content-type', 'text/html');
	var view = lighter.views[name];
	if (view) {
		var template = view.getMinifiedContent();
		try {
			var html = template.call(template.cache, context);
			this.end(html);
		}
		catch (e) {
			this.error500('Failed while rendering view.');
			console.error('Failed while rendering view: ' + name);
			console.error(e);
		}
	}
	else {
		this.error500('View not found.');
		console.error('View not found: ' + name);
	}
};

http.ServerResponse.prototype.error404 = function () {
	this.statusCode = 200;
	this.setHeader('content-type', 'text/html');
	if (lighter.views.error404) {
		this.view('error404');
	}
	else {
		this.end('<h1>Page Not Found</h1>');
	}
};

http.ServerResponse.prototype.error500 = function (message) {
	this.statusCode = 200;
	this.setHeader('content-type', 'text/html');
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