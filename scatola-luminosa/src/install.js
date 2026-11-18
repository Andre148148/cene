import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { P, pieces, connectors, cById, jumpers, feeders, H, barsLong, barsVert, bolts, brackets, walk } from './layout6.js';

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
controls.enableDamping = true; controls.maxDistance = 3500; controls.minDistance = 60;
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
const barMat = paintMat.clone();
const WOOD = new THREE.MeshStandardMaterial({ color: 0xc9a36b, roughness: 0.8 });
const MDFM = new THREE.MeshStandardMaterial({ color: 0xa9835a, roughness: 0.9 });
const STRIP1 = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5, emissive: 0xffd27a, emissiveIntensity: 0 });
const STRIP2 = new THREE.MeshStandardMaterial({ color: 0xffe9a8, roughness: 0.5, emissive: 0xffd27a, emissiveIntensity: 0 });
const CONM = new THREE.MeshStandardMaterial({ color: 0x5a6070, roughness: 0.5 });
const RED = new THREE.MeshStandardMaterial({ color: 0xe02222, roughness: 0.5 });
const BLK = new THREE.MeshStandardMaterial({ color: 0x3a3e4a, roughness: 0.5 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.7, roughness: 0.35 });
const BOLTM = new THREE.MeshStandardMaterial({ color: 0xe9e9e4, roughness: 0.8 });
const GLASS = new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.4, transparent: true, opacity: 0.6, emissive: 0xffe9c8, emissiveIntensity: 0 });
const CHG = new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: 0.5 });
const HOLEM = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1 });

/* ---------- parti animate ---------- */
// group: 'struct' (si può nascondere) | 'elec' (strisce e collegamenti)
const parts = [];
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const labels = [];
function add(step, mesh, o = {}) {
  mesh.userData.final = mesh.position.clone();
  const part = { mesh, step, group: o.group || 'struct', from: new THREE.Vector3(...(o.from || [0, 0, 80])), delay: o.delay || 0, dur: o.dur || 1.2, tube: !!o.tube, strip: o.strip || null, label: null, prog: 0, timing: o.timing || { [step]: [o.delay || 0, o.dur || 1.2] } };
  if (o.label) {
    const el = document.createElement('div'); el.className = 'lbl'; el.textContent = o.label.text; document.getElementById('labels').appendChild(el);
    part.label = { el, pos: new THREE.Vector3(...o.label.pos) };
    labels.push(part);
  }
  parts.push(part); scene.add(mesh); mesh.visible = false; return part;
}
const box = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const faceMats = inner => { const m = [WOOD, WOOD, WOOD, WOOD, WOOD, WOOD]; if (inner >= 0) m[inner] = paintMat; return m; };
function tubeMesh(pts, r, mat) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
  const segs = Math.max(8, Math.round(curve.getLength() / 3));
  const g = new THREE.TubeGeometry(curve, segs, r, 6, false);
  const m = new THREE.Mesh(g, mat); m.userData.idxCount = g.index.count; return m;
}
const addTube = (step, pts, r, mat, o = {}) => add(step, tubeMesh(pts, r, mat), { from: [0, 0, 0], tube: true, group: 'elec', delay: o.delay || 0, dur: o.dur || 1.4, label: o.label });

const { T, WH, BACK, PL, PW, ZD, DIFF, ZSTRIP, ZCON, ZTRUNK, YTRUNK, TOP } = P;
const S = { MDF: 0, WALLS: 1, HOLE: 2, BARS: 3, PAINT: 4, CUT: 5 };
const WALK0 = 6;                                   // indice del primo passo dei collegamenti
const idxOf = i => WALK0 + i;
const STEPS = [];
const stepOf = (g, t, d, cam, extra = {}) => STEPS.push({ g, t, d, cam, ...extra });
const CAMO = [[-720, -980, 760], [0, 0, 20]], CAMT = [[0, -420, 1050], [0, -20, 30]];

// 0 MDF 1000 × 500 × 10
add(S.MDF, box(P.L, P.W, BACK, 0, 0, BACK / 2, [MDFM, MDFM, MDFM, MDFM, paintMat, MDFM]), { from: [0, 0, 220], dur: 1.6 });
stepOf('Struttura', 'Pannello inferiore MDF', 'MDF 1000 × 500 × 10 mm. Sarà la base e il fondo: il lato verso l\'interno va verniciato di bianco opaco.', CAMO);
// 1 montanti SOPRA l'MDF + squadrette
const wz = BACK + WH / 2;
add(S.WALLS, box(P.L, T, WH, 0, P.W / 2 - T / 2, wz, faceMats(3)), { from: [0, 0, 190] });
add(S.WALLS, box(P.L, T, WH, 0, -(P.W / 2 - T / 2), wz, faceMats(2)), { from: [0, 0, 190], delay: 0.35 });
add(S.WALLS, box(T, PW, WH, P.L / 2 - T / 2, 0, wz, faceMats(1)), { from: [0, 0, 190], delay: 0.7 });
add(S.WALLS, box(T, PW, WH, -(P.L / 2 - T / 2), 0, wz, faceMats(0)), { from: [0, 0, 190], delay: 1.05 });
brackets.forEach((b, i) => {
  const g = new THREE.Group();
  g.add(box(30, 2.2, 28, -b.sx * 15, -b.sy * 1.1, 0, STEEL)); g.add(box(2.2, 30, 28, -b.sx * 1.1, -b.sy * 15, 0, STEEL));
  g.position.set(b.x, b.y, BACK + 40); add(S.WALLS, g, { from: [0, 0, 70], delay: 1.9 + i * 0.25, dur: 0.8 });
});
stepOf('Struttura', 'Montanti sopra l\'MDF', '2 montanti lunghi 1000 mm e 2 testate 470 mm (sezione 15 × 80) si appoggiano sull\'MDF e si incollano (stucco epossidico). Squadrette d\'acciaio negli angoli.', CAMO);
// 2 foro H + fermi
[[P.W / 2 + 0.2, 40], [P.W / 2 - T - 0.2, -30]].forEach(([y, f]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(H.d / 2, H.d / 2, 0.8, 24), HOLEM); m.position.set(0, y, H.z); add(S.HOLE, m, { from: [0, f, 0], dur: 0.8 }); });
bolts.forEach((b, i) => { const g = new THREE.CylinderGeometry(3, 3, ZD - 4 - BACK, 12); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, BOLTM); m.position.set(b.x, b.y, BACK + (ZD - 4 - BACK) / 2); add(S.HOLE, m, { from: [0, 0, 90], delay: 0.7 + i * 0.12, dur: 0.9 }); });
stepOf('Struttura', 'Foro per i cavi e fermi di appoggio', 'Foro Ø10 al centro del lato lungo, a 40 mm dall\'MDF, per le due spine USB. 10 bulloni sul fondo (2 per scomparto) con la cima 4 mm sotto il pannello: reggono il peso se qualcuno preme.', [[-300, -820, 820], [0, 0, 30]]);
// 3 listelli 8 × 8
barsLong.forEach((b, i) => add(S.BARS, box(b.x1 - b.x0, 8, 8, 0, b.y, ZD - 4, barMat), { from: [0, 0, 100], delay: i * 0.3 }));
barsVert.forEach((b, i) => add(S.BARS, box(8, b.y1 - b.y0, 8, b.x, 0, ZD - 4, barMat), { from: [0, 0, 100], delay: 0.6 + i * 0.2 }));
stepOf('Struttura', 'Listelli 8 × 8 sul legno nudo', '2 listelli lunghi 954 mm sui lati lunghi e 6 verticali da 454 mm: sono le 6 linee. Cima a 85 mm da terra (5 mm sotto il bordo dei montanti). Incollali sul legno nudo, prima di verniciare.', [[-300, -820, 820], [0, 0, 30]]);
stepOf('Struttura', 'Verniciatura bianca opaca', '2 mani di bianco opaco su fondo, pareti, listelli e bulloni. Lascia asciugare e arieggiare qualche giorno prima di proseguire.', CAMT, { paint: true });
// 5 taglio: i pezzi compaiono in fila fuori dalla scatola; ciascuno andrà al suo posto nel proprio passo
const placeStepOf = {};
walk.forEach((w, i) => { if (w.piece) placeStepOf[w.piece] = idxOf(i); });
const rowCursor = { 1: -996, 2: -996 };
const ordered = [1, 2].flatMap(set => pieces.filter(p => p.set === set).sort((a, b) => b.len - a.len));
ordered.forEach((p, i) => {
  const mat = p.set === 1 ? STRIP1 : STRIP2, line = p.kind === 'line';
  const m = line ? box(8, p.len, 1.2, p.x, 0, ZSTRIP - 0.6, mat) : box(p.len, 8, 1.2, p.x, p.y, ZSTRIP - 0.6, mat);
  const rowY = -330 - (p.set - 1) * 34, cxr = rowCursor[p.set] + p.len / 2; rowCursor[p.set] += p.len + 6;
  const rowPos = new THREE.Vector3(cxr, rowY, 1), k = i % 8, ps = placeStepOf[p.id];
  const part = add(S.CUT, m, {
    group: 'elec', strip: { rowPos, rowRot: line ? Math.PI / 2 : 0, axis: line ? 'y' : 'x', rowStep: S.CUT, placeStep: ps },
    timing: { [S.CUT]: [k * 0.45, 0.6], [ps]: [p.kind === 'line' || p.id[0] === 'T' ? 0.9 : 0, 1.3] },
    label: { text: `${p.id} · ${p.len}`, pos: [p.x, p.kind === 'line' ? 0 : p.y, ZSTRIP + 6] },
  });
  part.labelRow = rowPos.clone().add(new THREE.Vector3(0, 0, 8));
});
stepOf('Strisce', 'Taglio delle due strisce', 'Segni di taglio ogni 12 mm. Ogni striscia da 2 m (1992 mm) si taglia in 3 linee da 444 mm + 5 tratti da 132 mm: usi la striscia per intero. Striscia 1 in oro, striscia 2 in chiaro. Da qui si monta un pezzo alla volta.', [[0, -820, 760], [0, -230, 0]]);

// 6+ collegamenti, un pezzo alla volta, partendo dalla spina USB
const testIdx = { 1: -1, 2: -1 };
const trunkTube = (step, pts, mat, label) => addTube(step, pts, 1.0, mat, { delay: 0, dur: 1.0, label });
walk.forEach((w, i) => {
  const st = idxOf(i), sgn = w.set === 1 ? -1 : 1, cam = null;
  const grp = w.set === 1 ? 'Striscia 1 · spina USB A' : 'Striscia 2 · spina USB B';
  let fcam = CAMT;
  if (w.kind === 'usb') {
    const x0 = sgn * 2.5;
    [[RED, -0.9], [BLK, 0.9]].forEach(([mat, dy], q) => trunkTube(st, [[x0 + sgn * q * 1.8, 236, H.z], [x0 + sgn * q * 1.8, 233.5, H.z + 8], [sgn * 5, YTRUNK + dy, ZTRUNK], [w.trunkTo, YTRUNK + dy, ZTRUNK]], mat, q ? undefined : { text: 'dorsale ' + w.usb, pos: [w.trunkTo, YTRUNK, ZTRUNK - 9] }));
    [[RED, 0], [BLK, 1.8]].forEach(([mat, off], q) => {
      addTube(st, [[x0 + sgn * off * 0.5, 236, H.z], [x0 + sgn * off * 0.5, 262, H.z], [sgn * (10 + off * 0.5), 330, 34], [sgn * (22 + off * 0.5), 400, 20], [sgn * (22 + off * 0.5), 440, 14]], 1.4, mat, { delay: 0.9, dur: 1.6, label: q ? undefined : { text: 'cavo USB ' + w.usb, pos: [sgn * 14, 360, 46] } });
    });
    add(st, box(11, 20, 5, sgn * 22, 448, 14, STEEL), { group: 'elec', from: [0, 40, 0], delay: 2.4, dur: 0.8, label: { text: 'spina ' + w.usb, pos: [sgn * 22, 448, 26] } });
    fcam = [[sgn * 330, 720, 400], [sgn * 15, 330, 40]];
  }
  if (w.kind === 'piece') {
    const c = cById[w.con], f = feeders.find(q => q.id === w.feeder), mid = [(f.x + c.x) / 2, (YTRUNK + c.y) / 2, ZTRUNK + 4];
    [[RED, -0.9], [BLK, 0.9]].forEach(([mat, dy], q) => trunkTube(st, [[w.trunkFrom, YTRUNK + dy, ZTRUNK], [(w.trunkFrom + w.trunkTo) / 2, YTRUNK + dy, ZTRUNK], [w.trunkTo, YTRUNK + dy, ZTRUNK]], mat, q ? undefined : { text: 'dorsale ' + w.usb + ' →', pos: [(w.trunkFrom + w.trunkTo) / 2, YTRUNK, ZTRUNK - 9] }));
    const isLine = w.piece[0] === 'L';
    add(st, box(isLine ? 8 : 12, isLine ? 12 : 8, 5, c.x, c.y, ZCON, CONM), { group: 'elec', from: [0, 0, 60], delay: 2.3, dur: 0.7, label: { text: c.id, pos: [c.x, c.y, ZCON + 10] } });
    addTube(st, [[f.x - 0.8, YTRUNK, ZTRUNK], [mid[0] - 0.8, mid[1], mid[2]], [c.x - 0.8, c.y, ZCON - 2]], 0.6, RED, { delay: 3.0, dur: 0.7, label: { text: f.id, pos: [f.x, YTRUNK - 9, ZTRUNK - 6] } });
    addTube(st, [[f.x + 0.8, YTRUNK, ZTRUNK], [mid[0] + 0.8, mid[1], mid[2]], [c.x + 0.8, c.y, ZCON - 2]], 0.6, BLK, { delay: 3.0, dur: 0.7 });
    const jn = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), STEEL); jn.position.set(f.x, YTRUNK, ZTRUNK); add(st, jn, { group: 'elec', from: [0, 0, 8], delay: 2.9, dur: 0.4 });
    fcam = [[w.fx, c.y - 330, 330], [w.fx, c.y, 72]];
  }
  if (w.kind === 'low') {
    const j = jumpers.find(q => q.id === w.jumper), a = cById[j.a], b = cById[j.b], dir = a.y < 0 ? -1 : 1, mid = [(a.x + b.x) / 2, (a.y + b.y) / 2 + dir * 3, ZCON - 9];
    add(st, box(8, 12, 5, a.x, a.y, ZCON, CONM), { group: 'elec', from: [0, 0, 60], delay: 1.5, dur: 0.7, label: { text: a.id, pos: [a.x, a.y, ZCON + 10] } });
    add(st, box(12, 8, 5, b.x, b.y, ZCON, CONM), { group: 'elec', from: [0, 0, 60], delay: 1.8, dur: 0.7, label: { text: b.id, pos: [b.x, b.y, ZCON + 10] } });
    addTube(st, [[a.x - 0.8, a.y, ZCON - 2.5], [mid[0] - 0.8, mid[1], mid[2]], [b.x - 0.8, b.y, ZCON - 2.5]], 0.9, RED, { delay: 2.6, dur: 0.9, label: { text: j.id, pos: [mid[0], mid[1] + dir * 6, ZCON + 2] } });
    addTube(st, [[a.x + 0.8, a.y, ZCON - 2.5], [mid[0] + 0.8, mid[1], mid[2] - 1.2], [b.x + 0.8, b.y, ZCON - 2.5]], 0.9, BLK, { delay: 2.6, dur: 0.9 });
    fcam = [[w.fx, -a.y * 0 + (a.y < 0 ? a.y + 330 : a.y - 330), 330], [w.fx, a.y, 72]];
  }
  if (w.kind === 'test') {
    testIdx[w.set] = st;
    if (w.set === 1) add(st, box(80, 36, 28, 0, 470, 14, CHG), { group: 'elec', from: [0, 120, 0], dur: 1, label: { text: 'caricatore 5 V · 2 porte da 3 A', pos: [0, 470, 38] } });
    fcam = w.set === 1 ? CAMT : CAMT;
  }
  stepOf(grp, `${w.title}`, w.text, fcam);
});
// pannello opalino + viti
const PANEL = STEPS.length, ONST = STEPS.length + 1;
add(PANEL, box(PL - 2, PW - 2, DIFF, 0, 0, ZD + DIFF / 2, GLASS), { from: [0, 0, 260], dur: 2.2 });
[-440, -220, 0, 220, 440].forEach((x, i) => [231, -231].forEach((y, j) => { const g = new THREE.CylinderGeometry(2.6, 2.6, 1.2, 12); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, STEEL); m.position.set(x, y, TOP + 0.6); add(PANEL, m, { from: [0, 0, 40], delay: 2.4 + (i * 2 + j) * 0.1, dur: 0.5 }); }));
[-100, 100].forEach((y, j) => [-481, 481].forEach((x, i) => { const g = new THREE.CylinderGeometry(2.6, 2.6, 1.2, 12); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, STEEL); m.position.set(x, y, TOP + 0.6); add(PANEL, m, { from: [0, 0, 40], delay: 3.6 + (i * 2 + j) * 0.1, dur: 0.5 }); }));
stepOf('Chiusura', 'Pannello opalino fissato', 'Pannello da 5 mm appoggiato sui listelli, fissato con viti ogni 20 cm circa. Gioco di 1 mm per lato.', CAMO);
stepOf('Chiusura', 'Scatola accesa', 'Tutto collegato: le due strisce insieme. Dimmer opzionale sui cavi USB.', [[-520, -900, 620], [0, 0, 50]]);
S.PAINT = 4; S.PANEL = PANEL; S.ON = ONST; S.TEST1 = testIdx[1]; S.TEST2 = testIdx[2];

// contorno fantasma (compare quando si nasconde la struttura)
const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(P.L, P.W, TOP)), new THREE.LineBasicMaterial({ color: 0x586079 }));
ghost.position.set(0, 0, TOP / 2); ghost.visible = false; scene.add(ghost);
const ghostH = new THREE.Mesh(new THREE.TorusGeometry(H.d / 2 + 1.5, 0.8, 8, 24), new THREE.MeshBasicMaterial({ color: 0xcc3333 }));
ghostH.rotation.x = Math.PI / 2; ghostH.position.set(0, P.W / 2, H.z); ghostH.visible = false; scene.add(ghostH);

/* ---------- fasi ---------- */
const CAMW = [[0, -90, 400], [0, 235, 72]];
const stepDur = STEPS.map((s, i) => Math.max(...parts.map(p => (p.timing[i] ? p.timing[i][0] + p.timing[i][1] : 0)), 2.2) + (s.paint ? 2.4 : 0));
let cur = 0, stepTime = 0, playing = true, speed = 1, hold = 1.6, hideStruct = false, labelsOn = true;
let camTween = null;
const setCam = (pos, tgt) => { camTween = { pos: new THREE.Vector3(...pos), tgt: new THREE.Vector3(...tgt) }; };
const goto = i => { cur = Math.max(0, Math.min(STEPS.length - 1, i)); stepTime = 0; setCam(...STEPS[cur].cam); refreshUI(); };
camera.position.set(...CAMO[0]); controls.target.set(...CAMO[1]);

/* ---------- interfaccia ---------- */
const $ = id => document.getElementById(id);
$('steps').innerHTML = STEPS.map((s, i) => (i === 0 || STEPS[i - 1].g !== s.g ? `<h3>${s.g}</h3>` : '') + `<li data-i="${i}"><span>${i + 1}</span>${s.t}</li>`).join('');
$('steps').addEventListener('click', e => { const li = e.target.closest('li'); if (li) { playing = false; goto(+li.dataset.i); } });
const jump = $('jump'); jump.innerHTML = STEPS.map((s, i) => `<option value="${i}">${i + 1}. ${s.t}</option>`).join(''); jump.onchange = e => { playing = false; goto(+e.target.value); };
$('prev').onclick = () => { playing = false; goto(cur - 1); };
$('next').onclick = () => { playing = false; goto(cur + 1); };
$('play').onclick = () => { if (!playing && cur === STEPS.length - 1 && stepTime >= stepDur[cur]) goto(0); playing = !playing; refreshUI(); };
$('speed').oninput = e => { speed = +e.target.value; };
$('hide').onclick = () => { hideStruct = !hideStruct; refreshUI(); };
$('lab').onclick = () => { labelsOn = !labelsOn; refreshUI(); };
$('vTop').onclick = () => setCam([0, -300, 980], [0, 0, 40]);
$('vWall').onclick = () => setCam(...CAMW);
$('vBack').onclick = () => setCam([420, 780, 520], [0, 280, 40]);
$('vIso').onclick = () => setCam(...CAMO);
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); $('play').click(); } if (e.code === 'ArrowRight') $('next').click(); if (e.code === 'ArrowLeft') $('prev').click(); if (e.key === 's' || e.key === 'S') $('hide').click(); });
function refreshUI() {
  document.querySelectorAll('#steps li').forEach((li, i) => { li.classList.toggle('on', i === cur); li.classList.toggle('done', i < cur); if (i === cur) li.scrollIntoView({ block: 'nearest' }); });
  $('stitle').textContent = `${cur + 1}/${STEPS.length} · ${STEPS[cur].t}`; $('sdesc').textContent = STEPS[cur].d;
  $('play').textContent = playing ? '⏸' : '▶'; $('jump').value = String(cur);
  $('hide').textContent = hideStruct ? 'Mostra struttura' : 'Nascondi struttura'; $('hide').classList.toggle('act', hideStruct);
  $('lab').textContent = labelsOn ? 'Etichette: sì' : 'Etichette: no'; $('lab').classList.toggle('act', !labelsOn);
}

/* ---------- ciclo ---------- */
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);
const clock = new THREE.Clock();
const v3 = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  stepTime += dt * speed;
  if (playing && stepTime > stepDur[cur] + hold) { if (cur < STEPS.length - 1) goto(cur + 1); else { playing = false; refreshUI(); } }
  parts.forEach(p => {
    const m = p.mesh; let vis = false;
    if (p.strip) {
      const s = p.strip;
      if (cur < s.rowStep) { vis = false; p.prog = 0; }
      else if (cur === s.rowStep) { const pr = (stepTime - p.timing[cur][0]) / p.timing[cur][1], e = ease(pr); vis = pr > 0; p.prog = pr; m.position.copy(s.rowPos); m.rotation.z = s.rowRot; m.scale.set(1, 1, 1); m.scale[s.axis] = Math.max(0.001, e); }
      else if (cur < s.placeStep) { vis = true; p.prog = 1; m.position.copy(s.rowPos); m.rotation.z = s.rowRot; m.scale.set(1, 1, 1); }
      else if (cur === s.placeStep) { const pr = (stepTime - p.timing[cur][0]) / p.timing[cur][1], e = ease(pr); vis = true; p.prog = 1; m.position.lerpVectors(s.rowPos, m.userData.final, e); m.rotation.z = s.rowRot * (1 - e); m.scale.set(1, 1, 1); }
      else { vis = true; p.prog = 1; m.position.copy(m.userData.final); m.rotation.z = 0; m.scale.set(1, 1, 1); }
    } else {
      const prog = p.step < cur ? 1 : p.step > cur ? 0 : (stepTime - p.delay) / p.dur, e = ease(prog);
      vis = prog > 0; p.prog = prog;
      if (p.tube) m.geometry.setDrawRange(0, Math.floor(m.userData.idxCount * e / 6) * 6);
      else m.position.copy(m.userData.final).addScaledVector(p.from, 1 - e);
    }
    m.visible = vis && !(hideStruct && p.group === 'struct');
  });
  ghost.visible = hideStruct; ghostH.visible = hideStruct;
  // vernice e raggi X sui listelli
  const ps = S.PAINT, pp = cur > ps ? 1 : cur < ps ? 0 : Math.min(1, Math.max(0, (stepTime - 0.4) / 1.8));
  paintMat.color.copy(RAW).lerp(WHITEC, pp); barMat.color.copy(paintMat.color);
  const xr = cur >= S.CUT && cur <= S.TEST2; barMat.transparent = xr; barMat.opacity = xr ? 0.2 : 1; barMat.depthWrite = !xr; barMat.needsUpdate = true;
  // accensione: set 1 dal collaudo 1, set 2 dal collaudo 2
  const ramp = from => cur > from ? 1 : cur === from ? Math.min(1, Math.max(0, (stepTime - 0.5) / 1.0)) : 0;
  STRIP1.emissiveIntensity = ramp(S.TEST1) * 1.1; STRIP2.emissiveIntensity = ramp(S.TEST2) * 1.1;
  const lp = ramp(S.ON); GLASS.emissiveIntensity = lp * 0.7; GLASS.opacity = 0.6 + lp * 0.3;
  bloom.strength = 0.15 + Math.max(ramp(S.TEST1), ramp(S.TEST2)) * 0.25 + lp * 0.1;
  if (camTween) { const a = 1 - Math.exp(-dt * 3); camera.position.lerp(camTween.pos, a); controls.target.lerp(camTween.tgt, a); if (camera.position.distanceTo(camTween.pos) < 3) camTween = null; }
  controls.update(); composer.render();
  // etichette
  const w = window.innerWidth, h = window.innerHeight;
  labels.forEach(p => {
    const l = p.label, stage = p.strip ? (cur === p.strip.rowStep ? 'row' : cur === p.strip.placeStep ? 'place' : '') : (p.step === cur ? 'cur' : '');
    const show = labelsOn && stage && p.mesh.visible && p.prog > 0.05;
    l.el.style.display = show ? 'block' : 'none';
    if (!show) return;
    v3.copy(stage === 'row' ? p.labelRow : l.pos).project(camera);
    l.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px)`;
  });
  requestAnimationFrame(frame);
}
resize(); goto(0); frame();
window.__install = { goto: i => { playing = false; goto(i); }, setTime: t => { stepTime = t; }, hide: v => { hideStruct = v; refreshUI(); }, steps: STEPS.length, dur: stepDur };
