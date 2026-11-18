import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { P, pieces, connectors, cById, jumpers, feeders, H, trunks, barsLong, barsVert, bolts, cx, mx } from './layout6.js';

/* ---------- scena (z verso l'alto, scatola appoggiata sul tavolo) ---------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15181f);
const camera = new THREE.PerspectiveCamera(35, 1, 5, 9000);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxDistance = 3500; controls.minDistance = 120;
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2e38, 0.95));
const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-500, -700, 1300); scene.add(sun);
const table = new THREE.Mesh(new THREE.PlaneGeometry(4000, 3000), new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 1 }));
table.position.z = -0.6; scene.add(table);
const grid = new THREE.GridHelper(3000, 60, 0x3a4050, 0x2f3440); grid.rotation.x = Math.PI / 2; grid.position.z = -0.4; scene.add(grid);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.25, 0.6, 0.8);
composer.addPass(bloom); composer.addPass(new OutputPass());

/* ---------- materiali ---------- */
const RAW = new THREE.Color(0xd9bf8e), WHITEC = new THREE.Color(0xf3f2ec);
const paintMat = new THREE.MeshStandardMaterial({ color: RAW.clone(), roughness: 0.9 });
const WOOD = new THREE.MeshStandardMaterial({ color: 0xc9a36b, roughness: 0.8 });
const barMat = paintMat.clone();   // listelli: diventano semitrasparenti nei passi 6–9 per mostrare le strisce sotto
const MDFM = new THREE.MeshStandardMaterial({ color: 0xa9835a, roughness: 0.9 });
const STRIP1 = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5, emissive: 0xffd27a, emissiveIntensity: 0 });
const STRIP2 = new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.5, emissive: 0xffd27a, emissiveIntensity: 0 });
const CONM = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.6 });
const RED = new THREE.MeshStandardMaterial({ color: 0xe02222, roughness: 0.5 });
const BLK = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.5 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.7, roughness: 0.35 });
const BOLTM = new THREE.MeshStandardMaterial({ color: 0xe9e9e4, roughness: 0.8 });
const GLASS = new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.4, transparent: true, opacity: 0.6, emissive: 0xffe9c8, emissiveIntensity: 0 });
const CHG = new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: 0.5 });
const HOLEM = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1 });

/* ---------- parti animate ---------- */
const parts = [];      // {mesh, step, from:Vector3, delay, dur, final:Vector3, tube?:{count}}
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
function add(step, mesh, o = {}) {
  mesh.userData.final = mesh.position.clone();
  parts.push({ mesh, step, from: new THREE.Vector3(...(o.from || [0, 0, 80])), delay: o.delay || 0, dur: o.dur || 1.2, tube: o.tube || null, hold: o.hold });
  scene.add(mesh); mesh.visible = false; return mesh;
}
const box = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const faceMats = inner => { const m = [WOOD, WOOD, WOOD, WOOD, WOOD, WOOD]; if (inner >= 0) m[inner] = paintMat; return m; };
function tubeMesh(pts, r, mat) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
  const segs = Math.max(8, Math.round(curve.getLength() / 4));
  const g = new THREE.TubeGeometry(curve, segs, r, 6, false);
  const m = new THREE.Mesh(g, mat); m.position.set(0, 0, 0); m.userData.idxCount = g.index.count; return m;
}
const addTube = (step, pts, r, mat, o = {}) => add(step, tubeMesh(pts, r, mat), { from: [0, 0, 0], tube: true, delay: o.delay || 0, dur: o.dur || 1.4 });

const { T, WH, BACK, PL, PW, ZD, DIFF, BAR, ZSTRIP, ZCON, ZTRUNK, YTRUNK } = P;
// 1  MDF
add(0, box(PL, PW, BACK, 0, 0, BACK / 2, [MDFM, MDFM, MDFM, MDFM, paintMat, MDFM]), { from: [0, 0, 220], dur: 1.6 });
// 2  montanti
add(1, box(P.L, T, WH, 0, P.W / 2 - T / 2, WH / 2, faceMats(3)), { from: [0, 160, 0], delay: 0 });
add(1, box(P.L, T, WH, 0, -(P.W / 2 - T / 2), WH / 2, faceMats(2)), { from: [0, -160, 0], delay: 0.25 });
add(1, box(T, PW, WH, P.L / 2 - T / 2, 0, WH / 2, faceMats(1)), { from: [160, 0, 0], delay: 0.5 });
add(1, box(T, PW, WH, -(P.L / 2 - T / 2), 0, WH / 2, faceMats(0)), { from: [-160, 0, 0], delay: 0.75 });
// 3  foro H + fermi
const holeOut = new THREE.Mesh(new THREE.CylinderGeometry(H.d / 2, H.d / 2, 0.8, 24), HOLEM); holeOut.position.set(0, P.W / 2 + 0.2, H.z); add(2, holeOut, { from: [0, 40, 0], dur: 0.8 });
const holeIn = new THREE.Mesh(new THREE.CylinderGeometry(H.d / 2, H.d / 2, 0.8, 24), HOLEM); holeIn.position.set(0, P.W / 2 - T - 0.2, H.z); add(2, holeIn, { from: [0, -30, 0], dur: 0.8 });
bolts.forEach((b, i) => { const g = new THREE.CylinderGeometry(3, 3, 61, 12); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, BOLTM); m.position.set(b.x, b.y, BACK + 30.5); add(2, m, { from: [0, 0, 90], delay: 0.5 + i * 0.12, dur: 0.9 }); });
// 4  listelli 8x8
barsLong.forEach((b, i) => add(3, box(b.x1 - b.x0, 8, 8, 0, b.y, ZD - 4, barMat), { from: [0, 0, 100], delay: i * 0.3 }));
barsVert.forEach((b, i) => add(3, box(8, b.y1 - b.y0, 8, b.x, 0, ZD - 4, barMat), { from: [0, 0, 100], delay: 0.6 + i * 0.2 }));
// 6  strisce (set 1 oro, set 2 chiaro)
const glowParts = [];
pieces.forEach((p, i) => {
  const mat = p.set === 1 ? STRIP1 : STRIP2;
  const m = p.kind === 'line' ? box(8, p.len, 1.2, p.x, 0, ZSTRIP - 0.6, mat) : box(p.len, 8, 1.2, p.x, p.y, ZSTRIP - 0.6, mat);
  add(5, m, { from: [0, 0, -45], delay: i * 0.1, dur: 0.9 });
});
// 7  connettori e ponticelli
connectors.forEach((c, i) => {
  const isLine = cById[c.id].piece.startsWith('L');
  add(6, box(isLine ? 8 : 12, isLine ? 12 : 8, 5, c.x, c.y, ZCON, CONM), { from: [0, 0, -40], delay: i * 0.08, dur: 0.7 });
});
jumpers.forEach((j, i) => {
  const a = cById[j.a], b = cById[j.b];
  const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2 - (a.y < 0 ? 4 : -4), ZCON - 8];
  addTube(6, [[a.x, a.y, ZCON - 2.5], mid, [b.x, b.y, ZCON - 2.5]], 0.9, RED, { delay: 1.6 + i * 0.25, dur: 0.8 });
  addTube(6, [[a.x + 1.6, a.y, ZCON - 2.5], [mid[0] + 1.6, mid[1], mid[2] - 1.2], [b.x + 1.6, b.y, ZCON - 2.5]], 0.9, BLK, { delay: 1.6 + i * 0.25, dur: 0.8 });
});
// 8  dorsali + derivazioni
trunks.forEach((t, k) => {
  const sgn = t.id === 'A' ? -1 : 1, x0 = sgn * 2.5;
  [[RED, -0.9], [BLK, 0.9]].forEach(([mat, dy], q) => {
    addTube(7, [[x0 + sgn * q * 1.8, 236, H.z], [x0 + sgn * q * 1.8, 233.5, H.z + 8], [x0 + sgn * 6, YTRUNK + dy, ZTRUNK], [t.x1 * 0.5, YTRUNK + dy, ZTRUNK], [t.x1, YTRUNK + dy, ZTRUNK]], 1.0, mat, { delay: k * 0.4, dur: 2.2 });
  });
});
feeders.forEach((f, i) => {
  const c = cById[f.con];
  addTube(7, [[f.x - 0.8, YTRUNK, ZTRUNK], [(f.x + c.x) / 2 - 0.8, (YTRUNK + c.y) / 2, ZTRUNK + 4], [c.x - 0.8, c.y, ZCON - 2]], 0.6, RED, { delay: 2.4 + i * 0.12, dur: 0.6 });
  addTube(7, [[f.x + 0.8, YTRUNK, ZTRUNK], [(f.x + c.x) / 2 + 0.8, (YTRUNK + c.y) / 2, ZTRUNK + 4], [c.x + 0.8, c.y, ZCON - 2]], 0.6, BLK, { delay: 2.4 + i * 0.12, dur: 0.6 });
});
// 9  cavi USB dallo stesso foro + caricatore
const chg = box(80, 36, 28, 0, 470, 14, CHG); add(8, chg, { from: [0, 120, 0], dur: 1 });
[['A', -1], ['B', 1]].forEach(([k, sgn], i) => {
  const x = sgn * 2.5;
  [[RED, 0], [BLK, 1.8]].forEach(([mat, off]) => {
    addTube(8, [[x + sgn * off * 0.5, 236, H.z], [x + sgn * off * 0.5, 262, H.z], [sgn * (10 + off * 0.5), 330, 30], [sgn * (22 + off * 0.5), 400, 16], [sgn * (22 + off * 0.5), 440, 14]], 1.4, mat, { delay: 0.8 + i * 0.6, dur: 1.6 });
  });
  const plug = box(11, 20, 5, sgn * 22, 448, 14, STEEL); add(8, plug, { from: [0, 40, 0], delay: 2.2 + i * 0.4, dur: 0.8 });
});
// 10  pannello opalino + viti
add(9, box(PL - 2, PW - 2, DIFF, 0, 0, ZD + DIFF / 2, GLASS), { from: [0, 0, 260], dur: 2.2 });
[-440, -220, 0, 220, 440].forEach((x, i) => [231, -231].forEach((y, j) => { const g = new THREE.CylinderGeometry(2.6, 2.6, 1.2, 12); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, STEEL); m.position.set(x, y, ZD + DIFF + 0.6); add(9, m, { from: [0, 0, 40], delay: 2.4 + (i * 2 + j) * 0.1, dur: 0.5 }); }));
[-100, 100].forEach((y, j) => [-481, 481].forEach((x, i) => { const g = new THREE.CylinderGeometry(2.6, 2.6, 1.2, 12); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, STEEL); m.position.set(x, y, ZD + DIFF + 0.6); add(9, m, { from: [0, 0, 40], delay: 3.6 + (i * 2 + j) * 0.1, dur: 0.5 }); }));

/* ---------- fasi ---------- */
const STEPS = [
  { t: 'Pannello inferiore MDF', d: 'MDF 970 × 470 × 10 mm. Il lato che resta all\'interno va poi verniciato di bianco opaco. Appoggialo sul piano di lavoro.', cam: [[-720, -980, 760], [0, 0, 20]] },
  { t: 'Montanti a fianco dell\'MDF', d: '2 montanti lunghi 1000 mm e 2 testate 470 mm (sezione 15 × 80) si incollano ai bordi dell\'MDF, a filo in basso. Giunti con stucco epossidico, squadrette d\'acciaio negli angoli.', cam: [[-720, -980, 760], [0, 0, 20]] },
  { t: 'Foro per i cavi e fermi di appoggio', d: 'Foro Ø10 al centro del lato lungo (z = 40) per le due spine USB. 10 bulloni sul fondo, 2 per scomparto, con la cima 3–5 mm sotto il pannello: reggono il peso se qualcuno preme.', cam: [[-300, -820, 820], [0, 0, 20]] },
  { t: 'Listelli 8 × 8 sul legno nudo', d: '2 listelli lunghi 954 mm sui lati lunghi e 6 verticali da 454 mm: sono le 6 linee. Cima a 75 mm dal fondo (5 mm sotto il bordo). Incollali sul legno nudo, prima di verniciare.', cam: [[-300, -820, 820], [0, 0, 20]] },
  { t: 'Verniciatura bianca opaca', d: '2 mani di bianco opaco su fondo, pareti, listelli e bulloni. Lascia asciugare e arieggiare qualche giorno prima di proseguire.', cam: [[0, -420, 1050], [0, 0, 20]], paint: true },
  { t: 'Strisce LED sotto i listelli', d: 'Ogni striscia da 2 m, tagliata ogni 12 mm, si usa per intero: 3 linee da 444 mm + 5 tratti da 132 mm (tutti uguali, centrati negli scomparti) = 1992 mm. Incollali sotto i listelli, rivolti in basso (qui i listelli sono resi trasparenti per mostrare le strisce). Set 1 a sinistra (oro), set 2 a destra (chiaro).', cam: [[0, -420, 1050], [0, 0, 20]] },
  { t: 'Connettori a clip e ponticelli', d: '21 clip (C1–C21) sugli estremi indicati nello schema, 5 ponticelli corti (5–8 cm) tra il fondo delle linee e i tratti bassi.', cam: [[0, -90, 360], [0, 235, 55]] },
  { t: 'Dorsali A e B e derivazioni', d: 'Due dorsali dal foro H a z = 56 contro il lato lungo (630 mm per filo) e 11 derivazioni da 80 mm saldate e inserite nelle clip di alimentazione.', cam: [[0, -60, 340], [0, 235, 55]] },
  { t: 'Le due spine USB dallo stesso foro', d: 'I cavi dei due set escono entrambi dal foro H e finiscono nelle due porte di un caricatore da 5 V 3 A per porta. Collaudo un set alla volta prima di chiudere.', cam: [[420, 780, 520], [0, 280, 30]] },
  { t: 'Pannello opalino fissato', d: 'Pannello da 5 mm appoggiato sui listelli, fissato con viti ogni 20 cm circa. Gioco di 1 mm per lato.', cam: [[-720, -980, 760], [0, 0, 20]] },
  { t: 'Collaudo e accensione', d: 'Accendi: le due metà devono avere la stessa luce. Se una è più scura il suo cavo USB è troppo lungo o sottile.', cam: [[-520, -900, 620], [0, 0, 40]], light: true },
];
const stepDur = STEPS.map((s, i) => Math.max(...parts.filter(p => p.step === i).map(p => p.delay + p.dur), 2.6) + (s.paint ? 2.4 : 0));
let cur = 0, stepTime = 0, playing = true, speed = 1, hold = 1.8;
let camTween = null;
const goto = i => { cur = Math.max(0, Math.min(STEPS.length - 1, i)); stepTime = 0; camTween = { pos: new THREE.Vector3(...STEPS[cur].cam[0]), tgt: new THREE.Vector3(...STEPS[cur].cam[1]) }; refreshUI(); };
camera.position.set(...STEPS[0].cam[0]); controls.target.set(...STEPS[0].cam[1]);

/* ---------- interfaccia ---------- */
const $ = id => document.getElementById(id);
$('steps').innerHTML = STEPS.map((s, i) => `<li data-i="${i}"><span>${i + 1}</span>${s.t}</li>`).join('');
$('steps').addEventListener('click', e => { const li = e.target.closest('li'); if (li) { playing = false; goto(+li.dataset.i); } });
$('prev').onclick = () => { playing = false; goto(cur - 1); };
$('next').onclick = () => { playing = false; goto(cur + 1); };
$('play').onclick = () => { if (!playing && cur === STEPS.length - 1 && stepTime >= stepDur[cur]) goto(0); playing = !playing; refreshUI(); };
$('speed').oninput = e => { speed = +e.target.value; };
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); $('play').click(); } if (e.code === 'ArrowRight') $('next').click(); if (e.code === 'ArrowLeft') $('prev').click(); });
function refreshUI() {
  document.querySelectorAll('#steps li').forEach((li, i) => { li.classList.toggle('on', i === cur); li.classList.toggle('done', i < cur); });
  $('stitle').textContent = `${cur + 1}/${STEPS.length} · ${STEPS[cur].t}`; $('sdesc').textContent = STEPS[cur].d;
  $('play').textContent = playing ? '⏸' : '▶';
}

/* ---------- ciclo ---------- */
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);
const clock = new THREE.Clock();
const paintTarget = { v: 0 };
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  stepTime += dt * speed;
  if (playing && stepTime > stepDur[cur] + hold) { if (cur < STEPS.length - 1) goto(cur + 1); else { playing = false; refreshUI(); } }
  // parti
  parts.forEach(p => {
    let prog = p.step < cur ? 1 : p.step > cur ? 0 : (stepTime - p.delay) / p.dur;
    const e = ease(prog);
    p.mesh.visible = prog > 0;
    if (p.tube) { const n = Math.floor(p.mesh.userData.idxCount * e / 6) * 6; p.mesh.geometry.setDrawRange(0, n); }
    else { p.mesh.position.copy(p.mesh.userData.final).addScaledVector(p.from, 1 - e); }
  });
  // vernice
  const ps = 4; let pp = cur > ps ? 1 : cur < ps ? 0 : Math.min(1, Math.max(0, (stepTime - 0.4) / 1.8));
  paintMat.color.copy(RAW).lerp(WHITEC, pp); barMat.color.copy(paintMat.color);
  const xr = cur >= 5 && cur <= 8; barMat.transparent = xr; barMat.opacity = xr ? 0.22 : 1; barMat.depthWrite = !xr; barMat.needsUpdate = true;
  // accensione
  const ls = STEPS.length - 1; const lp = cur === ls ? Math.min(1, Math.max(0, (stepTime - 0.8) / 1.2)) : 0;
  STRIP1.emissiveIntensity = STRIP2.emissiveIntensity = lp * 1.0; GLASS.emissiveIntensity = lp * 0.55; GLASS.opacity = 0.6 + lp * 0.3;
  bloom.strength = 0.15 + lp * 0.18;
  if (camTween) { const a = 1 - Math.exp(-dt * 3); camera.position.lerp(camTween.pos, a); controls.target.lerp(camTween.tgt, a); if (camera.position.distanceTo(camTween.pos) < 3) camTween = null; }
  controls.update(); composer.render();
  requestAnimationFrame(frame);
}
resize(); goto(0); frame();
window.__install = { goto: i => { playing = false; goto(i); }, setTime: t => { stepTime = t; }, steps: STEPS.length, dur: stepDur };
