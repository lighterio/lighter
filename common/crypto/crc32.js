/**
 * Calculate a CRC32 hash for a string.
 *
 * @origin https://github.com/lighterio/lighter-common/common/crypto/crc32.js
 * @version 0.0.1
 */

module.exports = crc32;

var cachedTable = buildTable();

function crc32(str) {
  var l = str.length;
  var codes = new Array(l);
  for (var i = 0, n = 0, c; i < l; ++i) {
    c = str.charCodeAt(i);
    if (c < 128) {
      codes[n++] = c;
    } else if (c < 2048) {
      codes[n++] = (c >> 6) | 192;
      codes[n++] = (c & 63) | 128;
    } else {
      codes[n++] = (c >> 12) | 224;
      codes[n++] = ((c >> 6) & 63) | 128;
      codes[n++] = (c & 63) | 128;
    }
  }
  var crc = -1;
  var table = cachedTable;
  l = codes.length;
  for (i = 0; i < l; ++i) {
    c = (crc ^ codes[i]) & 255;
    crc = (crc >>> 8) ^ table[c];
  }
  return (crc ^ -1) >>> 0;
}

function buildTable() {
  var table = [];
  for (var i = 0, j, crc; i < 256; ++i) {
    crc = i;
    j = 8;
    while (j--) {
      if ((crc & 1) == 1) {
        crc = (crc >>> 1) ^ 3988292384;
      } else {
        crc >>>= 1;
      }
    }
    table[i] = crc >>> 0;
  }
  return table;
}
