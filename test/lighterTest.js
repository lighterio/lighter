var lighter = require('../lighter');
var chug = require('chug');
require('zeriousify').test();


describe('API', function () {

  it('should create an app', function () {
    var cwd = process.cwd();
    mock(console, {
      log: mock.ignore(),
      warn: mock.ignore()
    });
    var app = lighter({
      dir: process.cwd() + '/test/testFiles',
      logger: ['blackhole'],
      enableCluster: false
    });
  });

});
