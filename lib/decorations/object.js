/**
 * Iterate over an object's keys, and call a function on each key value pair.
 */
Object.defineProperty(Object, 'each', {
  enumerable: false,
  value: function each(object, callback) {
    for (var key in object) {
      var result = callback(key, object[key], object);
      if (result === false) {
        break;
      }
    }
  }
});

/**
 * Decorate an object with properties from another object. If the properties
 */
Object.defineProperty(Object, 'decorate', {
  enumerable: false,
  value: function decorate(object, decorations) {
    if (decorations) {
      decorations.each(function (value, key) {
        object[key] = value;
      });
    }
  }
});
