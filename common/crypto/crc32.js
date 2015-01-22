/**
 * Calculate a CRC32 hash for a string.
 *
 * @origin lighter-common/common/crypto/crc32.js
 * @version 0.0.1
 */

module.exports = crc32;

var cachedCrcTable = buildCRCTable();

function crc32(str) {
  var utf8CharCodes = utf8encode(str);
  var crc = -1
  var crcTable = cachedCrcTable;
  for (var i = 0, len = utf8CharCodes.length, y; i < len; ++i) {
    y = (crc ^ utf8CharCodes[i]) & 0xFF;
    crc = (crc >>> 8) ^ crcTable[y];
  }
  return (crc ^ -1) >>> 0;
}

function utf8encode(str) {
  var utf8CharCodes = [];
  for (var i = 0, len = str.length, c; i < len; ++i) {
    c = str.charCodeAt(i);
    if (c < 128) {
      utf8CharCodes.push(c);
    } else if (c < 2048) {
      utf8CharCodes.push((c >> 6) | 192, (c & 63) | 128);
    } else {
      utf8CharCodes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
    }
  }
  return utf8CharCodes;
}

function buildCRCTable() {
  var table = [];
  for (var i = 0, j, crc; i < 256; ++i) {
    crc = i;
    j = 8;
    while (j--) {
      if ((crc & 1) == 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc >>>= 1;
      }
    }
    table[i] = crc >>> 0;
  }
  return table;
}

function crc32(str) {
  var utf8CharCodes = utf8encode(str);
  var crc = -1
  var crcTable = cachedCrcTable;
  for (var i = 0, len = utf8CharCodes.length, y; i < len; ++i) {
    y = (crc ^ utf8CharCodes[i]) & 0xFF;
    crc = (crc >>> 8) ^ crcTable[y];
  }
  return (crc ^ -1) >>> 0;
}
