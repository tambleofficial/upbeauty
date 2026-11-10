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

  /* ---- 4) photos never look cut off and frames never show empty space ----
     Frames keep their shape. If a photo's shape is close to the frame (<=7% off) it simply fills it.
     If it is very different, the whole photo is shown and the leftover area is filled with a
     soft blurred copy of the same photo (no blank bars). */
  var FIT_TH = 0.07;
  function boxOf(el) {
    var p = el.parentElement;
    for (var i = 0; i < 4 && p && p.tagName !== 'MAIN' && p.tagName !== 'SECTION'; i++, p = p.parentElement) {
      var ar = getComputedStyle(p).aspectRatio;
      if (ar && /\d/.test(ar)) return p;
    }
    return null;
  }
  function boxRatio(box) {
    var m = (getComputedStyle(box).aspectRatio || '').match(/([\d.]+)\s*\/\s*([\d.]+)/);
    if (m && +m[2]) return +m[1] / +m[2];
    var r = box.getBoundingClientRect(); return r.height ? r.width / r.height : 0;
  }
  function setFill(box, url) {
    box.__ubFill = url;
    /* the blurred copy must stay inside this frame: make sure the frame is a positioning box */
    if (!box.hasAttribute('data-ub-static') && getComputedStyle(box).position === 'static') box.setAttribute('data-ub-static', '');
    if (!box.hasAttribute('data-ub-fill')) box.setAttribute('data-ub-fill', '');
    if (box.style.getPropertyValue('--ub-fill') !== url) box.style.setProperty('--ub-fill', url);
  }
  function clearFill(box) {
    if (!box || !box.__ubFill) return;
    box.__ubFill = null; box.removeAttribute('data-ub-fill'); box.removeAttribute('data-ub-static'); box.style.removeProperty('--ub-fill');
  }
  function decide(el, w, h, src) {
    if (!mq.matches || !w || !h) return;
    var box = el.__ubBox || (el.__ubBox = boxOf(el));
    if (!box) return;
    var br = boxRatio(box); if (!br) return;
    var ir = w / h, off = 1 - Math.min(ir, br) / Math.max(ir, br);
    var slot = el.tagName === 'IMAGE-SLOT';
    if (off > FIT_TH && src) {
      setFill(box, 'url("' + src.replace(/"/g, '%22') + '")');
      if (slot) { if (el.getAttribute('fit') !== 'contain') el.setAttribute('fit', 'contain'); }
      else el.setAttribute('data-ub-contain', '');
    } else {
      clearFill(box);
      if (slot) { if (el.getAttribute('fit') === 'contain') el.removeAttribute('fit'); }
      else el.removeAttribute('data-ub-contain');
    }
  }
  function watchFit(el) {
    if (el.__ubFit || el.closest('header,footer,.ub-reel')) return;
    if (el.tagName === 'IMAGE-SLOT') {
      var img = el.shadowRoot && el.shadowRoot.querySelector('.frame img');
      if (!img) return; /* not built yet, a later scan picks it up */
      el.__ubFit = 1;
      var f = function () { decide(el, img.naturalWidth, img.naturalHeight, img.currentSrc || img.src); };
      img.addEventListener('load', f); if (img.complete && img.naturalWidth) f();
    } else if (el.tagName === 'VIDEO') {
      el.__ubFit = 1;
      var fv = function () { decide(el, el.videoWidth, el.videoHeight, null); };
      el.addEventListener('loadedmetadata', fv); if (el.readyState >= 1) fv();
    } else if (el.tagName === 'IMG') {
      if (el.closest('article span')) return; /* tiny review avatars */
      el.__ubFit = 1;
      var fi = function () { decide(el, el.naturalWidth, el.naturalHeight, el.currentSrc || el.src); };
      el.addEventListener('load', fi); if (el.complete && el.naturalWidth) fi();
    }
  }
  /* lightbox: blurred copy of the photo behind it instead of a plain background */
  function lightbox(el) {
    var bg = el.style.backgroundImage, box = el.parentElement;
    if (!box) return;
    if (bg && bg !== 'none' && mq.matches) setFill(box, bg); else clearFill(box);
  }
  function fitScan(n) {
    if (!mq.matches || n.nodeType !== 1) return;
    var sel = 'main image-slot, main img, main video';
    if (n.matches && n.matches(sel)) watchFit(n);
    if (n.querySelectorAll) { n.querySelectorAll(sel).forEach(watchFit); n.querySelectorAll('main [role="img"]').forEach(lightbox); }
    if (n.matches && n.matches('main [role="img"]')) lightbox(n);
  }
  function onAttr(t) {
    if (t.__ubFill && t.style.getPropertyValue('--ub-fill') !== t.__ubFill) t.style.setProperty('--ub-fill', t.__ubFill);
    if (t.getAttribute && t.getAttribute('role') === 'img') lightbox(t);
  }
  function unfit() {
    document.querySelectorAll('[data-ub-fill]').forEach(clearFill);
    document.querySelectorAll('[data-ub-contain]').forEach(function (e) { e.removeAttribute('data-ub-contain'); });
    document.querySelectorAll('image-slot[fit="contain"]').forEach(function (e) { e.removeAttribute('fit'); });
    document.querySelectorAll('image-slot, main img, main video').forEach(function (e) { e.__ubFit = 0; });
  }
  /* ---- 4b) Instagram reels: play right on the page (Instagram blocks inline play for some reels) ---- */
  var REELS = { 'DeOl5gwNUnW': 1, 'DVIZdVZEcxo': 1, 'DLFVJ5URHs5': 1 };
  var reelIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) { var v = e.target.querySelector('video'); if (v && !v.paused) v.pause(); } });
  }, { threshold: 0.2 }) : null;
  function ensureReels() {
    if (!mq.matches) return;
    document.querySelectorAll('[data-screen-label="05 Instagram"] iframe').forEach(function (f) {
      var m = (f.getAttribute('src') || '').match(/\/reel\/([\w-]+)/);
      if (!m || !REELS[m[1]]) return;
      if (!f.hasAttribute('data-ub-hide')) f.setAttribute('data-ub-hide', '');
      var box = f.parentElement;
      if (!box || box.querySelector('.ub-reel')) return;
      var code = m[1], poster = '/assets/reels/' + code + '.jpg';
      var w = document.createElement('div'); w.className = 'ub-reel';
      w.setAttribute('data-ub-fill', ''); w.__ubFill = 'url("' + poster + '")'; w.style.setProperty('--ub-fill', w.__ubFill);
      var v = document.createElement('video');
      v.src = '/assets/reels/' + code + '.mp4'; v.poster = poster; v.preload = 'none'; v.loop = true;
      v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      var b = document.createElement('span'); b.className = 'ub-reel-btn'; b.setAttribute('aria-hidden', 'true');
      w.setAttribute('role', 'button'); w.setAttribute('aria-label', '영상 재생'); w.tabIndex = 0;
      w.appendChild(v); w.appendChild(b); box.appendChild(w);
      var toggle = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (v.paused) {
          document.querySelectorAll('.ub-reel video').forEach(function (o) { if (o !== v && !o.paused) o.pause(); });
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else v.pause();
      };
      w.addEventListener('click', toggle);
      w.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') toggle(e); });
      v.addEventListener('play', function () { w.classList.add('is-playing'); w.setAttribute('aria-label', '영상 일시정지'); });
      v.addEventListener('pause', function () { w.classList.remove('is-playing'); w.setAttribute('aria-label', '영상 재생'); });
      v.addEventListener('waiting', function () { w.classList.add('is-loading'); });
      v.addEventListener('playing', function () { w.classList.remove('is-loading'); });
      if (reelIO) reelIO.observe(w);
    });
  }
  function removeReels() {
    document.querySelectorAll('.ub-reel').forEach(function (w) { var v = w.querySelector('video'); if (v) v.pause(); if (reelIO) reelIO.unobserve(w); w.remove(); });
    document.querySelectorAll('iframe[data-ub-hide]').forEach(function (f) { f.removeAttribute('data-ub-hide'); });
  }

  /* ---- 5) header: hides while scrolling down, slides back in when scrolling up ---- */
  var lastY = 0, ticking = false;
  function hdr() {
    ticking = false;
    var h = document.querySelector('header');
    if (!h) return;
    if (!mq.matches) { root.classList.remove('ub-hdr-fixed', 'ub-hdr-show'); return; }
    var hh = h.offsetHeight || 60, ph = h.parentElement;
    if (ph && ph.tagName !== 'BODY' && ph.style.minHeight !== hh + 'px') ph.style.minHeight = hh + 'px';
    var y = window.scrollY, dy = y - lastY;
    var menuOpen = !!h.querySelector('[style*="position: fixed"][style*="inset: 0"]');
    if (y <= hh) { root.classList.remove('ub-hdr-fixed', 'ub-hdr-show'); }
    else if (menuOpen) { /* keep it as it is */ }
    else if (dy < -4) {
      if (!root.classList.contains('ub-hdr-fixed')) { root.classList.add('ub-hdr-fixed'); requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('ub-hdr-show'); }); }); }
      else root.classList.add('ub-hdr-show');
    }
    else if (dy > 4) { root.classList.add('ub-hdr-fixed'); root.classList.remove('ub-hdr-show'); }
    if (Math.abs(dy) > 4 || y <= hh) lastY = y;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(hdr); } }, { passive: true });

  function start() {
    if (started || !mq.matches) return;
    started = true;
    root.classList.add('ub-m');
    new MutationObserver(function (ms) {
      if (!mq.matches) return;
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'attributes') { fixEl(m.target); onAttr(m.target); }
        else for (var j = 0; j < m.addedNodes.length; j++) { scan(m.addedNodes[j]); fitScan(m.addedNodes[j]); }
      }
      ensureReels();
    }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'href'] });
    if (document.body) { scan(document.body); fitScan(document.body); }
    document.addEventListener('DOMContentLoaded', function () { scan(document.body); fitScan(document.body); });
    /* image-slot builds its inner image a moment after it is inserted */
    setTimeout(function () { fitScan(document.body); ensureReels(); }, 600);
    setTimeout(function () { fitScan(document.body); ensureReels(); }, 2000);
  }
  start();
  /* window resized into phone width after loading (e.g. browser dev tools) */
  var onChange = function () {
    root.classList.toggle('ub-m', mq.matches);
    if (mq.matches) { start(); if (document.body) { scan(document.body); fitScan(document.body); } }
    else { unfit(); removeReels(); }
    hdr();
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
})();
