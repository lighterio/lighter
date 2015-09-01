// @use jymin/jymin.js

Jymin.ready(function () {
  var href
  href = window.favicon
  if (href) {
    Jymin.all('link', function (link) {
      var parent
      if (Jymin.contains(link.rel, 'icon')) {
        parent = Jymin.parent(link)
        Jymin.remove(link)
        return Jymin.add(parent, 'link?rel=shortcut icon&href=' + href)
      }
    })
  }
})
