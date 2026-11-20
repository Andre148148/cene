// Bulloni di sostegno del pannello, punta a 5 mm sotto il pannello: si vedono?
import { simulate, lineV, DOWN, BW, BH, HU, GX, GY } from './radiosity.mjs';
const g = 35, zbar = HU - g - 8, X0 = [40, 176, 302, 438];
const base = () => { const leds = [], bars = []; for (const x of X0) { leds.push(...lineV(x, 456, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const at = (L, x, y) => { const i = Math.min(GX - 1, Math.floor(x / (BW / GX))), j = Math.min(GY - 1, Math.floor(y / (BH / GY))); return L[j * GX + i]; };
const ring = (L, x, y, r0, r1, pts) => { let s = 0, n = 0; for (const [dx, dy] of pts) { s += at(L, x + dx, y + dy); n++; } return s / n; };
const r0 = simulate(base());
console.log('base', (r0.minmax * 100).toFixed(1), (r0.cv * 100).toFixed(1));
const run = (name, bolts, cmp) => { const c = base(); for (const b of bolts) c.bars.push(b.box); const r = simulate(c);
  let worst = 0, txt = []; for (const b of bolts) { const v = at(r.L, b.x, b.y), ref = cmp(r0.L, b); const d = (v / ref - 1) * 100; worst = Math.min(worst, d); txt.push(d.toFixed(1)); }
  console.log(name.padEnd(54), `${(r.minmax * 100).toFixed(1)}% / ${(r.cv * 100).toFixed(1)}%   buio locale sopra il bullone (rispetto a prima): ${txt.join(' ')} %  | peggiore ${worst.toFixed(1)}%`); };
// confronto: stessa mappa senza bulloni, nello stesso punto
const same = (L, b) => at(L, b.x, b.y);
const zTop = HU - 5;                      // punta a 5 mm sotto il pannello
const ys = [235];                          // un bullone a metà lunghezza di ogni listello
const mk = (x, y, d, z0) => ({ x, y, box: [x - d / 2, x + d / 2, y - d / 2, y + d / 2, z0, zTop] });
for (const d of [6, 10]) {
  run(`sopra il listello (su ogni listello, y=235) Ø${d}`, X0.map(x => mk(x, 235, d, zbar + 8)), same);
  run(`in mezzo tra i listelli, dal pavimento, Ø${d}`, [108, 239, 370, 239].map((x, i) => mk(x, i === 3 ? 120 : 235, d, 0)), same);
}
// 4 bulloni per zona a quote diverse sopra i listelli
run('sopra i listelli, 2 per listello (y=120, 350) Ø6', X0.flatMap(x => [mk(x, 120, 6, zbar + 8), mk(x, 350, 6, zbar + 8)]), same);
