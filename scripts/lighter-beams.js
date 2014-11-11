onReady(function () {
  Beams()
    ._ON('chug:change', function (files) {
      // TODO: Iterate over files and reload selectively.
      location.reload();
    });
});
