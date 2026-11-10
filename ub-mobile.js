/* UP BEAUTY - mobile helpers. Only active while the screen is <=760px wide. */
(function () {
  if (window.__ubMobile) return; window.__ubMobile = 1;
  var mq = matchMedia('(max-width:760px)');
  var root = document.documentElement;
  var started = false;

  /* Home hero photos: start downloading right away (before the page script renders) */
  if (location.pathname === '/' || location.pathname === '/index.html') {
    ['home-hero-1', 'home-hero-2', 'home-hero-3'].forEach(function (n) {
      var l = document.createElement('link'); l.rel = 'preload'; l.as = 'image'; l.href = '/assets/committed/' + n + '.webp';
      document.head.appendChild(l);
    });
  }

  /* All screen sizes: once the page has loaded, fetch the remaining lazy photos in the background
     so they are already there when the visitor scrolls (no blank tiles while scrolling). */
  function eager(n) {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'IMG' && n.loading === 'lazy') { n.loading = 'eager'; return; }
    if (n.querySelectorAll) n.querySelectorAll('img[loading="lazy"]').forEach(function (i) { i.loading = 'eager'; });
  }
  window.addEventListener('load', function () {
    setTimeout(function () {
      eager(document.body);
      new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(eager); }); })
        .observe(document.body, { childList: true, subtree: true });
    }, 800);
  });

  /* ---- 1) lighter font set on phones ---- */
  var STATIC_FONT = /pretendard@v1\.3\.9\/dist\/web\/static\/pretendard\.min\.css/;
  var SUBSET_FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css';

  /* ---- 2) phone-sized photos: assets/w/... (or original) -> assets/m/... ---- */
  var ORIG = /(^|[("'\s\/])((?:\.\/|\/)?assets\/)(?:w\/)?(brow|lip|eyeline|hairline|store|lecture|images)\/([^"')\s]+?)\.(?:jpe?g|png)/gi;
  var HAS = /assets\/(?:w\/)?(brow|lip|eyeline|hairline|store|lecture|images)\/[^"')\s]+\.(jpe?g|png)/i;
  function swap(s) { return s.replace(ORIG, function (m, pre, base, dir, name) { return pre + base + 'm/' + dir + '/' + name + '.jpg'; }); }
  function fixEl(el) {
    if (el.nodeType !== 1 || !mq.matches) return;
    if (el.tagName === 'LINK') { if (STATIC_FONT.test(el.href || '')) el.href = SUBSET_FONT; return; }
    var s = el.getAttribute('src');
    if (s && HAS.test(s)) { var n = swap(s); if (n !== s) el.setAttribute('src', n); }
    var st = el.getAttribute('style');
    if (st && HAS.test(st)) { var ns = swap(st); if (ns !== st) el.setAttribute('style', ns); }
  }
  function scan(n) {
    if (n.nodeType !== 1) return;
    fixEl(n);
    if (n.querySelectorAll) n.querySelectorAll('link[href*="pretendard"],img[src*="assets/"],image-slot[src*="assets/"],[style*="assets/"]').forEach(fixEl);
  }

  /* ---- 3) carousels: mouse drag support (touch scrolls natively) ---- */
  var CAROUSEL = 'main section div[style*="overflow-x: auto"],main [data-m="tri"],[data-screen-label="02 At a Glance"] div[style*="minmax(150px, 1fr)"],' +
    'main section div[style*="flex-wrap: wrap; gap: 8px; margin: 0px 0px 32px"],[data-screen-label="02 Program Detail"] div[style*="flex-wrap: wrap; gap: 6px; margin-bottom: 32px"]';
  var drag = null, moved = false;
  document.addEventListener('pointerdown', function (e) {
    if (!mq.matches || e.pointerType !== 'mouse' || e.button !== 0) return;
    var c = e.target.closest && e.target.closest(CAROUSEL);
    if (!c || c.scrollWidth <= c.clientWidth + 2) return;
    drag = { c: c, x: e.clientX, left: c.scrollLeft, snap: c.style.scrollSnapType };
    moved = false;
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 6) { moved = true; drag.c.style.scrollSnapType = 'none'; drag.c.style.cursor = 'grabbing'; }
    if (moved) { drag.c.scrollLeft = drag.left - dx; e.preventDefault(); }
  }, true);
  function endDrag() {
    if (!drag) return;
    var c = drag.c, snap = drag.snap;
    c.style.cursor = '';
    if (moved) {
      /* settle on the nearest card */
      var cr = c.getBoundingClientRect(), pad = parseFloat(getComputedStyle(c).paddingLeft) || 0, best = c.scrollLeft, bd = 1e9;
      [].slice.call(c.children).forEach(function (k) {
        if (!k.offsetWidth) return;
        var t = k.getBoundingClientRect().left - cr.left + c.scrollLeft - pad;
        var d = Math.abs(t - c.scrollLeft); if (d < bd) { bd = d; best = t; }
      });
      c.scrollTo({ left: Math.max(0, best), behavior: 'smooth' });
      setTimeout(function () { c.style.scrollSnapType = snap; }, 450);
    }
    drag = null;
  }
  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);
  /* a drag must not count as a click on the card / start a link drag */
  document.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  document.addEventListener('dragstart', function (e) { if (mq.matches && e.target.closest && e.target.closest(CAROUSEL)) e.preventDefault(); }, true);

  function start() {
    if (started || !mq.matches) return;
    started = true;
    root.classList.add('ub-m');
    new MutationObserver(function (ms) {
      if (!mq.matches) return;
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'attributes') fixEl(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]);
      }
    }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'href'] });
    if (document.body) scan(document.body);
    document.addEventListener('DOMContentLoaded', function () { scan(document.body); });
  }
  start();
  /* window resized into phone width after loading (e.g. browser dev tools) */
  var onChange = function () {
    root.classList.toggle('ub-m', mq.matches);
    if (mq.matches) { start(); if (document.body) scan(document.body); }
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
})();
