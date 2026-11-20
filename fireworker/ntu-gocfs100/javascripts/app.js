// 百歲傳情‧海外同慶 前台原型互動
// 語系由 <html lang> 決定：zh-Hant 顯示中文欄位，en 顯示英文欄位。
// 內容：手機選單、線上祝福（篩選／載入更多／燈箱）、社團發展歷程（社團頁籤／區塊篩選／年代軸）、投稿表單驗證、送出成功頁。
(function () {
  'use strict';
  var LANG = document.documentElement.lang.indexOf('en') === 0 ? 'en' : 'zh';
  var EN = LANG === 'en';
  function t(obj) { return obj ? (obj[LANG] || obj.zh) : ''; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- 手機選單 ---------- */
  var toggle = $('.menu-toggle');
  if (toggle) {
    var header = $('#site-header');
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? toggle.dataset.labelClose : toggle.dataset.labelOpen);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) { toggle.click(); toggle.focus(); }
    });
  }

  /* ---------- 共用：標籤 ---------- */
  function idTag(key) { return '<span class="tag tag--' + key + '">' + esc(t(window.LABELS.identity[key])) + '</span>'; }
  function regionTag(key) { return '<span class="tag tag--region">' + esc(t(window.LABELS.region[key])) + '</span>'; }

  /* ---------- 01 線上祝福：照片牆 ---------- */
  var wall = $('#wall');
  if (wall && window.BLESSINGS) {
    var PAGE = 12;
    var state = { identity: '', region: '', decade: '', shown: PAGE };
    var list = [];
    var countEl = $('#result-count'), statusEl = $('#load-status'), moreBtn = $('#load-more'), emptyEl = $('#wall-empty');

    function filtered() {
      return window.BLESSINGS.filter(function (b) {
        if (state.identity && b.identity !== state.identity) return false;
        if (state.region && b.region !== state.region) return false;
        if (state.decade && Math.floor(b.year / 10) * 10 !== +state.decade) return false;
        return true;
      });
    }
    function card(b, i) {
      var li = el('li', 'wall__item');
      li.innerHTML =
        '<button class="photo-card" type="button" data-index="' + i + '">' +
          '<span class="photo-card__img ph ph--' + b.tone + '" style="aspect-ratio:1/' + (b.ratio * 0.62).toFixed(2) + '"></span>' +
          '<span class="photo-card__body">' +
            '<span class="tags">' + idTag(b.identity) + regionTag(b.region) + '</span>' +
            '<span class="photo-card__title">' + esc(t(b.title)) + '</span>' +
            '<span class="photo-card__meta">' + b.year + ' ・ ' + esc(t(window.LABELS.source[b.source])) + '</span>' +
          '</span>' +
        '</button>';
      return li;
    }
    function render() {
      list = filtered();
      wall.innerHTML = '';
      var n = Math.min(state.shown, list.length);
      for (var i = 0; i < n; i++) wall.appendChild(card(list[i], i));
      countEl.textContent = EN ? list.length + (list.length === 1 ? ' blessing' : ' blessings') : '共 ' + list.length + ' 則祝福';
      statusEl.textContent = EN ? 'Showing ' + n + ' of ' + list.length : '已顯示 ' + n + ' / ' + list.length;
      moreBtn.hidden = n >= list.length;
      emptyEl.hidden = list.length > 0;
      statusEl.hidden = list.length === 0;
    }
    $$('.chips[data-filter]').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var btn = e.target.closest('.chip'); if (!btn) return;
        $$('.chip', group).forEach(function (c) { c.classList.toggle('is-active', c === btn); c.setAttribute('aria-pressed', c === btn ? 'true' : 'false'); });
        state[group.dataset.filter] = btn.dataset.value;
        state.shown = PAGE; render();
      });
    });
    $('#year-filter').addEventListener('change', function () { state.decade = this.value; state.shown = PAGE; render(); });
    moreBtn.addEventListener('click', function () {
      var first = state.shown; state.shown += PAGE; render();
      var next = wall.children[first]; if (next) next.querySelector('button').focus({ preventScroll: true });
    });
    wall.addEventListener('click', function (e) {
      var btn = e.target.closest('.photo-card'); if (btn) openLb(+btn.dataset.index, btn);
    });

    /* ---------- 02 單筆照片檢視（燈箱） ---------- */
    var lb = $('#lightbox'), cur = 0, opener = null, touchX = null;
    var metaLabels = EN ? ['Source', 'Year', 'Date', 'Category'] : ['來源', '年份', '時間', '分類'];
    function fill() {
      var b = list[cur];
      $('#lb-count').textContent = (cur + 1) + ' / ' + list.length;
      $('#lb-photo').className = 'lightbox__photo ph ph--' + b.tone;
      $('#lb-tags').innerHTML = idTag(b.identity) + regionTag(b.region);
      $('#lb-title').textContent = t(b.title);
      var vals = [t(window.LABELS.source[b.source]), b.year, b.date, t(b.category)];
      $('#lb-meta').innerHTML = metaLabels.map(function (l, i) { return '<div><dt>' + l + '</dt><dd>' + esc(vals[i]) + '</dd></div>'; }).join('');
      $('#lb-message').textContent = t(b.message);
      $('#lb-signer').textContent = '— ' + t(b.signer);
      $('#lb-prev').disabled = cur === 0;
      $('#lb-next').disabled = cur === list.length - 1;
      var url = new URL(location.href); url.searchParams.set('photo', b.id); history.replaceState(null, '', url);
    }
    function openLb(i, from) {
      cur = i; opener = from || null; fill();
      lb.hidden = false; document.body.classList.add('no-scroll');
      $('#lb-close').focus();
    }
    function closeLb() {
      lb.hidden = true; document.body.classList.remove('no-scroll');
      var url = new URL(location.href); url.searchParams.delete('photo'); history.replaceState(null, '', url);
      if (opener) opener.focus();
    }
    function go(d) {
      var n = cur + d; if (n < 0 || n >= list.length) return;
      cur = n;
      if (cur >= state.shown) { state.shown = cur + 1; render(); } // 跟著篩選結果往後翻時，照片牆一起載入
      fill();
    }
    $('#lb-close').addEventListener('click', closeLb);
    $('#lb-prev').addEventListener('click', function () { go(-1); });
    $('#lb-next').addEventListener('click', function () { go(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Tab') { // 焦點留在燈箱內
        var f = $$('button:not([disabled])', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX == null) return;
      var dx = e.changedTouches[0].clientX - touchX; touchX = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });

    render();
    // 網址帶 ?photo=ID 時直接開啟該張（分享連結用）
    var pid = new URL(location.href).searchParams.get('photo');
    if (pid) {
      var idx = list.findIndex(function (b) { return b.id === pid; });
      if (idx >= 0) { if (idx >= state.shown) { state.shown = idx + 1; render(); } openLb(idx); }
    }
  }

  /* ---------- 03 社團發展歷程 ---------- */
  var timeline = $('#timeline');
  if (timeline && window.HISTORY) {
    var clubs = window.CLUBS, types = window.EVENT_TYPES;
    var clubName = {}; clubs.forEach(function (c) { clubName[c.id] = c.name; });
    var DECADES = [1928, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2026];
    var hs = { club: new URL(location.href).searchParams.get('club') || 'all', types: { found: true, develop: true, exchange: true } };
    if (hs.club !== 'all' && !clubName[hs.club]) hs.club = 'all';

    // 社團頁籤
    var tabs = $('#club-tabs');
    var tabData = [{ id: 'all', name: { zh: '全部社團', en: 'All Associations' } }].concat(clubs);
    tabs.innerHTML = tabData.map(function (c) {
      return '<li><button class="chip" type="button" data-club="' + c.id + '">' + esc(t(c.name)) + '</button></li>';
    }).join('');
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-club]'); if (!b) return;
      hs.club = b.dataset.club;
      var url = new URL(location.href);
      if (hs.club === 'all') url.searchParams.delete('club'); else url.searchParams.set('club', hs.club);
      history.replaceState(null, '', url);
      renderHistory();
    });

    // 區塊類型篩選（可複選）
    var tf = $('#type-filter');
    tf.innerHTML = Object.keys(types).map(function (k) {
      return '<li><button class="chip chip--type chip--' + k + ' is-active" type="button" data-type="' + k + '" aria-pressed="true"><span class="dot"></span>' + esc(t(types[k])) + '</button></li>';
    }).join('');
    tf.addEventListener('click', function (e) {
      var b = e.target.closest('[data-type]'); if (!b) return;
      var on = !hs.types[b.dataset.type];
      if (!on && Object.keys(hs.types).filter(function (k) { return hs.types[k]; }).length === 1) return; // 至少保留一種
      hs.types[b.dataset.type] = on;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      renderHistory();
    });

    function decadeOf(y) { // 對應年代軸上的點
      if (y < 1940) return 1928;
      if (y >= 2026) return 2026;
      return Math.floor(y / 10) * 10;
    }
    function typeLabel(e) { return '<span class="event-type event-type--' + e.type + '"><span class="dot"></span>' + esc(t(types[e.type])) + '</span>'; }
    function tone(i) { return ['warm', 'sand', 'grey', 'rose'][i % 4]; } // 示意照片色塊；時間軸與燈箱共用
    var tlEvents = []; // 單一社團時間軸目前顯示的紀錄（燈箱依此順序翻頁）

    function renderHistory() {
      $$('[data-club]', tabs).forEach(function (b) {
        var on = b.dataset.club === hs.club;
        b.classList.toggle('is-active', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      var events = window.HISTORY.filter(function (e) {
        return (hs.club === 'all' || e.club === hs.club) && hs.types[e.type];
      });
      var all = hs.club === 'all';
      var total = window.HISTORY.filter(function (e) { return all || e.club === hs.club; }).length;

      // 標題區
      if (all) {
        $('#club-eyebrow').textContent = EN ? clubs.length + ' associations ・ ' + total + ' records' : clubs.length + ' 個社團 ・ 共 ' + total + ' 筆紀錄';
        $('#club-title').textContent = EN ? 'All Associations' : '全部社團';
        $('#club-sub').textContent = EN ? 'Year by year, across all seven associations' : '依年份瀏覽七個社團的發展足跡';
      } else {
        var c = clubs.filter(function (x) { return x.id === hs.club; })[0];
        $('#club-eyebrow').textContent = EN ? 'Founded ' + c.founded : c.founded + ' 年成立';
        $('#club-title').textContent = t(c.name);
        $('#club-sub').textContent = EN ? total + ' records' : '共 ' + total + ' 筆紀錄';
      }

      // 年代軸
      var has = {}; events.forEach(function (e) { has[decadeOf(e.year)] = true; });
      $('#rail-list').innerHTML = DECADES.map(function (d) {
        return '<li><button type="button" class="rail__item' + (has[d] ? ' has-data' : '') + '" data-decade="' + d + '"' + (has[d] ? '' : ' disabled') + '><span class="rail__dot"></span><span class="rail__year">' + d + '</span></button></li>';
      }).join('');

      // 時間軸
      timeline.className = 'container ' + (all ? 'year-groups' : 'tl');
      if (!events.length) {
        timeline.innerHTML = '<p class="wall-empty">' + (EN ? 'No records for this selection.' : '目前沒有符合條件的紀錄。') + '</p>';
      } else if (all) {
        var byYear = [];
        events.forEach(function (e) {
          var g = byYear[byYear.length - 1];
          if (!g || g.year !== e.year) byYear.push(g = { year: e.year, items: [] });
          g.items.push(e);
        });
        timeline.innerHTML = byYear.map(function (g) {
          return '<section class="yg" data-decade="' + decadeOf(g.year) + '">' +
            '<div class="yg__year"><span class="yg__num">' + g.year + '</span><span class="yg__count">' +
              (EN ? g.items.length + (g.items.length === 1 ? ' record' : ' records') : g.items.length + ' 則紀錄') + '</span></div>' +
            '<ul class="yg__cards">' + g.items.map(function (e) {
              return '<li class="event-card"><p class="event-card__labels"><span class="tag tag--club">' + esc(t(clubName[e.club])) + '</span>' + typeLabel(e) + '</p>' +
                '<h3 class="event-card__title">' + esc(t(e.title)) + '</h3><p class="event-card__text">' + esc(t(e.text)) + '</p></li>';
            }).join('') + '</ul></section>';
        }).join('');
      } else {
        tlEvents = events;
        timeline.innerHTML = '<ol class="tl__list">' + events.map(function (e, i) {
          return '<li class="tl__item tl__item--' + (i % 2 ? 'right' : 'left') + ' tl__item--' + e.type + '" data-decade="' + decadeOf(e.year) + '">' +
            '<p class="tl__year">' + e.year + '</p><span class="tl__node" aria-hidden="true"></span>' +
            '<article class="event-card event-card--photo"><button type="button" class="event-card__img ph ph--' + tone(i) + '" data-index="' + i + '" aria-label="' + esc((EN ? 'Enlarge photo: ' : '放大照片：') + t(e.title)) + '"></button>' +
            '<div><p class="event-card__labels">' + typeLabel(e) + '</p><h3 class="event-card__title">' + esc(t(e.title)) + '</h3><p class="event-card__text">' + esc(t(e.text)) + '</p></div></article></li>';
        }).join('') + '</ol>';
      }
      updateRail();
    }

    // 年代軸：點擊捲動、捲動時標示目前年代
    var rail = $('#rail');
    function railOffset() { return rail.getBoundingClientRect().height + 16; }
    $('#rail-list').addEventListener('click', function (e) {
      var b = e.target.closest('.rail__item.has-data'); if (!b) return;
      var target = $('[data-decade="' + b.dataset.decade + '"]', timeline); if (!target) return;
      var y = target.getBoundingClientRect().top + window.pageYOffset - railOffset();
      window.scrollTo({ top: y, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    var ticking = false;
    function updateRail() {
      ticking = false;
      var items = $$('[data-decade]', timeline), line = railOffset() + 40, current = items.length ? items[0].dataset.decade : null;
      items.forEach(function (it) { if (it.getBoundingClientRect().top <= line) current = it.dataset.decade; });
      $$('.rail__item').forEach(function (b) {
        var on = b.dataset.decade === current;
        b.classList.toggle('is-current', on);
        if (on) {
          b.setAttribute('aria-current', 'true');
          var list = b.closest('.rail__list'); // 手機版年代軸可橫向捲動，把目前年代捲進畫面
          if (list.scrollWidth > list.clientWidth) list.scrollLeft = b.offsetLeft - list.clientWidth / 2 + b.offsetWidth / 2;
        } else b.removeAttribute('aria-current');
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(updateRail); } }, { passive: true });
    window.addEventListener('resize', updateRail);

    /* ---------- 03 時間軸照片燈箱：顯示 label（社團＋類型）、年份、title、text ---------- */
    var hlb = $('#history-lb'), hcur = 0, hTouchX = null;
    if (hlb) {
      function hFill() {
        var e = tlEvents[hcur];
        $('#hlb-count').textContent = (hcur + 1) + ' / ' + tlEvents.length;
        $('#hlb-photo').className = 'lightbox__photo ph ph--' + tone(hcur);
        $('#hlb-year').textContent = e.year;
        $('#hlb-labels').innerHTML = '<span class="tag tag--club">' + esc(t(clubName[e.club])) + '</span>' + typeLabel(e);
        $('#hlb-title').textContent = t(e.title);
        $('#hlb-text').textContent = t(e.text);
        $('#hlb-prev').disabled = hcur === 0;
        $('#hlb-next').disabled = hcur === tlEvents.length - 1;
      }
      function hOpen(i) {
        hcur = i; hFill();
        hlb.hidden = false; document.body.classList.add('no-scroll');
        $('#hlb-close').focus();
      }
      function hClose() {
        hlb.hidden = true; document.body.classList.remove('no-scroll');
        var b = $('.event-card__img[data-index="' + hcur + '"]', timeline); // 焦點回到最後看的那張
        if (b) b.focus();
      }
      function hGo(d) { var n = hcur + d; if (n < 0 || n >= tlEvents.length) return; hcur = n; hFill(); }
      timeline.addEventListener('click', function (e) {
        var b = e.target.closest('.event-card__img[data-index]'); if (b) hOpen(+b.dataset.index);
      });
      $('#hlb-close').addEventListener('click', hClose);
      $('#hlb-prev').addEventListener('click', function () { hGo(-1); });
      $('#hlb-next').addEventListener('click', function () { hGo(1); });
      hlb.addEventListener('click', function (e) { if (e.target === hlb) hClose(); });
      document.addEventListener('keydown', function (e) {
        if (hlb.hidden) return;
        if (e.key === 'Escape') hClose();
        else if (e.key === 'ArrowLeft') hGo(-1);
        else if (e.key === 'ArrowRight') hGo(1);
        else if (e.key === 'Tab') { // 焦點留在燈箱內
          var f = $$('button:not([disabled])', hlb), first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      hlb.addEventListener('touchstart', function (e) { hTouchX = e.touches[0].clientX; }, { passive: true });
      hlb.addEventListener('touchend', function (e) {
        if (hTouchX == null) return;
        var dx = e.changedTouches[0].clientX - hTouchX; hTouchX = null;
        if (Math.abs(dx) > 50) hGo(dx < 0 ? 1 : -1);
      });
    }
    renderHistory();
  }

  /* ---------- 04 投稿表單 ---------- */
  var form = $('#submit-form');
  if (form) {
    var MSG = EN ? {
      required: 'This field is required.', choose: 'Please choose one.', email: 'Please enter a valid email address.',
      date: 'Use the format YYYY/MM/DD.', photo: 'Please add at least one photo.', type: ' is not a JPG or PNG file.',
      size: ' is larger than 10 MB.', max: 'You can add up to 5 photos.', descZh: 'Caption (Chinese)', descEn: 'Caption (English)',
      descZhPh: '例：與同學於椰林大道合影', descEnPh: 'e.g. With classmates on the Royal Palm Blvd.', remove: 'Remove', agree: 'Please agree before submitting.'
    } : {
      required: '此欄位為必填。', choose: '請選擇一項。', email: 'Email 格式不正確。',
      date: '請依 YYYY/MM/DD 格式填寫。', photo: '請至少上傳一張照片。', type: ' 不是 JPG 或 PNG 檔。',
      size: ' 超過 10MB。', max: '最多上傳 5 張照片。', descZh: '照片描述（中文）', descEn: '照片描述（英文）',
      descZhPh: '例：與同學於椰林大道合影', descEnPh: 'e.g. With classmates on the Royal Palm Blvd.', remove: '移除', agree: '請勾選同意後再送出。'
    };
    // 年份選單
    var ys = $('[data-year-select]'), now = new Date().getFullYear();
    for (var y = now; y >= 1928; y--) { var o = document.createElement('option'); o.textContent = y; ys.appendChild(o); }

    function errBox(field) { return field.querySelector('.field-error') || (field.parentNode && field.parentNode.querySelector('.field-error')); }
    function setErr(field, msg) {
      var box = errBox(field); if (box) box.textContent = msg || '';
      field.classList.toggle('has-error', !!msg);
      $$('input,select,textarea', field).forEach(function (i) { if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); });
    }
    function checkField(field) {
      var input = $('input:not([type=radio]):not([type=file]),select,textarea', field), msg = '';
      if (field.matches('[data-required]')) {
        msg = $('input:checked', field) ? '' : MSG.choose;
      } else if (input) {
        var v = input.type === 'checkbox' ? input.checked : input.value.trim();
        if (input.required && !v) msg = input.type === 'checkbox' ? MSG.agree : (input.tagName === 'SELECT' ? MSG.choose : MSG.required);
        else if (input.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = MSG.email;
        else if (input.name === 'date' && v && !/^\d{4}\/\d{2}\/\d{2}$/.test(v)) msg = MSG.date;
      }
      setErr(field, msg);
      return !msg;
    }
    var fields = $$('.field', form).filter(function (f) { return !f.querySelector('.field'); });
    fields.forEach(function (f) {
      f.addEventListener('change', function () { checkField(f); updateSteps(); });
      f.addEventListener('focusout', function (e) { if (f.contains(e.relatedTarget)) return; if (!f.matches('[data-required]')) checkField(f); updateSteps(); });
    });

    // 照片上傳
    var photos = [], photoList = $('#photo-list'), photoErr = $('#photo-error'), drop = $('#dropzone'), fileInput = $('#f-photos');
    function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
    function addFiles(files) {
      var errs = [];
      Array.prototype.forEach.call(files, function (f) {
        if (!/^image\/(jpeg|png)$/.test(f.type)) return errs.push(f.name + MSG.type);
        if (f.size > 10 * 1048576) return errs.push(f.name + MSG.size);
        if (photos.length >= 5) { if (errs.indexOf(MSG.max) < 0) errs.push(MSG.max); return; }
        photos.push({ file: f, url: URL.createObjectURL(f), id: 'p' + Date.now() + Math.random().toString(16).slice(2, 6) });
      });
      photoErr.textContent = errs.join(' ');
      renderPhotos(); updateSteps();
    }
    function renderPhotos() {
      photoList.innerHTML = photos.map(function (p) {
        return '<li class="photo-row" data-id="' + p.id + '"><img src="' + p.url + '" alt="">' +
          '<div class="photo-row__body"><p class="photo-row__file">' + esc(p.file.name) + ' ・ ' + fmtSize(p.file.size) +
          '<button class="link-btn" type="button" data-remove="' + p.id + '">' + MSG.remove + '</button></p>' +
          '<div class="field-grid field-grid--tight">' +
          '<div class="field"><label for="' + p.id + '-zh">' + MSG.descZh + ' <span class="req">*</span></label><input id="' + p.id + '-zh" type="text" lang="zh-Hant" placeholder="' + MSG.descZhPh + '" required><p class="field-error"></p></div>' +
          '<div class="field"><label for="' + p.id + '-en">' + MSG.descEn + ' <span class="req">*</span></label><input id="' + p.id + '-en" type="text" lang="en" placeholder="' + MSG.descEnPh + '" required><p class="field-error"></p></div>' +
          '</div></div></li>';
      }).join('');
      $$('.field', photoList).forEach(function (f) { f.addEventListener('focusout', function () { checkField(f); updateSteps(); }); });
    }
    photoList.addEventListener('click', function (e) {
      var b = e.target.closest('[data-remove]'); if (!b) return;
      photos = photos.filter(function (p) { if (p.id === b.dataset.remove) { URL.revokeObjectURL(p.url); return false; } return true; });
      renderPhotos(); updateSteps(); drop.focus();
    });
    fileInput.addEventListener('change', function () { addFiles(this.files); this.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });

    // 步驟提示：依各區塊填寫狀況標示
    function panelDone(p) {
      if (p.dataset.step === '2') return photos.length > 0 && $$('input[type=text]', p).every(function (i) { return i.value.trim(); });
      return $$('.field', p).every(function (f) {
        if (f.matches('[data-required]')) return !!$('input:checked', f);
        var i = $('input,select,textarea', f); return !i || !i.required || i.value.trim();
      });
    }
    function updateSteps() {
      var panels = $$('.panel', form), firstOpen = null;
      panels.forEach(function (p) {
        var li = $('.stepper [data-step="' + p.dataset.step + '"]'), done = panelDone(p);
        li.classList.toggle('is-done', done);
        if (!done && firstOpen === null) firstOpen = p.dataset.step;
      });
      $$('.stepper li').forEach(function (li) { li.classList.toggle('is-current', li.dataset.step === (firstOpen || '3')); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('.field', form).filter(function (f) { return !f.querySelector('.field'); }).forEach(function (f) { if (!checkField(f)) ok = false; });
      if (!photos.length) { photoErr.textContent = MSG.photo; ok = false; }
      updateSteps();
      $('#form-alert').hidden = ok;
      if (!ok) {
        var first = $('.has-error input, .has-error select, .has-error textarea', form) || (photos.length ? null : drop);
        if (first) { first.focus(); first.scrollIntoView({ block: 'center' }); }
        return;
      }
      try { sessionStorage.setItem('ntu100-submitted', new Date().toISOString()); } catch (err) { /* 無痕模式時略過 */ }
      location.href = form.getAttribute('action');
    });
    form.addEventListener('reset', function () {
      photos.forEach(function (p) { URL.revokeObjectURL(p.url); }); photos = []; renderPhotos();
      $$('.field', form).forEach(function (f) { setErr(f, ''); });
      photoErr.textContent = ''; $('#form-alert').hidden = true;
      setTimeout(updateSteps, 0);
    });
  }

  /* ---------- 05 送出成功 ---------- */
  var subTime = $('#sub-time');
  if (subTime) {
    var d = new Date(), stored = null;
    try { stored = sessionStorage.getItem('ntu100-submitted'); } catch (err) { /* 略過 */ }
    if (stored) d = new Date(stored);
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    subTime.textContent = d.getFullYear() + '/' + p2(d.getMonth() + 1) + '/' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
})();
