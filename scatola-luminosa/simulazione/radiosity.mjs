// Simulazione a radiosità multi-rimbalzo di UNA zona della scatola (cavità 477,5 × 470 × 75 mm).
// - superfici: fondo, 4 pareti (bianco opaco, ρ = 0,85), pannello opalino sul soffitto (R = 0,40 riflesso, T = 0,55 trasmesso, 0,05 assorbito)
// - sorgenti: LED lambertiani (flusso unitario), puntiformi a passo 8 mm, con orientamento arbitrario
// - rimbalzi: sistema lineare risolto per iterazione (Gauss–Seidel), 40 iterazioni
// - listelli: ostacoli parallelepipedi che ombreggiano il percorso fondo/pareti → pannello (test raggio–AABB con 3×3 raggi per patch)
// - raccolta finale (final gather) del pannello su griglia fine a 8 mm, poi diffusione laterale gaussiana nel pannello (σ = 6 mm)
// - strisce incollate sotto il pannello: maschera opaca di larghezza pari alla striscia (nessuna trasmissione)
export const BW = 477.5, BH = 470, HU = 75;
export let RHO = 0.85, RD = 0.40, TD = 0.55;
const NX = 24, NY = 24, NZ = 4;
const dx = BW / NX, dy = BH / NY, dz = HU / NZ;

/* ---------- patch grossolane ---------- */
const C = [], N = [], A = [], RH = [], TYPE = [];     // TYPE: 0 fondo, 1 parete, 2 soffitto
const push = (c, n, a, rho, t) => { C.push(c); N.push(n); A.push(a); RH.push(rho); TYPE.push(t); };
for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) push([(i + .5) * dx, (j + .5) * dy, 0], [0, 0, 1], dx * dy, RHO, 0);
for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) { push([0, (j + .5) * dy, (k + .5) * dz], [1, 0, 0], dy * dz, RHO, 1); push([BW, (j + .5) * dy, (k + .5) * dz], [-1, 0, 0], dy * dz, RHO, 1); }
for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) { push([(i + .5) * dx, 0, (k + .5) * dz], [0, 1, 0], dx * dz, RHO, 1); push([(i + .5) * dx, BH, (k + .5) * dz], [0, -1, 0], dx * dz, RHO, 1); }
const nLow = C.length;                                                    // fondo + pareti
for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) push([(i + .5) * dx, (j + .5) * dy, HU], [0, 0, -1], dx * dy, RD, 2);
const NP = C.length, nCeil = NP - nLow;
const sub = (k, c, n) => {                                                // 3×3 punti campione sul patch k
  const out = [], cc = C[k], nn = N[k];
  const axes = nn[0] !== 0 ? [[0, 1, 0, dy], [0, 0, 1, dz]] : nn[1] !== 0 ? [[1, 0, 0, dx], [0, 0, 1, dz]] : [[1, 0, 0, dx], [0, 1, 0, dy]];
  for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) out.push([cc[0] + (axes[0][0] * u * axes[0][3] + axes[1][0] * v * axes[1][3]) / 3, cc[1] + (axes[0][1] * u * axes[0][3] + axes[1][1] * v * axes[1][3]) / 3, cc[2] + (axes[0][2] * u * axes[0][3] + axes[1][2] * v * axes[1][3]) / 3]);
  return out;
};
const SUB = [...Array(NP)].map((_, k) => sub(k));
const SUBFc = new Map();
function SUBF(k) {                                                         // 10×10 punti campione sul patch k (per il campo vicino)
  if (SUBFc.has(k)) return SUBFc.get(k);
  const out = [], cc = C[k], nn = N[k], M = 10;
  const axes = nn[0] !== 0 ? [[0, 1, 0, dy], [0, 0, 1, dz]] : nn[1] !== 0 ? [[1, 0, 0, dx], [0, 0, 1, dz]] : [[1, 0, 0, dx], [0, 1, 0, dy]];
  for (let u = 0; u < M; u++) for (let v = 0; v < M; v++) { const fu = (u + .5) / M - .5, fv = (v + .5) / M - .5; out.push([cc[0] + axes[0][0] * fu * axes[0][3] + axes[1][0] * fv * axes[1][3], cc[1] + axes[0][1] * fu * axes[0][3] + axes[1][1] * fv * axes[1][3], cc[2] + axes[0][2] * fu * axes[0][3] + axes[1][2] * fv * axes[1][3]]); }
  SUBFc.set(k, out); return out;
}

/* ---------- matrice dei fattori di forma (senza ostacoli) ---------- */
const F = new Float32Array(NP * NP);
const near = 2.6 * Math.max(dx, dy, dz);
for (let i = 0; i < NP; i++) for (let j = 0; j < NP; j++) {
  if (i === j) continue;
  const ni = N[i], nj = N[j];
  if (ni[0] === nj[0] && ni[1] === nj[1] && ni[2] === nj[2]) continue;      // stessa orientazione: coplanari o affacciati paralleli stesso verso
  const d0 = Math.hypot(C[i][0] - C[j][0], C[i][1] - C[j][1], C[i][2] - C[j][2]);
  let f = 0;
  const pairs = d0 < near ? 81 : 1;
  if (pairs === 1) {
    const d = [C[j][0] - C[i][0], C[j][1] - C[i][1], C[j][2] - C[i][2]], r2 = d0 * d0;
    const ci = (d[0] * ni[0] + d[1] * ni[1] + d[2] * ni[2]) / d0, cj = -(d[0] * nj[0] + d[1] * nj[1] + d[2] * nj[2]) / d0;
    if (ci > 0 && cj > 0) f = ci * cj * A[j] / (Math.PI * r2);
  } else {
    let s = 0;
    for (const a of SUB[i]) for (const b of SUB[j]) {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], r2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], r = Math.sqrt(r2);
      if (r < 1e-6) continue;
      const ci = (d[0] * ni[0] + d[1] * ni[1] + d[2] * ni[2]) / r, cj = -(d[0] * nj[0] + d[1] * nj[1] + d[2] * nj[2]) / r;
      if (ci > 0 && cj > 0) s += ci * cj / (Math.PI * r2);
    }
    f = s / 81 * A[j];
  }
  F[i * NP + j] = f;
}

/* ---------- raccolta finale: griglia fine sul pannello ---------- */
export const GX = 60, GY = 59, gdx = BW / GX, gdy = BH / GY;
const GPTS = [];
for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) GPTS.push([(i + .5) * gdx, (j + .5) * gdy, HU]);
const NG = GPTS.length;
const K = new Float32Array(NG * nLow);
for (let g = 0; g < NG; g++) for (let p = 0; p < nLow; p++) {
  const q = GPTS[g], c = C[p], n = N[p], d = [q[0] - c[0], q[1] - c[1], q[2] - c[2]], r2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], r = Math.sqrt(r2);
  const ca = (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / r, cb = d[2] / r;
  K[g * nLow + p] = ca > 0 && cb > 0 ? ca * cb * A[p] / (Math.PI * r2) : 0;
}

export function setParams(o) {                                          // varia riflettanza pareti, riflettanza e trasmissione del pannello
  if (o.rho !== undefined) RHO = o.rho; if (o.rd !== undefined) RD = o.rd; if (o.td !== undefined) TD = o.td;
  for (let k = 0; k < NP; k++) RH[k] = TYPE[k] === 2 ? RD : RHO;
}
/* ---------- ostacoli (listelli) ---------- */
function segHitsBox(a, b, bx) {                                           // segmento a→b interseca la scatola bx = [x0,x1,y0,y1,z0,z1]?
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) {
    const d = b[k] - a[k], lo = bx[2 * k], hi = bx[2 * k + 1];
    if (Math.abs(d) < 1e-9) { if (a[k] < lo || a[k] > hi) return false; }
    else { let u = (lo - a[k]) / d, v = (hi - a[k]) / d; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false; }
  }
  return true;
}

/* ---------- simulazione di una configurazione ---------- */
// cfg = { leds: [{p:[x,y,z], n:[nx,ny,nz]}], bars: [[x0,x1,y0,y1,z0,z1]], masks: [[x0,x1,y0,y1]] (strisce incollate sul pannello) }
export function simulate(cfg) {
  const leds = cfg.leds, bars = cfg.bars || [], masks = cfg.masks || [];
  const flux = leds.length;
  // irradianza diretta dei LED sui patch (campionamento adattivo: 8×8 punti se il LED è vicino al patch, altrimenti 3×3)
  const Ed = new Float64Array(NP);
  for (let k = 0; k < NP; k++) {
    let E = 0;
    for (const l of leds) {
      const d0 = Math.hypot(C[k][0] - l.p[0], C[k][1] - l.p[1], C[k][2] - l.p[2]);
      const pts = d0 < 60 ? SUBF(k) : SUB[k];
      let e = 0;
      for (const q of pts) {
        const d = [q[0] - l.p[0], q[1] - l.p[1], q[2] - l.p[2]], r2 = Math.max(d[0] * d[0] + d[1] * d[1] + d[2] * d[2], 4), r = Math.sqrt(r2);
        const cl = (d[0] * l.n[0] + d[1] * l.n[1] + d[2] * l.n[2]) / r, cp = -(d[0] * N[k][0] + d[1] * N[k][1] + d[2] * N[k][2]) / r;
        if (cl > 0 && cp > 0) e += (cl / Math.PI) * cp / r2;
      }
      E += e / pts.length;
    }
    Ed[k] = E;
  }
  // occlusione dei listelli sul percorso patch basso → soffitto
  let vis = null;
  if (bars.length) {
    vis = new Float32Array(nLow * nCeil);
    for (let i = 0; i < nLow; i++) for (let c = 0; c < nCeil; c++) {
      const a = C[i], subs = SUB[nLow + c]; let ok = 0;
      for (const b of subs) { let hit = false; for (const bx of bars) if (segHitsBox(a, b, bx)) { hit = true; break; } if (!hit) ok++; }
      vis[i * nCeil + c] = ok / 9;
    }
  }
  const balance = (() => { let t = 0; for (let k = 0; k < nLow; k++) t += Ed[k] * A[k]; return t / flux; })();
  // sistema di radiosità
  const B = new Float64Array(NP), Etot = new Float64Array(NP);
  let Atot = 0; for (let k = 0; k < NP; k++) Atot += A[k];
  const RB = 0.85; let Eadd = 0;
  for (let k = 0; k < NP; k++) { Etot[k] = Ed[k]; B[k] = RH[k] * Ed[k]; }
  for (let it = 0; it < 40; it++) {
    for (let i = 0; i < NP; i++) {
      let E = Ed[i] + Eadd;
      const row = i * NP;
      if (i < nLow) { for (let j = 0; j < nLow; j++) E += F[row + j] * B[j]; for (let c = 0; c < nCeil; c++) E += F[row + nLow + c] * (vis ? vis[i * nCeil + c] : 1) * B[nLow + c]; }
      else { const ci = i - nLow; for (let j = 0; j < nLow; j++) E += F[row + j] * (vis ? vis[j * nCeil + ci] : 1) * B[j]; }
      Etot[i] = E; B[i] = RH[i] * E;
    }
    if (vis) { let blocked = 0; for (let i = 0; i < nLow; i++) for (let c = 0; c < nCeil; c++) { const f = F[i * NP + nLow + c], v = vis[i * nCeil + c]; blocked += B[i] * A[i] * f * (1 - v) + B[nLow + c] * A[nLow + c] * F[(nLow + c) * NP + i] * (1 - v); } Eadd = RB * blocked / Atot; }
  }
  // raccolta finale sulla griglia fine del pannello
  const Eg = new Float64Array(NG);
  for (let g = 0; g < NG; g++) {
    const q = GPTS[g]; let E = 0;
    for (const l of leds) {
      const d = [q[0] - l.p[0], q[1] - l.p[1], q[2] - l.p[2]], r2 = Math.max(d[0] * d[0] + d[1] * d[1] + d[2] * d[2], 225), r = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      const cl = (d[0] * l.n[0] + d[1] * l.n[1] + d[2] * l.n[2]) / r;
      if (cl > 0) E += (cl / Math.PI) * (d[2] / r) / r2;
    }
    for (let p = 0; p < nLow; p++) {
      const kv = K[g * nLow + p]; if (kv === 0) continue;
      if (bars.length) { let hit = false; for (const bx of bars) if (segHitsBox(C[p], q, bx)) { hit = true; break; } if (hit) continue; }
      E += B[p] * kv;
    }
    Eg[g] = E + Eadd;
  }
  // luminanza uscente: trasmissione, maschere opache, diffusione laterale
  const L = new Float64Array(NG);
  for (let g = 0; g < NG; g++) {
    const q = GPTS[g]; let t = TD;
    for (const m of masks) if (q[0] >= m[0] && q[0] <= m[1] && q[1] >= m[2] && q[1] <= m[3]) { t = 0; break; }
    L[g] = Eg[g] * t;
  }
  const w = [1, Math.exp(-Math.pow(gdx, 2) / (2 * 36)), Math.exp(-Math.pow(2 * gdx, 2) / (2 * 36))];
  const blur = (arr, nx, ny, stepX) => { const out = new Float64Array(arr.length); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let s = 0, ws = 0; for (let k = -2; k <= 2; k++) { const ii = i + k; if (ii < 0 || ii >= nx) continue; const wk = w[Math.abs(k)]; s += wk * arr[j * nx + ii]; ws += wk; } out[j * nx + i] = s / ws; } return out; };
  const tr = (arr) => { const out = new Float64Array(arr.length); for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) out[i * GY + j] = arr[j * GX + i]; return out; };
  let Lb = blur(L, GX, GY, gdx); Lb = tr(Lb); Lb = blur(Lb, GY, GX, gdy); Lb = (() => { const out = new Float64Array(NG); for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) out[j * GX + i] = Lb[i * GY + j]; return out; })();
  // statistiche (esclusi 20 mm di bordo)
  let mn = 1e30, mx = 0, s = 0, s2 = 0, n = 0, tot = 0;
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const v = Lb[j * GX + i]; tot += v;
    const x = (i + .5) * gdx, y = (j + .5) * gdy; if (x < 20 || y < 20 || x > BW - 20 || y > BH - 20) continue;
    mn = Math.min(mn, v); mx = Math.max(mx, v); s += v; s2 += v * v; n++;
  }
  const m = s / n, eta = tot * gdx * gdy / flux;                             // frazione del flusso LED trasmessa dal pannello
  return { minmax: mn / mx, cv: Math.sqrt(Math.max(0, s2 / n - m * m)) / m, mean: m, eta, flux, balance, L: Lb };
}

/* ---------- generatori di LED ---------- */
export const DOWN = [0, 0, -1], UP = [0, 0, 1];
export const lineV = (x, len, z, n, yc = BH / 2, step = 8) => { const a = []; for (let y = yc - len / 2; y <= yc + len / 2 + 1e-6; y += step) a.push({ p: [x, y, z], n }); return a; };
export const lineH = (y, len, z, n, xc = BW / 2, step = 8) => { const a = []; for (let x = xc - len / 2; x <= xc + len / 2 + 1e-6; x += step) a.push({ p: [x, y, z], n }); return a; };
export const tiltIn = (axis, side, phi) => {                               // normale inclinata di φ rispetto alla verticale (verso il basso) verso l'interno
  const s = Math.sin(phi * Math.PI / 180), c = Math.cos(phi * Math.PI / 180);
  if (axis === 'x') return [side * s, 0, -c];                              // parete x: side = +1 se la parete è a x = 0 (interno verso +x)
  return [0, side * s, -c];
};
