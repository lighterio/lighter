// @use jymin/jymin.js

Jymin.onReady(function () {
  var href;
  href = window.favicon;
  if (href) {
    Jymin.all('link', function (link) {
      var parent;
      if (Jymin.contains(link.rel, 'icon')) {
        parent = Jymin.getParent(link);
        Jymin.removeElement(link);
        return Jymin.addElement(parent, 'link?rel=shortcut icon&href=' + href);
      }
    });
  }
});
