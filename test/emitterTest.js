var Emitter = require('../lib/common/emitter');

describe('Emitter', function () {

  it('extends an object', function () {
    var o = {};
    Emitter.extend(o);
    is.function(o.on);
    is.function(o.addListener);
    is.function(o.emit);
    is.function(o.removeListener);
    is.function(o.once);
    is.function(o.set);
    is.function(o.when);
  });

  it('.on adds a single listener', function (done) {
    var o = {};
    Emitter.extend(o);
    o.on('e', done);
    o.emit('e');
  });

  it('.on adds 2 listeners', function (done) {
    var o = {c: ''};
    Emitter.extend(o);
    var f = function (d) { o.c += 'f' + d; };
    var g = function (d) { o.c += 'g' + d; };
    o.on('e', f);
    o.on('e', g);
    o.emit('e', 1);
    is(o.c, 'f1g1');
    done();
  });

  it('.on adds 3 listeners', function (done) {
    var o = {c: ''};
    Emitter.extend(o);
    var f = function (d) { o.c += 'f' + d; };
    var g = function (d) { o.c += 'g' + d; };
    var h = function (d) { o.c += 'h' + d; };
    o.on('e', f);
    o.on('e', g);
    o.on('e', h);
    o.emit('e');
    is(o.c, 'fundefinedgundefinedhundefined');
    done();
  });

  it('.emit emits data arguments', function () {
    var o = {c: ''};
    Emitter.extend(o);
    var f = function () {
      var a = Array.prototype.slice.call(arguments);
      o.c += '[' + a.join(',') + ']';
    };
    o.on('c', f);
    o.emit('c');
    o.emit('c', 1);
    o.emit('c', 1, 2);
    o.emit('c', 1, 2, 3);
    is(o.c, '[][1][1,2][1,2,3]');
  });

  it('.removeListener removes a listener', function () {
    var o = {c: ''};
    Emitter.extend(o);
    var f = function () {
      var a = Array.prototype.slice.call(arguments);
      o.c += '[' + a.join(',') + ']';
    };
    o.on('c', f);
    o.emit('c');
    o.emit('c', 1);
    o.removeListener('c', f);
    o.emit('c', 1, 2);
    o.on('c', f);
    o.emit('c', 1, 2, 3);
    is(o.c, '[][1][1,2,3]');
  });

  it('.once fires an event once', function () {
    var o = {c: ''};
    Emitter.extend(o);
    var f = function () {
      var a = Array.prototype.slice.call(arguments);
      o.c += '[' + a.join(',') + ']';
    };
    o.emit('c');
    o.once('c', f);
    o.emit('c', 1);
    o.emit('c', 1, 2);
    is(o.c, '[1]');
  });

  it('.set sets a flag', function () {
    var o = {};
    Emitter.extend(o);
    o.set('ready');
    is(o._flags.ready, true);
    o.set('mode', 'server');
    is(o._flags.mode, 'server');
  });

  it('.when runs when a flag is true', function () {
    var o = {c: ''};
    Emitter.extend(o);
    o.when('ready', function () {
      o.c += 'a';
    });
    is(o.c, '');
    o.set('ready');
    is(o.c, 'a');
    o.when('ready', function () {
      o.c += 'b';
    });
    is(o.c, 'ab');
  });

  it('.when runs when a flag has a value', function () {
    var o = {c: ''};
    Emitter.extend(o);
    o.when('ready', function () {
      o.c += 'a';
    });
    is(o.c, '');
    o.set('ready');
    is(o.c, 'a');
    o.when('ready', function () {
      o.c += 'b';
    });
    is(o.c, 'ab');
  });

});
