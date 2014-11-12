/**
 * Emitter is a lightweight event emitter object with an API similar
 * to Node.js's EventEmitter.
 *
 * - `emitter.addListener` is not available. Use `emitter.on` instead (and
 *    save a few characters)
 *
 * - `emitter.setMaxListeners` is not available. Please ensure that you do not
 *   leak memory or hurt performance by adding too many listeners.
 *
 * - `emitter._events` doesn't exist until you've added listeners, and it is
 *   deleted if you remove all listeners.
 *
 * @origin lighter-common/common/events/emitter.js
 * @version 0.0.3
 */

var Type = require('../object/type');
var Emitter = module.exports = Type.extend({

  /**
   * Set the maximum number of listeners that can be.
   */
  setMaxListeners: function (n) {
    var self = this;
    self.maxListeners = n;
    return self;
  },

  /**
   * Bind a function as a listener for a type of event.
   */
  on: function (type, fn) {
    var self = this;
    var events = self._events = self._events || {};
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
    else if (listeners.length < self.maxListeners) {
      listeners.push(fn);
    }
    // TODO: throw.
    else {
      throw new Error('Max listeners exceeded');
    }
    return self;
  },

  /**
   * Set an event listener to be fired only once.
   */
  once: function (type, fn) {
    var self = this;
    function one() {
      self.removeListener(type, one);
      fn.apply(self, arguments);
    }
    self.on(type, one);
    return self;
  },

  /**
   * Emit an event with optional data.
   */
  emit: function (type, data) {
    var self = this;
    var events = self._events;
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
            listeners.apply(self, args);
          }
          else {
            listeners.call(self, data);
          }
        }
        // If there's more than one listener, run them all.
        else {
          for (var i = 0, l = listeners.length; i < l; i++) {
            if (args) {
              listeners[i].apply(self, args);
            }
            else {
              listeners[i].call(self, data);
            }
          }
        }
      }
    }
    return self;
  },

  /**
   * Return an array of listeners for an event type.
   */
  listeners: function (type) {
    var self = this;
    var events = self._events;
    var list = events ? events[type] : undefined;
    return !list ? [] : list instanceof Array ? list : [list];
  },

  /**
   * Remove an event listener.
   */
  removeListener: function (type, fn) {
    var self = this;
    var events = self._events;
    if (events) {
      var listeners = events[type];
      if (listeners == fn) {
        delete events[type];
        self.emit('removeListener', type, fn);
      }
      else if (typeof listeners == Array) {
        for (var i = 0, l = listeners.length; i < l; i++) {
          if (listeners[i] == fn) {
            listeners.splice(i, 1);
            return self.emit('removeListener', type, fn);
          }
        }
      }
    }
    return self;
  },

  /**
   * Remove all event listeners (optionally of a specified type).
   */
  removeAllListeners: function (type) {
    var self = this;
    var events = self._events;
    // We only need to do something if there are events.
    if (events) {
      if (type) {
        delete events[type];
      }
      else {
        delete self._events;
      }
    }
    return self;
  }

});
