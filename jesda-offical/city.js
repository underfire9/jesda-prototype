/* 捷思達 · 城市
   開場是一整座城市的線稿（白色量體＋黑色邊線、墨線積雲）。
   往下捲：先由地面往上鋪一層石材，整座城像一座建築模型；
   鏡頭降到街道高度時，大道兩旁的建築再長出最終材質（玻璃、石材、金屬、路燈、路面）。
   最後一幕切成黃昏到夜晚。建築依材質合併成少數幾個網格。 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createCity(canvas, opt) {
  opt = opt || {};
  const mobile = !!opt.mobile;
  let seed = 20091;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // ---------- 共用 uniform ----------
  const U = {
    uTime: { value: 0 },
    uStone: { value: -30 },   // 石材前緣高度（公尺）
    uFinal: { value: -30 },   // 最終材質前緣高度
    uNight: { value: 0 },
    uDraw: { value: 6000 },
    uCam: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(.5, .4, .3).normalize() },
    uFogNear: { value: 380 }, uFogFar: { value: 2300 },
    uFogLine: { value: new THREE.Color(0xeceeef) },
    uFogDay: { value: new THREE.Color(0xdcdfe0) },
    uFogNight: { value: new THREE.Color(0x2b2641) },
    uMat: { value: 0 },
    uCurve: { value: 1 / 5000 },   // 地表曲率：像一顆小星球
    uPx: { value: new THREE.Vector2(.001, .001) }
  };
  const LINE_RGB = 'vec3(.33,.37,.42)';   // 線條：石墨藍灰，不用純黑

  const GLSL_NOISE = `
    float hh(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
    float h3(vec3 p){ p = fract(p*.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hh(i),hh(i+vec2(1,0)),f.x), mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*vn(p); p=p*2.02+vec2(17.1,9.3); a*=.5; } return v; }
    float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      float a=h3(i), b=h3(i+vec3(1,0,0)), c=h3(i+vec3(0,1,0)), d=h3(i+vec3(1,1,0));
      float e=h3(i+vec3(0,0,1)), g=h3(i+vec3(1,0,1)), k=h3(i+vec3(0,1,1)), l=h3(i+vec3(1,1,1));
      return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(k,l,f.x),f.y), f.z); }
  `;
  // 兩道前緣：石材、最終材質；地面與樹用同一道前緣決定換色的時機
  const GLSL_FRONT = `
    float stoneFront(vec3 wp){ return uStone + (vn(wp.xz*.03)-.5)*12. + (vn(wp.xz*.19+3.)-.5)*2.5; }
    float finalFront(vec3 wp){ return uFinal + (vn(wp.xz*.035+7.)-.5)*10. + (vn(wp.xz*.2+11.)-.5)*2.; }
  `;

  // 以鏡頭為中心把世界彎成球面：地平線出現弧度，建築沿球面法線略微傾斜
  const GLSL_BEND = `
    uniform float uCurve;
    vec3 bend(vec3 p){ vec2 r = p.xz - uCam.xz; float d = length(r); if (d < .01 || uCurve <= 0.) return p;
      float Rr = 1./uCurve, th = d*uCurve, ry = Rr + p.y; vec2 nr = r/d * ry*sin(th);
      return vec3(uCam.x + nr.x, ry*cos(th) - Rr, uCam.z + nr.y); }
  `;
  const BEND_PROJECT = `
    vec4 mvPosition = vec4(transformed, 1.);
    #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
    #endif
    mvPosition = modelMatrix * mvPosition; mvPosition.xyz = bend(mvPosition.xyz);
    mvPosition = viewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;`;
  // 給內建材質加上彎曲（保留原本的 onBeforeCompile）
  function bendMat(mat, key) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.uniforms.uCam = U.uCam; sh.uniforms.uCurve = U.uCurve;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uCam;' + GLSL_BEND)
        .replace('#include <project_vertex>', BEND_PROJECT);
    };
    const pk = mat.customProgramCacheKey && mat.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
    mat.customProgramCacheKey = () => 'bend-' + (key || '') + (pk ? pk() : '');
    return mat;
  }

  // ---------- 渲染器 ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdcdfe0, 380, 2300);
  const camera = new THREE.PerspectiveCamera(44, 1, 1, 7000);

  // ---------- 天空 ----------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: Object.assign({ uEnv: { value: 0 } }, U),
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform float uTime, uNight, uMat, uEnv; uniform vec3 uFogLine, uFogDay, uFogNight; varying vec3 vDir;
      ${GLSL_NOISE}
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 lTop = vec3(.80,.85,.90), lHor = vec3(.945,.948,.948);
        vec3 dTop = vec3(.42,.58,.78), dHor = vec3(.90,.88,.84);
        vec3 nTop = vec3(.045,.055,.15), nMid = vec3(.34,.21,.40), nHor = vec3(.98,.56,.30);
        float g = pow(clamp(h,0.,1.), .5);
        vec3 lineSky = mix(lHor, lTop, g);
        vec3 daySky = mix(dHor, dTop, g);
        vec3 nightSky = mix(nHor, nMid, smoothstep(0.,.17,h)); nightSky = mix(nightSky, nTop, smoothstep(.12,.62,h));
        vec3 col = mix(lineSky, daySky, uMat); col = mix(col, nightSky, uNight);
        vec3 fogC = mix(mix(uFogLine, uFogDay, uMat), uFogNight, uNight);
        col = mix(col, fogC, (1. - smoothstep(-.03, .05, h)) * (1. - uNight*.7));
        vec3 sunD = normalize(vec3(.55,.22,-.8));
        float sd = max(dot(d, sunD), 0.);
        col += vec3(1.,.82,.6) * pow(sd, 8.) * .22 * uMat * (1.-uNight);
        vec3 sunN = normalize(vec3(.32,.08,-1.)); float sn = max(dot(d, sunN), 0.);
        col += vec3(1.,.55,.25) * pow(sn, 10.) * .5 * uNight + vec3(1.,.82,.6) * pow(sn, 500.) * 2. * uNight;
        // 高空薄雲（只在白天與夜晚）
        if (h > 0.) {
          vec2 q = d.xz / (h + .1) * .6 + vec2(uTime*.01, 0.);
          float c = smoothstep(.55,.8, fbm(q*1.4 + fbm(q*.5)*.8)) * smoothstep(.0,.25,h) * uMat;
          col = mix(col, mix(vec3(1.,.98,.95), vec3(.95,.62,.46), uNight), c * .35 * (1.-uEnv*.5));
        }
        float st = step(.9966, hh(floor(d.xz/(h+.2)*260.))) * smoothstep(.25,.7,h) * uNight;
        col += st * .8;
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 24), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  // ---------- 雲：程序生成的積雲 ----------
  // 每朵雲由大小雲團層層長出（主雲團 → 子雲團 → 孫雲團），算出一張高度場，
  // 線稿版從高度場畫出外輪廓、前後雲團的分界與背光面的排線；白天版用同一張高度場打光。
  let cs = 7741; const crnd = () => { cs = (cs * 16807) % 2147483647; return cs / 2147483647; };
  const crr = (a, b) => a + (b - a) * crnd();
  const CWID = 1024, CHEI = 512;
  function cloudPuffs(type) {
    const P = [], y0 = CHEI * .82;
    const mound = (L, R, n, rMin, rMax, hMax, pw) => {
      for (let i = 0; i < n; i++) {
        const u = (i + crr(-.3, .3)) / (n - 1), x = CWID * (L + (R - L) * u), pr = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, u)))), pw);
        const r = (rMin + (rMax - rMin) * pr) * crr(.85, 1.15);
        P.push([x, y0 - r * crr(.45, .7) - pr * hMax * crr(.7, 1.1), r, crr(0, 30)]);
      }
    };
    if (type === 'tower') {
      const cx = CWID * crr(.44, .56);
      mound(.3, .7, 5, 50, 95, 40, .6);
      let y = y0 - 120, r = 82;
      for (let l = 0; l < 3; l++) { const k = 2 + (l < 2 ? 1 : 0); for (let i = 0; i < k; i++) P.push([cx + (i - (k - 1) / 2) * r * crr(.8, 1.1) + crr(-20, 20), y - crr(0, 25), r * crr(.85, 1.1), 20 + l * 10 + crr(0, 20)]); y -= r * crr(.9, 1.1); r *= .78; }
    } else if (type === 'wide') {
      mound(.05, .95, 12, 34, 62, 34, .4);
      for (let i = 0; i < 4; i++) P.push([CWID * crr(.2, .8), y0 - crr(70, 110), crr(36, 55), crr(10, 30)]);
    } else if (type === 'cluster') {
      [[.18, .42], [.46, .66], [.7, .9]].forEach(([L, R], j) => { if (j === 1 || crnd() < .8) mound(L, R, 4, 30, 62 + j * 8, 40 + crnd() * 40, .7); });
    } else {
      mound(.16, .84, 7, 46, 118, crr(70, 120), .75);
    }
    // 子雲團與孫雲團：只長在上半部，讓輪廓像花椰菜一樣有層次
    const grow = (src, depth) => {
      const out = [];
      src.forEach(([x, y, r, z]) => {
        if (r < (depth ? 40 : 26)) return;
        const k = 2 + Math.floor(crnd() * (depth ? 2 : 3));
        for (let i = 0; i < k; i++) {
          const a = -Math.PI * (.12 + .76 * (i + crr(-.3, .3)) / Math.max(1, k - 1)), rr2 = r * crr(.4, .6), d = r * crr(.55, .8);
          out.push([x + Math.cos(a) * d, y + Math.sin(a) * d, rr2, z + r * crr(.15, .45)]);
        }
      });
      return out;
    };
    const c1 = grow(P, 0), c2 = grow(c1, 1);
    const all = P.concat(c1, c2).filter(p => p[1] + p[2] * .2 < y0);
    all.forEach(p => { p.push(crnd() * 6.28, crnd() * 6.28); });
    return { puffs: all, y0 };
  }
  function cloudField(c) {
    const W = CWID, H = CHEI, N = W * H;
    const hgt = new Float32Array(N).fill(-1e9), own = new Int16Array(N).fill(-1), shd = new Float32Array(N), alp = new Float32Array(N);
    const L = [-.45, -.72, .53], base = x => c.y0 + 3 * Math.sin(x * .021) + 2 * Math.sin(x * .057);
    c.puffs.forEach(([cx, cy, r, z, p1, p2], idx) => {
      const R = r * 1.1, x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (y > base(x)) continue;
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy; if (d2 > R * R) continue;
        const an = Math.atan2(dy, dx), re = r * (1 + .025 * Math.sin(3 * an + p1) + .012 * Math.sin(7 * an + p2));
        if (d2 >= re * re) continue;
        const sq = Math.sqrt(re * re - d2), h = z + sq, i = y * W + x, nz = sq / re;
        const a = Math.min(1, nz / .38); if (a > alp[i]) alp[i] = a;
        if (h > hgt[i]) {
          hgt[i] = h; own[i] = idx;
          const nx = dx / re, ny = dy / re, lam = nx * L[0] + ny * L[1] + nz * L[2];
          shd[i] = Math.max(0, Math.min(1, .55 + .5 * lam));
        }
      }
    });
    return { W, H, hgt, own, shd, alp, base };
  }
  const INK = [84, 94, 107];
  function cloudLine(c, f) {
    const { W, H, hgt, own, shd, base } = f, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x2 = cv.getContext('2d'), img = x2.createImageData(W, H), D = img.data;
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && own[y * W + x] >= 0;
    const OFF = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (own[i] < 0) continue;
      let ink = 0;
      for (let k = 0; k < OFF.length && ink < .9; k++) {
        const qx = x + OFF[k][0], qy = y + OFF[k][1];
        if (!inside(qx, qy)) { ink = k < 4 || k > 7 ? .9 : .55; continue; }
        const j = qy * W + qx;
        if (own[j] !== own[i] && hgt[i] - hgt[j] > 4) ink = Math.max(ink, k < 4 || k > 7 ? .5 : .28);
      }
      const b = base(x); if (y > b - 2.2) ink = Math.max(ink, .85);
      const sh = shd[i], low = Math.max(0, Math.min(1, (y - (b - 150)) / 150));
      if (sh < .56 && ((x - y * .55) % 10 + 10) % 10 < 2.2) ink = Math.max(ink, .42 * Math.min(1, (.56 - sh) * 4) * (.3 + .7 * low));
      const w = 250 - 10 * (1 - sh);
      D[i * 4] = w + (INK[0] - w) * ink; D[i * 4 + 1] = w + (INK[1] - w) * ink; D[i * 4 + 2] = w + 1 + (INK[2] - w) * ink; D[i * 4 + 3] = 255;
    }
    x2.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function cloudSoft(c, f) {
    const { W, H, own, shd, alp, base } = f, w = W / 2, h = H / 2, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x2 = cv.getContext('2d'), img = x2.createImageData(w, h), D = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * 2) * W + x * 2, o = (y * w + x) * 4; if (own[i] < 0) continue;
      const sh = shd[i], b = base(x * 2), low = Math.max(0, Math.min(1, (y * 2 - (b - 170)) / 170));
      const lit = [255, 254, 251], dk = [194, 203, 219], k = Math.max(0, Math.min(1, sh * (1 - .45 * low) + .05));
      const rim = (1 - alp[i]) * sh * 30;
      for (let ch = 0; ch < 3; ch++) D[o + ch] = Math.min(255, dk[ch] + (lit[ch] - dk[ch]) * k + rim);
      D[o + 3] = 255 * alp[i] * Math.max(0, Math.min(1, (b - y * 2) / 12));
    }
    x2.putImageData(img, 0, 0);
    // 柔化：讓明暗連成一片，不會一顆顆像球
    const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h; const y2 = cv2.getContext('2d');
    y2.filter = 'blur(3px)'; y2.drawImage(cv, 0, 0); y2.filter = 'none'; y2.globalAlpha = .45; y2.drawImage(cv, 0, 0);
    const t = new THREE.CanvasTexture(cv2); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const CTYPES = mobile ? ['cumulus', 'tower', 'wide', 'cluster', 'cumulus', 'wide'] : ['cumulus', 'tower', 'wide', 'cumulus', 'cluster', 'wide', 'tower', 'cumulus'];
  const cloudKinds = CTYPES.map(type => { const c = cloudPuffs(type), f = cloudField(c); return { type, tex: [cloudLine(c, f), cloudSoft(c, f)] }; });
  const clouds = [];
  const CN = mobile ? 6 : 9;
  for (let i = 0; i < CN; i++) {
    const k = cloudKinds[(i * 5) % cloudKinds.length], far = k.type === 'wide';
    const w = (far ? crr(1300, 1800) : k.type === 'tower' ? crr(800, 1100) : k.type === 'cluster' ? crr(850, 1150) : crr(750, 1150));
    const pos = new THREE.Vector3(-2300 + (i + crr(.1, .9)) * 4600 / CN, far ? crr(330, 470) : crr(440, 760), far ? crr(-3600, -2800) : crr(-2700, -1100));
    const pair = k.tex.map((tex, j) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: j ? 0 : 1 })); sp.scale.set(w, w * .5, 1); sp.position.copy(pos); sp.renderOrder = -5 + j; scene.add(sp); return sp; });
    clouds.push({ pair, v: crr(3, 8), fade: 1 });
  }

  // ---------- 幾何工具 ----------
  const MATS = ['glass', 'stone', 'concrete', 'metal', 'dark', 'lamp', 'lampglass', 'column'];
  const parts = {}; MATS.forEach(k => parts[k] = []);
  const faceGeos = [[], []], edgeGeos = [[], []];
  let REG = 0;   // 0：大道附近；1：兩側外圍（鏡頭降低後被前排擋住，可以不畫）
  let bid = 0;
  function facadeU(g) {
    g.computeBoundingBox();
    const cx = (g.boundingBox.min.x + g.boundingBox.max.x) / 2, cz = (g.boundingBox.min.z + g.boundingBox.max.z) / 2;
    const P = g.attributes.position, Nn = g.attributes.normal, n = P.count, u = new Float32Array(n);
    for (let i = 0; i < n; i += 3) {
      const nx = Nn.getX(i) + Nn.getX(i + 1) + Nn.getX(i + 2), nz = Nn.getZ(i) + Nn.getZ(i + 1) + Nn.getZ(i + 2);
      const L = Math.hypot(nx, nz) || 1, ax = Math.abs(nx / L), az = Math.abs(nz / L);
      const axis = ax > .985 || az > .985;
      const tx = nz / L, tz = -nx / L;
      const v = [];
      for (let k = 0; k < 3; k++) {
        const x = P.getX(i + k), z = P.getZ(i + k);
        if (axis) v.push(x * tx + z * tz);
        else { const dx = x - cx, dz = z - cz; v.push(Math.atan2(dx, dz) * Math.hypot(dx, dz)); }
      }
      if (!axis) {
        const R = Math.hypot(P.getX(i) - cx, P.getZ(i) - cz) || 1, span = Math.PI * R;
        const mx = Math.max(...v), mn = Math.min(...v);
        if (mx - mn > span) for (let k = 0; k < 3; k++) if (v[k] < 0) v[k] += 2 * span;
      }
      u[i] = v[0]; u[i + 1] = v[1]; u[i + 2] = v[2];
    }
    g.setAttribute('aU', new THREE.BufferAttribute(u, 1));
  }
  function finish(g, flat) {
    if (g.index) g = g.toNonIndexed();
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (flat) g.computeVertexNormals();
    return g;
  }
  function stamp(g, b, m) {
    const n = g.attributes.position.count;
    g.setAttribute('aB', new THREE.BufferAttribute(new Float32Array(n).fill(b), 1));
    g.setAttribute('aM', new THREE.BufferAttribute(new Float32Array(n).fill(m), 1));
    return g;
  }
  function add(g, kind, b, hasMat, opts) {
    opts = opts || {};
    // 每棟建築微幅錯開幾公分，相鄰建築的立面就不會共平面而互相閃爍
    if (b.off === undefined) b.off = [(((b.id * 977) % 1) - .5) * .09, (b.id - .5) * .03, (((b.id * 613) % 1) - .5) * .09];
    g.translate(b.off[0], b.off[1], b.off[2]);
    const edges = new THREE.EdgesGeometry(g, opts.angle || 24);
    g = finish(g, !opts.smooth);
    facadeU(g);
    stamp(g, b.id, hasMat ? 1 : 0);
    faceGeos[REG].push(g);
    stamp(edges, b.id, hasMat ? 1 : 0);
    edgeGeos[REG].push(edges);
    if (hasMat) parts[kind].push(g);
  }
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return g; };
  function shapeChamfer(w, d, c) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + c, -d / 2); s.lineTo(w / 2 - c, -d / 2); s.lineTo(w / 2, -d / 2 + c); s.lineTo(w / 2, d / 2 - c);
    s.lineTo(w / 2 - c, d / 2); s.lineTo(-w / 2 + c, d / 2); s.lineTo(-w / 2, d / 2 - c); s.lineTo(-w / 2, -d / 2 + c); s.closePath();
    return s;
  }
  function shapeRound(w, d, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  function shapeSaw(w, d, n, k, s) {
    const sh = new THREE.Shape(), fx = -s * d / 2;
    sh.moveTo(s * d / 2, -w / 2); sh.lineTo(s * d / 2, w / 2);
    sh.lineTo(fx, w / 2);
    for (let i = 0; i < n; i++) { const z0 = w / 2 - i * w / n, z1 = z0 - w / n; sh.lineTo(fx - s * k, (z0 + z1) / 2 + w / n * .2); sh.lineTo(fx, z1); }
    sh.closePath(); return sh;
  }
  function prism(shape, h, x, y, z, seg) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: seg || 8 });
    g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g;
  }
  const cyl = (r, h, x, y, z, seg) => { const g = new THREE.CylinderGeometry(r, r, h, seg || 40, 1); g.translate(x, y + h / 2, z); return g; };
  function taper(w0, w1, d0, d1, h, x, y, z) {
    const g = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const top = p.getY(i) > 0; p.setX(i, p.getX(i) * (top ? w1 : w0)); p.setZ(i, p.getZ(i) * (top ? d1 : d0)); }
    g.scale(1, h, 1); g.translate(x, y + h / 2, z); return g;
  }
  // 斜屋頂：長 w 沿 x、寬 d 沿 z
  function gableRoof(w, d, h, x, y, z) {
    const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(x - w / 2, y, z);   // 屋脊沿 x（垂直街道）
    return g;
  }

  // ---------- 共用細部 ----------
  let detail = true;   // 遠方的建築不加屋頂設備，省幾何
  function roof(x, z, w, d, y, b, m) {
    if (!detail) return;
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const bw = rr(.18, .42) * w, bd = rr(.2, .45) * d, bx = x + rr(-.5, .5) * (w - bw), bz = z + rr(-.5, .5) * (d - bd);
      if (rnd() < .25) add(cyl(Math.min(bw, bd) * .35, rr(2, 3.6), bx, y, bz, 14), 'metal', b, m, { smooth: true });
      else add(box(bw, rr(1.8, 4.2), bd, bx, y, bz), rnd() < .5 ? 'concrete' : 'metal', b, m);
    }
  }
  function parapet(x, z, w, d, y, b, m) { add(box(w + .5, .9, d + .5, x, y, z), 'metal', b, m); }
  function frameCrown(x, z, w, d, y, h, b, m) {
    const t = .7;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => add(box(t, h, t, x + i * (w / 2 - t / 2), y, z + j * (d / 2 - t / 2)), 'metal', b, m));
    add(box(w, t, t, x, y + h - t, z - d / 2 + t / 2), 'metal', b, m); add(box(w, t, t, x, y + h - t, z + d / 2 - t / 2), 'metal', b, m);
    add(box(t, t, d, x - w / 2 + t / 2, y + h - t, z), 'metal', b, m); add(box(t, t, d, x + w / 2 - t / 2, y + h - t, z), 'metal', b, m);
  }
  function storefront(p, h, b, m) {
    if (!detail) { add(box(p.w, h, p.d, p.x, 0, p.z), 'stone', b, m); return h; }
    const ins = 1.4;
    add(box(p.w - ins * 2, h, p.d - ins * 2, p.x, 0, p.z), 'glass', b, m);
    return h;
  }

  // ---------- 建築樣式 ----------
  // p：中心 x,z；w 為 x 方向（垂直大道）的深度、d 為 z 方向（沿街）的面寬；高 h；臨街面朝 -s 方向的 x
  const STY = {
    podiumTower(p, b, m) {
      const ph = rr(12, 18), th = p.h;
      const g0 = storefront(p, 5.2, b, m);
      add(box(p.w, ph - g0, p.d, p.x, g0, p.z), 'stone', b, m);
      add(box(p.w + .8, .7, p.d + .8, p.x, ph, p.z), 'metal', b, m);
      const tw = p.w - rr(5, 8), td = p.d - rr(5, 8), c = rr(1.6, 3.4);
      add(prism(shapeChamfer(tw, td, c), th - ph, p.x, ph + .7, p.z), 'glass', b, m);
      const top = th + .7;
      if (rnd() < .5) frameCrown(p.x, p.z, tw - 1, td - 1, top, rr(6, 10), b, m);
      else { add(prism(shapeChamfer(tw - 3, td - 3, Math.max(c - 1, .6)), 5, p.x, top, p.z), 'metal', b, m); roof(p.x, p.z, tw - 4, td - 4, top + 5, b, m); }
      if (rnd() < .3) add(cyl(.35, rr(14, 26), p.x + rr(-2, 2), top, p.z + rr(-2, 2), 8), 'metal', b, m, { smooth: true });
    },
    deco(p, b, m) {
      const tiers = 3 + (rnd() < .5 ? 1 : 0); let y = 0, w = p.w, d = p.d;
      const g0 = storefront({ x: p.x, z: p.z, w, d, s: p.s }, 5.5, b, m); y = g0;
      for (let i = 0; i < tiers; i++) {
        const h = ((p.h - g0) * (i === 0 ? .5 : .5 / (tiers - 1)));
        add(box(w, h, d, p.x, y, p.z), 'stone', b, m);
        add(box(w + 1, .9, d + 1, p.x, y + h, p.z), 'stone', b, m);
        if (i === 0 && detail) [-1, 1].forEach(k => add(box(1.6, h, 1.6, p.x - p.s * (w / 2 - .5), y, p.z + k * (d / 2 - .5)), 'stone', b, m));
        y += h + .9; w *= .76; d *= .76;
      }
      add(box(w * .7, rr(4, 7), d * .7, p.x, y, p.z), 'stone', b, m);
      if (detail) add(cyl(.3, rr(10, 20), p.x, y, p.z, 8), 'metal', b, m, { smooth: true });
    },
    rounded(p, b, m) {
      const r = Math.min(p.w, p.d) * rr(.24, .42), g0 = 6;
      add(prism(shapeRound(p.w - 2.4, p.d - 2.4, Math.max(r - 1.2, .8)), g0, p.x, 0, p.z, 10), 'glass', b, m);
      add(prism(shapeRound(p.w, p.d, r), p.h - g0, p.x, g0, p.z, 10), 'glass', b, m);
      if (detail) { const step = rr(3.9 * 3, 3.9 * 4); for (let y = g0 + step; y < p.h - 6; y += step) add(prism(shapeRound(p.w + 1.2, p.d + 1.2, r + .6), .55, p.x, y, p.z, 10), 'metal', b, m); }
      add(prism(shapeRound(p.w + 1.2, p.d + 1.2, r + .6), .55, p.x, g0, p.z, 10), 'metal', b, m);
      add(prism(shapeRound(p.w - 4, p.d - 4, Math.max(r - 2, .6)), 4.5, p.x, p.h, p.z, 10), 'metal', b, m);
      roof(p.x, p.z, p.w * .5, p.d * .5, p.h + 4.5, b, m);
    },
    cylinder(p, b, m) {
      const ph = rr(9, 13), r = Math.min(p.w, p.d) * .44;
      storefront(p, 5, b, m);
      add(box(p.w, ph - 5, p.d, p.x, 5, p.z), 'stone', b, m);
      add(cyl(r, p.h - ph, p.x, ph, p.z), 'glass', b, m, { smooth: true });
      if (detail) for (let y = ph + 24; y < p.h - 8; y += 24) add(cyl(r + .5, .6, p.x, y, p.z), 'metal', b, m, { smooth: true });
      add(cyl(r * .78, 7, p.x, p.h, p.z), 'metal', b, m, { smooth: true });
    },
    fins(p, b, m) {
      const g0 = storefront(p, 5.5, b, m);
      add(box(p.w, p.h - g0, p.d, p.x, g0, p.z), 'concrete', b, m);
      if (detail) {
        const fx = p.x - p.s * (p.w / 2 + .45), n = Math.max(4, Math.floor(p.d / 3.1));
        for (let i = 0; i <= n; i++) add(box(.9, p.h - g0 + .6, .35, fx, g0, p.z - p.d / 2 + i * (p.d / n)), 'metal', b, m);
      }
      parapet(p.x, p.z, p.w, p.d, p.h, b, m);
      roof(p.x, p.z, p.w * .7, p.d * .7, p.h + .9, b, m);
    },
    cantilever(p, b, m) {
      const h1 = p.h * rr(.45, .6), h2 = p.h - h1, off = rr(3, 6);
      const g0 = storefront(p, 5, b, m);
      add(box(p.w, h1 - g0, p.d, p.x, g0, p.z), 'stone', b, m);
      const dz = rr(-1.5, 1.5);
      add(box(p.w + off, h2, p.d + 2, p.x - p.s * off / 2, h1, p.z + dz), 'glass', b, m);
      add(box(p.w + off + .6, .6, p.d + 2.6, p.x - p.s * off / 2, p.h, p.z + dz), 'metal', b, m);
      roof(p.x, p.z, p.w * .6, p.d * .6, p.h + .6, b, m);
    },
    retail(p, b, m) {
      const k = pick(['stone', 'concrete']);
      const g0 = storefront(p, 5, b, m);
      add(box(p.w, p.h - g0, p.d, p.x, g0, p.z), k, b, m);
      add(box(p.w + .3, .8, p.d + .3, p.x, g0, p.z), 'metal', b, m);
      parapet(p.x, p.z, p.w, p.d, p.h, b, m);
      if (detail && rnd() < .5) add(box(1.6, 5, .35, p.x - p.s * (p.w / 2 + .9), 7, p.z + p.d * .36), 'dark', b, m);
      roof(p.x, p.z, p.w * .8, p.d * .7, p.h + .9, b, m);
    },
    taper(p, b, m) {
      const ph = rr(10, 15);
      storefront(p, 5, b, m);
      add(box(p.w, ph - 5, p.d, p.x, 5, p.z), 'stone', b, m);
      const w0 = p.w - 5, d0 = p.d - 5, k = rr(.62, .78);
      add(taper(w0, w0 * k, d0, d0 * k, p.h - ph, p.x, ph, p.z), 'glass', b, m);
      add(taper(w0 * k, w0 * k * .55, d0 * k, d0 * k * .55, rr(6, 10), p.x, p.h, p.z), 'metal', b, m);
    },
    twin(p, b, m) {
      const ph = rr(12, 16);
      storefront(p, 5.5, b, m);
      add(box(p.w, ph - 5.5, p.d, p.x, 5.5, p.z), 'stone', b, m);
      const tw = p.d * .36, gap = p.d * .14;
      const zA = p.z - (tw + gap) / 2, zB = p.z + (tw + gap) / 2, hB = p.h * rr(.78, .9);
      add(prism(shapeChamfer(p.w - 6, tw, 1.5), p.h - ph, p.x, ph, zA), 'glass', b, m);
      add(prism(shapeChamfer(p.w - 6, tw, 1.5), hB - ph, p.x, ph, zB), 'glass', b, m);
      add(box(p.w * .36, 4, gap + 2, p.x, hB * .62, p.z), 'metal', b, m);
      frameCrown(p.x, zA, p.w - 7, tw - 1, p.h, 6, b, m);
    },
    arcade(p, b, m) {
      const ch = 7.5, inset = 3.2, fx = p.x - p.s * (p.w / 2 - .6);
      add(box(p.w, p.h - ch, p.d, p.x, ch, p.z), 'stone', b, m);
      add(box(p.w - inset, ch, p.d - 1, p.x + p.s * inset * .5, 0, p.z), 'glass', b, m);
      const n = Math.max(3, Math.floor(p.d / 5));
      for (let i = 0; i <= n; i++) add(cyl(.5, ch, fx, 0, p.z - p.d / 2 + .6 + i * ((p.d - 1.2) / n), 12), 'column', b, m, { smooth: true });
      add(box(p.w + .8, 1, p.d + .8, p.x, p.h, p.z), 'stone', b, m);
      roof(p.x, p.z, p.w * .7, p.d * .7, p.h + 1, b, m);
    },
    stepped(p, b, m) {
      const g0 = storefront(p, 5.5, b, m);
      let y = g0, w = p.w, d = p.d, x = p.x, z = p.z;
      [.48, .3, .22].forEach((f, i) => {
        const h = (p.h - g0) * f;
        add(box(w, h, d, x, y, z), i === 0 ? 'stone' : 'glass', b, m);
        add(box(w + .6, .6, d + .6, x, y + h, z), 'metal', b, m);
        y += h + .6;
        const nw = w * rr(.68, .8), nd = d * rr(.7, .85);
        z += (i % 2 ? 1 : -1) * (d - nd) * .4; x += p.s * (w - nw) * .4; w = nw; d = nd;
      });
      roof(x, z, w * .8, d * .8, y, b, m);
    },
    lshape(p, b, m) {
      const g0 = storefront(p, 5, b, m), lowH = Math.min(p.h * .5, rr(14, 22));
      add(box(p.w, lowH - g0, p.d, p.x, g0, p.z), 'concrete', b, m);
      parapet(p.x, p.z, p.w, p.d, lowH, b, m);
      const sd = p.d * rr(.34, .44), sz = p.z + (rnd() < .5 ? -1 : 1) * (p.d - sd) / 2;
      add(box(p.w * .8, p.h - lowH, sd, p.x + p.s * p.w * .1, lowH, sz), 'glass', b, m);
      add(box(p.w * .8 + .6, 1.2, sd + .6, p.x + p.s * p.w * .1, p.h, sz), 'metal', b, m);
    },
    notched(p, b, m) {
      const g0 = storefront(p, 5.5, b, m), gap = rr(2.4, 3.6), hd = (p.d - gap) / 2;
      add(box(p.w, p.h - g0, hd, p.x, g0, p.z - (gap + hd) / 2), 'glass', b, m);
      add(box(p.w, p.h - g0, hd, p.x, g0, p.z + (gap + hd) / 2), 'glass', b, m);
      add(box(p.w - 4, p.h - g0, gap + .2, p.x + p.s * 2, g0, p.z), 'dark', b, m);
      frameCrown(p.x, p.z, p.w, p.d, p.h, rr(5, 8), b, m);
    },
    saw(p, b, m) {
      const g0 = storefront(p, 5, b, m), n = Math.max(3, Math.round(p.d / 6));
      add(prism(shapeSaw(p.d, p.w, n, 2.2, p.s), p.h - g0, p.x, g0, p.z, 1), 'glass', b, m);
      parapet(p.x + p.s * 1, p.z, p.w - 2, p.d, p.h, b, m);
    },
    // 飯店塔：裙樓＋偏一側的細長塔
    hotel(p, b, m) {
      const ph = rr(14, 20);
      storefront(p, 5.5, b, m);
      add(box(p.w, ph - 5.5, p.d, p.x, 5.5, p.z), 'stone', b, m);
      const td = p.d * .42, tw = p.w * .62, tz = p.z + (rnd() < .5 ? -1 : 1) * (p.d - td) / 2 * .8, tx = p.x + p.s * (p.w - tw) / 2 * .8;
      add(box(tw, p.h - ph, td, tx, ph, tz), 'concrete', b, m);
      add(box(tw + 1.2, 1, td + 1.2, tx, p.h * .7, tz), 'metal', b, m);
      frameCrown(tx, tz, tw, td, p.h, rr(4, 7), b, m);
    },
    octa(p, b, m) {
      const g0 = storefront(p, 5.5, b, m), w = Math.min(p.w, p.d);
      add(prism(shapeChamfer(w, w, w * .29), p.h - g0, p.x, g0, p.z), 'glass', b, m);
      add(prism(shapeChamfer(w * .72, w * .72, w * .2), rr(5, 9), p.x, p.h, p.z), 'metal', b, m);
    },
    // 退台：朝大道一側逐層退縮
    terrace(p, b, m) {
      const g0 = storefront(p, 5, b, m), n = 4; let y = g0, wx = p.w, x = p.x;
      for (let i = 0; i < n; i++) {
        const h = (p.h - g0) / n;
        add(box(wx, h, p.d, x, y, p.z), i % 2 ? 'concrete' : 'stone', b, m);
        if (detail && i < n - 1) add(box(.3, .9, p.d, x - p.s * (wx / 2 - .15), y + h, p.z), 'metal', b, m);
        y += h; const nw = wx * .8; x += p.s * (wx - nw) / 2; wx = nw;
      }
    },
    // 連棟街屋：窄面寬、高低不一的一排
    rowhouses(p, b, m) {
      let z = p.z - p.d / 2;
      while (z < p.z + p.d / 2 - 3) {
        const w = Math.min(rr(4.5, 7.5), p.z + p.d / 2 - z), h = rr(10, 22);
        const kind = pick(['stone', 'concrete']);
        add(box(p.w, h, w - .2, p.x, 0, z + w / 2), kind, b, m);
        if (detail) { add(box(1.2, .45, w - .8, p.x - p.s * (p.w / 2 + .6), 4.2, z + w / 2), 'metal', b, m); if (rnd() < .5) add(gableRoof(p.w, w - .2, rr(2, 3.5), p.x, h, z + w / 2), 'dark', b, m); }
        z += w;
      }
    },
    slab(p, b, m) {
      const g0 = storefront(p, 5, b, m);
      add(box(p.w * .55, p.h - g0, p.d, p.x + p.s * p.w * .225, g0, p.z), 'concrete', b, m);
      add(box(p.w * .45, p.h * .3, p.d, p.x - p.s * p.w * .275, g0, p.z), 'glass', b, m);
      parapet(p.x + p.s * p.w * .225, p.z, p.w * .55, p.d, p.h, b, m);
      roof(p.x + p.s * p.w * .225, p.z, p.w * .4, p.d * .7, p.h + .9, b, m);
    },
    simple(p, b, m) {
      const r = rnd();
      if (r < .45) { add(box(p.w, p.h, p.d, p.x, 0, p.z), 'concrete', b, m); if (p.h > 30) add(box(p.w * .6, rr(3, 6), p.d * .6, p.x, p.h, p.z), 'concrete', b, m); }
      else if (r < .7) add(taper(p.w, p.w * .82, p.d, p.d * .82, p.h, p.x, 0, p.z), 'glass', b, m);
      else { add(box(p.w, p.h * .6, p.d, p.x, 0, p.z), 'stone', b, m); add(box(p.w * .7, p.h * .4, p.d * .7, p.x, p.h * .6, p.z), 'glass', b, m); }
    }
  };
  // 中庭型：口字形量體，中間挖空
  STY.courtyard = function (p, b, m) {
    const t = Math.min(p.w, p.d) * .32;
    add(box(t, p.h, p.d, p.x - p.s * (p.w / 2 - t / 2), 0, p.z), 'stone', b, m);
    add(box(t, p.h * rr(.7, .9), p.d, p.x + p.s * (p.w / 2 - t / 2), 0, p.z), 'stone', b, m);
    add(box(p.w - 2 * t, p.h * rr(.8, 1), t, p.x, 0, p.z - p.d / 2 + t / 2), 'concrete', b, m);
    add(box(p.w - 2 * t, p.h * rr(.6, .9), t, p.x, 0, p.z + p.d / 2 - t / 2), 'concrete', b, m);
  };


  // ---------- 第八版新增樣式（共 11 種）----------
  Object.assign(STY, {
    // 外露結構框架的玻璃塔
    exoframe(p, b, m) {
      const g0 = storefront(p, 6, b, m), w = p.w - 2, d = p.d - 2;
      add(box(w, p.h - g0, d, p.x, g0, p.z), 'glass', b, m);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => add(box(1.1, p.h + 1, 1.1, p.x + i * w / 2, 0, p.z + j * d / 2), 'metal', b, m));
      if (detail) for (let y = g0 + 15; y < p.h - 4; y += 15.6) add(box(w + 1.2, .8, d + 1.2, p.x, y, p.z), 'metal', b, m);
      add(box(w + 1.2, 1, d + 1.2, p.x, p.h, p.z), 'metal', b, m);
      roof(p.x, p.z, w * .6, d * .6, p.h + 1, b, m);
    },
    // 扭轉塔：每段樓板繞中心多轉幾度
    twist(p, b, m) {
      const ph = rr(8, 12), side = Math.min(p.w, p.d) * .74;
      storefront(p, 5.5, b, m);
      add(box(p.w, ph - 5.5, p.d, p.x, 5.5, p.z), 'stone', b, m);
      const n = Math.max(4, Math.round((p.h - ph) / 7.8)), sh = (p.h - ph) / n, th = rr(.05, .08) * (rnd() < .5 ? -1 : 1);
      for (let i = 0; i < n; i++) {
        const g = new THREE.BoxGeometry(side, sh, side); g.rotateY(i * th); g.translate(p.x, ph + i * sh + sh / 2, p.z);
        add(g, 'glass', b, m);
        if (detail && i) { const r = new THREE.BoxGeometry(side + .8, .45, side + .8); r.rotateY(i * th); r.translate(p.x, ph + i * sh + .22, p.z); add(r, 'metal', b, m); }
      }
    },
    // 尖頂塔：方塔頂上收成金字塔尖，再立一根天線
    spire(p, b, m) {
      const g0 = storefront(p, 5.5, b, m), w = p.w - 3, d = p.d - 3, sh = Math.min(w, d) * rr(.8, 1.2);
      add(box(p.w, rr(10, 14) - g0, p.d, p.x, g0, p.z), 'stone', b, m);
      add(prism(shapeChamfer(w, d, 1.2), p.h - sh - 12, p.x, 12, p.z), 'concrete', b, m);
      add(taper(w, .6, d, .6, sh, p.x, p.h - sh, p.z), 'metal', b, m);
      if (detail) add(cyl(.22, rr(8, 16), p.x, p.h, p.z, 6), 'metal', b, m, { smooth: true });
    },
    // 斜頂：屋頂沿街面一端高一端低
    wedge(p, b, m) {
      const g0 = storefront(p, 5, b, m), hi = p.h, lo = p.h * rr(.45, .65), flip = rnd() < .5;
      const s = new THREE.Shape(); s.moveTo(-p.d / 2, 0); s.lineTo(p.d / 2, 0); s.lineTo(p.d / 2, (flip ? hi : lo) - g0); s.lineTo(-p.d / 2, (flip ? lo : hi) - g0); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: p.w, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(p.x - p.w / 2, g0, p.z);
      add(g, 'glass', b, m);
      if (detail) [-1, 1].forEach(k => add(box(p.w + .6, 1, .8, p.x, g0 - 1, p.z + k * p.d / 2), 'metal', b, m));
    },
    // 門形：兩座塔頂端以一段量體相連
    gate(p, b, m) {
      const tw = p.d * .32, hB = p.h * rr(.2, .3);
      [-1, 1].forEach(k => { storefront({ x: p.x, z: p.z + k * (p.d - tw) / 2, w: p.w, d: tw, s: p.s }, 5.5, b, m); add(box(p.w, p.h - 5.5, tw, p.x, 5.5, p.z + k * (p.d - tw) / 2), 'concrete', b, m); });
      add(box(p.w, hB, p.d - tw * 2 + .4, p.x, p.h - hB, p.z), 'glass', b, m);
      add(box(p.w + .8, .9, p.d + .8, p.x, p.h, p.z), 'metal', b, m);
      roof(p.x, p.z, p.w * .6, p.d * .7, p.h + .9, b, m);
    },
    // 疊盒：一層層錯開堆疊（每層至少六成壓在下層上）
    stack(p, b, m) {
      const g0 = storefront(p, 5, b, m), n = Math.max(3, Math.min(6, Math.round((p.h - g0) / 12))), hh = (p.h - g0) / n;
      let y = g0, ox = 0, oz = 0;
      const bw = p.w * .78, bd = p.d * .78;
      for (let i = 0; i < n; i++) {
        add(box(bw, hh, bd, p.x + ox, y, p.z + oz), i % 2 ? 'concrete' : 'glass', b, m);
        y += hh;
        if (i % 2) ox = p.s * rr(-1, 1) * p.w * .11; else oz = rr(-1, 1) * p.d * .11;
      }
      roof(p.x + ox, p.z + oz, bw * .6, bd * .6, y, b, m);
    },
    // 古典：基座、立柱、簷部、山牆
    classic(p, b, m) {
      const base = 1.6, ch = Math.min(p.h * .55, rr(9, 13)), fx = p.x - p.s * (p.w / 2 - 1.2), body = Math.max(ch + 3, Math.min(p.h, 22));
      add(box(p.w + 1, base, p.d + 1, p.x, 0, p.z), 'stone', b, m);
      add(box(p.w - 4, body - base, p.d - 2, p.x + p.s * 1.6, base, p.z), 'stone', b, m);
      const n = Math.max(4, Math.floor(p.d / 3.6));
      for (let i = 0; i <= n; i++) add(cyl(.55, ch, fx, base, p.z - p.d / 2 + 1 + i * ((p.d - 2) / n), 12), 'column', b, m, { smooth: true });
      add(box(p.w, 1.6, p.d, p.x, base + ch, p.z), 'stone', b, m);
      if (base + ch + 1.6 < body) add(box(p.w - 4, body - base - ch - 1.6, p.d - 2, p.x + p.s * 1.6, base + ch + 1.6, p.z), 'stone', b, m);
      const s = new THREE.Shape(); s.moveTo(-p.d / 2, 0); s.lineTo(p.d / 2, 0); s.lineTo(0, rr(2.5, 4)); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: p.w, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(p.x - p.w / 2, Math.max(body, base + ch + 1.6), p.z);
      add(g, 'dark', b, m);
    },
    // 圓頂：方形裙樓上的鼓座與半球頂
    dome(p, b, m) {
      const ph = rr(8, 12), r = Math.min(p.w, p.d) * .34, dh = rr(4, 7);
      storefront(p, 5, b, m);
      add(box(p.w, ph - 5, p.d, p.x, 5, p.z), 'stone', b, m);
      add(box(p.w + .6, .8, p.d + .6, p.x, ph, p.z), 'stone', b, m);
      add(cyl(r, dh, p.x, ph + .8, p.z, 32), 'stone', b, m, { smooth: true });
      const s = new THREE.SphereGeometry(r * .96, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); s.translate(p.x, ph + .8 + dh, p.z);
      add(s, 'metal', b, m, { smooth: true });
      if (detail) add(cyl(.5, 2.4, p.x, ph + .8 + dh + r * .94, p.z, 10), 'metal', b, m, { smooth: true });
    },
    // 束筒：四根高低不一的方塔綁在一起
    bundled(p, b, m) {
      const g0 = storefront(p, 6, b, m), hw = p.w / 2 - .6, hd = p.d / 2 - .6;
      const hs = [1, rr(.62, .8), rr(.78, .92), rr(.45, .6)].sort(() => rnd() - .5);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j], k) => {
        const h = Math.max(g0 + 6, p.h * hs[k]), x = p.x + i * hw / 2, z = p.z + j * hd / 2;
        add(box(hw, h - g0, hd, x, g0, z), 'glass', b, m);
        add(box(hw + .4, .8, hd + .4, x, h, z), 'metal', b, m);
      });
    },
    // 老倉庫改建：連續斜屋頂、磚造厚牆
    loft(p, b, m) {
      const h = Math.min(p.h, rr(10, 18)), n = Math.max(2, Math.round(p.d / 9)), wd = p.d / n;
      add(box(p.w, h, p.d, p.x, 0, p.z), 'stone', b, m);
      for (let i = 0; i < n; i++) add(gableRoof(p.w, wd, rr(2.2, 3.2), p.x, h, p.z - p.d / 2 + wd * (i + .5)), 'dark', b, m);
      if (detail) { add(box(p.w + .3, .5, p.d + .3, p.x, 4.6, p.z), 'metal', b, m); if (rnd() < .6) add(cyl(.9, h + rr(5, 9), p.x + p.s * p.w * .3, 0, p.z + p.d * .38, 12), 'concrete', b, m, { smooth: true }); }
    },
    // 住宅：臨街面每層一道陽台板
    balcony(p, b, m) {
      const g0 = storefront(p, 4.5, b, m), fh = 3.3;
      add(box(p.w - 1.6, p.h - g0, p.d, p.x + p.s * .8, g0, p.z), 'concrete', b, m);
      if (detail) for (let y = g0 + fh; y < p.h - 1; y += fh) {
        add(box(1.8, .28, p.d - 1.4, p.x - p.s * (p.w / 2 - 1.7), y, p.z), 'concrete', b, m);
        add(box(.12, 1, p.d - 1.4, p.x - p.s * (p.w / 2 - .86), y + .28, p.z), 'metal', b, m);
      }
      parapet(p.x + p.s * .8, p.z, p.w - 1.6, p.d, p.h, b, m);
      roof(p.x + p.s * .8, p.z, p.w * .6, p.d * .7, p.h + .9, b, m);
    }
  });

  // ---------- B9 新增樣式（共 17 種）----------
  // 平面多邊形：pts 為 [x, z]（相對建築中心），交給 prism 往上擠出
  function polyShape(pts) { const s = new THREE.Shape(); pts.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); s.closePath(); return s; }
  // 把多邊形往外放大 e 公尺（近似：依外框比例縮放），做線腳與壓頂
  const growPts = (pts, w, d, e) => pts.map(([x, z]) => [x * (w + 2 * e) / w, z * (d + 2 * e) / d]);
  // 頂面不平的盒子：top(lx, lz) 回傳該角的高度（相對底部）
  function slopeBox(w, d, x, y, z, top) {
    const g = new THREE.BoxGeometry(w, 1, d), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) P.setY(i, P.getY(i) > 0 ? top(P.getX(i), P.getZ(i)) : 0);
    g.translate(x, y, z); return g;
  }
  Object.assign(STY, {
    // 轉角建築：靠路口那一端做成大圓角，轉角頂上一座圓亭
    corner(p, b, m) {
      const s = p.s, e = p.end || 1, r = Math.min(p.w, p.d) * rr(.36, .46), g0 = 5.2;
      const P = (w, d, rad) => {
        const fx = -s * w / 2, bx = s * w / 2, ez = e * d / 2, cx = fx + s * rad, cz = ez - e * rad, pts = [[bx, ez]];
        for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 * (1 - i / 12); pts.push([cx - s * rad * Math.cos(a), cz + e * rad * Math.sin(a)]); }
        pts.push([fx, -ez], [bx, -ez]); return polyShape(pts);
      };
      add(prism(P(p.w - 2.8, p.d - 2.8, Math.max(r - 1.4, 1)), g0, p.x, 0, p.z, 1), 'glass', b, m);
      add(prism(P(p.w, p.d, r), p.h - g0, p.x, g0, p.z, 1), 'stone', b, m);
      add(prism(P(p.w + .8, p.d + .8, r + .4), .8, p.x, g0, p.z, 1), 'metal', b, m);
      if (detail) for (let y = g0 + 11.7; y < p.h - 4; y += 11.7) add(prism(P(p.w + .5, p.d + .5, r + .25), .45, p.x, y, p.z, 1), 'stone', b, m);
      add(prism(P(p.w + 1, p.d + 1, r + .5), .9, p.x, p.h, p.z, 1), 'metal', b, m);
      const cx = p.x - s * (p.w / 2 - r), cz = p.z + e * (p.d / 2 - r), tr = r * .62, th = rr(4.5, 7);
      add(cyl(tr, th, cx, p.h + .9, cz, 24), 'glass', b, m, { smooth: true });
      add(cyl(tr + .4, .5, cx, p.h + .9 + th, cz, 24), 'metal', b, m, { smooth: true });
      const dm = new THREE.SphereGeometry(tr + .2, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2); dm.scale(1, .55, 1); dm.translate(cx, p.h + 1.4 + th, cz);
      add(dm, 'metal', b, m, { smooth: true });
      roof(p.x + s * p.w * .2, p.z - e * p.d * .2, p.w * .4, p.d * .4, p.h + .9, b, m);
    },
    // 弧形立面：臨街面往大道鼓出一道弧，每層一片白色樓板
    curved(p, b, m) {
      const s = p.s, k = Math.min(p.w * .28, rr(3.5, 6)), g0 = 5.5, fh = rr(3.6, 4.2);
      const P = (e) => {
        const W = p.w / 2 + e, D = p.d / 2 + e, pts = [[s * W, -D], [s * W, D]];
        for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([-s * (W - k + k * Math.sin(Math.PI * t)), D - 2 * D * t]); }
        return polyShape(pts);
      };
      add(prism(P(-1.4), g0, p.x, 0, p.z, 1), 'glass', b, m);
      add(prism(P(0), p.h - g0, p.x, g0, p.z, 1), 'glass', b, m);
      add(prism(P(.7), .45, p.x, g0, p.z, 1), 'metal', b, m);
      if (detail) for (let y = g0 + fh; y < p.h - 2; y += fh) add(prism(P(.55), .32, p.x, y, p.z, 1), 'concrete', b, m);
      add(prism(P(.7), 1, p.x, p.h, p.z, 1), 'metal', b, m);
      roof(p.x + s * p.w * .15, p.z, p.w * .5, p.d * .6, p.h + 1, b, m);
    },
    // 退縮式頂樓：實心主體，頂上退後一段的玻璃頂樓，前面留露台與格柵棚架
    penthouse(p, b, m) {
      const s = p.s, g0 = storefront(p, 5, b, m), body = p.h - 4.6, back = rr(5, 7.5);
      add(box(p.w, body - g0, p.d, p.x, g0, p.z), pick(['stone', 'concrete']), b, m);
      add(box(p.w + .5, .9, p.d + .5, p.x, body, p.z), 'metal', b, m);
      const pw = p.w - back - 1, px = p.x + s * (back + 1) / 2, top = body + .9;
      add(box(pw, 3.8, p.d - 3, px, top, p.z), 'glass', b, m);
      add(box(pw + 1.2, .45, p.d - 1.8, px, top + 3.8, p.z), 'metal', b, m);
      if (detail) {
        const fx = p.x - s * (p.w / 2 - .6);
        [-1, 1].forEach(k => add(box(.3, 3.4, .3, fx, top, p.z + k * (p.d / 2 - 1.6)), 'metal', b, m));
        add(box(.32, .32, p.d - 3, fx, top + 3.4, p.z), 'metal', b, m);
        for (let z = -p.d / 2 + 1.8; z < p.d / 2 - 1.6; z += 1.1) add(box(back + .6, .16, .12, p.x - s * (p.w / 2 - .6 - back / 2), top + 3.72, p.z + z), 'metal', b, m);
        add(box(.08, 1.1, p.d - .6, p.x - s * (p.w / 2 - .25), top, p.z), 'lampglass', b, m);   // 玻璃欄杆
      }
    },
    // 騎樓街屋：一排窄面寬的店屋，一樓退成騎樓，樓上外推窗台、直立招牌、頂樓加蓋
    qilou(p, b, m) {
      const s = p.s, arc = 3.6, g = 4.2, fx = p.x - s * p.w / 2;
      let z = p.z - p.d / 2;
      while (z < p.z + p.d / 2 - 3) {
        const uw = Math.min(rr(4.2, 6.5), p.z + p.d / 2 - z), zc = z + uw / 2, fl = 3 + Math.floor(rnd() * 3), h = g + fl * 3.3;
        add(box(p.w - arc, g, uw - .2, p.x + s * arc / 2, 0, zc), 'glass', b, m);
        add(box(p.w, h - g, uw - .2, p.x, g, zc), pick(['stone', 'concrete', 'stone']), b, m);
        add(box(.7, g, .7, fx + s * .35, 0, z + .4), 'stone', b, m);
        if (detail) {
          for (let f = 0; f < fl; f++) add(box(.55, 1.7, uw - 1.6, fx - s * .27, g + f * 3.3 + .9, zc), 'metal', b, m);
          if (rnd() < .6) add(box(.9, rr(3, 6.5), .2, fx - s * .5, g + rr(.4, 1.6), z + .55), 'dark', b, m);
          if (rnd() < .45) { add(box(p.w * .55, 2.4, uw - .8, p.x + s * p.w * .2, h, zc), 'metal', b, m); add(gableRoof(p.w * .6, uw - .4, 1.2, p.x + s * p.w * .2, h + 2.4, zc), 'dark', b, m); }
          else add(box(p.w + .2, .8, uw, p.x, h, zc), 'stone', b, m);
        }
        z += uw;
      }
      add(box(.7, g, .7, fx + s * .35, 0, z - .4), 'stone', b, m);
    },
    // 老公寓：四、五層樓，每扇窗外一個鐵窗、冷氣機，頂樓鐵皮加蓋與水塔
    oldApt(p, b, m) {
      const s = p.s, fl = 4 + Math.floor(rnd() * 2), fh = 3.2, g = 3.8, h = g + fl * fh, fx = p.x - s * p.w / 2;
      storefront(p, g, b, m);
      add(box(p.w, h - g, p.d, p.x, g, p.z), 'concrete', b, m);
      add(box(p.w + .2, 1, p.d + .2, p.x, h, p.z), 'concrete', b, m);
      if (detail) {
        add(box(1.6, .14, p.d, fx - s * .8, g - .5, p.z), 'metal', b, m);   // 雨遮
        const bays = Math.max(2, Math.round(p.d / 4)), bw = p.d / bays;
        for (let f = 0; f < fl; f++) for (let i = 0; i < bays; i++) {
          const zc = p.z - p.d / 2 + bw * (i + .5), y = g + f * fh + .7;
          if (rnd() < .78) add(box(.6, 1.9, bw - 1.1, fx - s * .3, y, zc), 'metal', b, m);
          if (rnd() < .3) add(box(.5, .45, .8, fx - s * .25, y - .6, zc + bw * .3), 'metal', b, m);
        }
        const sw = p.w * rr(.45, .65), sx = p.x + s * (p.w - sw) / 2, sd = p.d * rr(.5, .8);
        add(box(sw, 2.5, sd, sx, h + 1, p.z), 'metal', b, m);
        add(slopeBox(sw + .6, sd + .6, sx, h + 3.5, p.z, (lx) => .15 + (lx * s / (sw + .6) + .5) * .7), 'dark', b, m);
        [0, 1].forEach(i => add(cyl(.75, 1.5, p.x - s * p.w * .28, h + 1, p.z + p.d * .3 - i * 1.8, 12), 'metal', b, m, { smooth: true }));
      }
    },
    // 玻璃帷幕：頂部沿對角線斜切，臨街面整片直向鋁擠型
    curtain(p, b, m) {
      const s = p.s, g0 = storefront(p, 6, b, m), body = p.h - g0, cut = Math.min(p.h * .24, rr(10, 18)), dir = rnd() < .5 ? 1 : -1;
      const top = (lx, lz) => body - cut * ((lz * dir / p.d + .5) * .65 + (lx * s / p.w + .5) * .35);
      add(slopeBox(p.w, p.d, p.x, g0, p.z, top), 'glass', b, m);
      if (detail) for (let z = -p.d / 2 + 1.2; z < p.d / 2 - .6; z += 2.4) add(box(.4, top(-s * p.w / 2, z) - .2, .22, p.x - s * (p.w / 2 + .2), g0, p.z + z), 'metal', b, m);
    },
    // 波浪陽台：每層樓板的前緣是一道波，逐層錯相位
    wave(p, b, m) {
      const s = p.s, g0 = storefront(p, 5, b, m), fh = 3.5, amp = rr(1.2, 1.9), ph0 = rnd() * 6, lam = p.d / rr(1, 1.8);
      add(box(p.w - 2.5, p.h - g0, p.d - 1, p.x + s * 1.25, g0, p.z), 'glass', b, m);
      const slab = (f) => {
        const D = p.d / 2 - .5, pts = [[-s * (p.w / 2 - 6), D], [-s * (p.w / 2 - 6), -D]];
        for (let i = 0; i <= 20; i++) { const z = -D + 2 * D * i / 20; pts.push([-s * (p.w / 2 - 2.1 + amp * (.5 + .5 * Math.sin(z / lam * Math.PI * 2 + ph0 + f * .5))), z]); }
        return polyShape(pts);
      };
      if (detail) { let f = 0; for (let y = g0 + fh; y < p.h - 1; y += fh) add(prism(slab(f++), .3, p.x, y, p.z, 1), 'concrete', b, m); }
      add(box(p.w - 1.5, 1, p.d, p.x + s * .75, p.h, p.z), 'concrete', b, m);
      roof(p.x + s * 2, p.z, p.w * .5, p.d * .6, p.h + 1, b, m);
    },
    // 像素堆疊：方塊一格格往上疊，前排低、後排高
    pixel(p, b, m) {
      const c = 6.5, nx = Math.max(2, Math.floor(p.w / c)), nz = Math.max(2, Math.floor(p.d / c)), cw = p.w / nx, cd = p.d / nz, lv = Math.max(2, Math.round(p.h / c));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const k = Math.max(1, Math.round(lv * Math.min(1, (.3 + .7 * (i + .5) / nx) * rr(.7, 1.3))));
        const x = p.x - p.s * (p.w / 2 - cw * (i + .5)), z = p.z - p.d / 2 + cd * (j + .5);
        for (let l = 0; l < k; l++) add(box(cw - .3, c, cd - .3, x, l * c, z), (i + j + l) % 3 ? 'glass' : 'concrete', b, m);
      }
    },
    // 梭形塔：平面兩端收尖，像一片葉子
    lens(p, b, m) {
      const a = p.w / 2, c = p.d / 2 + 2, g0 = 6;
      const P = (e) => { const pts = []; for (let i = 0; i <= 16; i++) { const z = c * (1 - 2 * i / 16); pts.push([(a + e) * (1 - (z / c) ** 2), z]); } for (let i = 1; i < 16; i++) { const z = -c * (1 - 2 * i / 16); pts.push([-(a + e) * (1 - (z / c) ** 2), z]); } return polyShape(pts); };
      add(prism(P(-1.5), g0, p.x, 0, p.z, 1), 'glass', b, m);
      add(prism(P(0), p.h - g0, p.x, g0, p.z, 1), 'glass', b, m);
      if (detail) for (let y = g0; y < p.h - 6; y += 15.6) add(prism(P(.5), .6, p.x, y, p.z, 1), 'metal', b, m);
      add(prism(P(-a * .3), rr(5, 8), p.x, p.h, p.z, 1), 'metal', b, m);
      if (detail) add(cyl(.25, rr(10, 18), p.x, p.h, p.z, 6), 'metal', b, m, { smooth: true });
    },
    // 十字形塔：兩道交叉的量體，高低不一
    crossPlan(p, b, m) {
      const g0 = storefront(p, 5.5, b, m), aw = Math.min(p.w, p.d) * .4, h2 = p.h * rr(.62, .8);
      add(box(aw, p.h - g0, p.d, p.x, g0, p.z), 'glass', b, m);
      add(box(p.w, h2 - g0, aw, p.x, g0, p.z), 'stone', b, m);
      add(box(p.w + .6, .8, aw + .6, p.x, h2, p.z), 'metal', b, m);
      add(box(aw + .8, 1, p.d + .8, p.x, p.h, p.z), 'metal', b, m);
      if (detail) [-1, 1].forEach(k => add(box(aw * .5, p.h - g0 + 3, .5, p.x, g0, p.z + k * (p.d / 2 + .25)), 'metal', b, m));
      roof(p.x, p.z, aw * .7, p.d * .4, p.h + 1, b, m);
    },
    // 六角塔：石材與玻璃交替的分段
    hexa(p, b, m) {
      const r = Math.min(p.w, p.d) * .52, g0 = 6;
      const hex = (R, h, y) => { const g = new THREE.CylinderGeometry(R, R, h, 6, 1); g.rotateY(Math.PI / 6); g.translate(p.x, y + h / 2, p.z); return g; };
      add(hex(r - 1.4, g0, 0), 'glass', b, m);
      let y = g0, i = 0; const seg = rr(14, 20);
      while (y < p.h - 3) { const h = Math.min(seg, p.h - y); add(hex(r, h, y), i % 2 ? 'stone' : 'glass', b, m); if (detail || y + h >= p.h - 3) add(hex(r + .5, .6, y + h - .3), 'metal', b, m); y += h; i++; }
      add(hex(r * .7, 4, y + .3), 'metal', b, m); add(hex(r * .4, 3, y + 4.3), 'metal', b, m);
    },
    // 熨斗形：靠路口一端收成鈍角，平面是梯形
    triangle(p, b, m) {
      const s = p.s, e = p.end || 1, fx = -s * p.w / 2, bx = s * p.w / 2, D = p.d / 2, g0 = 5;
      const pts = [[fx, -e * D], [fx, e * (D - 1.4)], [fx + s * 1.2, e * D], [bx, e * (D - p.d * .55)], [bx, -e * D]];
      add(prism(polyShape(growPts(pts, p.w, p.d, -1.4)), g0, p.x, 0, p.z, 1), 'glass', b, m);
      add(prism(polyShape(pts), p.h - g0, p.x, g0, p.z, 1), 'stone', b, m);
      const band = polyShape(growPts(pts, p.w, p.d, .5));
      if (detail) for (let y = g0; y < p.h - 4; y += 10.4) add(prism(band, .5, p.x, y, p.z, 1), 'stone', b, m);
      add(prism(polyShape(growPts(pts, p.w, p.d, .8)), 1.2, p.x, p.h, p.z, 1), 'stone', b, m);
      roof(p.x + s * 2, p.z - e * p.d * .15, p.w * .4, p.d * .4, p.h + 1.2, b, m);
    },
    // 水平百葉：厚框包住臨街面，框內一道道橫向百葉
    louver(p, b, m) {
      const s = p.s, g0 = storefront(p, 5.5, b, m), fr = 1.6;
      add(box(p.w - 2.2, p.h - g0, p.d - 2 * fr, p.x + s * 1.1, g0, p.z), 'glass', b, m);
      [-1, 1].forEach(k => add(box(p.w, p.h - g0 + 1.4, fr, p.x, g0, p.z + k * (p.d / 2 - fr / 2)), 'stone', b, m));
      add(box(p.w, 1.4, p.d, p.x, p.h, p.z), 'stone', b, m);
      if (detail) for (let y = g0 + .9; y < p.h - .3; y += 1.15) add(box(.9, .14, p.d - 2 * fr, p.x - s * (p.w / 2 - .7), y, p.z), 'metal', b, m);
      roof(p.x + s * 2, p.z, p.w * .5, p.d * .6, p.h + 1.4, b, m);
    },
    // 玻璃中庭：後方石材主體，前方一角是格框玻璃盒
    atrium(p, b, m) {
      const s = p.s, aw = p.w * rr(.38, .46), ah = Math.min(p.h * .65, rr(13, 20)), e = rnd() < .5 ? 1 : -1, ad = p.d * rr(.5, .62);
      const wb = p.w - aw, bxc = p.x + s * (p.w / 2 - wb / 2), ax = p.x - s * (p.w / 2 - aw / 2), az = p.z + e * (p.d - ad) / 2;
      add(box(wb, p.h, p.d, bxc, 0, p.z), 'stone', b, m);
      add(box(wb + .6, .9, p.d + .6, bxc, p.h, p.z), 'metal', b, m);
      add(box(aw, ah, ad, ax, 0, az), 'glass', b, m);
      add(box(aw - 1, 5, p.d - ad, ax + s * .5, 0, p.z - e * ad / 2), 'concrete', b, m);
      if (detail) {
        const fx = ax - s * aw / 2;
        for (let z = -ad / 2; z <= ad / 2 + .01; z += ad / Math.max(3, Math.round(ad / 3))) add(box(.25, ah, .25, fx - s * .1, 0, az + z), 'metal', b, m);
        for (let y = 3; y < ah - .5; y += 3) add(box(.22, .22, ad, fx - s * .1, y, az), 'metal', b, m);
        add(box(aw + .4, .5, ad + .4, ax, ah, az), 'metal', b, m);
      }
      roof(bxc, p.z, wb * .6, p.d * .6, p.h + .9, b, m);
    },
    // 鐘樓：低層石造建築，一端立著方塔、鐘面與尖頂
    clock(p, b, m) {
      const s = p.s, body = Math.min(p.h, rr(12, 17)), tw = Math.min(7, p.d * .3), e = rnd() < .5 ? 1 : -1;
      const tz = p.z + e * (p.d / 2 - tw / 2), tx = p.x - s * (p.w / 2 - tw / 2 - 1), th = body + rr(12, 18);
      storefront(p, 5, b, m);
      add(box(p.w, body - 5, p.d, p.x, 5, p.z), 'stone', b, m);
      add(box(p.w + .8, .8, p.d + .8, p.x, body, p.z), 'stone', b, m);
      add(box(tw, th - body - .8, tw, tx, body + .8, tz), 'stone', b, m);
      add(box(tw + .6, .7, tw + .6, tx, th - 5.5, tz), 'stone', b, m);
      const cf = new THREE.CylinderGeometry(tw * .32, tw * .32, .3, 24); cf.rotateZ(Math.PI / 2); cf.translate(tx - s * (tw / 2 + .15), th - 2.8, tz);
      add(cf, 'metal', b, m, { smooth: true });
      add(box(tw + .5, .6, tw + .5, tx, th, tz), 'stone', b, m);
      add(taper(tw + .5, .4, tw + .5, .4, tw * 1.1, tx, th + .6, tz), 'dark', b, m);
      roof(p.x + s * p.w * .2, p.z - e * p.d * .2, p.w * .5, p.d * .4, body + .8, b, m);
    },
    // 馬薩式屋頂：石造主體上一圈斜坡屋頂與老虎窗
    mansard(p, b, m) {
      const s = p.s, fl = Math.min(6, Math.max(3, Math.round((p.h - 9) / 3.6))), body = 5 + fl * 3.6, mh = 4.5, ins = 2.4;
      storefront(p, 5, b, m);
      add(box(p.w, body - 5, p.d, p.x, 5, p.z), 'stone', b, m);
      add(box(p.w + 1, .9, p.d + 1, p.x, body, p.z), 'stone', b, m);
      add(taper(p.w + .4, p.w - ins * 2, p.d + .4, p.d - ins * 2, mh, p.x, body + .9, p.z), 'dark', b, m);
      if (detail) {
        const n = Math.max(2, Math.floor(p.d / 5)), fx = p.x - s * (p.w / 2 - 1.3);
        for (let i = 0; i < n; i++) { const z = p.z - p.d / 2 + (i + .5) * p.d / n; add(box(1.6, 2.3, 1.6, fx, body + .9, z), 'stone', b, m); add(gableRoof(1.9, 2, .9, fx, body + 3.2, z), 'dark', b, m); }
        add(box(1, 2.6, 1.8, p.x + s * p.w * .2, body + mh - .6, p.z + p.d * .3), 'stone', b, m);
      }
    },
    // 鋸齒屋頂工廠：低矮廠房、一排鋸齒天窗與一根煙囪
    sawroof(p, b, m) {
      const s = p.s, h = Math.min(p.h, rr(7, 10)), n = Math.max(3, Math.round(p.w / 7)), tw = p.w / n, th = rr(2.6, 3.4);
      add(box(p.w, h, p.d, p.x, 0, p.z), 'concrete', b, m);
      const sh = new THREE.Shape(); sh.moveTo(s * -p.w / 2, 0);
      for (let i = 0; i < n; i++) { const x0 = -p.w / 2 + i * tw; sh.lineTo(s * x0, th); sh.lineTo(s * (x0 + tw), 0); }
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: p.d - .4, bevelEnabled: false }); g.translate(p.x, h, p.z - (p.d - .4) / 2);
      add(g, 'dark', b, m);
      if (detail) for (let i = 0; i < n; i++) add(box(.2, th * .8, p.d - 1.2, p.x + s * (-p.w / 2 + i * tw + .12), h, p.z), 'glass', b, m);
      add(box(.3, 4.6, p.d * .45, p.x - s * (p.w / 2 + .1), 0, p.z + p.d * .15), 'dark', b, m);
      add(cyl(.85, h + rr(10, 16), p.x + s * p.w * .32, 0, p.z - p.d * .36, 12), 'concrete', b, m, { smooth: true });
    }
  });

  // ---------- 城市配置：一條大道＋街廓格網 ----------
  const ROAD = 10.5, WALK = 15.5;       // 雙向六車道（每向 3.5 m × 3），人行道 5 m
  const CROSS = [-52, -158, -266, -352, -470, -588, -690, -818, -934, -1066, -1198, -1324, -1470, -1610, -1760];
  const CW = [16, 14, 18, 13, 16, 14, 18, 13, 16, 14, 16, 14, 16, 14, 14];
  const ZMAX = 300, ZMIN = -1900;
  const inCross = (z, pad) => CROSS.some((c, i) => Math.abs(z - c) < CW[i] / 2 + (pad || 0));
  // 大道兩側的縱向街道
  const cols = [];
  [-1, 1].forEach(s => { let x = WALK; for (let i = 0; i < 12; i++) { const w = i === 0 ? rr(54, 66) : rr(60, 96); cols.push({ s, x0: x, x1: x + w, i }); x += w + (i % 3 === 2 ? 16 : 11); } });
  const rows = []; { const ez = [ZMAX].concat(CROSS).concat([ZMIN]); for (let i = 0; i < ez.length - 1; i++) rows.push([ez[i] - (i ? CW[i - 1] / 2 : 0), ez[i + 1] + (i < CW.length ? CW[i] / 2 : 0)]); }
  const CBD = new THREE.Vector2(0, -1180);
  function heightAt(x, z) {
    const d = Math.hypot(x * 1.25, (z - CBD.y)), cbd = 210 * Math.exp(-Math.pow(d / 430, 2));
    let h = rr(12, 30) + cbd * rr(.45, 1.1);
    if (rnd() < .06) h += rr(30, 70) * Math.exp(-Math.pow(d / 900, 2));
    const near = 120 - z;        // 鏡頭開場位置在 z≈130
    h = Math.min(h, 16 + near * .3);
    if (Math.abs(x) > 600) h *= .7;
    return Math.max(8, h);
  }
  // 臨街造型表：[最低高度, 自然最高高度, 1＝適合放在街廓端點（路口）]
  const SUIT = {
    podiumTower: [40, 250], deco: [30, 130], rounded: [24, 200], cylinder: [36, 220], fins: [16, 90], cantilever: [20, 80],
    retail: [10, 30], taper: [42, 220], twin: [45, 220], arcade: [12, 40], stepped: [24, 140], lshape: [26, 70],
    notched: [20, 140], saw: [12, 60], hotel: [34, 150], octa: [22, 160], terrace: [14, 40], rowhouses: [8, 22],
    exoframe: [24, 200], twist: [32, 200], spire: [36, 220], wedge: [14, 50], gate: [34, 150], stack: [20, 90],
    classic: [10, 26], dome: [10, 30], bundled: [34, 220], loft: [8, 18], balcony: [14, 60],
    corner: [16, 80, 1], curved: [18, 120], penthouse: [14, 45], qilou: [8, 22], oldApt: [12, 20], curtain: [28, 200],
    wave: [16, 80], pixel: [14, 70], lens: [36, 220], crossPlan: [34, 200], hexa: [24, 160], triangle: [18, 70, 1],
    louver: [18, 90], atrium: [16, 60], clock: [10, 30], mansard: [14, 32], sawroof: [8, 14]
  };
  const FRONT_ALL = Object.keys(SUIT);
  const TALL = ['podiumTower', 'rounded', 'cylinder', 'taper', 'twin', 'notched', 'stepped', 'octa', 'hotel', 'exoframe', 'twist', 'spire', 'gate', 'bundled', 'stack', 'lens', 'crossPlan', 'hexa', 'curtain'];
  const FILL_LOW = ['simple', 'rowhouses', 'courtyard', 'slab', 'retail', 'lshape', 'loft', 'balcony', 'wedge', 'dome', 'oldApt', 'sawroof', 'mansard', 'pixel'];
  const FILL_MID = ['simple', 'stepped', 'slab', 'courtyard', 'deco', 'hotel', 'octa', 'fins', 'balcony', 'stack', 'exoframe', 'spire', 'twist', 'bundled', 'louver', 'hexa', 'crossPlan', 'curtain', 'wave'];
  const matZ = mobile ? -600 : -720;
  function place(style, p, front, forceMat) {
    const b = { id: (bid++ % 997) / 997 };
    const hasMat = forceMat || (front && p.z > matZ);
    detail = front || (Math.abs(p.x) < 220 && p.z > -900);
    REG = Math.abs(p.x) > 150 && p.z > -820 ? 1 : 0;
    STY[style](p, b, hasMat);
  }
  const blocks = [], lots = [];
  const capAt = (x, z) => Math.max(8, 16 + (120 - z) * .3) * (Math.abs(x) > 600 ? .7 : 1);
  if (!opt.catalog) cols.forEach(col => {
    rows.forEach(([z0, z1]) => {
      const bw = col.x1 - col.x0, bl = z0 - z1;
      if (bl < 20) return;
      blocks.push({ x0: col.s * col.x0, x1: col.s * col.x1, z0, z1 });
      if (mobile && col.i > 7) return;
      if (col.i > 9 && rnd() < .3) return;          // 偶爾留一塊公園
      const front = col.i === 0;
      const inset = 3.2;                               // 街廓四周的人行道
      const blockFront = [];
      // 沿 z 切地塊（先只記下地塊，造型等全部切完再統一指定）
      let z = z0 - inset;
      while (z > z1 + inset + 8) {
        const w = Math.min(front ? rr(20, 34) : rr(24, 46), z - z1 - inset); if (w < 10) break;
        const zc = z - w / 2;
        const xa = col.x0 + inset, xb = col.x1 - inset;
        if (front) {
          const d = Math.min(rr(24, 34), xb - xa);
          const x = col.s * (xa + d / 2);
          const lot = { p: { x, z: zc, w: d, d: w - rr(1, 3), h: heightAt(x, zc), s: col.s, end: rnd() < .5 ? 1 : -1 }, front: true, cap: capAt(x, zc) };
          lots.push(lot); blockFront.push(lot);
          // 臨街建築後方的填充
          const d2 = xb - xa - d - 4;
          if (d2 > 12) { const x2 = col.s * (xa + d + 4 + d2 / 2), h2 = heightAt(x2, zc); lots.push({ p: { x: x2, z: zc, w: d2, d: w - rr(2, 5), h: h2, s: col.s }, front: false, pool: h2 > 60 ? TALL : FILL_MID, of: lot }); }
        } else {
          const n = bw > 70 && rnd() < .7 ? 2 : 1;
          for (let k = 0; k < n; k++) {
            const dd = (xb - xa) / n, xs = xa + dd * k;
            const x = col.s * (xs + dd / 2), h = heightAt(x, zc);
            lots.push({ p: { x, z: zc, w: dd - rr(2, 5), d: w - rr(2, 4), h, s: col.s }, front: false, pool: h > 70 ? TALL : h > 32 ? FILL_MID : FILL_LOW });
          }
        }
        z -= w + rr(0, 3);
      }
      // 街廓兩端（靠路口）的地塊，轉角型與熨斗型會把造型收向路口
      if (blockFront.length) { blockFront[0].atEnd = true; blockFront[0].p.end = 1; const l = blockFront[blockFront.length - 1]; l.atEnd = true; if (blockFront.length > 1) l.p.end = -1; }
    });
  });

  // ---------- 臨街造型指定（B10）----------
  // 從鏡頭最近的地塊開始，逐棟挑造型：同一側不重複、對街與前後 120 m 內不撞型，
  // 用完所有造型後（遠處、沒有材質的街廓）才開始重複，且優先挑用得最少的。
  {
    const vis = (l) => l.p.z < 170 && l.p.z > matZ ? 0 : 1;   // 鏡頭看得到的那段大道（起點身後的不算）優先
    const fronts = lots.filter(l => l.front).sort((a, b) => vis(a) - vis(b) || b.p.z - a.p.z), used = {}, sideUsed = [{}, {}], done = [];
    fronts.forEach(l => {
      const side = l.p.s > 0 ? 1 : 0;
      let best = FRONT_ALL[0], bs = Infinity;
      FRONT_ALL.forEach(st => {
        const [lo, hi, endy] = SUIT[st];
        let sc = rnd() * 20;
        if (l.cap < lo) sc += 5000;                         // 這裡蓋不到這個造型需要的高度
        sc += Math.max(0, lo - l.p.h) * 3;                   // 需要把房子拉高一點
        if (l.p.h > hi * 1.6) sc += 150;                     // 原本規劃很高，換成低矮造型會掉一截天際線
        if (endy && !l.atEnd) sc += 3000;
        if (sideUsed[side][st]) sc += 1000;
        sc += (used[st] || 0) * 300;
        for (let i = done.length - 1; i >= 0 && done.length - i < 16; i--) if (done[i].style === st && Math.abs(done[i].p.z - l.p.z) < 120) sc += 4000;
        if (sc < bs) { bs = sc; best = st; }
      });
      const [lo, hi] = SUIT[best];
      if (l.p.h < lo) l.p.h = Math.min(l.cap, lo + rr(0, 6));
      l.p.h = Math.min(l.p.h, hi);
      l.style = best; used[best] = (used[best] || 0) + 1; sideUsed[side][best] = 1; done.push(l);
    });
  }
  lots.forEach(l => {
    if (!l.front) { let st = pick(l.pool); if (l.of && st === l.of.style) st = pick(l.pool); l.style = st; }
    place(l.style, l.p, l.front);
  });

  // ---------- 型錄模式：所有臨街造型排成一列，給驗收截圖用 ----------
  const catalog = [];
  if (opt.catalog) {
    const list = opt.catalog === true ? FRONT_ALL : opt.catalog;
    list.forEach((st, i) => {
      const [lo, hi] = SUIT[st] || [20, 60], z = 60 - i * 40, h = Math.min(hi, Math.max(lo, Math.min(lo * 1.9, 70)));
      const p = { x: -(WALK + 3.2 + 15), z, w: 28, d: 30, h, s: -1, end: 1 };
      blocks.push({ x0: -(WALK + 1), x1: -(WALK + 36), z0: z + 20, z1: z - 20 });
      place(st, p, true, true);
      catalog.push({ style: st, x: p.x, z, h });
    });
  }
  // 大道盡頭不放地標：在地平線弧度下只會露出一塊灰色矩形，像一段突起的路

  // ---------- 地面 ----------
  const ground = { asphalt: [], walk: [], paint: [], curb: [], yellow: [] };
  // 地面要細分，球面彎曲時才不會穿插
  const plane = (x0, x1, z0, z1, y, sg) => { const W = Math.abs(x1 - x0), H = Math.abs(z1 - z0); sg = sg || 24; const g = new THREE.PlaneGeometry(W, H, Math.ceil(W / sg), Math.ceil(H / sg)); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); return g; };
  const tbox = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d, Math.ceil(w / 20), 1, Math.ceil(d / 20)); g.translate(x, y + h / 2, z); return g; };
  ground.asphalt.push(plane(-1600, 1600, ZMAX + 400, ZMIN - 300, 0, 25));
  const L = [];
  const seg = (x0, z0, x1, z1, y) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 16); for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n; L.push(x0 + (x1 - x0) * a, y || .06, z0 + (z1 - z0) * a, x0 + (x1 - x0) * b, y || .06, z0 + (z1 - z0) * b); } };
  // 每個街廓一塊抬高的人行道鋪面；線稿時畫出街廓的輪廓
  blocks.forEach(B => {
    const xa = Math.min(B.x0, B.x1), xb = Math.max(B.x0, B.x1);
    const g = tbox(xb - xa, .16, B.z0 - B.z1, (xa + xb) / 2, 0, (B.z0 + B.z1) / 2);
    ground.walk.push(g);
    seg(xa, B.z0, xb, B.z0, .17); seg(xa, B.z1, xb, B.z1, .17); seg(xa, B.z0, xa, B.z1, .17); seg(xb, B.z0, xb, B.z1, .17);
  });
  // 大道人行道（貼著車道）
  [-1, 1].forEach(s => rows.forEach(([z0, z1]) => {
    ground.walk.push(tbox(WALK - ROAD, .16, z0 - z1, s * (ROAD + WALK) / 2, 0, (z0 + z1) / 2));
    ground.curb.push(tbox(.4, .2, z0 - z1, s * (ROAD + .2), 0, (z0 + z1) / 2));
    seg(s * ROAD, z0, s * ROAD, z1, .17);
  }));
  // 車道標線：中央雙黃線、車道虛線
  [-1, 1].forEach(s => {
    ground.yellow.push(plane(s * .12, s * .27, ZMAX + 300, ZMIN - 200, .04));
    seg(s * .2, ZMAX + 300, s * .2, ZMIN - 200);
    [3.5, 7].forEach(lx => { for (let z = ZMAX + 280; z > ZMIN - 200; z -= 12) if (!inCross(z, 4) && !inCross(z - 4, 4)) { ground.paint.push(plane(s * lx - .08, s * lx + .08, z, z - 4, .04)); seg(s * lx, z, s * lx, z - 4); } });
    ground.paint.push(plane(s * (ROAD - .55), s * (ROAD - .4), ZMAX + 300, ZMIN - 200, .04));
  });
  // 斑馬線：只放在幾個主要路口，位置與數量不規則
  const ZEBRA = [[-158, [1]], [-352, [1, -1]], [-588, [-1]], [-818, [1]], [-1066, [1, -1]], [-1470, [-1]]];
  ZEBRA.forEach(([c, sides]) => {
    const i = CROSS.indexOf(c);
    sides.forEach(k => {
      const zc = c + k * (CW[i] / 2 + 3.2);
      for (let x = -ROAD + .8; x < ROAD - .8; x += 1.5) { ground.paint.push(plane(x, x + .75, zc - 2.2, zc + 2.2, .045)); seg(x, zc - 2.2, x, zc + 2.2); seg(x + .75, zc - 2.2, x + .75, zc + 2.2); }
      ground.paint.push(plane(k > 0 ? 0 : -ROAD, k > 0 ? ROAD : 0, zc + k * 3.3 - .22, zc + k * 3.3 + .22, .045));
    });
  });
  const lineGroundGeo = new THREE.BufferGeometry();
  lineGroundGeo.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
  stamp(lineGroundGeo, 0, 0);

  // ---------- 路燈：和建築同一套流程，開場就是線稿，接著上石材、最終材質 ----------
  // 造型：八角基座、收分燈桿、彎曲燈臂與扁平燈罩，另有一支朝人行道的低矮行人燈
  const LAMP_X = ROAD + .9, lampPos = [];
  [-1, 1].forEach(s => { for (let z = ZMAX - 10; z > ZMIN; z -= 30) if (!inCross(z, 3)) lampPos.push([s * LAMP_X, z, s]); });
  const lampB = { id: .5, off: [0, 0, 0] };
  const lampHeads = [], pedHeads = [];
  function lampAt(x, z, s) {
    const m = true, o = { smooth: true };
    detail = true;
    add(cyl(.26, .55, x, 0, z, 8), 'lamp', lampB, m);
    add(cyl(.3, .07, x, .55, z, 8), 'lamp', lampB, m);
    const pole = new THREE.CylinderGeometry(.075, .13, 8.2, 8, 1); pole.translate(x, .62 + 4.1, z);
    add(pole, 'lamp', lampB, m, o);
    add(cyl(.11, .22, x, 3.2, z, 8), 'lamp', lampB, m);          // 中段的套環
    add(cyl(.095, .3, x, 8.82, z, 8), 'lamp', lampB, m);
    // 主燈臂：往車道方向彎出去
    const d = -s;
    const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(x, 8.9, z), new THREE.Vector3(x, 9.7, z), new THREE.Vector3(x + d * .9, 9.75, z), new THREE.Vector3(x + d * 2.5, 9.45, z));
    add(new THREE.TubeGeometry(curve, 12, .055, 6, false), 'lamp', lampB, m, o);
    const hx = x + d * 2.85;
    const head = new THREE.BoxGeometry(1.25, .13, .42); head.rotateZ(d * .06); head.translate(hx, 9.38, z);
    add(head, 'lamp', lampB, m);
    const top = new THREE.BoxGeometry(.9, .06, .28); top.rotateZ(d * .06); top.translate(hx + d * .05, 9.47, z);
    add(top, 'lamp', lampB, m);
    const lens = new THREE.BoxGeometry(1.05, .03, .32); lens.rotateZ(d * .06); lens.translate(hx, 9.3, z);
    add(lens, 'lampglass', lampB, m);
    lampHeads.push([hx, 9.25, z]);
    // 行人燈：低矮短臂朝人行道
    const px = x - d * .95;
    add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, 4.6, z), new THREE.Vector3(x - d * .5, 4.75, z), new THREE.Vector3(px, 4.62, z)), 6, .035, 6, false), 'lamp', lampB, m, o);
    const ph = new THREE.CylinderGeometry(.16, .2, .16, 8, 1); ph.translate(px, 4.48, z); add(ph, 'lamp', lampB, m);
    const pl = new THREE.CylinderGeometry(.17, .17, .025, 8, 1); pl.translate(px, 4.39, z); add(pl, 'lampglass', lampB, m);
    pedHeads.push([px, 4.36, z]);
  }
  REG = 0; lampPos.forEach(l => lampAt(l[0], l[1], l[2]));

  // ---------- 合併 ----------
  // 型錄模式只有近處一區，另一區放一個埋在地下的小方塊，合併時才不會是空的
  [0, 1].forEach(r => { if (!faceGeos[r].length) { REG = r; add(box(.01, .01, .01, 0, -5, 0), 'concrete', { id: 0 }, false); } });
  const faceGeoR = faceGeos.map(a => mergeGeometries(a, false));
  const edgeGeoR = [mergeGeometries(edgeGeos[0].concat([lineGroundGeo]), false), mergeGeometries(edgeGeos[1], false)];

  const LINE_COMMON = `
    uniform float uStone, uFinal, uNight, uDraw, uFogNear, uFogFar, uMat; uniform vec3 uCam, uFogLine, uFogDay, uFogNight;
    ${GLSL_NOISE} ${GLSL_FRONT}
    vec3 fogCol(){ vec3 c = mix(uFogLine, uFogDay, uMat); return mix(c, uFogNight, uNight); }
  `;
  const LINE_VERT = `uniform vec3 uCam; uniform vec2 uPx; ${GLSL_BEND}`;
  // 線稿白面：石材前緣以下消失
  const faceMat = new THREE.ShaderMaterial({
    uniforms: U, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    vertexShader: LINE_VERT + `varying vec3 vW, vN; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = normal; gl_Position = projectionMatrix*viewMatrix*vec4(bend(w.xyz),1.); }`,
    fragmentShader: LINE_COMMON + `varying vec3 vW, vN;
      void main(){
        if (vW.y < stoneFront(vW)) discard;
        float side = abs(vN.y) > .5 ? 1. : (abs(vN.x) > abs(vN.z) ? .978 : .955);
        vec3 col = vec3(1.035) * side;
        float dist = distance(vW, uCam);
        col = mix(col, fogCol(), smoothstep(uFogNear, uFogFar, dist));
        if (dist > uDraw) col = fogCol();
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const lineMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: LINE_VERT + `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*vec4(bend(w.xyz),1.); }`,
    fragmentShader: LINE_COMMON + `varying vec3 vW;
      void main(){
        if (vW.y < stoneFront(vW) + .4) discard;
        float dist = distance(vW, uCam);
        float a = (1. - smoothstep(uFogNear*.4, uFogFar, dist)*.88) * (1. - smoothstep(uDraw - 60., uDraw, dist));
        gl_FragColor = vec4(${LINE_RGB}, a * .78);
        #include <colorspace_fragment>
      }`
  });
  const outer = [];   // 外圍區的網格：鏡頭低於屋頂後關掉
  faceGeoR.forEach((g, r) => {
    const f = new THREE.Mesh(g, faceMat), l = new THREE.LineSegments(edgeGeoR[r], lineMat);
    f.frustumCulled = l.frustumCulled = false; l.renderOrder = 2; scene.add(f, l); if (r) outer.push(f, l);
  });

  // ---------- 材質 ----------
  // 窗戶用室內映射：每格窗後面假裝有一個房間
  const GLSL_INTERIOR = `
    vec3 interior(vec2 cf, vec2 rs, float rd, vec3 N, float sd, float lit){
      vec3 V = normalize(vWP - cameraPosition);
      vec3 cr = cross(vec3(0.,1.,0.), N); vec3 T = cr / max(length(cr), 1e-4);
      vec3 d = vec3(dot(V,T)/rs.x, V.y/rs.y, max(dot(V,-N),.03)/rd);
      vec3 p = vec3(clamp(cf,.001,.999), 0.);
      // 視線剛好水平時 d.y 趨近 0：保留正負號，否則射線會算出負距離，在視線高度畫出一條亮線
      float dx = abs(d.x) < 1e-4 ? (d.x < 0. ? -1e-4 : 1e-4) : d.x, dy = abs(d.y) < 1e-4 ? (d.y < 0. ? -1e-4 : 1e-4) : d.y;
      float tx = ((d.x > 0. ? 1. : 0.) - p.x) / dx, ty = ((d.y > 0. ? 1. : 0.) - p.y) / dy, tz = 1. / d.z;
      float t = max(min(min(tx, ty), tz), 0.);
      vec3 h = p + d * t;
      float hue = fract(sd*7.31);
      vec3 wall = mix(vec3(.70,.66,.60), vec3(.56,.60,.64), step(.55, sd)) * (.85 + .3*hue);
      vec3 c;
      if (t == tz) { c = wall; c *= 1. - .5 * step(h.y, .3) * step(.1, h.x) * step(h.x, .9); c *= 1. - .25 * step(abs(h.x - fract(sd*3.7)), .06); }
      else if (t == ty) { if (d.y > 0.) { c = vec3(.86,.85,.82); c += step(abs(fract(h.x*2.+.25)-.5), .09) * step(abs(h.z-.5), .32) * (.35 + lit*2.); } else c = vec3(.33,.30,.27) * (.9 + .2*hue); }
      else c = wall * .8;
      return c * mix(1., .45, h.z);
    }`;
  const FACADE = {
    glass: `
      float fy = vWP.y/3.9, cu = vU/1.55;
      vec2 cell = floor(vec2(cu, fy)); vec2 cf = fract(vec2(cu, fy));
      float ew = fwidth(cu)*1.2;
      gMul = vert * clamp(1. - smoothstep(.03, .03+ew, cf.x) + smoothstep(.97-ew, .97, cf.x) + 1.-smoothstep(.0, .012+ew, abs(cf.y-.23)), 0., 1.);
      gSpd = vert * step(cf.y,.22) * (1.-gMul);
      gWin = vert * clamp(1.-gMul-gSpd, 0., 1.);
      vec2 rq = vec2(vU/4.65, fy); vec2 room = floor(rq), rf = fract(rq);
      float rs = h3(vec3(room, vB*97.));
      gLit = step(.66, rs);
      float bl = step(.74, h3(vec3(room.yx, vB*13.))) * h3(vec3(room, 3.1)) * .7;
      gBlind = gWin * step(1. - bl, (cf.y - .22) / .78);
      gPane = h3(vec3(cell, vB));
      gTilt = (vec2(h3(vec3(cell, 1.7)), h3(vec3(cell, 4.3))) - .5) * .05;
      gInt = interior(vec2(rf.x, (rf.y-.22)/.78), vec2(4.65, 3.05), 6.5, N0, rs, gLit);`,
    stone: `
      float fy = vWP.y/3.7, cu = vU/3.1;
      vec2 cell = floor(vec2(cu, fy)); vec2 cf = fract(vec2(cu, fy));
      float shop = 1. - step(1., fy);
      vec2 lo = mix(vec2(.22,.24), vec2(.05,.06), shop), hi = mix(vec2(.78,.86), vec2(.95,.84), shop);
      float inW = step(lo.x,cf.x)*step(cf.x,hi.x)*step(lo.y,cf.y)*step(cf.y,hi.y);
      gWin = vert * inW;
      vec2 wl = (cf - lo) / (hi - lo); gWL = wl;
      gSill = vert * (1. - inW) * (1. - shop) * step(lo.x - .03, cf.x) * step(cf.x, hi.x + .03) * step(lo.y - .045, cf.y) * step(cf.y, lo.y);
      gSpd = gWin * max(smoothstep(.16, 0., 1.-wl.y), smoothstep(.12, 0., wl.x) * .7);
      gMul = vert * (1.-inW) * (1.-shop) * step(abs(cf.y - .2), .035) * step(.18, cf.x) * step(cf.x, .82);
      float rs = h3(vec3(cell, vB*53.));
      gLit = max(step(.7, rs), shop * .6);
      float bl = step(.6, h3(vec3(cell.yx, vB*7.))) * rs * .7 * (1.-shop);
      gBlind = gWin * step(1. - bl, wl.y);
      gPane = rs;
      gTilt = (vec2(h3(vec3(cell, 2.1)), h3(vec3(cell, 5.9))) - .5) * .04;
      gInt = interior(wl, mix(vec2(1.7, 2.3), vec2(2.9, 2.9), shop), mix(4., 9., shop), N0, rs, gLit);`,
    concrete: `
      float fy = vWP.y/3.6, cu = vU/1.9;
      vec2 cell = floor(vec2(cu, fy)); vec2 cf = fract(vec2(cu, fy));
      gWin = vert * step(.36,cf.y)*step(cf.y,.88) * step(1.,fy);
      gWL = vec2(fract(vU/5.7), (cf.y - .36) / .52);
      gSill = vert * step(1.,fy) * step(.33, cf.y) * step(cf.y, .36);
      gMul = gWin * (step(cf.x,.045)+step(.955,cf.x));
      gWin *= (1.-gMul);
      gSpd = gWin * smoothstep(.1, 0., .88 - cf.y);
      vec2 rq = vec2(vU/5.7, fy); vec2 room = floor(rq);
      float rs = h3(vec3(room, vB*71.));
      gLit = step(.64, rs);
      float bl = step(.7, h3(vec3(room.yx, vB*5.))) * h3(vec3(room, 8.)) * .8;
      gBlind = gWin * step(1. - bl, (cf.y - .36) / .52);
      gPane = h3(vec3(cell, vB));
      gTilt = (vec2(h3(vec3(cell, 3.3)), h3(vec3(cell, 6.1))) - .5) * .04;
      gInt = interior(vec2(fract(vU/5.7), (cf.y - .36) / .52), vec2(5.7, 1.9), 7., N0, rs, gLit);`
  };
  const WIN_COLOR = `float gp = fract(vB*5.31); vec3 tintG = gp < .25 ? vec3(.15,.19,.21) : gp < .5 ? vec3(.19,.20,.21) : gp < .7 ? vec3(.12,.16,.22) : gp < .85 ? vec3(.21,.19,.16) : vec3(.14,.18,.16); vec3 F0 = tintG * (.88 + .24*gPane); vec3 glassC = mix(F0, vec3(.9), fres*.8);`;
  const COLOR = {
    glass: WIN_COLOR + `
            vec3 c = glassC;
            c = mix(c, vec3(.13,.15,.17) + fres*.25, gSpd);
            c = mix(c, vec3(.44,.45,.46) * (.85 + .3 * step(.5, fract(vU / 1.55 + .5))), clamp(gMul,0.,1.));
            c *= 1. - .25 * gSpd * (1. - smoothstep(.0, .05, abs(fract(vWP.y / 3.9) - .22)));
            c = mix(c, vec3(.60,.58,.54), gBlind);
            if (vert < .5) { c = vec3(.40,.40,.40) * (.9 + .16 * hh(floor(vWP.xz * 7.))); }
            diffuseColor.rgb = c;`,
    stone: WIN_COLOR + `
            float sn = fbm(vWP.xy*.7+vWP.zy*.7);
            float pk = fract(vB*7.13); vec3 st = (pk < .2 ? vec3(.86,.855,.83) : pk < .36 ? vec3(.72,.73,.72) : pk < .5 ? vec3(.58,.38,.30) : pk < .63 ? vec3(.30,.31,.33) : pk < .78 ? vec3(.64,.68,.71) : pk < .9 ? vec3(.78,.74,.67) : vec3(.48,.50,.47)) * (.93 + .14*sn);
            st *= 1. - vert * (1.-smoothstep(.02, .045, fract(vWP.y/1.85))) * .12;
            st *= 1. - vert * (1.-smoothstep(.01, .02, fract(vU/1.2 + floor(vWP.y/1.85)*.5))) * .08;
            st = mix(st, st*1.08, clamp(gMul,0.,1.));
            vec3 c = mix(st, glassC * (1. - .6*gSpd), gWin);
            c = mix(c, vec3(.62,.60,.56), gBlind);
            if (vert < .5) c = vec3(.52,.51,.49);
            // 窗洞的深度：上緣與一側的陰影、細窗框、窗台
            { float rev = (1. - smoothstep(.0, .2, 1. - gWL.y)) * .5 + (1. - smoothstep(.0, .08, gWL.x)) * .28;
              c = mix(c, c * (1. - rev), gWin * (1. - gBlind * .6));
              float fe = min(min(gWL.x, 1. - gWL.x), min(gWL.y, 1. - gWL.y));
              float fw = fwidth(gWL.x) * 1.2 + .012;
              c = mix(c, vec3(.16,.165,.17), gWin * (1. - smoothstep(fw, fw * 2., fe)) * .85);
              c = mix(c, c * 1.12 + .03, gSill); }
            if (vert < .5) { float gv = hh(floor(vWP.xz * 7.)); vec2 rj = abs(fract(vWP.xz / 1.5) - .5); c *= (.9 + .16 * gv) * (1. - .08 * (1. - smoothstep(.46, .49, max(rj.x, rj.y)))); }
            diffuseColor.rgb = c;`,
    concrete: WIN_COLOR + `
            float cn = fbm(vWP.xy*1.3+vWP.zy*1.3);
            float cp = fract(vB*3.7); vec3 cc = (cp < .3 ? vec3(.70,.70,.68) : cp < .55 ? vec3(.55,.57,.59) : cp < .75 ? vec3(.80,.80,.78) : cp < .9 ? vec3(.40,.42,.44) : vec3(.62,.58,.52)) * (.9 + .2*cn);
            cc *= 1. - vert * (1.-smoothstep(.0, .02, fract(vU/1.2))) * .06;
            cc *= 1. - vert * smoothstep(.6, 1., fbm(vec2(vU*.4, vWP.y*.08))) * .12 * smoothstep(8., 0., fract(vWP.y/3.6)*3.6);
            vec3 c = mix(cc, glassC * (1. - .5*gSpd), gWin);
            c = mix(c, vec3(.24,.25,.26), clamp(gMul,0.,1.));
            c = mix(c, vec3(.62,.61,.58), gBlind);
            if (vert < .5) c = vec3(.48,.48,.47);
            // 窗洞的深度：上緣與一側的陰影、細窗框、窗台
            { float rev = (1. - smoothstep(.0, .2, 1. - gWL.y)) * .5 + (1. - smoothstep(.0, .08, gWL.x)) * .28;
              c = mix(c, c * (1. - rev), gWin * (1. - gBlind * .6));
              float fe = min(min(gWL.x, 1. - gWL.x), min(gWL.y, 1. - gWL.y));
              float fw = fwidth(gWL.x) * 1.2 + .012;
              c = mix(c, vec3(.16,.165,.17), gWin * (1. - smoothstep(fw, fw * 2., fe)) * .85);
              c = mix(c, c * 1.12 + .03, gSill); }
            if (vert < .5) { float gv = hh(floor(vWP.xz * 7.)); vec2 rj = abs(fract(vWP.xz / 1.5) - .5); c *= (.9 + .16 * gv) * (1. - .08 * (1. - smoothstep(.46, .49, max(rj.x, rj.y)))); }
            diffuseColor.rgb = c;`,
    metal: `diffuseColor.rgb = vec3(.36,.355,.345) * (1. - .08*step(.97, fract(vU/1.5)));`,
    dark: `diffuseColor.rgb = vec3(.12,.12,.125);`,
    lamp: `diffuseColor.rgb = vec3(.17,.175,.18) * (1. - .06*step(.5, fract(vWP.y*2.)) * step(vWP.y, .62));`,
    lampglass: `diffuseColor.rgb = vec3(.82,.82,.8);`,
    column: `diffuseColor.rgb = vec3(.80,.79,.76) * (.94 + .1 * fbm(vWP.xy * 2. + vWP.zy * 2.));`,
    // 建築模型：米白石灰華，細緻紋理與分割縫
    model: `float mn = fbm(vWP.xz*.35 + vWP.y*.35) * .6 + fbm(vec2(vU, vWP.y)*2.2) * .4;
            float mp = fract(vB*7.13 + .37);
            vec3 mc = mp < .26 ? vec3(.93,.93,.915) : mp < .45 ? vec3(.80,.815,.82) : mp < .58 ? vec3(.87,.86,.84) : mp < .72 ? vec3(.70,.725,.75) : mp < .86 ? vec3(.79,.805,.785) : vec3(.53,.555,.585);
            mc *= .95 + .1*mn;
            float vein = smoothstep(.62, .66, fbm(vec2(vU*.6 + vWP.y*.2, vWP.y*1.4)));
            mc *= 1. - vein * .05;
            float jy = 1. - smoothstep(.0, .03, abs(fract(vWP.y/1.2) - .5) * 2. - .94);
            float jx = 1. - smoothstep(.0, .03, abs(fract(vU/2.4 + floor(vWP.y/1.2)*.5) - .5) * 2. - .97);
            mc *= 1. - vert * max(jy, jx) * .035;
            // 模型上刻出的開窗：每棟有自己的樓高、開間與窗型（點窗或帶狀窗）
            { float fh = 3.5 + .7 * fract(vB * 3.1), mw = 2.2 + 1.8 * fract(vB * 5.7), ribbon = step(.7, fract(vB * 11.3));
              vec2 q = vec2(vU / mw, vWP.y / fh), qf = fract(q), qi = floor(q);
              vec2 aa = fwidth(q) * 1.2 + .004;
              float gf = 1. - step(.5, qi.y);
              vec2 lo = mix(mix(vec2(.2, .3), vec2(-.1, .34), ribbon), vec2(.07, .06), gf), hi = mix(mix(vec2(.8, .84), vec2(1.1, .8), ribbon), vec2(.93, .88), gf);
              float win = smoothstep(lo.x - aa.x, lo.x + aa.x, qf.x) * (1. - smoothstep(hi.x - aa.x, hi.x + aa.x, qf.x)) * smoothstep(lo.y - aa.y, lo.y + aa.y, qf.y) * (1. - smoothstep(hi.y - aa.y, hi.y + aa.y, qf.y));
              win *= vert * step(.001, abs(vB - .5));   // 路燈不刻窗
              vec2 wl = (qf - lo) / (hi - lo);
              float sh = .8 - .14 * (1. - smoothstep(.0, .3, 1. - wl.y)) - .06 * (1. - smoothstep(.0, .12, wl.x));
              mc *= mix(1., sh, win);
              float sill = vert * (1. - win) * step(lo.x, qf.x) * step(qf.x, hi.x) * (1. - smoothstep(aa.y, aa.y * 2. + .015, abs(qf.y - lo.y + .02)));
              mc *= 1. + sill * .06;
              mc *= 1. - vert * (1. - smoothstep(aa.y, aa.y * 2. + .006, abs(qf.y - .015))) * .05; }
            if (vert < .5) { vec2 rj = abs(fract(vWP.xz / 1.2) - .5); mc *= .96 * (1. - .05 * (1. - smoothstep(.46, .49, max(rj.x, rj.y)))); }
            diffuseColor.rgb = mc;`
  };
  const WG = `(gWin*(1.-gBlind))`;
  const ROUGH = {
    glass: `roughnessFactor = mix(mix(.35, .28, gSpd), .02 + .06*gPane, ${WG}); roughnessFactor = mix(roughnessFactor, .8, gBlind);`,
    stone: `roughnessFactor = mix(.82, .03 + .05*gPane, ${WG}); roughnessFactor = mix(roughnessFactor, .8, gBlind);`,
    concrete: `roughnessFactor = mix(.9, .03 + .05*gPane, ${WG}); roughnessFactor = mix(roughnessFactor, .8, gBlind);`,
    model: `roughnessFactor = .62 + .1*mn;`
  };
  const METAL = {
    glass: `metalnessFactor = mix(.75, 1., ${WG}); metalnessFactor *= 1. - gBlind;`,
    stone: `metalnessFactor = ${WG};`,
    concrete: `metalnessFactor = ${WG};`,
    model: `metalnessFactor = 0.;`
  };
  const EMIT = `
    float wgE = gWin*(1.-gBlind)*(1.-fres*.8);
    vec3 lamp = vec3(1.,.80,.56);
    vec3 roomLight = mix(vec3(.05) + lamp*gLit*.06, vec3(.012) + lamp*gLit*1.7, uNight);
    totalEmissiveRadiance += gInt * roomLight * wgE;
    totalEmissiveRadiance += vec3(.9,.78,.6) * gBlind * gLit * uNight * .55;`;
  // kind：final（最終材質，最終前緣以下）、model（石材，石材前緣以下、最終前緣以上）
  function patch(mat, kind, layer) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uStone: U.uStone, uFinal: U.uFinal, uNight: U.uNight, uTime: U.uTime });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute float aB; attribute float aU; attribute float aM; flat varying float vB; varying float vU; flat varying float vM; varying vec3 vWP; varying vec3 vWN;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vB = aB; vU = aU; vM = aM;
          vWP = (modelMatrix*vec4(transformed,1.)).xyz; vWN = normalize(mat3(modelMatrix)*objectNormal);`);
      const cut = layer === 'model'
        ? `if (vWP.y > stoneFront(vWP)) discard; if (vM > .5 && vWP.y < finalFront(vWP)) discard;`
        : `if (vWP.y > finalFront(vWP)) discard;`;
      const edge = layer === 'model'
        ? `float edge = smoothstep(1.2, 0., stoneFront(vWP) - vWP.y) * (1. - uNight);`
        : `float edge = smoothstep(1.2, 0., finalFront(vWP) - vWP.y) * (1. - uNight);`;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uStone, uFinal, uNight, uTime; flat varying float vB; varying float vU; flat varying float vM; varying vec3 vWP; varying vec3 vWN;
          ${GLSL_NOISE} ${GLSL_FRONT} ${GLSL_INTERIOR}
          float gWin, gSpd, gMul, gLit, gBlind, gPane, fres, gSill; vec2 gTilt, gWL; vec3 gInt; vec3 N0;`)
        .replace('void main() {', `void main() {
          ${cut}
          N0 = normalize(vWN);
          float vert = 1. - step(.5, abs(N0.y));
          fres = pow(1. - clamp(dot(normalize(cameraPosition - vWP), N0), 0., 1.), 5.);
          gWin = 0.; gSpd = 0.; gMul = 0.; gLit = 0.; gBlind = 0.; gPane = 0.; gSill = 0.; gTilt = vec2(0.); gWL = vec2(.5); gInt = vec3(0.);
          ${FACADE[kind] || ''}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          ${COLOR[kind] || ''}
          diffuseColor.rgb *= .74 + .26*smoothstep(0., 10., vWP.y);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          // 每片玻璃略微不平，反射會碎開，不像一整面鏡子
          { vec3 cr = cross(vec3(0.,1.,0.), N0); vec3 T = cr / max(length(cr), 1e-4); vec3 nt = (T*gTilt.x + vec3(0.,1.,0.)*gTilt.y) * ${WG};
            normal = normalize(normal + (viewMatrix * vec4(nt, 0.)).xyz); }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          ${ROUGH[kind] || ''}`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          ${METAL[kind] || ''}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          ${edge}
          totalEmissiveRadiance += vec3(1.,.84,.6) * edge * 1.1;
          ${FACADE[kind] ? EMIT : ''}
          ${kind === 'lampglass' ? 'totalEmissiveRadiance += vec3(1.,.8,.55) * 9. * smoothstep(.15, .6, uNight);' : ''}`);
    };
    mat.customProgramCacheKey = () => 'jesda-' + layer + kind;
    return bendMat(mat, 'p');
  }
  const matDefs = {
    glass: { roughness: .1, metalness: 1, envMapIntensity: 1.1 },
    stone: { roughness: .85, metalness: 0, envMapIntensity: .8 },
    concrete: { roughness: .9, metalness: 0, envMapIntensity: .8 },
    metal: { roughness: .42, metalness: .8, envMapIntensity: .9 },
    dark: { roughness: .6, metalness: .3, envMapIntensity: .6 },
    lamp: { roughness: .38, metalness: .65, envMapIntensity: 1 },
    lampglass: { roughness: .2, metalness: 0, envMapIntensity: .6 },
    column: { roughness: .7, metalness: 0, envMapIntensity: .7 }
  };
  const pbrMats = {};
  MATS.forEach(k => {
    if (!parts[k].length) return;
    const m = patch(new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff }, matDefs[k])), k, 'final');
    pbrMats[k] = m;
    const mesh = new THREE.Mesh(mergeGeometries(parts[k], false), m);
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
    scene.add(mesh);
  });
  // 全城的石材模型層：與線稿白面共用同一份幾何
  const modelMat = patch(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .65, metalness: 0, envMapIntensity: .55 }), 'model', 'model');
  faceGeoR.forEach((g, r) => {
    const mm = new THREE.Mesh(g, modelMat); mm.castShadow = mm.receiveShadow = true; mm.frustumCulled = false; scene.add(mm); if (r) outer.push(mm);
  });

  // 地面：線稿 → 模型（淺石色）→ 最終（瀝青、鋪面、標線）
  function groundMat(name, extra, modelCol, rough) {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0, envMapIntensity: .5 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uStone: U.uStone, uFinal: U.uFinal, uNight: U.uNight });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
          uniform float uStone, uFinal, uNight; varying vec3 vWP; ${GLSL_NOISE} ${GLSL_FRONT} float gF;`)
        .replace('void main() {', `void main() { if (stoneFront(vWP) < 1.) discard; gF = smoothstep(-3., 3., finalFront(vWP));`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 real = vec3(1.); float rgh = roughness;
          ${extra}
          vec3 mdl = ${modelCol} * (.96 + .06*vn(vWP.xz*.6));
          diffuseColor.rgb = mix(mdl, real, gF);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(.7, rgh, gF); roughnessFactor = mix(roughnessFactor, roughnessFactor*.55, uNight);`);
    };
    m.customProgramCacheKey = () => 'g-' + name;
    m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1;
    return bendMat(m, 'g');
  }
  const gm = {
    // 瀝青：細骨材顆粒、輪跡較深較亮、補丁與修補縫
    asphalt: groundMat('asphalt', `
      float ag = hh(floor(vWP.xz*28.)) * .5 + hh(floor(vWP.xz*9.)) * .5;
      real = vec3(.205,.205,.2) * (.86 + .22*ag) * (.9 + .2*fbm(vWP.xz*.35));
      float lane = abs(vWP.x) < 10.5 ? 1. : 0.;
      float wheel = lane * (1. - smoothstep(.0, .55, abs(mod(abs(vWP.x) + .0, 3.5) - 1.75 + (mod(abs(vWP.x),3.5) > 1.75 ? -.85 : .85))));
      real *= 1. - .1 * wheel;
      float pt = step(.78, vn(vWP.xz*vec2(.06,.03)+3.)) ; real *= mix(1., .86, pt);
      rgh = .88 - .18*wheel - .05*ag;`, 'vec3(.70,.69,.67)', .88),
    // 人行道：錯縫鋪面，每塊顏色微差
    walk: groundMat('walk', `
      vec2 t = vWP.xz / vec2(.6, .3); t.x += step(1., mod(floor(t.y), 2.)) * .5;
      vec2 id = floor(t), f = fract(t);
      float joint = max(1. - smoothstep(.0, .05, f.x), 1. - smoothstep(.0, .09, f.y));
      real = vec3(.62,.60,.57) * (.9 + .16*hh(id)) * (1. - .35*joint) * (.94 + .1*vn(vWP.xz*.3));
      rgh = .82;`, 'vec3(.86,.85,.82)', .82),
    paint: groundMat('paint', `real = mix(vec3(.205,.205,.2), vec3(.86,.86,.84), smoothstep(.25,.45, fbm(vWP.xz*3.))); rgh = .7;`, 'vec3(.92,.91,.89)', .7),
    yellow: groundMat('yellow', `real = mix(vec3(.205,.205,.2), vec3(.85,.66,.22), smoothstep(.22,.42, fbm(vWP.xz*3.))); rgh = .7;`, 'vec3(.92,.91,.89)', .7),
    curb: groundMat('curb', `real = vec3(.58,.57,.55) * (.9 + .2*hh(floor(vWP.xz*1.2))); rgh = .75;`, 'vec3(.88,.87,.84)', .75)
  };
  Object.keys(ground).forEach(k => {
    if (!ground[k].length) return;
    const g = mergeGeometries(ground[k].map(x => finish(x, false)), false);
    const mesh = new THREE.Mesh(g, gm[k]); mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
  });
  const baseGround = new THREE.Mesh(finish(plane(-3200, 3200, 800, -4000, -.05, 80), false), faceMat);
  baseGround.frustumCulled = false; scene.add(baseGround);

  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), ax = new THREE.Vector3(0, 1, 0);

  // ---------- 夜晚：燈頭光暈、地面光池、光錐 ----------
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.22, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const nightGroup = new THREE.Group(); scene.add(nightGroup);
  const nightMats = [];
  (function () {
    const pts = [], pts2 = [];
    lampHeads.forEach(h => pts.push(h[0], h[1] - .05, h[2]));
    pedHeads.forEach(h => pts2.push(h[0], h[1] - .03, h[2]));
    const mk = (arr, size, col, op) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      const m = bendMat(new THREE.PointsMaterial({ map: glowTex, size, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }), 'pt');
      m.userData.k = op; nightMats.push(m); nightGroup.add(new THREE.Points(g, m));
    };
    mk(pts, 3.2, 0xffd6a0, 1); mk(pts, 9, 0xff9a50, .45); mk(pts2, 1.6, 0xffd6a0, .9); mk(pts2, 4.5, 0xff9a50, .35);
    // 地面光池：主燈照在車道邊、行人燈照在人行道
    const pg = new THREE.PlaneGeometry(1, 1, 4, 4); pg.rotateX(-Math.PI / 2);
    const pools = (heads, sx, sz, col, op) => {
      const m = bendMat(new THREE.MeshBasicMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 'pool');
      m.userData.k = op; nightMats.push(m);
      const im = new THREE.InstancedMesh(pg, m, heads.length);
      heads.forEach((h, i) => { tm.compose(ps.set(h[0], .2, h[2]), q.identity(), sc.set(sx, 1, sz)); im.setMatrixAt(i, tm); });
      im.frustumCulled = false; nightGroup.add(im);
    };
    pools(lampHeads, 13, 17, 0xffb070, .9); pools(lampHeads, 5, 7, 0xffd9a8, .7); pools(pedHeads, 6, 7, 0xffc488, .6);
    // 光錐：燈罩往下的一束淡淡的光
    const cg = new THREE.CylinderGeometry(.45, 4.2, 9.1, 28, 1, true); cg.translate(0, -4.55, 0);
    const cm = new THREE.ShaderMaterial({
      uniforms: Object.assign({ uOp: { value: 0 } }, U), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: LINE_VERT + `varying vec3 vN, vV; varying float vY;
        void main(){ vec4 w = modelMatrix*instanceMatrix*vec4(position,1.); vY = position.y; vN = normalize(mat3(modelMatrix)*normal);
          vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix*viewMatrix*vec4(bend(w.xyz),1.); }`,
      fragmentShader: `uniform float uOp; varying vec3 vN, vV; varying float vY;
        void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float t = clamp(-vY/9.1, 0., 1.);
          float a = uOp * f * (1. - t*.75) * smoothstep(0., .08, t);
          gl_FragColor = vec4(vec3(1.,.74,.45) * a * .16, 1.); }`
    });
    nightMats.push(cm); cm.userData.k = 1; cm.userData.uniform = true;
    const cones = new THREE.InstancedMesh(cg, cm, lampHeads.length);
    lampHeads.forEach((h, i) => { tm.compose(ps.set(h[0], h[1], h[2]), q.identity(), sc.set(1, 1, 1)); cones.setMatrixAt(i, tm); });
    cones.frustumCulled = false; nightGroup.add(cones);
  })();

  // ---------- 燈光：午後斜陽 ----------
  const hemi = new THREE.HemisphereLight(0xd6e2f0, 0x7a7266, .55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0e0, 3.1);
  sun.castShadow = !mobile;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -190, right: 190, top: 190, bottom: -190, near: 10, far: 1100 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .6;
  scene.add(sun, sun.target);
  const SUN_DAY = new THREE.Vector3(.58, .46, .67).normalize();   // 午後斜陽從右後方照進大道，影子往前拉長
  const SUN_NIGHT = new THREE.Vector3(.3, .1, -.95).normalize();

  // 環境反射：天空＋周圍的建築剪影（帶窗格），讓玻璃反射到城市
  const pmrem = new THREE.PMREMGenerator(renderer);
  function envFor(night) {
    const s = new THREE.Scene();
    const m = skyMat.clone(); m.uniforms = Object.assign({}, U, { uMat: { value: 1 }, uNight: { value: night }, uTime: { value: 30 }, uEnv: { value: 1 } });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), m));
    { const gp = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: night ? 0x100d16 : 0x4d4b47 })); gp.position.y = -4; s.add(gp); }
    const wc = document.createElement('canvas'); wc.width = 64; wc.height = 128; const x = wc.getContext('2d');
    x.fillStyle = night ? '#16141d' : '#8a8c8d'; x.fillRect(0, 0, 64, 128);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) { x.fillStyle = night ? (Math.random() < .35 ? '#e8b878' : '#201c26') : (Math.random() < .5 ? '#6e7378' : '#a3a6a6'); x.fillRect(i * 8 + 1, j * 8 + 2, 6, 5); }
    const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2 + Math.random() * .2, r = 50 + Math.random() * 25, h = 12 + Math.random() * 40;
      const bm = new THREE.Mesh(new THREE.BoxGeometry(10 + Math.random() * 10, h, 10 + Math.random() * 10), new THREE.MeshBasicMaterial({ map: wt }));
      bm.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r); bm.lookAt(0, h / 2 - 4, 0); s.add(bm);
    }
    return pmrem.fromScene(s, .015).texture;
  }
  const envDay = envFor(0), envNight = envFor(1);
  scene.environment = envDay;

  // ---------- 後製 ----------
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (!mobile && !opt.noAO) {
    gtao = new GTAOPass(scene, camera, 2, 2);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = .9;
    gtao.updateGtaoMaterial({ radius: 3.5, distanceExponent: 1.5, thickness: 2.5, scale: 1, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    if (gtao.normalMaterial) bendMat(gtao.normalMaterial, 'n');
    // 法線／深度那一趟不畫天空與雲
    const ov = gtao.overrideVisibility.bind(gtao), rv = gtao.restoreVisibility.bind(gtao);
    gtao.overrideVisibility = () => { ov(); sky.visible = false; clouds.forEach(c => c.pair.forEach(sp => sp.visible = false)); };
    gtao.restoreVisibility = () => { rv(); sky.visible = true; applyClouds(); };
    gtao.enabled = false;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .4, .45, .9);
  bloom.enabled = false; composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- 鏡頭路徑 ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const KEYS = [
    { p: V(0, 66, 150), l: V(0, 44, -560) },      // 0 開場：懸在大道上空，看見整座城
    { p: V(0, 40, 40), l: V(0, 24, -560) },       // 1 下降前進
    { p: V(0, 15, -96), l: V(0, 14, -600) },      // 2 關於我們：最低點附近
    { p: V(0, 9, -176), l: V(0, 11, -620) },      // 3 進門
    { p: V(0, 7.5, -214), l: V(0, 30, -760) }     // 4 夜景（鏡頭一直在道路正中央）
  ];
  const pathP = new THREE.CatmullRomCurve3(KEYS.map(k => k.p), false, 'centripetal');
  const pathL = new THREE.CatmullRomCurve3(KEYS.map(k => k.l), false, 'centripetal');
  // 滑鼠像操縱桿：左右讓機身傾斜（約 5°）並略為轉向，上下讓機頭俯仰；用有阻尼的彈簧，慢慢跟上
  const camState = { t: 0, tx: 0, ty: 0, amp: 1, roll: 0, vr: 0, pitch: 0, vp: 0 };   // amp：偏移量倍率
  const ROLL = THREE.MathUtils.degToRad(2), PITCH = THREE.MathUtils.degToRad(3), YAW = THREE.MathUtils.degToRad(1.5);
  function flySpring(dt) {
    const k = 2.4, c = 3.4;
    camState.vr += ((-camState.tx * ROLL * camState.amp) - camState.roll) * k * dt; camState.vr *= Math.exp(-c * dt); camState.roll += camState.vr * dt;
    camState.vp += ((camState.ty * PITCH * camState.amp) - camState.pitch) * k * dt; camState.vp *= Math.exp(-c * dt); camState.pitch += camState.vp * dt;
  }
  const look = new THREE.Vector3(), sunDir = new THREE.Vector3();
  function placeCamera() {
    const t = THREE.MathUtils.clamp(camState.t / (KEYS.length - 1), 0, 1);
    if (camState.fixed) { camera.position.copy(camState.fixed[0]); camera.lookAt(camState.fixed[1]); }
    else {
      pathP.getPoint(t, camera.position); pathL.getPoint(t, look);
      camera.lookAt(look);
      camera.rotateY(camState.roll / ROLL * YAW); camera.rotateX(camState.pitch); camera.rotateZ(camState.roll);
    }
    outer.forEach(o => { o.visible = camera.position.y > 26; });
    U.uCam.value.copy(camera.position);
    sunDir.copy(SUN_DAY).lerp(SUN_NIGHT, U.uNight.value).normalize(); U.uSunDir.value.copy(sunDir);
    sun.position.copy(camera.position).addScaledVector(sunDir, 500); sun.position.y = Math.max(sun.position.y, 60);
    sun.target.position.set(camera.position.x, 0, camera.position.z - 120);
    sun.shadow.camera.position.copy(sun.position);
  }

  function applyClouds() {
    const m = U.uMat.value, n = U.uNight.value;
    clouds.forEach(c => {
      c.pair[0].material.opacity = (1 - m) * c.fade; c.pair[0].visible = m < .99 && c.fade > 0;
      c.pair[1].material.opacity = m * (.95 - .25 * n) * c.fade; c.pair[1].visible = m > .01 && c.fade > 0;
      c.pair[1].material.color.setRGB(1 - .1 * n, 1 - .4 * n, 1 - .48 * n);
    });
  }
  // ---------- 狀態混合 ----------
  const state = { stone: 0, final: 0, night: 0 };
  const C = (h) => new THREE.Color(h);
  const hemiDay = C(0xd6e2f0), hemiNight = C(0x3a3a6a), groundDay = C(0x7a7266), groundNight = C(0x1a1520);
  const sunDay = C(0xfff0e0), sunNight = C(0xff8448);
  function applyState() {
    const s = state.stone, f = state.final, n = state.night;
    U.uStone.value = -30 + s * 420;
    U.uFinal.value = -30 + f * 360;
    U.uMat.value = THREE.MathUtils.smoothstep(s, 0, .4);
    U.uNight.value = n;
    hemi.color.copy(hemiDay).lerp(hemiNight, n); hemi.groundColor.copy(groundDay).lerp(groundNight, n);
    hemi.intensity = .55 - .3 * n;
    sun.color.copy(sunDay).lerp(sunNight, n); sun.intensity = 3.1 * (1 - n * .8);
    const env = n > .5 ? envNight : envDay; if (scene.environment !== env) scene.environment = env;
    Object.keys(pbrMats).forEach(k => { pbrMats[k].envMapIntensity = matDefs[k].envMapIntensity * (1 - .3 * n); });
    nightGroup.visible = n > .02;
    { const k = THREE.MathUtils.smoothstep(n, .3, .9); nightMats.forEach(m => { if (m.userData.uniform) m.uniforms.uOp.value = k; else m.opacity = k * m.userData.k; }); }
    applyClouds();
    if (gtao) gtao.enabled = s > .03;

    bloom.enabled = n > .05; bloom.strength = .5 * n;
    renderer.toneMappingExposure = 1 - .05 * n;
    scene.fog.color.copy(U.uFogDay.value).lerp(U.uFogNight.value, n); scene.fog.near = 380 - 160 * n;
  }

  // ---------- 尺寸與迴圈 ----------
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    U.uPx.value.set(2 / (w * DPR), 2 / (h * DPR));
    if (gtao) gtao.setSize(w * DPR * .6, h * DPR * .6);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.fov = w / h < .8 ? 66 : 44;
    camera.updateProjectionMatrix();
  }
  resize();
  let running = true, last = performance.now(), elapsed = 0;
  function step(dt) {
    elapsed += dt; U.uTime.value = elapsed; flySpring(Math.min(dt, .05));
    // 雲往右飄：繞回的位置遠在畫面外，靠近兩端時淡出淡入，不會在畫面裡突然出現
    clouds.forEach(c => {
      c.pair.forEach(sp => { sp.position.x += c.v * dt; if (sp.position.x > 3000) sp.position.x -= 6000; });
      c.fade = 1 - THREE.MathUtils.smoothstep(Math.abs(c.pair[0].position.x), 2300, 2900);
    });
    applyClouds();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!running || document.hidden) return;
    step(dt);
    placeCamera();
    composer.render(dt);
  }
  applyState(); placeCamera();
  requestAnimationFrame(frame);

  return {
    U, state, camState, resize, applyState, camera, catalog,
    fronts: () => lots.filter(l => l.front).map(l => ({ style: l.style, z: Math.round(l.p.z), s: l.p.s, h: Math.round(l.p.h) })),
    // 型錄截圖用：把鏡頭固定在某處（傳 null 回到捲動路徑）
    fixCamera(p, l) { camState.fixed = p ? [new THREE.Vector3(...p), new THREE.Vector3(...l)] : null; },
    setRunning(v) { running = v; last = performance.now(); },
    renderOnce(dt) { if (dt) step(dt); placeCamera(); composer.render(0); },
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, faces: faceGeoR[0].attributes.position.count + faceGeoR[1].attributes.position.count, edges: edgeGeoR[0].attributes.position.count + edgeGeoR[1].attributes.position.count, buildings: bid, outerVisible: outer[0].visible })
  };
}
