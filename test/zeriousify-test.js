var zeriousify;
try {
  zeriousify = require('zeriousify');
}
catch (e) {
  // If Zeriousify isn't installed globally, skip it.
}
if (zeriousify) {
  zeriousify.test();
}
