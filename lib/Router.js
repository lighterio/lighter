var Class = require('./Class');

/**
 * A Lighter Router sets up HTTP routing.
 */
module.exports = Class.extend({

	init: function init(protocol) {
		this.protocol = protocol;
	},

	add: function add(method, path, callback) {
		if (path.indexOf('*') > -1) {

		} else {
			paths[method][path] = callback;
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
			response.writeHead(404, {'content-type': 'text/html'});
			response.end('<h1>Page Not Found</h1>Sorry, the page you\'re looking for does not exist.');
		}
	}

});

var paths = {
	GET: {},
	PUT: {},
	POST: {},
	DELETE: {}
};