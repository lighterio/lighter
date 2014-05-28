setTimeout(function () {
  getBeams()
    .on('chug:change', function (files) {
      // TODO: Iterate over files and just reload selectively.
      location.reload();
    });
}, 1);