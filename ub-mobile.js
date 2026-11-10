/* UP BEAUTY - mobile only helpers (<=760px). PC is untouched. */
(function () {
  if (window.__ubMobile) return; window.__ubMobile = 1;
  if (!matchMedia('(max-width:760px)').matches) return;
  var root = document.documentElement;
  root.classList.add('ub-m');

  /* 1) Lighter fonts: swap the full Pretendard static set (~3.7MB) for the dynamic subset */
  var STATIC_FONT = /pretendard@v1\.3\.9\/dist\/web\/static\/pretendard\.min\.css/;
  var SUBSET_FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css';
  function fixLink(l) { if (l.tagName === 'LINK' && STATIC_FONT.test(l.href || '')) l.href = SUBSET_FONT; }

  /* 2) Lighter photos: original camera files -> resized mobile copies in assets/m/ */
  var ORIG = /(^|[("'\s\/])((?:\.\/|\/)?assets\/)(brow|lip|eyeline|hairline|store|lecture|images)\/([^"')\s]+?)\.(?:jpe?g|png)/gi;
  var HAS = /assets\/(brow|lip|eyeline|hairline|store|lecture|images)\/[^"')\s]+\.(jpe?g|png)/i;
  function swap(s) { return s.replace(ORIG, function (m, pre, base, dir, name) { return pre + base + 'm/' + dir + '/' + name + '.jpg'; }); }
  /* Program page photo slots have no src in the export -> use the committed photos */
  var FILL = { 'sub-prog-lip': 1, 'sub-prog-overlip': 1, 'sub-prog-brow': 1, 'sub-prog-hairline': 1, 'sub-prog-eyeline': 1 };
  function fixEl(el) {
    if (el.nodeType !== 1) return;
    if (el.tagName === 'LINK') { fixLink(el); return; }
    if (el.tagName === 'IMAGE-SLOT' && FILL[el.id] && !el.getAttribute('src')) { el.setAttribute('src', 'assets/committed/' + el.id + '.webp'); return; }
    var s = el.getAttribute('src');
    if (s && HAS.test(s)) { var n = swap(s); if (n !== s) el.setAttribute('src', n); }
    var st = el.getAttribute('style');
    if (st && HAS.test(st)) { var ns = swap(st); if (ns !== st) el.setAttribute('style', ns); }
  }
  function scan(n) {
    if (n.nodeType !== 1) return;
    fixEl(n);
    if (n.querySelectorAll) n.querySelectorAll('link[href*="pretendard"],img[src*="assets/"],image-slot,source[src*="assets/"],[style*="assets/"]').forEach(fixEl);
  }
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === 'attributes') fixEl(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]);
    }
  }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'href', 'id'] });
  document.addEventListener('DOMContentLoaded', function () { scan(document.body); });

})();
