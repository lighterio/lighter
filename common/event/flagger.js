/**
 * Flagger is an EventEmitter with the ability to store flag values and run
 * listener functions immediately if a flag already has the target value,
 * or listen for a change if it doesn't.
 *
 * @origin lighter-common/common/events/flagger.js
 * @version 0.0.3
 * @import event/emitter
 */

var Emitter = require('../event/emitter');
var Flagger = module.exports = Emitter.extend({

  /**
   * Get the value of a flag.
   */
  getFlag: function (flag) {
    return (this._flags || 0)[flag];
  },

  /**
   * Set a flag, like "ready" and emit its value.
   */
  setFlag: function (flag, value) {
    var self = this;
    var flags = self._flags || (self._flags = {});
    if (arguments.length < 2) {
      value = true;
    }
    if (flags[flag] !== value) {
      flags[flag] = value;
      self.emit(flag, value);
      self.emit(flag + ':' + value);
    }
    return self;
  },

  /**
   * Fire an event when a flag is set (even if it was set in the past).
   */
  when: function (flag, value, fn) {
    var self = this;
    var flags = self._flags;
    if (arguments.length < 3) {
      fn = value;
      value = true;
    }
    if (flags) {
      if (flags[flag] === value) {
        fn.apply(self);
        return self;
      }
    }
    self.on(flag + ':' + value, fn);
    return self;
  }

});
