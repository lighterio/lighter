Jymin.all('head', function (head) {
  var css = 'LIGHTER_ALL_CSS';
  var style = Jymin.addElement(head, 'style?type=text/css', css);
  (style.styleSheet || 0).cssText = css;
  Jymin.addElement(head, 'link?rel=shortcut icon&href=/favicon.ico?v=LIGHTER_CACHE_BUST');
});
