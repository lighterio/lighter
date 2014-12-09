var lighter = require('../lighter');

describe('API', function () {

  it('should create an app', function () {
    var cwd = process.cwd();
    mock(console, {
      log: mock.ignore(),
      warn: mock.ignore()
    });
    var App = lighter({
      dir: process.cwd() + '/test/test-files',
      logger: ['blackhole'],
      enableCluster: false
    });
  });

});
