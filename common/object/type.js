/**
 * A Type is an extendable object whose instances can be constructed
 * with an `init` method.
 *
 * @origin https://github.com/lighterio/lighter-common/common/object/type.js
 * @version 0.0.1
 */

// The default constructor does nothing.
var Type = module.exports = function () {};

/**
 * Extend a Type, to create a new Type with properties decorated onto it.
 */
Type.extend = function (properties) {

  // Create the constructor, using a new or inherited `init` method.
  var type = properties.init || function () {
    if (this.init) {
      this.init.apply(this, arguments);
    }
  };

  // Copy the parent and its prototype.
  var parent = type.parent = this;
  Type.decorate(type, parent);
  Type.decorate(type.prototype, parent.prototype);

  // Copy the properties that extend the parent.
  Type.decorate(type.prototype, properties);

  return type;
};

/**
 * Decorate an object with specified properties or prototype properties.
 */
Type.decorate = function (object, properties) {
  properties = properties || this.prototype;
  for (var key in properties) {
    object[key] = properties[key];
  }
  return object;
};
