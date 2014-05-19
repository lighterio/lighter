var lighter = require('../lighter');
var chug = require('chug');
require('zeriousify').test();


describe('API', function () {

	it('should create an app', function () {
		var write = process.stdout.write;
		var app = lighter({
			dir: process.cwd() + '/test/testFiles',
			logger: require('cedar')('blackhole')
		});
		process.stdout.write = write;
	});
});