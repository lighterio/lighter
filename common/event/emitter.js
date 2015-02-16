/**
 * Emitter is a lightweight event emitter object with an API similar
 * to Node's EventEmitter.
 *
 * - `emitter.addListener` is not available. Use `emitter.on` instead (and
 *   save a few characters)
 *
 * - `emitter.on` throws an error if there are too many listeners, whereas,
 *   Node would log to the console.
 *
 * - `emitter._events` doesn't exist until you've added listeners, and it is
 *   deleted if you remove all listeners.
 *
 * @origin https://github.com/lighterio/lighter-common/common/events/emitter.js
 * @version 0.0.5
 * @import object/type
 */

var Type = require('../object/type');
var Emitter = module.exports = Type.extend({

  /**
   * Set the maximum number of listeners that can listen to any type of event.
   */
  setMaxListeners: function (max) {
    var self = this;
    self._maxListeners = max ? max : Infinity;
    return self;
  },

  /**
   * Handle the case of max listeners being exceeded for an event type.
   */
  maxListenersExceeded: function (type) {
    var self = this;
    var max = self._maxListeners || Emitter.defaultMaxListeners;
    throw new Error('Max ' + max + ' listeners exceeded for "' + type + '".');
  },

  /**
   * Bind a function as a listener for a type of event.
   */
  on: function (type, fn) {
    var self = this;
    var events = self._events = self._events || {};
    var listeners = events[type];
    var max = self._maxListeners || Emitter.defaultMaxListeners;
    // If there's only one, don't waste an Array.
    if (!listeners) {
      events[type] = fn;
    }
    // When there's more than one, start an Array unless the max is 1.
    else if (typeof listeners == 'function') {
      if (max > 1) {
        events[type] = [listeners, fn];
      }
      else {
        self.maxListenersExceeded(type);
      }
    }
    // When it's already an Array, push unless we've exceeded the max.
    else {
      if (listeners.length < max) {
        listeners.push(fn);
      }
      else {
        self.maxListenersExceeded(type);
      }
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
  },

  /**
   * Set one listener for a type of event (replacing any others).
   */
  one: function (type, fn) {
    var self = this;
    var events = self._events = self._events || {};
    events[type] = fn;
    return self;
  }

});

// Same default as native EventEmitter.
Emitter.defaultMaxListeners = 10;
