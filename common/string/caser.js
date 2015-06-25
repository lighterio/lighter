/**
 * Converts names to a specified case.
 *
 * - "camel" case `looksLikeThis`.
 * - "title" case `LooksLikeThis`.
 * - "snake" case `looks_like_this`.
 * - "scream" case `LOOKS_LIKE_THIS`.
 * - "oxford" case `Looks_Like_This`.
 * - "spinal" case `looks-like-this`.
 * - "train" case `LOOKS-LIKE-THIS`.
 * - "private" case `_looksLikeThis`.
 * - "shrinker" case `_LOOKS_LIKE_THIS`.
 *
 * @origin https://github.com/lighterio/lighter-common/common/string/caser.js
 * @version 0.0.1
 */

var caser = module.exports = {
  split: function (name) {
    return name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[_-\s]+/g)
  },

  camel: function (name) {
    var words = caser.split(name)
    for (var i = 0, l = words.length; i < l; i++) {
      var word = words[i]
      if (i) {
        words[i] = word[0].toUpperCase() + word.substr(1).toLowerCase()
      } else {
        words[i] = word.toLowerCase()
      }
    }
    return words.join('')
  },

  title: function (name) {
    var words = caser.split(name)
    for (var i = 0, l = words.length; i < l; i++) {
      var word = words[i]
      words[i] = word[0].toUpperCase() + word.substr(1).toLowerCase()
    }
    return words.join('')
  },

  snake: function (name) {
    return caser.split(name).join('_').toLowerCase()
  },

  scream: function (name) {
    return caser.split(name).join('_').toUpperCase()
  },

  oxford: function (name) {
    var words = caser.split(name)
    for (var i = 0, l = words.length; i < l; i++) {
      var word = words[i]
      words[i] = word[0].toUpperCase() + word.substr(1).toLowerCase()
    }
    return words.join('_')
  },

  spinal: function (name) {
    return caser.split(name).join('-').toLowerCase()
  },

  train: function (name) {
    return caser.split(name).join('-').toUpperCase()
  },

  private: function (name) {
    return '_' + caser.camel(name)
  },

  shrinker: function (name) {
    return ''
  }

}
