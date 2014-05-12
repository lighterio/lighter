var lighter = require('../lighter');
var Class = require('./Class');
var qs = require('qs');

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

		var cookies = request.cookies = {};
		var cookie = request.headers.cookie;
		if (cookie) {
			cookie.split(/; ?/).forEach(function (pair) {
				pair = pair.split('=');
				cookies[pair[0]] = decodeURIComponent(pair[1]);
			});
		}

		var url = request.url;
		if (url.indexOf('?') > -1) {
			var parts = url.split('?');
			url = request.url = parts[0];
			request.query = qs.parse(parts[1]);
		} else {
			request.query = {};
		}

		var callback = paths[request.method][url];
		if (callback) {

			// Parse the request body if we need to.
			if (request.method == 'POST') {
				var body = '';
				request.on('data', function (data) {
					body += data;
					// Don't allow users to post more than ~1MB.
					if (body.length > 1e6) {
						request.connection.destroy();
					}
				});
				request.on('end', function () {
					request.body = qs.parse(body);
					callback(request, response);
				});
			}
			else {
				request.body = '';
				callback(request, response);
			}

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