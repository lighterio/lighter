/**
 * This file is used to insert CSS and a favicon via JS. This way, each page
 * has fewer tags in its head, and it only has to make one request for
 * external JS/CSS. Additionally, the favicon is delayed, so it will not
 * interfere with critical features.
 *
 * @use jymin/jymin.js
 */

Jymin.all('head', function (head) {
  var css = 'LIGHTER_ALL_CSS';
  var style = Jymin.addElement(head, 'style?type=text/css', css);
  (style.styleSheet || 0).cssText = css;
  Jymin.addElement(head, 'link?rel=shortcut icon&href=/favicon.ico?v=LIGHTER_CACHE_BUST');
});
