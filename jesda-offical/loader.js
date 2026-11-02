/* 進站 loading：Jesda 水面 Logo（源自 jesda-logo-3d/water.html）
   鏡頭卡在水面，logo 隨載入進度從水下浮出、轉正、壓平成 2D logo，接著交棒給首頁的 lockup */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const MARK = "M46.273 0V6.3067V23.8471C46.273 28.3012 39.997 30.745 39.997 30.745C39.997 30.745 33.7211 28.3012 33.7211 23.8471V9.46001H27.4452V24.0442C27.4452 32.9524 39.997 37.4459 39.997 37.4459C39.997 37.4459 52.5489 32.9524 52.5489 24.0442V6.3067H55.6869V24.734C55.6869 36.0072 39.997 40.9934 39.997 40.9934C39.997 40.9934 24.3072 36.1057 24.3072 24.8325V6.3067H36.8591V23.5515C36.8591 25.7785 39.997 27.1975 39.997 27.1975C39.997 27.1975 43.135 25.7785 43.135 23.5515V6.3067V0H18.0312V25.2267C18.0312 40.9934 39.997 47.3001 39.997 47.3001C39.997 47.3001 61.9628 40.9934 61.9628 25.2267V0H46.273Z";
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── 水面高度：深水色散 ω = √(g·k) 的波浪，加上 logo 破水時的漣漪環與被帶起的水丘。
   所有用到水面的地方（網格、光束、logo 上的水線、鏡頭水線）都讀同一個 surfH ── */
const SURF = /* glsl */`
const float G = 9.8;
uniform vec4 uRip[8];   // 漣漪：x, z, 起始時間, 振幅
uniform vec4 uHump;     // 水丘：x, z, 半徑, 高度
uniform float uCalm;    // 浮出後海面稍微平靜
float waveH(vec2 p, float t){
  vec4 W[5];
  W[0] = vec4(normalize(vec2( 0.80, 0.60)), 0.85, 0.075);
  W[1] = vec4(normalize(vec2(-0.45, 0.89)), 1.55, 0.042);
  W[2] = vec4(normalize(vec2( 0.96,-0.28)), 2.80, 0.022);
  W[3] = vec4(normalize(vec2( 0.25, 0.97)), 5.10, 0.010);
  W[4] = vec4(normalize(vec2(-0.85,-0.52)), 8.70, 0.005);
  float h = 0.;
  for (int i = 0; i < 5; i++){
    float k = W[i].z;
    h += W[i].w * sin(dot(W[i].xy, p) * k - sqrt(G * k) * t + float(i) * 1.7);
  }
  return h * uCalm;
}
float surfH(vec2 p, float t){
  float h = waveH(p, t);
  for (int i = 0; i < 8; i++){
    vec4 r = uRip[i]; float dt = t - r.z;
    if (r.w == 0. || dt <= 0.) continue;
    float d = length(p - r.xy);
    // 兩個往外擴散的波包：前緣快、後緣慢，振幅隨時間與距離衰減
    float x1 = d - dt * 1.05, x2 = d - dt * .62;
    h += r.w * exp(-dt * .75) / (1. + d * 1.4) * (exp(-x1 * x1 * 9.) * cos(x1 * 15.) + .6 * exp(-x2 * x2 * 14.) * cos(x2 * 22.));
  }
  vec2 q = p - uHump.xy;
  h += uHump.w * exp(-dot(q, q) / (uHump.z * uHump.z));
  return h;
}
vec3 surfN(vec2 p, float t){
  float e = .04;
  return normalize(vec3(surfH(p - vec2(e, 0.), t) - surfH(p + vec2(e, 0.), t), 2. * e, surfH(p - vec2(0., e), t) - surfH(p + vec2(0., e), t)));
}
`;
const NOISE = /* glsl */`
// 焦散：迭代扭曲的經典寫法，亮紋細、暗區大
float caustic(vec2 p, float t){
  vec2 q = mod(p * 6.2831, 6.2831) - 250.; vec2 i = q; float c = 1., inten = .005;
  for (int n = 0; n < 4; n++){
    float tt = t * (1. - 3.5 / float(n + 1));
    i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(q.x / (sin(i.x + tt) / inten), q.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.);
}
`;
const FOG = /* glsl */`
// 水下吸收：越深、越遠，線條越淡
float absorb(vec3 p){ float d = length(p - cameraPosition); return exp(-d * .075) * exp(min(p.y, 0.) * .22); }
`;

const COL = {
  paper: new THREE.Color('#f3f2ee'), ink: new THREE.Color('#121417'),
  water: new THREE.Color('#dde4e3'), deepInk: new THREE.Color('#9fb0ab'),
  // 莫蘭迪色的線：灰綠水紋、暖灰稜線
  line: new THREE.Color('#a9b4af'), edge: new THREE.Color('#a39f99'),
  face: new THREE.Color('#33383b'),
};
const SUN = new THREE.Vector3(-0.35, 0.82, -0.45).normalize();

const canvas = document.getElementById('wlCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const DPR = Math.min(devicePixelRatio, 1.5);   // loading 階段：解析度上限 1.5x 就夠細
renderer.setPixelRatio(DPR);
renderer.autoClear = false;
renderer.setClearColor(COL.paper);
const camera = new THREE.PerspectiveCamera(48, 1, 0.02, 200);
camera.lookAt(0, -0.06, -1);

const U = {
  uTime: { value: 0 }, uCalm: { value: 1 },
  uRip: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
  uHump: { value: new THREE.Vector4(0, 0, .6, 0) },
};
const scene = new THREE.Scene();

/* ── 水面：網格線，鏡頭附近密、遠處疏 ── */
{
  const a = [];
  let z = -0.25, dz = 0.12;
  while (z > -40) {
    const span = 5 + -z * 0.7, n = Math.min(240, Math.ceil(span * 2 / 0.09));
    for (let i = 0; i < n; i++) a.push(-span + 2 * span * i / n, 0, z, -span + 2 * span * (i + 1) / n, 0, z);
    z -= dz; dz *= 1.075;
  }
  for (let x = -10.15; x <= 10.2; x += 0.7) {
    let z0 = -0.25, d = 0.08;
    while (z0 > -40) { const z1 = z0 - d; a.push(x, 0, z0, x, 0, z1); z0 = z1; d = Math.min(1.2, d * 1.04); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  scene.add(new THREE.LineSegments(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ...U, uInk: { value: COL.line } },
    vertexShader: SURF + `uniform float uTime; varying vec3 vP;
      void main(){ vec3 p = position; p.y += surfH(p.xz, uTime); vP = p; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 uInk; varying vec3 vP;
      void main(){ float d = length(vP - cameraPosition);
        gl_FragColor = vec4(uInk, .22 * exp(-d * .09) * smoothstep(.15, .9, d)); }`,
  })));
}

/* ── 光束：從水面斜射而下的細線，跟著上方水面的曲率一明一暗 ── */
{
  const NR = 70, a = [], f = [], s = [];
  const dir = SUN.clone().negate();
  for (let i = 0; i < NR; i++) {
    const x = (Math.random() - .5) * 12, z = -1.5 - Math.random() * 12, len = 2.5 + Math.random() * 3.5;
    a.push(x, 0, z, x + dir.x * len, dir.y * len, z + dir.z * len);
    f.push(0, 1); s.push(i, i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  g.setAttribute('along', new THREE.Float32BufferAttribute(f, 1));
  g.setAttribute('seed', new THREE.Float32BufferAttribute(s, 1));
  scene.add(new THREE.LineSegments(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ...U, uInk: { value: COL.deepInk } },
    vertexShader: SURF + FOG + `uniform float uTime; attribute float along, seed; varying float vA;
      void main(){ vec3 p = position;
        vec3 n = surfN(position.xz, uTime);
        float focus = clamp(.35 + (1. - n.y) * 40. + .25 * sin(uTime * (.6 + fract(seed * .37)) + seed), 0., 1.);
        if (along < .5) p.y += surfH(p.xz, uTime);
        vA = (1. - along) * focus * absorb(p) * .35;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 uInk; varying float vA; void main(){ gl_FragColor = vec4(uInk, vA); }`,
  })));
}

/* ── 氣泡：細線小圓，越大浮得越快、左右擺動，接近水面淡出 ── */
{
  const NB = 120, SEG = 14, a = [], c = [], r = [];
  for (let i = 0; i < NB; i++) {
    const cx = (Math.random() - .5) * 9, cy = -Math.random() * 4.5, cz = -1.2 - Math.random() * 10;
    const rad = 0.006 + Math.pow(Math.random(), 3) * 0.035;
    for (let k = 0; k < SEG; k++) {
      const t0 = k / SEG * Math.PI * 2, t1 = (k + 1) / SEG * Math.PI * 2;
      a.push(Math.cos(t0), Math.sin(t0), 0, Math.cos(t1), Math.sin(t1), 0);
      c.push(cx, cy, cz, i, cx, cy, cz, i); r.push(rad, rad);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  g.setAttribute('center', new THREE.Float32BufferAttribute(c, 4));
  g.setAttribute('rad', new THREE.Float32BufferAttribute(r, 1));
  const b = new THREE.LineSegments(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: U.uTime, uInk: { value: COL.deepInk } },
    vertexShader: FOG + `uniform float uTime; attribute vec4 center; attribute float rad; varying float vA;
      void main(){
        float speed = .12 + rad * 9.;                  // 小氣泡受黏滯力影響浮得慢
        float y = mod(center.y + uTime * speed + 4.5, 4.5) - 4.5;
        vec3 c = vec3(center.x + sin(uTime * (1.5 + rad * 30.) + center.w) * rad * 2.5, y, center.z);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float squash = 1. - clamp(rad * 6., 0., .25);  // 大氣泡略扁
        vec3 p = c + (right * position.x + up * position.y * squash) * rad;
        vA = absorb(c) * smoothstep(0., -.35, y) * smoothstep(-4.5, -3.8, y) * .6;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 uInk; varying float vA; void main(){ gl_FragColor = vec4(uInk, vA); }`,
  }));
  b.frustumCulled = false; scene.add(b);
}

/* ── Logo：淺色貼面 + 黑色稜線。水下有焦散反光並被水吸收變淡；水面切過的地方畫一條接觸線；剛出水的部分帶一點濕痕 ── */
scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d4d3, 2.6));
const sunL = new THREE.DirectionalLight(0xffffff, 1.2); sunL.position.copy(SUN).multiplyScalar(10); scene.add(sunL);

const svg = new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg"><path d="' + MARK + '"/></svg>');
const shapes = SVGLoader.createShapes(svg.paths[0]);
const DEPTH = 27, CX = 40, CY = 23.65;
const SCALE0 = 0.021, SCALE1 = 0.007;   // 浮出過程縮小 2/3（最後是水下大小的 1/3）
const geo = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: false, curveSegments: 24 });
geo.translate(-CX, -CY, -DEPTH / 2);
geo.rotateX(Math.PI);
let HALF_H = CY * SCALE0;   // logo 中心到上下緣的距離，隨縮放更新

const uWet = { value: 0 }, uFace = { value: 0 }, uFlat = { value: 0 };   // uFace：貼面不透明度（水下 0、上升中漸顯）；uFlat：收平成 2D 的程度
const faceMat = new THREE.MeshLambertMaterial({ color: COL.face, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
faceMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, U, { uWater: { value: COL.water }, uInk: { value: COL.edge }, uWet, uFace, uFlat, uFlatCol: { value: COL.face.clone().convertLinearToSRGB() } });   // 此處片段色已轉成 sRGB，平色也用 sRGB
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vW; varying vec3 vWN;')
    .replace('#include <fog_vertex>', '#include <fog_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uTime, uWet, uFace, uFlat; uniform vec3 uWater, uInk, uFlatCol; varying vec3 vW; varying vec3 vWN;\n' + SURF + NOISE)
    .replace('#include <fog_fragment>',
      `float dl = vW.y - surfH(vW.xz, uTime);          // >0 在水面上
       float sub = 1. - smoothstep(-.004, .004, dl);
       float up = clamp(vWN.y * .6 + .45, 0., 1.);
       vec2 cp = vW.xz * 1.2 + vW.y * .15;
       float cs = caustic(cp, uTime * .55) * .9 + caustic(cp * 1.7 + 3., uTime * .7) * .35;
       gl_FragColor.rgb += cs * up * exp(vW.y * .35) * .5 * sub;
       float dist = length(vW - cameraPosition);
       gl_FragColor.rgb = mix(gl_FragColor.rgb, uWater, sub * (1. - exp(-dist * .06) * exp(min(vW.y, 0.) * .3)));
       gl_FragColor.rgb *= 1. - (1. - sub) * uWet * .07 * exp(-dl * 5.);   // 剛出水的濕痕，靠近水線最深
       float cl = 1. - smoothstep(0., fwidth(dl) * 1.6, abs(dl));
       gl_FragColor.rgb = mix(gl_FragColor.rgb, uInk, cl * .25);
       gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlatCol, uFlat);   // 光影收成 2D logo 的單一平色
       gl_FragColor.a = uFace;`);
};
const edgeMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: { ...U, uInk: { value: COL.edge } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: SURF + FOG + `uniform float uTime, uAlpha; uniform vec3 uInk; varying vec3 vW;
    void main(){ float dl = vW.y - surfH(vW.xz, uTime);
      gl_FragColor = vec4(uInk, uAlpha * (dl > 0. ? .35 : .15 + .2 * absorb(vW))); }`,
});
edgeMat.uniforms.uAlpha = { value: 1 };
// 框線狀態的橫線：曲面上每一段前後相連的線，貼面浮現時淡出
const hatchMat = edgeMat.clone();
hatchMat.uniforms = { ...U, uInk: { value: COL.edge }, uAlpha: { value: .3 } };
const logo = new THREE.Group();
// 被貼面擋住的線另畫一次（只畫在貼面後方的部分），透明度跟著貼面反向漸淡，
// 這樣背面的框線是慢慢隱去，而不是在某個進度一次消失
edgeMat.depthWrite = hatchMat.depthWrite = false;
const hidden = m => { const h = m.clone(); h.uniforms = { ...m.uniforms, uAlpha: { value: 1 } }; h.depthFunc = THREE.GreaterDepth; return h; };
const edgeHid = hidden(edgeMat), hatchHid = hidden(hatchMat);
const edgeG = new THREE.EdgesGeometry(geo, 20), hatchG = new THREE.EdgesGeometry(geo, 1);
const faces = new THREE.Mesh(geo, faceMat); faces.renderOrder = 1;
const lines = [[edgeG, edgeMat], [edgeG, edgeHid], [hatchG, hatchMat], [hatchG, hatchHid]].map(([g, m], i) => {
  const l = new THREE.LineSegments(g, m); l.renderOrder = 2 + i; return l; });
logo.add(faces, ...lines);
logo.scale.setScalar(SCALE0);
scene.add(logo);

/* ── 水滴：logo 下緣離水後，從盾形底邊滴落，落回水面時打出小漣漪 ── */
const ND = 48;
const drops = Array.from({ length: ND }, () => ({ on: false, p: new THREE.Vector3(), vy: 0 }));
const dropPos = new Float32Array(ND * 6);
const dropGeo = new THREE.BufferGeometry(); dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
const dropLines = new THREE.LineSegments(dropGeo, new THREE.LineBasicMaterial({ color: COL.edge, transparent: true, opacity: .5 }));
dropLines.frustumCulled = false; scene.add(dropLines);
const tmp = new THREE.Vector3();
function spawnDrop() {
  const d = drops.find(o => !o.on); if (!d) return;
  // 盾形下緣：中央最低，往兩側沿弧線升高
  const u = Math.random() * 2 - 1;
  const lx = u * 21, ly = 47.3 - 22 * Math.pow(Math.abs(u), 1.8);
  tmp.set(lx, -(ly - CY), (Math.random() - .5) * DEPTH);
  logo.localToWorld(d.p.copy(tmp));
  d.vy = -Math.random() * .05; d.on = true;
}

/* ── 鏡頭玻璃上的水線：全螢幕「相乘」薄片，同一個 pass 疊上去 ── */
const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true,
  uniforms: { ...U, uAspect: { value: 1 }, uLens: { value: new THREE.Vector3(0.34, -0.05, 1) },
    uTint: { value: new THREE.Vector3(0xdd / 0xf3, 0xe4 / 0xf2, 0xe3 / 0xee) /* sRGB：水色 ÷ 紙色 */ } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: SURF + `
    uniform float uTime, uAspect; uniform vec3 uLens, uTint; varying vec2 vUv;
    float lensWater(float x){ return waveH(vec2(x, -.15), uTime) * uLens.z; }
    void main(){
      float lx = (vUv.x * 2. - 1.) * uAspect * uLens.x;
      float ly = (vUv.y * 2. - 1.) * uLens.x + uLens.y;
      float d = ly - lensWater(lx);
      vec3 m = d < 0. ? uTint * (1. - (1. - vUv.y) * .08) : vec3(1.);
      float w = fwidth(d);
      m = mix(m, vec3(.66, .69, .67), (1. - smoothstep(0., w * 1.6, abs(d + w * .5))) * .9);
      gl_FragColor = vec4(m, 1.);
    }`,
}));
comp.frustumCulled = false;
const compScene = new THREE.Scene(); compScene.add(comp);
const compCam = new THREE.Camera();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.9 ? 62 : 48;
  camera.updateProjectionMatrix();
  comp.material.uniforms.uAspect.value = w / h;
}
addEventListener('resize', resize); resize();

/* ── 進度 → 動作 ── */
const START = { x: 0.2, y: -1.15, z: -5.4, rx: 0.12, ry: -0.42, rz: 0.075 };
const END_Y = 0.85;
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const brandSvg = document.querySelector('#wlBrand svg'), flatEl = document.getElementById('wlFlat');
const pctEl = document.getElementById('wlPct'), brandEl = document.getElementById('wlBrand');
let S;
function reset() {
  S = { target: 0, shown: 0, y: START.y, vy: 0, autoT: 0, handoff: false, rip: 0, crossed: { top: false, mid: false, bot: false },
        done: 0, dropT: -1, brand: false };
  U.uRip.value.forEach(v => v.set(0, 0, 0, 0));
  drops.forEach(d => { d.on = false; });
  uWet.value = 0;
  brandEl.classList.remove('on'); pctEl.style.opacity = 1; flatEl.style.opacity = 0;
}
reset();
function ripple(x, z, amp) { U.uRip.value[S.rip++ % 8].set(x, z, U.uTime.value, amp); }

// 進度 = 真實載入（字型、圖片、城市）與節奏表兩者取低：載入很快時照原本設計的節奏一段一段跳，
// 網路慢時就停在真實進度等它
const TASKS = { fonts: false, load: false, city: false };
const PACE = reduce ? .3 : .8;   // 節奏表整體時間倍率：1 = 原版 6.4 秒浮出
function done(k) { if (k in TASKS) TASKS[k] = true; }
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => done('fonts'));
if (document.readyState === 'complete') done('load'); else addEventListener('load', () => done('load'));
setTimeout(() => Object.keys(TASKS).forEach(done), 15000);   // 保險：卡住太久就放行
// 真實載入全部完成（例如有快取）後，節奏表加速：剩下的部分約 1.6 秒內跑完
const FAST_SEC = reduce ? .6 : 1.6;
function autoProgress(dt) {
  const k = Object.values(TASKS), real = .08 + .92 * k.filter(Boolean).length / k.length;
  S.fast = real >= 1;
  if (S.fast && S.quick === undefined) S.quick = S.autoT < 6.4 * PACE * .5;   // 一下子就載完（多半是快取）
  S.autoT += dt * (S.fast ? Math.max(1, 6.4 * PACE / FAST_SEC) : 1);
  const steps = [[0, 0], [.6, .08], [1.4, .22], [2.1, .31], [3.2, .52], [3.8, .58], [4.9, .77], [5.6, .9], [6.4, 1]];
  let v = 0; for (const [t, p] of steps) if (S.autoT >= t * PACE) v = p;
  S.target = Math.max(S.target, Math.min(v, real));
}

const world = new THREE.Vector3();
// logo 實際在螢幕上的最低點：傾斜加上厚度，下緣會比中心線低，所以投影外框八個角取最低者
geo.computeBoundingBox();
const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(i => new THREE.Vector3(
  i & 1 ? geo.boundingBox.max.x : geo.boundingBox.min.x, i & 2 ? geo.boundingBox.max.y : geo.boundingBox.min.y, i & 4 ? geo.boundingBox.max.z : geo.boundingBox.min.z));
// 平面 logo 對齊 3D 的正面：取靠鏡頭那一面的左上、右下角投影
const fl = new THREE.Vector3(), fr = new THREE.Vector3();
function placeFlat() {
  const b = geo.boundingBox, z = b.max.z;   // rotateX(π) 後 +z 那面朝向鏡頭
  fl.set(-21.97, 23.65, z); logo.localToWorld(fl).project(camera);
  fr.set(21.97, -23.65, z); logo.localToWorld(fr).project(camera);
  const x0 = (fl.x * .5 + .5) * innerWidth, y0 = (-fl.y * .5 + .5) * innerHeight;
  const x1 = (fr.x * .5 + .5) * innerWidth, y1 = (-fr.y * .5 + .5) * innerHeight;
  flatEl.style.width = (x1 - x0) + 'px'; flatEl.style.height = (y1 - y0) + 'px';
  flatEl.style.transform = `translate(${x0}px, ${y0}px)`;
}
function logoBottomPx() {
  let m = -Infinity;
  for (const c of corners) { world.copy(c); logo.localToWorld(world).project(camera); m = Math.max(m, (-world.y * .5 + .5) * innerHeight); }
  return m;
}
function place(el, x, y, z, dy) {
  world.set(x, y, z).project(camera);
  el.style.transform = `translate(${(world.x * .5 + .5) * innerWidth}px, ${(-world.y * .5 + .5) * innerHeight + dy}px) translate(-50%, 0)`;
}

let last = performance.now(), t = 3;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  t += reduce ? 0 : dt;
  U.uTime.value = t;
  autoProgress(dt);

  // 顯示進度平滑追上實際進度
  S.shown += (S.target - S.shown) * (1 - Math.exp(-dt * (S.fast ? 5 : 2.2)));
  if (S.target >= 1 && S.shown > .995) S.shown = 1;
  const e = ease(S.shown);

  // 浮力：位置用欠阻尼彈簧追目標，出水後會上下晃一兩下才停
  const goal = START.y + (END_Y - START.y) * e;
  S.vy += ((goal - S.y) * 14 - S.vy * 3.2) * dt;
  S.y += S.vy * dt;
  const sway = 1 - e;
  logo.position.set(START.x * sway + Math.sin(t * .27 + 1.) * .03 * sway, S.y + Math.sin(t * .45) * .03 * sway, START.z);
  logo.rotation.set((START.rx + Math.sin(t * .38) * .02) * sway, (START.ry + Math.sin(t * .21 + 2.) * .035) * sway, (START.rz + Math.sin(t * .33 + .5) * .015) * sway);
  const sc = SCALE0 + (SCALE1 - SCALE0) * e;
  // 關鍵點：轉正的最後一段，厚度一路壓扁到 0，光影收成平色，稜線跟著消失 → 變成一張與 2D logo 完全相同的平面
  const flat = THREE.MathUtils.smoothstep(e, .82, 1);
  logo.scale.set(sc, sc, sc * Math.max(.001, 1 - flat)); HALF_H = CY * sc;
  logo.updateMatrixWorld();

  // 破水：上緣、中心、下緣依序穿過水面時各打一圈漣漪；半出水時把水帶起一個小丘
  const top = S.y + HALF_H, bot = S.y - HALF_H, lx = logo.position.x, lz = logo.position.z;
  if (!S.crossed.top && top > 0) { S.crossed.top = true; ripple(lx, lz, .028); }
  if (!S.crossed.mid && S.y > 0) { S.crossed.mid = true; ripple(lx, lz, .022); }
  if (!S.crossed.bot && bot > 0.01) { S.crossed.bot = true; ripple(lx, lz, .045); S.dropT = 0; uWet.value = 1; }
  const emerged = THREE.MathUtils.clamp(top / (2 * HALF_H), 0, 1);
  U.uHump.value.set(lx, lz, .55, .05 * Math.sin(Math.PI * emerged) * Math.min(1, Math.abs(S.vy) * 4 + .3));
  U.uCalm.value = 1 - .35 * e;
  // 水下只有框線；開始上升後貼面慢慢浮現，夠實了才遮住背面的線
  uFace.value = THREE.MathUtils.smoothstep(S.shown, .12, .8);
  hatchMat.uniforms.uAlpha.value = .3 * (1 - uFace.value);
  edgeHid.uniforms.uAlpha.value = 1 - uFace.value;
  hatchHid.uniforms.uAlpha.value = .3 * (1 - uFace.value);
  // 換成 2D：轉正（進度 100%、擺動歸零）後，3D 淡出、平面 logo 同步淡入在正面的同一位置
  uFlat.value = flat;
  edgeMat.uniforms.uAlpha.value = 1 - flat; edgeHid.uniforms.uAlpha.value *= 1 - flat;
  // 壓平完成的那一格，畫面上的 3D 已經和 2D 一模一樣，直接換成 2D 向量
  const isFlat = flat >= 1;
  logo.visible = !isFlat; flatEl.style.opacity = isFlat ? 1 : 0;
  comp.material.uniforms.uLens.value.set(.34, -.05 + .03 * e, 1 - .4 * e);

  // 水滴：出水後頭兩秒最多，之後越來越少；濕痕慢慢乾
  if (S.dropT >= 0) {
    S.dropT += dt;
    const rate = 26 * Math.exp(-S.dropT * 1.1);
    if (Math.random() < rate * dt) spawnDrop();
    uWet.value = Math.exp(-S.dropT * .5);
  }
  for (let i = 0; i < ND; i++) {
    const d = drops[i], o = i * 6;
    if (d.on) {
      d.vy -= 9.8 * .45 * dt; d.p.y += d.vy * dt;
      if (d.p.y < 0) { d.on = false; if (Math.random() < .5) ripple(d.p.x, d.p.z, .006); }
    }
    const len = d.on ? Math.max(.012, -d.vy * .035) : 0;
    dropPos[o] = d.p.x; dropPos[o + 1] = d.p.y; dropPos[o + 2] = d.p.z;
    dropPos[o + 3] = d.p.x; dropPos[o + 4] = d.p.y + len; dropPos[o + 5] = d.p.z;
  }
  dropGeo.attributes.position.needsUpdate = true;

  // 百分比：跟在 logo 下方，進度越高字越小；完成後換成品牌字
  const pct = Math.round(S.shown * 100);
  pctEl.firstChild.textContent = pct;
  pctEl.setAttribute('aria-valuenow', pct);
  pctEl.style.fontSize = (34 - 23 * e) + 'px';
  if (!S.handoff) {
  placeFlat();
  const bottomPx = logoBottomPx();
  world.set(logo.position.x, S.y, logo.position.z).project(camera);
  const cxPx = (world.x * .5 + .5) * innerWidth;
  pctEl.style.transform = `translate(${cxPx}px, ${bottomPx + 12 + 10 * (1 - e)}px) translate(-50%, 0)`;
  brandEl.style.transform = `translate(${cxPx}px, ${bottomPx + 16}px) translate(-50%, 0)`;
  // 字樣與圖示同寬：投影圖示左右邊緣算出螢幕寬度
  world.set(logo.position.x - 22 * sc, S.y, logo.position.z).project(camera); const xl = world.x;
  world.set(logo.position.x + 22 * sc, S.y, logo.position.z).project(camera);
  brandSvg.style.width = ((world.x - xl) * .5 * innerWidth).toFixed(1) + 'px';
  }
  if (S.shown === 1) {
    S.done += dt;
    pctEl.style.opacity = Math.max(0, 1 - S.done * 1.6);
    // 一路載很快時，品牌字與停留時間也跟著縮短
    if (S.done > (S.quick ? .35 : .7) && !S.brand) { S.brand = true; brandEl.classList.add('on'); S.brandAt = S.done; }
    if (S.brand && S.done - S.brandAt > (S.quick ? 1.1 : 2.2) && !S.fin) { S.fin = true; finish(); }
  }

  renderer.clear(); renderer.render(scene, camera); renderer.render(compScene, compCam);
  raf = requestAnimationFrame(frame);
}
let raf = requestAnimationFrame(frame);

let finish; const finished = new Promise(r => { finish = r; });
function stop() {
  cancelAnimationFrame(raf);
  scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  renderer.dispose(); renderer.forceContextLoss();
}
// 交棒：logo 停在水面上，水往下退出畫面、露出首頁；首頁的 lockup 換成和 loading 結尾一模一樣的大小、位置、顏色，
// 退完水才把這邊的 logo 換成 lockup（兩者重疊，看不出切換）
function fitLockup(lockup, mark, type) {
  const f = flatEl.getBoundingClientRect(), b = brandSvg.getBoundingClientRect();
  // viewBox 不同：lk-mark 18 0 44 47.3、平面 18.03 0 43.93 47.3；lk-type 0 58 80 57、品牌字 0 59 80 56
  const s = f.width / 43.93, mw = 44 * s, mh = 47.3 * s, tw = b.width, typeTop = b.top - tw / 80;
  const w = Math.max(mw, tw);
  Object.assign(lockup.style, { top: (f.top / innerHeight * 100).toFixed(3) + '%', width: w + 'px', transform: 'translate(-50%, 0)' });
  Object.assign(mark.style, { width: mw + 'px' });
  Object.assign(type.style, { width: tw + 'px', margin: (typeTop - f.top - mh) + 'px auto 0' });
  lockup.classList.add('wl-ver');
}
function handoff({ lockup, mark, type, below, hold = 0, dur = 1.6 }) {
  S.handoff = true;
  fitLockup(lockup, mark, type);
  // 水退下的同時，logo 以慢、快、慢的節奏往下移到標語上方（留 30px），首頁的 lockup 直接放在終點
  let dy = 0;
  if (below) {
    const lr = lockup.getBoundingClientRect(), tb = brandSvg.getBoundingClientRect();
    const bottom = Math.max(lr.bottom, tb.bottom);
    dy = Math.max(0, below.getBoundingClientRect().top - 30 - bottom);
    lockup.style.top = ((lr.top + dy) / innerHeight * 100).toFixed(3) + '%';
  }
  // 水線在螢幕上的位置：遠處水面投影下來的高度，往上留一點給波峰
  world.set(0, 0, -30).project(camera);
  const ly = (-world.y * .5 + .5) * innerHeight - 14;
  const stage = document.getElementById('wlStage'), vh = innerHeight;
  const o = { sky: 1, drop: 0, dy: 0 };
  const paint = () => {
    // 水面以上（天空那塊紙色）淡掉，露出後面的城市；整片水再往下沉出畫面
    stage.style.webkitMaskImage = stage.style.maskImage =
      `linear-gradient(to bottom, rgba(0,0,0,${o.sky}) ${ly - 24}px, #000 ${ly}px)`;
    stage.style.transform = `translateY(${o.drop * (vh - ly + 40)}px)`;
    flatEl.style.translate = brandEl.style.translate = `0 ${o.dy}px`;
  };
  paint();
  return new Promise(res => {
    gsap.timeline({ delay: hold, onUpdate: paint, onComplete() {
        res();   // 首頁這時顯示 lockup；再過兩格藏起這邊的 logo，兩者完全重疊不會閃
        // 不直接藏：品牌字帶紙色光暈、邊緣反鋸齒也和首頁 lockup 不完全相同，硬切會閃一下，改成兩者重疊後慢慢淡出
        const wl = document.getElementById('wl');
        requestAnimationFrame(() => requestAnimationFrame(() => { wl.style.transition = 'opacity .6s ease'; wl.style.opacity = 0; }));
        setTimeout(() => { stop(); wl.remove(); }, 800);
      } })
      .to(o, { sky: 0, duration: reduce ? .01 : .6, ease: 'power1.inOut' }, 0)
      .to(o, { drop: 1, duration: reduce ? .01 : dur, ease: 'power3.in' }, reduce ? 0 : .15)
      .to(o, { dy, duration: reduce ? .01 : dur, ease: 'power2.inOut' }, reduce ? 0 : .1);
  });
}
// 首頁用：done('city') 回報城市建好；finished 在品牌字出現後 resolve；handoff() 交棒給首頁
window.JesdaIntro = { done, finished, handoff, stop, frames: n => new Promise(r => { const f = () => (n-- <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }) };

