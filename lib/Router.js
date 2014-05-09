var lighter = require('../lighter');
var Class = require('./Class');

/**
 * A Lighter Router sets up HTTP routing.
 */
module.exports = Class.extend({

	init: function init(protocol) {
		this.protocol = protocol;
	},

	setPort: function setPort(port) {
		this.port = port;
	},

	add: function add(method, path, callback) {
		if (path.indexOf('*') > -1) {
			throw "Lighter routing does not support wildcards in paths. Cannot route " + path + "."
		} else {
			paths[method][path] = callback;
			//console.log("Routed " + this.protocol + "://localhost:" + this.port + path + " for " + method + ".");
		}
	},

	serve: function (request, response) {
		var url = request.url;
		var queryStart = url.indexOf('?');
		if (queryStart > -1) {
			url = url.substr(0, queryStart);
		}
		var callback = paths[request.method][url];
		if (callback) {
			callback(request, response);
		}
		else {
			response.error404();
		}
	}

});

var paths = {
	GET: {},
	PUT: {},
	POST: {},
	DELETE: {}
};