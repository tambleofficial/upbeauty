/* 업뷰티 관리자 연결 (공개 화면용)
 * 서버(functions/_middleware.js)가 넣어준 window.__CMS 를 화면에 반영합니다.
 *  - text.t  : { 원래 문구: 바꾼 문구 }
 *  - media.m : { '/assets/원래파일': '/assets/uploads/새파일' }  → img 사진과 배경 사진 모두 교체
 */
(function () {
  var C = window.__CMS || {};
  var media = (C.media && C.media.m) || {};
  var mkeys = Object.keys(media);
  function pathOf(u) { try { return new URL(u, document.baseURI).pathname; } catch (e) { return u; } }
  window.__sjPathOf = pathOf;
  var URLRE = /url\((["']?)([^"')]+)\1\)/g;
  function swapEl(el) {
    if (el.tagName === 'IMG') { var s = el.getAttribute('src'); if (s) { var p = pathOf(s); if (Object.prototype.hasOwnProperty.call(media, p) && s !== media[p]) { el.setAttribute('data-sj-key', p); el.setAttribute('src', media[p]); } } }
    var bg = el.style && el.style.backgroundImage;
    if (bg && bg.indexOf('url(') >= 0) {
      var hit = false, nb = bg.replace(URLRE, function (m, q, u) { var p = pathOf(u); if (Object.prototype.hasOwnProperty.call(media, p) && u !== media[p]) { hit = true; el.setAttribute('data-sj-key', p); return 'url("' + media[p] + '")'; } return m; });
      if (hit) el.style.backgroundImage = nb.replace(/\binitial\b/g, 'none');
    }
  }
  function swapMedia(root) {
    if (!mkeys.length || !root || root.nodeType !== 1) return;
    swapEl(root);
    var all = root.querySelectorAll('img[src],[style*="url("]');
    for (var i = 0; i < all.length; i++) swapEl(all[i]);
  }
  window.__sjSwapMedia = swapMedia;
  if (mkeys.length) {
    new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var m = ms[i]; if (m.type === 'attributes') { if (m.target.nodeType === 1) swapEl(m.target); } else for (var j = 0; j < m.addedNodes.length; j++) if (m.addedNodes[j].nodeType === 1) swapMedia(m.addedNodes[j]); } })
      .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style'] });
    document.addEventListener('DOMContentLoaded', function () { swapMedia(document.body); });
  }

  var T = (C.text && C.text.t) || {};
  var keys = Object.keys(T);
  window.__sjNorm = function (s) { return String(s || '').replace(/\u00a0/g, ' ').replace(/[ \t\r\f\v]+/g, ' ').replace(/ *\n */g, '\n').trim(); };
  if (!keys.length) return;
  var norm = window.__sjNorm;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var SKIP = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, TEXTAREA: 1, INPUT: 1, SVG: 1, HELMET: 1 };
  function leafText(el) {
    if (!el || SKIP[el.tagName] || el.isContentEditable) return null;
    var txt = '', has = false;
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { txt += n.nodeValue; if (/\S/.test(n.nodeValue)) has = true; }
      else if (n.nodeType === 1 && n.tagName === 'BR') txt += '\n';
      else return null;
    }
    return has ? norm(txt) : null;
  }
  function applyEl(el) {
    var t = leafText(el);
    if (t === null || !Object.prototype.hasOwnProperty.call(T, t)) return;
    var v = T[t];
    if (norm(v) === t) return;
    el.setAttribute('data-sj-orig', t);
    el.innerHTML = esc(v).replace(/\n/g, '<br>');
  }
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    applyEl(root);
    var all = root.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) applyEl(all[i]);
  }
  window.__sjApplyText = scan;
  var pending = [], sched = false;
  function flush() { sched = false; var list = pending; pending = []; for (var i = 0; i < list.length; i++) scan(list[i]); }
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === 'characterData') { if (m.target.parentNode) pending.push(m.target.parentNode); }
      else { for (var j = 0; j < m.addedNodes.length; j++) { var a = m.addedNodes[j]; pending.push(a.nodeType === 1 ? a : a.parentNode); } }
    }
    if (!sched && pending.length) { sched = true; Promise.resolve().then(flush); }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener('DOMContentLoaded', function () { scan(document.body); });
})();
