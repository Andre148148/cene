import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { simulateBay } from './sim.js';

/* ---------- Parametri del progetto (mm) ---------- */
// Costruzione attuale: montanti 15x80 a FIANCO del pannello MDF da 10 mm; pannello opalino appoggiato sui listelli 8x8.
const L = 1000, W = 500;       // dimensioni esterne scatola
const T = 15;                  // spessore montanti
const WH = 80;                 // altezza montanti (dal piano inferiore dell'MDF)
const BACK = 10;               // pannello inferiore MDF
const DIFF = 3;                // pannello opalino (vetro sintetico)
const BAR = 8, BARW = 8;       // listello 8x8
const STRIP_W = 8;             // striscia COB 8 mm
const PL = L - 2 * T, PW = W - 2 * T;   // 970 x 470: MDF e luce interna
const ZD = WH - DIFF;          // 77: quota di appoggio del pannello opalino (cima di listelli e traversi)
const HU = ZD - BACK;          // 67: altezza utile sopra l'MDF
const BAY = (PL - 2 * T) / 3;  // 313,3: larghezza di ogni campata
const TEMPS = { '3000': [1, 0.78, 0.52], '4000': [1, 0.87, 0.70], '6500': [0.93, 0.96, 1] };

const state = { on: true, inside: false, section: false, temp: '4000' };

/* ---------- Scena ---------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15171c);
const camera = new THREE.PerspectiveCamera(35, 1, 10, 8000);
camera.position.set(-760, 430, 1450);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-60, 0, 40);
controls.enableDamping = true;
controls.maxDistance = 4000;
controls.minDistance = 150;

const hemi = new THREE.HemisphereLight(0xcfd8ff, 0x20242b, 0.9);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 0.8);
key.position.set(-600, 900, 900);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.9);
fill.position.set(200, 150, 1500);
scene.add(fill);

// parete di fondo + alone di luce
const wall = new THREE.Mesh(new THREE.PlaneGeometry(6000, 4000),
  new THREE.MeshStandardMaterial({ color: 0x2b2e35, roughness: 1 }));
wall.position.z = -2; scene.add(wall);

function haloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
const halo = new THREE.Mesh(new THREE.PlaneGeometry(2300, 1500), haloMat);
halo.position.z = -1; scene.add(halo);

/* ---------- Post-processing (bagliore) ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.6, 0.75);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- Materiali ---------- */
const world = new THREE.Group(); scene.add(world); // contenitore ruotabile per la vista sezione
const WHITE = new THREE.MeshStandardMaterial({ color: 0xf3f2ec, roughness: 0.92 });
const WOOD = new THREE.MeshStandardMaterial({ color: 0xc9a36b, roughness: 0.8 });
const MDF = new THREE.MeshStandardMaterial({ color: 0xa9835a, roughness: 0.9 });
const PCB = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6 });
const chipMat = new THREE.MeshBasicMaterial({ color: 0x777777 });
const diffMat = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.55, emissive: 0xffffff, emissiveIntensity: 0 });
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0); // tiene x <= 0 (taglio al centro della campata centrale)
const allMats = [WHITE, WOOD, MDF, PCB, diffMat, chipMat];
let sectionGroup = null;

/* ---------- Texture di luminosità del pannello (stima al 1° rimbalzo) ---------- */
function stats(Hu) {
  const r = simulateBay(BAY, PW, Hu, BAR, BARW);
  let mn = 1e9, mx = 0, sm = 0, n = 0;
  for (let j = 0; j < r.ny; j++) for (let i = 0; i < r.nx; i++) {
    const x = (i + .5) * 16, y = (j + .5) * 16;
    if (x < 20 || y < 20 || x > BAY - 20 || y > PW - 20) continue;
    const v = r.data[j * r.nx + i]; mn = Math.min(mn, v); mx = Math.max(mx, v); sm += v; n++;
  }
  const centre = r.data[Math.floor(r.ny / 2) * r.nx + Math.floor(r.nx / 2)];
  return { r, minMax: mn / mx, centreAvg: centre / (sm / n), avg: sm / n };
}

function makeLightMap(Hu) {
  const { r, avg } = stats(Hu);
  const big = document.createElement('canvas'); big.width = PL; big.height = PW;
  const g = big.getContext('2d');
  const enc = (lin) => Math.round(255 * Math.pow(Math.min(1, Math.max(0, lin)), 1 / 2.2));
  const dark = enc(0.06); g.fillStyle = `rgb(${dark},${dark},${dark})`; g.fillRect(0, 0, PL, PW);
  const small = document.createElement('canvas'); small.width = r.nx; small.height = r.ny;
  const sg = small.getContext('2d'); const img = sg.createImageData(r.nx, r.ny);
  for (let j = 0; j < r.ny; j++) for (let i = 0; i < r.nx; i++) {
    const v = enc(r.data[j * r.nx + i] / avg * 0.7);
    const o = ((r.ny - 1 - j) * r.nx + i) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255;
  }
  sg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  for (let i = 0; i < 3; i++) g.drawImage(small, i * (BAY + T), 0, BAY, PW);
  const out = document.createElement('canvas'); out.width = PL; out.height = PW;
  const og = out.getContext('2d'); og.filter = 'blur(5px)'; og.drawImage(big, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

/* ---------- Costruzione della scatola ---------- */
let boxGroup = null, diffuserMesh = null, spots = [];
const labels = []; // etichette della vista sezione
let lift = 0, liftTarget = 0;

function faceMats(innerIdx, top = WOOD) {
  const m = [WOOD, WOOD, WOOD, WOOD, top, WOOD];   // +x -x +y -y +z -z
  if (innerIdx >= 0) m[innerIdx] = WHITE;
  return m;
}
function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); boxGroup.add(m); return m;
}

function build() {
  if (boxGroup) { world.remove(boxGroup); boxGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  spots.forEach(s => { world.remove(s); world.remove(s.target); }); spots = [];
  boxGroup = new THREE.Group(); world.add(boxGroup);

  const xs = i => -PL / 2 + i * (BAY + T);

  // pannello inferiore MDF 10 mm: faccia interna (alto) bianca
  box(PL, PW, BACK, 0, 0, BACK / 2, [MDF, MDF, MDF, MDF, WHITE, MDF]);
  // montanti 15x80 a fianco del pannello (dal piano inferiore dell'MDF fino in cima)
  box(L, T, WH, 0, W / 2 - T / 2, WH / 2, faceMats(3));
  box(L, T, WH, 0, -(W / 2 - T / 2), WH / 2, faceMats(2));
  box(T, PW, WH, L / 2 - T / 2, 0, WH / 2, faceMats(1));
  box(T, PW, WH, -(L / 2 - T / 2), 0, WH / 2, faceMats(0));
  // traversi: poggiano sull'MDF e arrivano alla quota dei listelli (altezza 67)
  [xs(1) - T / 2, xs(2) - T / 2].forEach(x => box(T, PW, HU, x, 0, BACK + HU / 2, WHITE));

  // listelli 8x8 + striscia COB 8 mm sotto (rivolta in basso)
  const zBar = ZD - BAR / 2, zStrip = ZD - BAR - 0.6;
  const ymin = -PW / 2, ymax = PW / 2;
  const addBar = (len, cx, cy, alongY) => {
    box(alongY ? BARW : len, alongY ? len : BARW, BAR, cx, cy, zBar, WHITE);
    box(alongY ? STRIP_W : len, alongY ? len : STRIP_W, 1.2, cx, cy, zStrip, PCB);
    box(alongY ? 4 : len, alongY ? len : 4, 0.8, cx, cy, zStrip - 0.9, chipMat);
  };
  for (let i = 0; i < 3; i++) {
    const xmin = xs(i), xmax = xmin + BAY, cx = (xmin + xmax) / 2;
    addBar(PW, xmin + BARW / 2, 0, true);
    addBar(PW, xmax - BARW / 2, 0, true);
    addBar(BAY - 2 * BARW, cx, ymin + BARW / 2, false);
    addBar(BAY - 2 * BARW, cx, ymax - BARW / 2, false);
    const mk = (px, py, tx, ty) => {
      const sp = new THREE.SpotLight(0xffffff, 0, 0, 1.25, 1, 1);
      sp.position.set(px, py, ZD - BAR - 1); sp.target.position.set(tx, ty, BACK);
      world.add(sp); world.add(sp.target); spots.push(sp);
    };
    mk(xmin + BARW / 2, 0, xmin + 60, 0); mk(xmax - BARW / 2, 0, xmax - 60, 0);
    mk(cx, ymin + BARW / 2, cx, ymin + 60); mk(cx, ymax - BARW / 2, cx, ymax - 60);
  }

  // pannello opalino: appoggiato sui listelli, a filo con la cima dei montanti
  if (diffMat.emissiveMap) diffMat.emissiveMap.dispose();
  diffMat.emissiveMap = makeLightMap(HU); diffMat.needsUpdate = true;
  diffuserMesh = new THREE.Mesh(new THREE.BoxGeometry(PL - 2, PW - 2, DIFF), diffMat);
  diffuserMesh.position.set(0, 0, ZD + DIFF / 2);
  boxGroup.add(diffuserMesh);

  // profilo di sezione al centro della campata centrale (x = 0)
  if (sectionGroup) world.remove(sectionGroup);
  sectionGroup = new THREE.Group(); world.add(sectionGroup);
  const cap = (y0, y1, z0, z1, col, dx = 0.4) => {
    const geo = new THREE.PlaneGeometry(y1 - y0, z1 - z0);
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    mesh.position.set(dx, (y0 + y1) / 2, (z0 + z1) / 2); sectionGroup.add(mesh);
  };
  cap(-PW / 2, PW / 2, 0, BACK, 0xa9835a);                                          // MDF
  cap(-W / 2, -W / 2 + T, 0, WH, 0xc9a36b); cap(W / 2 - T, W / 2, 0, WH, 0xc9a36b);  // montanti
  cap(-PW / 2, -PW / 2 + BARW, ZD - BAR, ZD, 0xf3f2ec, 0.5); cap(PW / 2 - BARW, PW / 2, ZD - BAR, ZD, 0xf3f2ec, 0.5);
  cap(-PW / 2, -PW / 2 + STRIP_W, ZD - BAR - 1.2, ZD - BAR, 0xffffff, 0.6); cap(PW / 2 - STRIP_W, PW / 2, ZD - BAR - 1.2, ZD - BAR, 0xffffff, 0.6);
  cap(-PW / 2 + 1, PW / 2 - 1, ZD, WH, 0xdfe8ee);                                    // pannello opalino
  sectionGroup.visible = state.section;

  applyClip(); setLight();

  const yl = -PW / 2;
  const lp = [
    ['Pannello opalino 3 mm', [0, yl + 40, WH], 40, -40, ],
    ['Listello 8×8 + striscia COB 8 mm rivolta in basso', [0, yl + BARW / 2, ZD - BAR - 1.5], 70, 60],
    [`Montante ${T}×${WH} mm (a fianco dell'MDF)`, [0, -W / 2 + T / 2, WH * 0.5], 0, 0],
    ['Pannello inferiore MDF 10 mm (bianco)', [0, yl + 80, BACK / 2], 40, 50],
  ];
  labels.forEach(l => l.el.remove()); labels.length = 0;
  lp.forEach(([txt, p, dx, dy]) => {
    const el = document.createElement('div'); el.className = 'lbl'; el.textContent = txt;
    document.getElementById('labels').appendChild(el);
    labels.push({ el, pos: new THREE.Vector3(...p), dx, dy });
  });
  applyClip();
  updateStats();
}

function applyClip() {
  // in vista sezione: metà scatola tagliata + profilo disegnato sul piano di taglio
  allMats.forEach(mt => {
    mt.clippingPlanes = state.section ? [clipPlane] : [];
    mt.side = state.section ? THREE.DoubleSide : THREE.FrontSide;
    mt.needsUpdate = true;
  });
  if (sectionGroup) sectionGroup.visible = state.section;
  world.rotation.x = state.section ? -Math.PI / 2 : 0; // pannello in alto, tavola in basso, montante a sinistra (come lo schizzo)
  wall.visible = halo.visible = !state.section;
  world.updateMatrixWorld(true);
  document.querySelectorAll('.lbl').forEach(e => e.style.display = state.section ? 'block' : 'none');
}

/* ---------- Accensione / spegnimento ---------- */
let k = 0; // 0 = spento, 1 = acceso (animato)
function setLight() {
  const [r, g, b] = TEMPS[state.temp];
  diffMat.emissive.setRGB(r, g, b);
}
function updateStats() {
  const strip = 3 * (2 * PW + 2 * (BAY - 2 * BARW)) / 1000;
  const cur = stats(HU), alt = stats(80), low = stats(60);
  const pc = v => (v * 100).toFixed(0) + '%';
  document.getElementById('stats').innerHTML = `
    <div><b>Ingombro esterno:</b> ${L} × ${W} × ${WH} mm</div>
    <div><b>MDF inferiore:</b> ${PL} × ${PW} × ${BACK} mm · <b>opalino:</b> ${PL - 2} × ${PW - 2} × ${DIFF} mm</div>
    <div><b>Altezza utile LED → MDF:</b> ${HU} mm · <b>campate:</b> 3 da ${BAY.toFixed(0)} × ${PW} mm</div>
    <div><b>Striscia COB necessaria:</b> ≈ ${strip.toFixed(1)} m (rotolo da 5 m)</div>
    <table><tr><th></th><th>60 mm</th><th>${HU} mm (attuale)</th><th>80 mm</th></tr>
    <tr><td>centro / media</td><td>${pc(low.centreAvg)}</td><td>${pc(cur.centreAvg)}</td><td>${pc(alt.centreAvg)}</td></tr>
    <tr><td>min / max</td><td>${pc(low.minMax)}</td><td>${pc(cur.minMax)}</td><td>${pc(alt.minMax)}</td></tr></table>
    <div class="note">Stima al 1° rimbalzo, fondo bianco 85%: nella realtà i rimbalzi sulle pareti bianche migliorano un po' il risultato. 80 mm = montanti sopra l'MDF (alternativa).</div>`;
}

/* ---------- UI ---------- */
const $ = id => document.getElementById(id);
function refreshUI() {
  $('sw').classList.toggle('on', state.on);
  $('swtxt').textContent = state.on ? 'ACCESO' : 'SPENTO';
  $('inside').checked = state.inside; $('section').checked = state.section; $('temp').value = state.temp;
}
$('sw').onclick = () => { state.on = !state.on; refreshUI(); };
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); $('sw').click(); } });
$('inside').onchange = e => { state.inside = e.target.checked; liftTarget = state.inside ? 280 : 0; };
$('temp').onchange = e => { state.temp = e.target.value; setLight(); };
let camTween = null;
$('section').onchange = e => {
  state.section = e.target.checked; applyClip();
  if (state.section) { state.inside = false; $('inside').checked = false; liftTarget = 0; camTween = { pos: new THREE.Vector3(400, 70, 225), tgt: new THREE.Vector3(0, 40, 225) }; }
  else camTween = { pos: new THREE.Vector3(-760, 430, 1450), tgt: new THREE.Vector3(-60, 0, 40) };
};
window.__cam = { camera, controls }; window.__state = state; window.__rebuild = () => { refreshUI(); build(); };

/* ---------- Loop ---------- */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
const v3 = new THREE.Vector3();
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const a = 1 - Math.exp(-dt * 8);
  const target = state.on ? 1 : 0;
  k += (target - k) * a;
  if (Math.abs(target - k) < 0.003) k = target;
  lift += (liftTarget - lift) * a;
  if (diffuserMesh) { diffuserMesh.position.z = ZD + DIFF / 2 + lift * 0.8; diffuserMesh.position.y = lift * 1.25; }
  diffMat.emissiveIntensity = 1.0 * k;
  const [r, g, b] = TEMPS[state.temp];
  const c = 0.35 + 2.2 * k;
  chipMat.color.setRGB(r * c, g * c, b * c);
  spots.forEach(s => { s.color.setRGB(r, g, b); s.intensity = 22 * k; });
  haloMat.opacity = 0.10 * k * (state.section ? 0.3 : 1);
  haloMat.color.setRGB(r, g, b);
  bloom.strength = 0.05 + 0.28 * k;
  hemi.intensity = 0.5 + 0.3 * (1 - k);
  fill.intensity = 0.15 + 0.9 * (1 - k);
  if (camTween) {
    camera.position.lerp(camTween.pos, a); controls.target.lerp(camTween.tgt, a);
    if (camera.position.distanceTo(camTween.pos) < 2) camTween = null;
  }
  controls.update();
  composer.render();
  const w = window.innerWidth, h = window.innerHeight;
  labels.forEach(l => {
    v3.copy(l.pos); world.localToWorld(v3); v3.project(camera);
    l.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w + l.dx}px, ${(-v3.y * 0.5 + 0.5) * h + l.dy}px)`;
  });
  requestAnimationFrame(tick);
}
resize(); refreshUI(); build(); tick();
