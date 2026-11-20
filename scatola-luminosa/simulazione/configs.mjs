import { simulate, lineV, lineH, DOWN, UP, tiltIn, BW, BH, HU } from './radiosity.mjs';
const BARW = 10, BARH = 8, STRIPW = 10;
// ---------- layout: pezzi simbolici ----------
// V: {t:'V', x:'L'|'R'|frazione, len, yc?}  H: {t:'H', y:'B'|'T'|frazione, len, xc?}
const V = (x, len, yc = 0.5) => ({ t: 'V', x, len, yc });
const H = (y, len, xc = 0.5) => ({ t: 'H', y, len, xc });
const fr = (n, i) => (i + 0.5) / n;                                       // posizioni centrate
const spread = (n) => [...Array(n)].map((_, i) => i / (n - 1));           // da parete a parete
export const LAY = {
  'L1 cornice + 2 centrali V 108 (±60)': [V('L', 444), V('R', 444), H('B', 444), H('T', 444), V(-60, 108), V(60, 108)],
  'L2 cornice + 1 centrale V 216': [V('L', 444), V('R', 444), H('B', 444), H('T', 444), V(0, 216)],
  'L3 cornice + 2 centrali H 108': [V('L', 444), V('R', 444), H('B', 444), H('T', 444), H('b', 108), H('t', 108)],
  'L4 cornice sola (1776)': [V('L', 444), V('R', 444), H('B', 444), H('T', 444)],
  'L5 4 verticali uniformi + 2 H 108': [...spread(4).map(f => V(f, 444)), H('B', 108), H('T', 108)],
  'L6 5 verticali 396': spread(5).map(f => V(f, 396)),
  'L7 4 orizzontali uniformi + 2 V 108': [...spread(4).map(f => H(f, 444)), V('L', 108), V('R', 108)],
  'L8 3 verticali + 2 H 324': [...spread(3).map(f => V(f, 444)), H('B', 324), H('T', 324)],
  'L9 6 orizzontali 324': spread(6).map(f => H(f, 324)),
  'L10 7 verticali 276': spread(7).map(f => V(f, 276)),
  'L11 anello interno (inset 60) + 2 V 108': [V(60 / BW, 444 - 120), V(1 - 60 / BW, 444 - 120), H(60 / BH, BW - 120 - 60), H(1 - 60 / BH, BW - 120 - 60), V(-60, 108), V(60, 108)],
  'L12 5 verticali interni 396 (mai alle pareti)': [...Array(5)].map((_, i) => V(fr(5, i), 396)),
  'L13 5 orizzontali interni 396': [...Array(5)].map((_, i) => H(fr(5, i), 396)),
  'L15 2 coppie V (passo 16) + 2 H 108': [V(0.25 * BW / BW - 8 / BW, 444), V(0.25 + 8 / BW, 444), V(0.75 - 8 / BW, 444), V(0.75 + 8 / BW, 444), H('B', 108), H('T', 108)],
  'L16 4 verticali uniformi 444 (senza H)': spread(4).map(f => V(f, 444)),
  'L17 5 verticali 396 + H 108 sopra e sotto': [...spread(5).map(f => V(f, 360)), H('B', 108), H('T', 108)],
  'L14 cornice V soli lati + 3 H 324 (griglia)': [V('L', 444), V('R', 444), H(0.25, 324), H(0.5, 324), H(0.75, 324)],
};
// ---------- costruzione della configurazione ----------
export function build(layout, mount) {
  const e = mount.e, leds = [], bars = [], masks = [];
  const zbar = mount.kind === 'down' ? HU - mount.g - BARH : null;
  const zled = mount.kind === 'down' ? zbar - 1.2 : mount.kind === 'up' ? 1.5 : mount.kind === 'ceil' ? HU - 1 : mount.z;
  const nrm = mount.kind === 'down' || mount.kind === 'ceil' ? DOWN : mount.kind === 'up' ? UP : null;
  for (const pc of layout) {
    if (pc.t === 'V') {
      const x = pc.x === 'L' ? e : pc.x === 'R' ? BW - e : (typeof pc.x === 'number' && Math.abs(pc.x) > 1) ? BW / 2 + pc.x : pc.x * BW;
      const yc = pc.yc * BH, wall = (pc.x === 'L' || pc.x === 'R');
      if (mount.kind === 'side' || mount.kind === 'tilt') {
        if (!(pc.x === 'L' || pc.x === 'R')) return null;
        const side = pc.x === 'L' ? 1 : -1, n = mount.kind === 'side' ? [side, 0, 0] : tiltIn('x', side, mount.phi);
        leds.push(...lineV(x, pc.len, mount.z, n, yc));
      } else {
        leds.push(...lineV(x, pc.len, zled, nrm, yc));
        if (mount.kind === 'down') bars.push([x - BARW / 2, x + BARW / 2, 0, BH, zbar, zbar + BARH]);
        if (mount.kind === 'ceil') masks.push([x - STRIPW / 2, x + STRIPW / 2, yc - pc.len / 2, yc + pc.len / 2]);
      }
    } else {
      const yy = pc.y === 'B' ? e : pc.y === 'T' ? BH - e : pc.y === 'b' ? BH / 3 : pc.y === 't' ? 2 * BH / 3 : pc.y * BH;
      const xc = pc.xc * BW, wall = (pc.y === 'B' || pc.y === 'T');
      if (mount.kind === 'side' || mount.kind === 'tilt') {
        if (!wall) return null;
        const side = pc.y === 'B' ? 1 : -1, n = mount.kind === 'side' ? [0, side, 0] : tiltIn('y', side, mount.phi);
        leds.push(...lineH(yy, pc.len, mount.z, n, xc));
      } else {
        leds.push(...lineH(yy, pc.len, zled, nrm, xc));
        if (mount.kind === 'down') bars.push([0, BW, yy - BARW / 2, yy + BARW / 2, zbar, zbar + BARH]);
        if (mount.kind === 'ceil') masks.push([xc - pc.len / 2, xc + pc.len / 2, yy - STRIPW / 2, yy + STRIPW / 2]);
      }
    }
  }
  return { leds, bars, masks };
}
export const MOUNT = [
  { name: 'listello giù, cima a 0 mm dal pannello', kind: 'down', g: 0, e: 5 },
  { name: 'listello giù, cima a 10 mm dal pannello', kind: 'down', g: 10, e: 5 },
  { name: 'listello giù, cima a 15 mm dal pannello', kind: 'down', g: 15, e: 5 },
  { name: 'listello giù, cima a 20 mm dal pannello', kind: 'down', g: 20, e: 5 },
  { name: 'a terra, verso l\'alto (senza listelli)', kind: 'up', e: 5 },
  { name: 'incollata sotto il pannello, in basso (senza listelli)', kind: 'ceil', e: 5 },
];
export const WALLM = [];
for (const z of [12, 25, 40, 55]) WALLM.push({ name: `parete, orizzontale a ${z} mm da terra`, kind: 'side', z, e: 0.5 });
for (const z of [45, 60, 68]) for (const phi of [30, 45, 60]) WALLM.push({ name: `parete a ${z} mm, inclinata ${phi}° verso il basso`, kind: 'tilt', z, phi, e: 0.5 });
