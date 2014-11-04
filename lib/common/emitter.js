/**
 * Stripped-down Event Emitter.
 */
var Emitter = module.exports = function Emitter() {};

Emitter.prototype = {

  /**
   * Bind a function as a listener for a type of event.
   */
  on: function (type, fn) {
    var events = this._events = this._events || {};
    var listeners = events[type];
    // If there's only one, don't waste an Array.
    if (!listeners) {
      events[type] = fn;
    }
    // When there's more than one, start an Array.
    else if (typeof listeners == 'function') {
      events[type] = [listeners, fn];
    }
    // When it's already an Array, just push.
    else {
      listeners.push(fn);
    }
    return this;
  },

  /**
   * Emit an event with optional data.
   */
  emit: function (type, data) {
    var events = this._events;
    if (events) {
      var listeners = events[type];
      if (listeners) {
        // If there's more than one data argument, build an array.
        var args;
        if (arguments.length > 2) {
          args = Array.prototype.slice.call(arguments, 1);
        }
        // If there's only one listener, run it.
        if (typeof listeners == 'function') {
          if (args) {
            listeners.apply(this, args);
          }
          else {
            listeners.call(this, data);
          }
        }
        // If there's more than one listener, run them all.
        else {
          for (var i = 0, l = listeners.length; i < l; i++) {
            if (args) {
              listeners[i].apply(this, args);
            }
            else {
              listeners[i].call(this, data);
            }
          }
        }
      }
    }
    return this;
  },

  /**
   * Remove an event listener.
   */
  removeListener: function (type, fn) {
    var events = this._events;
    if (events) {
      var listeners = events[type];
      if (listeners == fn) {
        delete events[type];
        this.emit('removeListener', type, fn);
      }
      else if (typeof listeners == Array) {
        for (var i = 0, l = listeners.length; i < l; i++) {
          if (listeners[i] == fn) {
            listeners.splice(i, 1);
            this.emit('removeListener', type, fn);
            break;
          }
        }
      }
    }
    return this;
  },

  /**
   * Set an event listener to be fired only once.
   */
  once: function (type, fn) {
    function one() {
      this.removeListener(type, one);
      fn.apply(this, arguments);
    }
    this.on(type, one);
    return this;
  },

  /**
   * Set a flag, like "ready" and emit the flag.
   */
  set: function (flag, value) {
    var flags = this._flags || (this._flags = {});
    if (arguments.length < 2) {
      value = true;
    }
    if (flags[flag] !== value) {
      flags[flag] = value;
      this.emit(flag + ':' + value);
    }
    return this;
  },

  /**
   * Fire an event when a flag is set (even if it was set in the past).
   */
  when: function (flag, value, fn) {
    var flags = this._flags;
    if (arguments.length < 3) {
      fn = value;
      value = true;
    }
    if (flags) {
      if (flags[flag] === value) {
        fn.apply(this);
        return this;
      }
    }
    this.on(flag + ':' + value, fn);
    return this;
  }

};

// Backward compatible naming.
Emitter.prototype.addListener = Emitter.prototype.on;

/**
 * Extend an object to become an event emitter.
 */
Emitter.extend = function (emitter) {
  var proto = Emitter.prototype;
  emitter = emitter || {};
  for (var key in proto) {
    if (proto.hasOwnProperty(key)) {
      emitter[key] = proto[key];
    }
  }
  return emitter;
};
