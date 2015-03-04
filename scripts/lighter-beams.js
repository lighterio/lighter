/**
 * @use beams/scripts/beams-jymin.js
 */
Beams._on('chug:change', function (files) {
  // TODO: Iterate over files and reload selectively.
  location.reload();
});
