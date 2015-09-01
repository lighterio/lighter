/**
 * This file is used to insert CSS and a favicon via JS. This way, each page
 * has fewer tags in its head, and it only has to make one request for
 * external JS/CSS. Additionally, the favicon is delayed, so it will not
 * interfere with critical features.
 *
 * @use jymin/jymin.js
 * @use mimo/scripts/mimo-jymin.js
 */

// Tokens will be populated by Lighter.
var cssText = 'CSS_TEXT'
var cacheBust = 'CACHE_BUST'

// Add the CSS into the page.
Jymin.css(cssText)

// Load the favicon lazily, if accessed from a web browser.
var head = Jymin.getHead()
if ((window._platform || 'web') == 'web') {
  Jymin.add(head, 'link?rel=shortcut icon&href=/favicon.ico?v=' + cacheBust)
}
