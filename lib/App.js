var http = require('http');
var https = require('https');
var Class = require('./Class');
var Router = require('./Router');

/**
 * A Lighter App.
 */
module.exports = Class.extend({

	init: function init() {
	},

	routers: {
		http: new Router('http'),
		https: new Router('https')
	},

	_addRoute: function _addRoute(method, path, callback, protocol) {
		var isRouted = false;
		if (!protocol || (protocol == 'http')) {
			if (this.routers.http.port) {
				isRouted = true;
				this.routers.http.add(method, path, callback);
			}
		}
		if (!protocol || (protocol == 'https')) {
			if (this.routers.https.port) {
				isRouted = true;
				this.routers.https.add(method, path, callback);
			}
		}
		if (!isRouted) {
			throw "Could not route " + method + " to " + path +  " over " + (protocol || "http or https") + ".";
		}
	},

	get: function get(path, callback, protocol) {
		this._addRoute('GET', path, callback, protocol);
		return this;
	},

	put: function get(path, callback, protocol) {
		this._addRoute('PUT', path, callback, protocol);
		return this;
	},

	post: function get(path, callback, protocol) {
		this._addRoute('POST', path, callback, protocol);
		return this;
	},

	delete: function get(path, callback, protocol) {
		this._addRoute('DELETE', path, callback, protocol);
		return this;
	},

	use: function use(path, callback, protocol) {
		var methods = ['GET', 'PUT', 'POST', 'DELETE'];
		methods.forEach(function (method) {
			this._addRoute(method, path, callback, protocol);
		});
		return this;
	},

	listen: function listen(httpPort, httpsPort) {
		if (httpPort) {
			this.routers.http.setPort(httpPort);
			http.createServer(this.routers.http.serve).listen(httpPort);
		}
		if (httpsPort) {
			this.routers.https.setPort(httpsPort);
			https.createServer(this.routers.https.serve).listen(httpsPort);
		}
		return this;
	}

});