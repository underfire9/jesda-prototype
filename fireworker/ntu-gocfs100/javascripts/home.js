// 首頁：語言切換＋主選單
// ・語言切換（右上角）：載入中顯示但停用，進場開幕後才能切換；切換不重新載入，照片牆繼續播放
// ・主選單：HTML 只負責排版、鍵盤與螢幕報讀（文字透明、不接收滑鼠），
//   看得到的樣子由這支檔案畫在 canvas 上，再由 assets/canvas/scene.js 的 NavPlane 放進 3D 場景，
//   所以和 logo 一樣會被前方的照片遮住。顏色在 sass/application.scss 的 .home-nav 變數調整。
(function () {
  var nav = document.getElementById('home-nav');
  var langBox = document.getElementById('home-lang');
  if (!nav || !langBox) return;
  var root = document.documentElement;
  var links = [].slice.call(nav.querySelectorAll('.home-nav__link'));
  var langBtns = [].slice.call(langBox.querySelectorAll('.home-lang__btn'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = root.lang.indexOf('en') === 0 ? 'en' : 'zh';
  var dirty = true;

  // ---------- 語言切換 ----------
  function setLang(lang) {
    cur = lang;
    root.lang = lang === 'en' ? 'en' : 'zh-Hant';
    nav.querySelectorAll('[data-zh]').forEach(function (el) { el.textContent = el.dataset[lang]; });
    nav.querySelectorAll('[data-href-zh]').forEach(function (el) {
      el.href = lang === 'en' ? el.dataset.hrefEn : el.dataset.hrefZh;
    });
    nav.setAttribute('aria-label', lang === 'en' ? 'Main menu' : '主選單');
    langBox.dataset.lang = lang;
    langBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'); });
    // fireworker 版：網址同步成 /en/index.html，重新整理後維持同一語言
    if (window.__homeLangUrl && history.replaceState) {
      history.replaceState(null, '', lang === 'en' ? '/en/index.html' : '/index.html');
    }
    // artifact 版：把語言傳給外層頁面，讓內頁連結也帶到對應語言
    if (typeof window.__onHomeLang === 'function') window.__onHomeLang(lang);
    dirty = true;
  }
  langBtns.forEach(function (b) {
    b.addEventListener('click', function () { if (b.dataset.lang !== cur) setLang(b.dataset.lang); });
  });
  function enableLang() {
    langBox.classList.remove('is-loading');
    langBtns.forEach(function (b) { b.disabled = false; });
  }

  // ---------- 主選單：畫進 3D 場景 ----------
  var tex = window.__navTex = { canvas: document.createElement('canvas'), mask: document.createElement('canvas'), version: 0, x: 0, y: 0, w: 0, h: 0, alpha: 0, tint: [1, 1, 1, .8], blur: 12 };
  var PAD = 10;             // 畫布四周留白（給鍵盤焦點框）
  var NUDGE_EVERY = 3200;   // 箭頭每隔多久輕推一次（毫秒）
  var hover = -1;           // 滑鼠指著第幾個連結
  var prog = links.map(function () { return 0; }); // 每個連結的 hover 動畫進度 0–1
  var shownAt = 0;          // 開始淡入的時間

  function css(name) { return getComputedStyle(nav).getPropertyValue(name).trim(); }

  // 一個字一個字畫，才能加字距（各瀏覽器的 canvas letterSpacing 支援不一）
  function textWidth(c, s, ls) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += c.measureText(s[i]).width;
    return w + ls * Math.max(0, s.length - 1);
  }
  function drawText(c, s, x, y, ls) {
    for (var i = 0; i < s.length; i++) { c.fillText(s[i], x, y); x += c.measureText(s[i]).width + ls; }
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // CSS 顏色字串 → [r, g, b, a]（0–1）
  function parseColor(str) {
    var m = str.match(/rgba?\(([^)]+)\)/), hex = str.match(/^#([0-9a-f]{6})$/i);
    if (m) { var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1]; }
    if (hex) { var n = parseInt(hex[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1]; }
    return [1, 1, 1, .8];
  }
  function toLinear(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }

  function draw() {
    var box = nav.getBoundingClientRect();
    if (!box.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = box.width + PAD * 2, H = box.height + PAD * 2;
    var pw = Math.ceil(W * dpr), ph = Math.ceil(H * dpr);
    var cv = tex.canvas, mv = tex.mask, c = cv.getContext('2d'), mc = mv.getContext('2d');
    [cv, mv].forEach(function (x) { if (x.width !== pw || x.height !== ph) { x.width = pw; x.height = ph; } });
    [c, mc].forEach(function (x) { x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H); });

    // 膠囊底色（半透明＋霧面模糊，模糊在 scene.js 處理）
    var bg = parseColor(css('--nav-bg'));
    tex.tint = [toLinear(bg[0]), toLinear(bg[1]), toLinear(bg[2]), bg[3]];
    tex.blur = parseFloat(css('--nav-blur')) || 0;

    var color = css('--nav-color'), accent = css('--nav-accent'),
        hoverBg = css('--nav-hover-bg'), hoverColor = css('--nav-hover-color'), focusColor = css('--nav-focus');
    var arrowD = parseFloat(css('--nav-arrow')) || 24;
    var now = performance.now();

    links.forEach(function (el, i) {
      var a = el.getBoundingClientRect(), st = getComputedStyle(el), t = prog[i];
      var r = { x: a.left - box.left + PAD, y: a.top - box.top + PAD, w: a.width, h: a.height }, rad = r.h / 2;

      // 膠囊形狀（遮罩）
      mc.fillStyle = '#fff'; roundRect(mc, r.x, r.y, r.w, r.h, rad); mc.fill();
      // hover：橘底淡入
      if (t > 0) { c.globalAlpha = t; roundRect(c, r.x, r.y, r.w, r.h, rad); c.fillStyle = hoverBg; c.fill(); c.globalAlpha = 1; }

      // 文字：靠左，hover 時變白
      var s = el.textContent;
      if (st.textTransform === 'uppercase') s = s.toUpperCase();
      var ls = parseFloat(st.letterSpacing) || 0;
      c.font = st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
      c.textBaseline = 'middle';
      var tx = r.x + parseFloat(st.paddingLeft), ty = r.y + r.h / 2 + 1;
      c.globalAlpha = 1 - t; c.fillStyle = color; drawText(c, s, tx, ty, ls);
      c.globalAlpha = t; c.fillStyle = hoverColor; drawText(c, s, tx, ty, ls);
      c.globalAlpha = 1;

      // 右側小圓箭頭：細線長箭身＋小開口箭頭；平常橘底白箭頭，hover 時白底橘箭頭、箭頭往右；
      // 每隔幾秒輕推一下提示可以點
      var d = arrowD, edge = (r.h - d) / 2, cx = r.x + r.w - edge - d / 2, cy = r.y + r.h / 2;
      var nudge = 0;
      if (!reduce && shownAt) {
        var phs = ((now - shownAt - 1600 - i * 180) % NUDGE_EVERY + NUDGE_EVERY) % NUDGE_EVERY;
        if (phs < 700) nudge = Math.sin(phs / 700 * Math.PI) * d * 0.12 * (1 - t);
      }
      c.globalAlpha = 1 - t; c.fillStyle = accent; c.beginPath(); c.arc(cx, cy, d / 2, 0, Math.PI * 2); c.fill();
      c.globalAlpha = t; c.fillStyle = hoverColor; c.beginPath(); c.arc(cx, cy, d / 2, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
      var ax = cx + t * d * 0.08 + nudge, half = d * 0.24, head = d * 0.15;
      c.save();
      c.beginPath(); c.arc(cx, cy, d / 2 - 0.5, 0, Math.PI * 2); c.clip(); // 箭頭往右推時不超出圓
      c.strokeStyle = t > 0.5 ? accent : hoverColor;
      c.lineWidth = Math.max(1.1, d / 17); c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(ax - half, cy); c.lineTo(ax + half, cy);
      c.moveTo(ax + half - head, cy - head); c.lineTo(ax + half, cy); c.lineTo(ax + half - head, cy + head);
      c.stroke();
      c.restore();

      // 鍵盤焦點框
      if (el.matches(':focus-visible')) {
        c.strokeStyle = focusColor; c.lineWidth = 2;
        roundRect(c, r.x - 4, r.y - 4, r.w + 8, r.h + 8, rad + 4); c.stroke();
      }
    });

    tex.w = W; tex.h = H;
    tex.version++;
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  var last = performance.now();
  function tick(now) {
    var dt = Math.min(64, now - last); last = now;
    // hover 動畫
    links.forEach(function (el, i) {
      var want = (i === hover || el.matches(':focus-visible')) ? 1 : 0;
      if (prog[i] !== want) {
        prog[i] = reduce ? want : (want > prog[i] ? Math.min(want, prog[i] + dt / 220) : Math.max(want, prog[i] - dt / 220));
        dirty = true;
      }
    });
    // 箭頭輕推期間每格都要重畫
    if (!reduce && shownAt && tex.alpha > 0) {
      var ph = ((now - shownAt - 1600) % NUDGE_EVERY + NUDGE_EVERY) % NUDGE_EVERY;
      if (ph < 700 + links.length * 180 + 50) dirty = true;
    }
    if (dirty) { dirty = false; draw(); }
    // 位置（HTML 選單的中心）＋進場淡入、由下往上
    var box = nav.getBoundingClientRect(), k = 0;
    if (shownAt) {
      var delay = reduce ? 0 : 600, dur = reduce ? 300 : 700;
      k = Math.max(0, Math.min(1, (now - shownAt - delay) / dur));
    }
    tex.alpha = reduce ? k : ease(k);
    tex.x = box.left + box.width / 2;
    tex.y = box.top + box.height / 2 + (reduce ? 0 : (1 - ease(k)) * 12);
    requestAnimationFrame(tick);
  }

  // ---------- 主選單：滑鼠與觸控（選單本身不接收事件，避免擋住拖曳照片牆） ----------
  var stage = document.getElementById('root');
  function linkAt(x, y) {
    if (tex.alpha < 0.5) return -1;
    for (var i = 0; i < links.length; i++) {
      var r = links[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        // 被前方照片遮住的地方不算
        if (window.__navOccluded && window.__navOccluded(x, y)) return -1;
        return i;
      }
    }
    return -1;
  }
  function canvasEl() { return stage && stage.querySelector('canvas'); }
  var down = null, overLink = false;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || !stage || !stage.contains(e.target)) return;
    var moved = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6;
    var i = moved ? -1 : linkAt(e.clientX, e.clientY);
    if (i !== hover) { hover = i; dirty = true; }
    var cv = canvasEl();
    if (cv) {
      if (i >= 0) { cv.style.cursor = 'pointer'; overLink = true; }
      else if (overLink) { cv.style.cursor = down ? 'grabbing' : 'grab'; overLink = false; }
    }
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    if (!stage || !stage.contains(e.target)) return;
    down = { x: e.clientX, y: e.clientY, i: linkAt(e.clientX, e.clientY) };
  }, { passive: true });
  window.addEventListener('pointerup', function (e) {
    var d = down; down = null;
    if (!d || d.i < 0) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return;
    if (linkAt(e.clientX, e.clientY) === d.i) window.location.href = links[d.i].href;
  });
  window.addEventListener('pointercancel', function () { down = null; });

  // 鍵盤焦點、視窗大小、字型載入完成時重畫
  nav.addEventListener('focusin', function () { dirty = true; });
  nav.addEventListener('focusout', function () { dirty = true; });
  window.addEventListener('resize', function () { dirty = true; });
  if (document.fonts) {
    document.fonts.ready.then(function () { dirty = true; });
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { dirty = true; });
  }

  // 進場開幕：開放語言切換、選單淡入
  function onIntroDone() { if (!shownAt) { shownAt = performance.now(); enableLang(); } }
  window.addEventListener('home:introdone', onIntroDone);
  if (root.classList.contains('intro-done')) onIntroDone();

  setLang(cur);
  requestAnimationFrame(tick);
})();
