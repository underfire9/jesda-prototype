/* 捷思達首頁 · 林蔭大道
   開場懸在大道上空的線稿城市；往下捲，鏡頭下降前進、材質由地面長上建築，
   Logo 沿弧線飛進左上角；關於我們浮在街景上；接著一扇拱門從下方升起，像走進大樓；
   內容逛完，兩扇門往兩側打開，回到黃昏到夜晚的彩色街景。 */
import { createCity } from './city.js';

const D = window.JESDA, LOGO = window.JESDA_LOGO;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => (n < 10 ? '0' : '') + n;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 760;
gsap.registerPlugin(ScrollTrigger);
let finaleActive = false;

// ── 標誌拆成「盾形 J」與「字」兩部分
let uid = 0;
const markSVG = () => LOGO.replace(/<g class="type"[\s\S]*?<\/g>/, '')
  .replace('width="80" height="115" viewBox="0 0 80 115"', 'viewBox="18 0 44 47.3"')
  .replace(/mask0_106_653/g, 'jm' + (++uid));
const typeSVG = () => LOGO.replace(/<mask[\s\S]*?<\/mask>/, '').replace(/<g mask[\s\S]*?<\/g>/, '')
  .replace('width="80" height="115" viewBox="0 0 80 115"', 'viewBox="0 58 80 57"');
$('#lkMark').innerHTML = '<span class="lk-fly" id="lkFly" style="display:block">' + markSVG() + '</span>';
$('#lkType').innerHTML = typeSVG();

// ── 拆字
$$('[data-split]').forEach(el => { el.innerHTML = Array.from(el.textContent).map(c => '<span>' + (c === ' ' ? '&nbsp;' : esc(c)) + '</span>').join(''); });
const slogan = $('#slogan');
slogan.innerHTML = Array.from(slogan.textContent).map(c => '<span class="ch">' + esc(c) + '</span>').join('');


// ── 1F 實績
const catById = {}; D.categories.forEach(c => { catById[c.id] = c; });
const typeById = {}; D.clientTypes.forEach(t => { typeById[t.id] = t; });
const imgCls = (f) => /etalk/.test(f.img) ? ' class="contain"' : '';
$('#workList').innerHTML = D.featured.map((f, i) => `
  <article class="work" data-i="${i}">
    <div class="mimg"><img src="${f.img}" alt=""${imgCls(f)} loading="lazy"></div>
    <div class="tag mono"><span>${pad(i + 1)}</span><i style="background:${catById[f.cat] ? catById[f.cat].color : '#999'}"></i><span>${esc(f.clientShort || f.client)} · ${esc(f.tag)}</span></div>
    <h3>${esc(f.name)}</h3>
    <p class="desc">${esc(f.desc)}</p>
    <dl><dt>挑戰</dt><dd>${esc(f.challenge)}</dd><dt>做法</dt><dd>${esc(f.approach)}</dd></dl>
    ${f.placeholder ? '<span class="note mono">＊挑戰與做法為示意文字，待補實際內容</span>' : ''}
  </article>`).join('');
const frame = $('#frame');
D.featured.forEach((f, i) => { const im = new Image(); im.src = f.img; im.alt = ''; if (imgCls(f)) im.className = 'contain'; im.dataset.i = i; frame.insertBefore(im, $('#frameBadge')); });
function setWork(i) {
  $$('img', frame).forEach(im => im.classList.toggle('on', +im.dataset.i === i));
  const f = D.featured[i];
  $('#frameBadge').textContent = (catById[f.cat] || {}).name || '';
  $('#capName').innerHTML = '<b>' + esc(f.clientShort || f.client) + '</b>　' + esc(f.unit || '');
  $('#capIdx').textContent = pad(i + 1) + ' / ' + pad(D.featured.length);
  $('#workCount').textContent = pad(i + 1) + ' / ' + pad(D.featured.length);
}
setWork(0);

// ── 2F 系統目錄
const filt = { cat: 'all', type: 'all' };
let showAll = false;
const LIMIT = 24;
function chips(el, list, key, countFn) {
  el.innerHTML = `<button class="chip" data-k="${key}" data-v="all" aria-pressed="true">全部 <b>${D.systems.length}</b></button>` +
    list.map(x => `<button class="chip" data-k="${key}" data-v="${x.id}" aria-pressed="false"><i style="background:${x.color}"></i>${esc(x.name)} <b>${countFn(x.id)}</b></button>`).join('');
}
chips($('#catFilters'), D.categories, 'cat', id => D.systems.filter(s => s.cat === id).length);
chips($('#typeFilters'), D.clientTypes.filter(t => D.systems.some(s => s.type === t.id)), 'type', id => D.systems.filter(s => s.type === id).length);
function renderSys() {
  const list = D.systems.filter(s => (filt.cat === 'all' || s.cat === filt.cat) && (filt.type === 'all' || s.type === filt.type));
  const lim = showAll || filt.cat !== 'all' || filt.type !== 'all' ? list.length : LIMIT;
  $('#sysList').innerHTML = list.map((s, i) => {
    const c = catById[s.cat] || { color: '#999', name: '' };
    return `<li class="${i >= lim ? 'hide' : ''}"><span class="i">S${pad(D.systems.indexOf(s) + 1)}</span><span class="n">${esc(s.name)}</span><span class="c">${esc(s.clientShort)}　${esc(s.unit || '')}</span><span class="k"><i style="background:${c.color}"></i>${esc(c.name)}</span></li>`;
  }).join('');
  $('#sysCount').textContent = list.length + ' 套' + (filt.cat !== 'all' ? '　·　' + catById[filt.cat].name : '') + (filt.type !== 'all' ? '　·　' + typeById[filt.type].name : '');
  const hidden = list.length - lim;
  $('#moreBtn').hidden = hidden <= 0;
  $('#moreN').textContent = '+' + hidden;
  ScrollTrigger.refresh();
}
document.addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  filt[b.dataset.k] = b.dataset.v;
  $$('.chip[data-k="' + b.dataset.k + '"]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  renderSys();
});
$('#moreBtn').addEventListener('click', () => { showAll = true; renderSys(); });
renderSys();

// 合作單位跑馬燈
(function () {
  const names = D.clients.map(c => c.short);
  const half = Math.ceil(names.length / 2);
  const row = (arr) => { const h = arr.map(n => '<span>' + esc(n) + '</span>').join(''); return h + h; };
  $('#mq1').innerHTML = row(names.slice(0, half));
  $('#mq2').innerHTML = row(names.slice(half).concat(D.ghostSchools ? ['及其他 ' + D.ghostSchools + ' 所大專校院'] : []));
})();

// ── 4F 四次迭代：一棟樓從放樣到點燈
const ITER = [
  ['第一迭代', '核心功能建置與流程驗證', '以可操作的核心功能版本驗證資料流程與介面，讓使用者在測試環境實際操作、回饋與修正。'],
  ['第二迭代', '完整功能與使用者驗證', '整合前後端與 UI/UX，確認資料邏輯，並進行效能、資安與高負載測試。'],
  ['第三迭代', '正式上線與驗收版本交付', '完成上線安排、教育訓練與驗收，確認交付版本順暢運作。'],
  ['第四迭代', '全流程運作驗證與優化版本', '以全流程運作回饋持續改善營運痛點，步步對齊、匠心打磨，直到系統真正順手好用。']
];
function drawing(k) {
  const W = 220, base = 138, x0 = 70, x1 = 150, top = 30;
  let g = `<path class="s" d="M10 ${base} H210"/>`;
  const floors = []; for (let y = base - 18; y > top; y -= 18) floors.push(y);
  if (k === 0) g += `<path class="s d" d="M${x0} ${base} V${top} H${x1} V${base}"/><path class="s d" d="M${x0 - 14} ${base} v8 M${x1 + 14} ${base} v8 M${x0 - 14} ${base + 4} H${x1 + 14}"/><circle class="a" cx="${x0}" cy="${base}" r="2.5"/><circle class="a" cx="${x1}" cy="${base}" r="2.5"/>`;
  if (k >= 1) { g += `<path class="s" d="M${x0} ${base} V${top} H${x1} V${base} M${(x0 + x1) / 2} ${base} V${top}"/>`; floors.forEach(y => { g += `<path class="s${k === 1 ? ' d' : ''}" d="M${x0} ${y} H${x1}"/>`; }); }
  if (k >= 2) floors.concat([base]).forEach((y, fi) => { for (let x = x0 + 8; x < x1 - 6; x += 18) g += `<rect class="w" x="${x}" y="${y - 13}" width="10" height="8"/>`; });
  if (k === 3) { let n = 0; floors.concat([base]).forEach((y) => { for (let x = x0 + 8; x < x1 - 6; x += 18) { if ((n++ * 7) % 5 < 2) g += `<rect class="a" x="${x}" y="${y - 13}" width="10" height="8"/>`; } }); g += `<path class="s" d="M${(x0 + x1) / 2} ${top} V${top - 16}"/><circle class="a" cx="${(x0 + x1) / 2}" cy="${top - 18}" r="2.5"/>`; }
  return `<svg viewBox="0 0 ${W} 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${g}</svg>`;
}
$('#iter').insertAdjacentHTML('beforeend', ITER.map((t, k) => `
  <div class="cell">
    <div class="idx mono"><span>[4F-0${k + 1}]</span><span>Iteration ${k + 1} / 4</span></div>
    <div class="draw">${drawing(k)}</div>
    <h3>${t[0]}<br><span style="color:var(--muted);font-size:.78em">${t[1]}</span></h3>
    <p>${t[2]}</p>
  </div>`).join(''));

// ── 專案諮詢：整理成信件內容（本頁不會寄信）
async function copyText(text, btn) {
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = '已複製'; }
  catch (e) { const r = document.createRange(); const n = btn.previousElementSibling || btn; r.selectNodeContents(n); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = '已選取，請按複製'; }
  setTimeout(() => { btn.textContent = old; }, 1800);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) copyText(b.dataset.copy, b); });
$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, need = $$('input[name="need"]:checked', f).map(x => x.value);
  let ok = true;
  ['org', 'name', 'email'].forEach(n => { const el = f.elements[n]; const bad = !el.value.trim() || (n === 'email' && !/^\S+@\S+\.\S+$/.test(el.value)); el.closest('.f').style.borderColor = bad ? 'var(--accent)' : ''; if (bad) ok = false; });
  if (!ok) return;
  const body = `捷思達您好，\n\n我們想諮詢一個專案：\n\n單位：${f.elements.org.value}\n聯絡人：${f.elements.name.value}\n信箱：${f.elements.email.value}\n電話：${f.elements.tel.value || '—'}\n需求：${need.join('、') || '—'}\n\n${f.elements.msg.value || ''}\n`;
  $('#mailBody').textContent = body;
  $('#result').hidden = false;
  $('#copyMail').onclick = () => copyText(body, $('#copyMail'));
  ScrollTrigger.refresh();
});

// ── 平滑捲動
const lenis = reduce ? null : new Lenis({ lerp: .1, wheelMultiplier: 1.5, touchMultiplier: 1.5 });
if (lenis) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
const flight = $('#flight');
function targetY(hash) {
  if (hash === '#about') return flight.offsetTop + .55 * (flight.offsetHeight - innerHeight);
  if (hash === '#top') return 0;
  const el = $(hash); if (!el) return null;
  return el.getBoundingClientRect().top + scrollY - 70;
}
function go(hash) { const y = targetY(hash); if (y == null) return; if (lenis) lenis.scrollTo(y, { duration: 1.8, easing: t => t < .5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2 }); else scrollTo(0, y); }
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  e.preventDefault(); closeMenu(); go(a.getAttribute('href'));
});

// ── 選單
const menuBtn = $('#menuBtn');
function closeMenu() { document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', '開啟選單'); lenis && lenis.start(); }
menuBtn.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  if (!open) return closeMenu();
  document.body.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', '關閉選單'); lenis && lenis.stop();
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

// ── 城市
const canvas = $('#city');
let city;
const WL = window.JesdaIntro;
// 先讓水面 loading 跑幾格再建城市（建城市會卡住主執行緒一下），建好先暫停，等交棒才開始跑
if (WL) await WL.frames(3);
try { city = createCity(canvas, { mobile }); city.setRunning(false); city.renderOnce(); } catch (err) { console.error(err); }
WL && WL.done('city');
const cam = { a: 0, b: 0, c: 0, s: 0, f: 0, n: 0 };
addEventListener('resize', () => { city && city.resize(); });
if (!mobile) addEventListener('pointermove', e => { if (!city) return; city.camState.tx = (e.clientX / innerWidth - .5) * 2; city.camState.ty = -(e.clientY / innerHeight - .5) * 2; });
const altEl = $('#alt'), distEl = $('#dist');
gsap.ticker.add(() => {
  if (!city) return;
  city.camState.t = cam.a + cam.b + cam.c;
  // 鏡頭下降途中，傾斜與俯仰的幅度逐漸減半，進到關於我們時剛好剩一半
  const k = Math.min(1, cam.a / 1.85); city.camState.amp = 1 - .5 * k * k * (3 - 2 * k);
  city.state.stone = cam.s; city.state.final = cam.f; city.state.night = cam.n;
  city.applyState();
  const p = city.camera.position;
  altEl.textContent = String(Math.max(0, Math.round(p.y))).padStart(3, '0');
  distEl.textContent = (Math.max(0, 120 - p.z) / 1000).toFixed(2);
});

// ── 開場：載入 → 拉起幕 → 城市線稿由近到遠畫出來
const intro = gsap.timeline({ paused: true });
// 水面 loading 跑完（logo 轉正、品牌字出現、在水面停一下）→ 水往下退出，露出首頁，同時城市開始畫；
// 首頁 logo 維持 loading 結尾的樣子與位置
lenis && lenis.stop();
function startSite() {
  document.documentElement.classList.remove('is-loading');
  lenis && lenis.start();
}
if (WL) WL.finished.then(() => {
  // 在中段重新整理時，瀏覽器可能已經捲到原本的位置：水退之前先回到開場
  scrollTo(0, 0); lenis && lenis.scrollTo(0, { immediate: true, force: true }); ScrollTrigger.update();
  city && city.setRunning(true);
  intro.play();
  return WL.handoff({ lockup: $('#lockup'), mark: $('#lkMark'), type: $('#lkType'), below: $('#slogan') });
}).then(startSite);
else { startSite(); intro.play(); }
if (city) { city.U.uDraw.value = reduce ? 4000 : 40; intro.to(city.U.uDraw, { value: 3200, duration: 3.2, ease: 'expo.inOut' }, .1); }
intro.from('#slogan .ch', { yPercent: 70, opacity: 0, duration: 1.2, stagger: .045, ease: 'expo.out' }, .9)
  .from('.hero-copy .mono', { opacity: 0, y: 10, duration: 1, ease: 'expo.out' }, 1.3)
  .from('.hud > *', { opacity: 0, y: 12, duration: 1, stagger: .08, ease: 'expo.out' }, 1.4)
  .from('.top .menu-btn', { opacity: 0, y: -12, duration: 1, ease: 'expo.out', clearProps: 'transform' }, 1.2);

// ── Logo 緞帶：盾形 J 本身是一條不斷的線。捲動時線的一端先離開，
//    沿一道弧線飛往左上角，整條線像緞帶一樣跟著過去，抵達後重新繞回 logo 的形狀
const fly = $('#lkFly'), mk = $('#lkMark'), slot = $('#dockSlot');
const geo = { dx: 0, dy: 0, s: 1, a: null, b: null };
function measure() {
  const a = mk.getBoundingClientRect(), b = slot.getBoundingClientRect();
  geo.dx = (b.left + b.width / 2) - (a.left + a.width / 2);
  geo.dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  geo.s = b.width / a.width; geo.a = a; geo.b = b;
  // 緞帶的起點取 logo 目前實際畫在哪裡（開場進場動畫還沒跑完時也對得上）
  geo.f = fly.style.visibility === 'hidden' || gsap.getProperty(fly, 'scale') !== 1 ? (rb.p > .5 ? a : geo.f || a) : fly.firstElementChild.getBoundingClientRect();
}
// logo 中心線（viewBox 18 0 44 47.3 座標），由線的一端 A 走到另一端 E
const MARK_W = 6.27;
const markLine = (() => {
  const P = [[30.58, 9.46]], cub = (c1, c2, e) => { const s0 = P[P.length - 1]; for (let i = 1; i <= 20; i++) { const t = i / 20, u = 1 - t; P.push([u * u * u * s0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * e[0], u * u * u * s0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * e[1]]); } };
  P.push([30.58, 23.95]); cub([30.58, 30.6], [40, 34.1], [40, 34.1]); cub([40, 34.1], [49.41, 30.6], [49.41, 23.95]);
  P.push([49.41, 3.15], [58.82, 3.15], [58.82, 24.98]); cub([58.82, 38.5], [40, 44.15], [40, 44.15]); cub([40, 44.15], [21.17, 38.5], [21.17, 24.98]);
  P.push([21.17, 3.15], [40, 3.15], [40, 25.4]);
  return P;
})();
const rbCv = document.createElement('canvas');
rbCv.setAttribute('style', 'position:fixed;left:0;top:0;z-index:61;pointer-events:none');
document.body.appendChild(rbCv);
const rbX = rbCv.getContext('2d'), rb = { p: 0 };
let RB = null, INK = [18, 20, 23];
const LIGHT = [168, 172, 178];
function buildRibbon() {
  measure();
  // 畫布尺寸用實際可視寬高（不含捲軸），否則有捲軸的桌機上整張畫布會被橫向壓縮，緞帶往左偏
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  rbCv.width = vw * dpr; rbCv.height = vh * dpr; rbCv.style.width = vw + 'px'; rbCv.style.height = vh + 'px'; rbX.setTransform(dpr, 0, 0, dpr, 0, 0);
  const map = (r) => ([x, y]) => [r.left + (x - 18) / 44 * r.width, r.top + y / 47.3 * r.height];
  const L1 = markLine.slice().reverse().map(map(geo.f)), L2 = markLine.map(map(geo.b));
  const A = L1[L1.length - 1], D = L2[0], W = vw, H = vh;
  // 弧線：先往上竄，再大幅往左掃向定位點，從右上方滑進去
  const c1 = [A[0] + W * .2, Math.max(H * .1, A[1] - H * .28)], c2 = [D[0] + W * .3, D[1] + H * .04];
  const arc = [];
  for (let i = 1; i < 96; i++) { const t = i / 96, u = 1 - t; arc.push([u * u * u * A[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * D[0], u * u * u * A[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * D[1]]); }
  const pts = L1.concat(arc, L2), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  RB = { pts, cum, n1: L1.length - 1, n2: L1.length + arc.length, w1: MARK_W / 44 * geo.f.width, w2: MARK_W / 44 * geo.b.width };
  RB.len1 = cum[RB.n1]; RB.len2 = cum[cum.length - 1] - cum[RB.n2]; RB.arcA = RB.len1; RB.arcB = cum[RB.n2]; RB.total = cum[cum.length - 1];
}
function at(d) {
  const { pts, cum } = RB; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
  const t = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
}
function sub(a, b) {   // 取出 [a,b] 這段折線，保留原本的轉角
  const { pts, cum } = RB, out = [at(a)];
  for (let i = 0; i < pts.length; i++) if (cum[i] > a && cum[i] < b) out.push(pts[i]);
  out.push(at(b)); return out;
}
function strokePoly(P, w) {
  rbX.lineWidth = w; rbX.beginPath(); rbX.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) rbX.lineTo(P[i][0], P[i][1]); rbX.stroke();
}
function drawRibbon() {
  if (!RB) return;
  const p = rb.p;
  rbX.clearRect(0, 0, rbCv.width, rbCv.height);
  if (p <= .0005) { gsap.set(fly, { x: 0, y: 0, scale: 1 }); if (rb.hid) { rb.hid = false; fly.style.visibility = ''; } return; }
  if (p >= .9995) { gsap.set(fly, { x: geo.dx, y: geo.dy, scale: geo.s }); if (rb.hid) { rb.hid = false; fly.style.visibility = ''; } return; }
  // 由 logo 換成緞帶的那一刻重新量一次位置：捲軸出現、字型載入等版面變動都會讓舊的量測偏掉
  if (!rb.hid) { buildRibbon(); rb.hid = true; fly.style.visibility = 'hidden'; }
  const head = RB.len1 + (RB.total - RB.len1) * Math.pow(p, .8), tail = (RB.total - RB.len2) * Math.pow(p, 1.45);   // 尾端落後，飛行中緞帶拉長
  const col = getComputedStyle(mk).color; rbX.strokeStyle = col; INK = (col.match(/\d+/g) || [18, 20, 23]).slice(0, 3).map(Number); rbX.lineJoin = 'miter'; rbX.miterLimit = 6; rbX.lineCap = 'butt';
  if (tail < RB.arcA) strokePoly(sub(tail, Math.min(head, RB.arcA)), RB.w1);
  if (head > RB.arcB) strokePoly(sub(Math.max(tail, RB.arcB), head), RB.w2);
  const a0 = Math.max(tail, RB.arcA), a1 = Math.min(head, RB.arcB);
  if (a1 > a0) {
    // 弧線上的緞帶：寬度從大 logo 漸變到小 logo，途中翻轉兩次（寬度隨 |cos| 收窄）
    rbX.lineCap = 'round';
    const step = 3;
    for (let d = a0; d < a1; d += step) {
      const e = Math.min(a1, d + step + .6), m = ((d + e) / 2 - RB.arcA) / (RB.arcB - RB.arcA);
      const k = m * m * (3 - 2 * m), tw = .18 + .82 * Math.abs(Math.cos(m * Math.PI * 2));
      const P = [at(d), at(e)];
      const lift = Math.sin(Math.PI * m);
      rbX.strokeStyle = `rgb(${INK.map((c, i) => Math.round(c + (LIGHT[i] - c) * lift)).join(',')})`;
      rbX.globalAlpha = (.82 + .18 * tw) * (1 - .3 * lift);
      strokePoly(P, (RB.w1 + (RB.w2 - RB.w1) * k) * tw * (1 - .62 * lift));   // 飛行中段變細、變淡，降低存在感
    }
    rbX.globalAlpha = 1;
  }
}
buildRibbon();
addEventListener('resize', () => { buildRibbon(); drawRibbon(); });

const about = $('#about');
gsap.set(about, { xPercent: -50, yPercent: -46 });
const counts = $$('[data-count]').map(el => ({ el, to: +el.dataset.count, v: 0 }));
const doorP = $('#doorPanel'), doorIn = $('#doorIn');
// 門從 32px 寬的一道縫開始，往兩側推開
const door = { t: 100, s: 1, r: 1 };
const setDoor = () => { const s = door.s * (doorP.clientWidth / 2 - 16), r = door.r * 16; doorP.style.clipPath = `inset(${door.t}% ${s}px 0% ${s}px round ${r}px ${r}px 0px 0px)`; };
setDoor();

const tl = gsap.timeline({ defaults: { ease: 'none' } });
tl.to(cam, { a: 2, duration: .46, ease: 'power1.inOut' }, 0)
  .to(cam, { s: 1, duration: .22, ease: 'power1.inOut' }, .04)   // 先全城鋪上石材
  .to(cam, { f: 1, duration: .16, ease: 'power1.inOut' }, .30)   // 快到最低點時，大道兩旁上最終材質
  // 開場文字退場
  .to('#slogan .ch', { yPercent: -60, opacity: 0, duration: .05, stagger: .003, ease: 'power2.in' }, 0)
  .to('.hero-copy .mono, .hud, #halo', { opacity: 0, y: -16, duration: .05, ease: 'power2.in' }, 0)
  // 字形散去，只留盾形 J
  .to('#lkType path', { opacity: 0, y: -10, duration: .05, stagger: .006, ease: 'power2.in' }, .01)
  // 緞帶飛行
  .to(rb, { p: 1, duration: .14, ease: 'power1.inOut', onUpdate: drawRibbon }, .04)
  .to('.dock-word b span, .dock-word .mono span', { opacity: 1, y: 0, duration: .03, stagger: .0025, ease: 'power2.out' }, .17)
  // 關於我們
  .fromTo(about, { autoAlpha: 0, y: 70, scale: .97 }, { autoAlpha: 1, y: 0, scale: 1, duration: .06, ease: 'power3.out' }, .42)
  .from($$('.ln, .stats > div', about), { opacity: 0, y: 20, duration: .05, stagger: .008, ease: 'power2.out' }, .43)
  .to(counts, { v: (i) => counts[i].to, duration: .08, ease: 'power2.out', onUpdate: () => counts.forEach(c => { c.el.firstChild.nodeValue = Math.round(c.v); }) }, .45)
  .to(about, { autoAlpha: 0, y: -60, duration: .05, ease: 'power2.in' }, .63)
  // 進門：拱門從下方升起，鏡頭往前推進門裡
  .to(door, { t: 0, duration: .24, ease: 'power2.inOut', onUpdate: setDoor }, .66)
  .to(door, { s: 0, r: 0, duration: .14, ease: 'power2.in', onUpdate: setDoor }, .76)
  .to(cam, { b: 1, duration: .26, ease: 'power1.inOut' }, .66)
  .fromTo(doorIn, { opacity: 0, y: 70, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .12, ease: 'power2.out' }, .82)
  .to({}, { duration: .08 }, .92);
ScrollTrigger.create({
  trigger: flight, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1, animation: tl, invalidateOnRefresh: true,
  onUpdate: (st) => {
    if (city) city.setRunning(st.progress < .95 || finaleActive);
    mk.classList.toggle('docked', st.progress > .2);
    document.body.classList.toggle('docked', st.progress > .17);
  },
  onRefreshInit: () => { buildRibbon(); }, onRefresh: () => drawRibbon()
});
mk.addEventListener('click', () => { if (mk.classList.contains('docked')) go('#top'); });

ScrollTrigger.create({ trigger: '#inside', start: 'top 60px', end: 'bottom 60px', toggleClass: { targets: document.body, className: 'paper' } });

// ── 室內各層：進場
$$('.sec-title h2, .sec-title p').forEach(el => {
  gsap.from(el, { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
});
$$('.work').forEach((w, i) => {
  ScrollTrigger.create({ trigger: w, start: 'top 55%', end: 'bottom 55%', onToggle: st => { if (st.isActive) setWork(i); } });
  gsap.from(w.children, { y: 30, opacity: 0, duration: 1, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: w, start: 'top 75%' } });
});
gsap.from('.sys', { opacity: 0, y: 30, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.sys', start: 'top 85%' } });
$$('.tech .cell, .iso .cell').forEach((c, i) => {
  gsap.from(c, { opacity: 0, y: 40, duration: 1.1, delay: (i % 3) * .08, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 85%' } });
});
$$('.tsvg .t').forEach(p => { const L = p.getTotalLength ? p.getTotalLength() : 300; if (p.getAttribute('stroke-dasharray')) return; gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: p.closest('.cell'), start: 'top 75%' } }); });
gsap.to('#iterBar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#iter', start: 'top 70%', end: 'bottom 60%', scrub: 1 } });
$$('#iter .cell').forEach((c, i) => {
  const parts = $$('.draw svg > *', c);
  gsap.from(parts, { opacity: 0, y: 6, duration: .6, stagger: .02, ease: 'power2.out', scrollTrigger: { trigger: '#iter', start: 'top ' + (70 - i * 8) + '%' } });
});

// ── 終幕：兩扇門打開，回到街上，天色轉黃昏再入夜
const ft = gsap.timeline({ defaults: { ease: 'none' } });
// 和進大廳同一個過場，反過來：紙面上先從下方開出一道 32px 的拱形縫，升到頂後往兩側推開，露出街景
const exitP = $('#exitHole'), ex = { t: 100, s: 1, r: 1 };
const setExit = () => { const s = ex.s * (exitP.parentNode.clientWidth / 2 - 16), r = ex.r * 16;
  Object.assign(exitP.style, { top: ex.t + '%', left: s + 'px', right: s + 'px', borderRadius: `${r}px ${r}px 0 0` }); };
setExit(); addEventListener('resize', setExit);
// 終幕一進入視窗底部就開始：縫在 7F 下方的紙面裡升起，7F 的內容往上捲走時門才慢慢推開，兩者不重疊
// （前 0.4 是終幕從視窗底部捲到頂部的那一段；門只開在終幕自己的畫面裡）
ft.to(ex, { t: 0, duration: .34, ease: 'power1.inOut', onUpdate: setExit }, .02)
  .to(ex, { s: 0, r: 0, duration: .24, ease: 'power2.inOut', onUpdate: setExit }, .3)
  .to(cam, { c: 1, duration: .62, ease: 'power1.inOut' }, .3)
  .to(cam, { n: 1, duration: .58, ease: 'sine.inOut' }, .32)   // 門推開時開始轉入黃昏、夜晚
  .to('#fin', { opacity: 1, duration: .1 }, .66)
  .from('#fin > *', { y: 40, duration: .16, stagger: .03, ease: 'power3.out' }, .66)
  .to({}, { duration: .06 }, .94);
ScrollTrigger.create({ trigger: '#finale', start: 'top bottom', end: 'bottom bottom', scrub: reduce ? true : 1, animation: ft,
  onUpdate: st => { document.body.classList.toggle('night', st.progress > .48); } });
ScrollTrigger.create({ trigger: '#finale', start: 'top bottom', end: 'bottom top',
  onToggle: st => { finaleActive = st.isActive; if (city) city.setRunning(st.isActive || $('#flight').getBoundingClientRect().bottom > innerHeight * .2); } });

if (reduce) { tl.progress(0); }
addEventListener('load', () => ScrollTrigger.refresh());
window.__jesda = { city, cam, tl, ft, lenis };
