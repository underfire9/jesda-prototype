/* 臺大藝文中心原型互動：選單、輪播、分頁標籤、月曆、篩選 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 頁首：捲動邊線、手機選單 ---------- */
  var header = $("#site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    var toggle = $(".menu-toggle", header);
    if (toggle) toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "關閉選單" : "開啟選單");
      $("use", toggle).setAttribute("href", open ? "#i-close" : "#i-menu");
    });
  }

  /* ---------- 首頁輪播 ---------- */
  $$(".js-hero").forEach(function (hero) {
    var slides = $$(".hero__slide", hero);
    var controls = document.getElementById(hero.getAttribute("data-controls"));
    if (!slides.length || !controls) return;
    var cur = 0, timer = null, playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches, DURATION = 6000, start = 0, raf = null;
    var bar = $(".bar", controls), num = $(".current", controls), pauseBtn = $(".js-pause", controls);
    $(".total", controls).textContent = pad(slides.length);
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("is-active", k === cur); s.setAttribute("aria-hidden", k === cur ? "false" : "true"); s.inert = k !== cur; });
      num.textContent = pad(cur + 1);
      restart();
    }
    function tick(t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / DURATION);
      bar.style.width = (p * 100) + "%";
      if (p >= 1) { show(cur + 1); return; }
      raf = requestAnimationFrame(tick);
    }
    function restart() {
      cancelAnimationFrame(raf); start = 0; bar.style.width = "0";
      if (playing) raf = requestAnimationFrame(tick);
    }
    $(".js-prev", controls).addEventListener("click", function () { show(cur - 1); });
    $(".js-next", controls).addEventListener("click", function () { show(cur + 1); });
    pauseBtn.addEventListener("click", function () {
      playing = !playing;
      pauseBtn.setAttribute("aria-label", playing ? "暫停輪播" : "播放輪播");
      $("use", pauseBtn).setAttribute("href", playing ? "#i-pause" : "#i-play");
      if (!playing) bar.style.width = "100%";
      restart();
    });
    if (!playing) { pauseBtn.setAttribute("aria-label", "播放輪播"); $("use", pauseBtn).setAttribute("href", "#i-play"); }
    show(0);
  });

  /* ---------- 分頁標籤（role=tablist） ---------- */
  $$("[role=tablist]").forEach(function (list) {
    var tabs = $$("[role=tab]", list);
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      var more = document.getElementById(list.getAttribute("data-more"));
      if (more && tab.getAttribute("data-more-href")) more.href = tab.getAttribute("data-more-href");
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n);
      });
    });
  });

  /* ---------- 月曆 ---------- */
  var EVENTS = window.NTU_ARTS_EVENTS || [];
  var TODAY = window.NTU_ARTS_TODAY || "";
  var byDate = {};
  EVENTS.forEach(function (ev) { ev.dates.forEach(function (d) { (byDate[d] = byDate[d] || []).push(ev); }); });
  function ymd(y, m, d) { return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d; }
  var WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  $$(".js-calendar").forEach(function (box) {
    var parts = (box.getAttribute("data-month") || TODAY.slice(0, 7)).split("-");
    var y = +parts[0], m = +parts[1];
    var mode = box.getAttribute("data-mode") || "mini";
    var grid = $(".cal-grid tbody", box), label = $(".month", box);
    var list = document.getElementById(box.getAttribute("data-list") || "");
    var next = $(".js-next-event", box);

    function render() {
      label.textContent = y + "." + (m < 10 ? "0" : "") + m;
      var first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
      var html = "<tr>", col = 0;
      for (var i = 0; i < first; i++) { html += "<td></td>"; col++; }
      for (var d = 1; d <= days; d++) {
        var key = ymd(y, m, d), evs = byDate[key] || [];
        var cls = (key === TODAY ? "is-today " : "") + (evs.length ? "has-event" : "");
        var desc = evs.length ? "，" + evs.length + " 場活動" : "";
        var inner = evs.length
          ? '<a class="day" href="' + (mode === "page" ? "#d-" + key : "/programs/calendar.html?d=" + key + "#d-" + key) + '" data-date="' + key + '" aria-label="' + m + " 月 " + d + " 日" + desc + '">' + d + "</a>"
          : '<span class="day"' + (key === TODAY ? ' aria-label="今天，' + m + " 月 " + d + ' 日"' : "") + ">" + d + "</span>";
        html += '<td class="' + cls + '">' + inner + "</td>";
        if (++col % 7 === 0 && d < days) html += "</tr><tr>";
      }
      while (col % 7) { html += "<td></td>"; col++; }
      grid.innerHTML = html + "</tr>";
      if (list) renderList();
      if (next) renderNext();
    }
    function renderNext() {
      var keys = Object.keys(byDate).sort().filter(function (k) { return k >= TODAY; });
      if (!keys.length) return;
      var ev = byDate[keys[0]][0], p = keys[0].split("-"), dt = new Date(+p[0], +p[1] - 1, +p[2]);
      $(".label", next).textContent = "NEXT  /  " + (+p[1]) + "." + p[2] + "（" + WEEK[dt.getDay()] + "）" + ev.time;
      var a = $(".title", next); a.textContent = ev.title; a.href = ev.url;
    }
    function renderList() {
      var prefix = ymd(y, m, 1).slice(0, 8), keys = Object.keys(byDate).sort().filter(function (k) { return k.indexOf(prefix) === 0; });
      var html = "<h2>" + y + " 年 " + m + " 月的活動</h2>";
      if (!keys.length) html += '<p class="empty">這個月份目前沒有活動。</p>';
      keys.forEach(function (k) {
        var p = k.split("-"), dt = new Date(+p[0], +p[1] - 1, +p[2]);
        byDate[k].forEach(function (ev, i) {
          html += '<article class="event-row"' + (i === 0 ? ' id="d-' + k + '"' : "") + '><p class="d">' + (+p[1]) + "." + p[2] + "（" + WEEK[dt.getDay()] + "）" + ev.time + "</p><div><h3><a href=\"" + ev.url + "\">" + ev.title + "</a></h3><p>" + ev.tag + "｜" + ev.venue + "</p></div></article>";
        });
      });
      list.innerHTML = html;
    }
    $(".js-cal-prev", box).addEventListener("click", function () { m--; if (m < 1) { m = 12; y--; } render(); });
    $(".js-cal-next", box).addEventListener("click", function () { m++; if (m > 12) { m = 1; y++; } render(); });
    var q = new URLSearchParams(location.search).get("d");
    if (mode === "page" && q) { var qp = q.split("-"); y = +qp[0]; m = +qp[1]; }
    render();
    if (mode === "page" && q && location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  });

  /* ---------- 節目列表篩選 ---------- */
  $$(".js-filter").forEach(function (wrap) {
    var target = document.getElementById(wrap.getAttribute("data-target"));
    var count = document.getElementById(wrap.getAttribute("data-count"));
    if (!target) return;
    var chips = $$(".chip", wrap), selects = $$("select", wrap);
    function apply() {
      var cat = ($(".chip[aria-pressed=true]", wrap) || {}).value || "all";
      var vals = {}; selects.forEach(function (s) { vals[s.name] = s.value; });
      var n = 0;
      $$("[data-category]", target).forEach(function (card) {
        var ok = (cat === "all" || card.getAttribute("data-category") === cat);
        Object.keys(vals).forEach(function (k) { if (vals[k] !== "all" && card.getAttribute("data-" + k) !== vals[k]) ok = false; });
        card.hidden = !ok; if (ok) n++;
      });
      if (count) count.textContent = "共 " + n + " 檔節目";
    }
    chips.forEach(function (c) { c.addEventListener("click", function () { chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); }); apply(); }); });
    selects.forEach(function (s) { s.addEventListener("change", apply); });
  });

  /* ---------- 原型：表單送出不離開頁面 ---------- */
  $$("form[data-demo]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      if (f.getAttribute("data-demo") === "go") return;
      e.preventDefault();
      var msg = $(".js-form-msg", f); if (msg) { msg.hidden = false; }
    });
  });

  /* ---------- 複製連結 ---------- */
  $$(".js-copy").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      try { navigator.clipboard.writeText(location.href); b.textContent = "已複製連結"; } catch (err) {}
    });
  });
})();
