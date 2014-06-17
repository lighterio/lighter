onReady(function () {
  Beams()
    .on('chug:change', function (files) {
      // TODO: Iterate over files and reload selectively.
      location.reload();
    });
});
