/**
 * This file is used to insert CSS and a favicon via JS. This way, each page
 * has fewer tags in its head, and it only has to make one request for
 * external JS/CSS. Additionally, the favicon is delayed, so it will not
 * interfere with critical features.
 *
 * @use jymin/jymin.js
 */

Jymin.insertCss('CSS_TEXT');
var head = Jymin.getHead();
if (!window._isMobileApp) {
  Jymin.addElement(head, 'link?rel=shortcut icon&href=/favicon.ico?v=CACHE_BUST');
}
