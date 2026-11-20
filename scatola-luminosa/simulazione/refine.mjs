// Ricerca locale nella famiglia migliore: n verticali (posizioni libere, lunghezze a multipli di 12 mm) + tratti orizzontali centrati,
// con budget di 1992 mm (166 unità). Montaggio selezionabile (down g / up / ceil).
import fs from 'node:fs';
import { simulate, lineV, lineH, DOWN, UP, BW, BH, HU } from './radiosity.mjs';
const mode = process.argv[2] || 'down15', iters = +(process.argv[3] || 80), seed = +(process.argv[4] || 1);
let rs = seed; const rnd = () => (rs = (rs * 1664525 + 1013904223) % 4294967296) / 4294967296;
const BARW = 10, BARH = 8, UNIT = 12, BUDGET = 166;
const g = mode.startsWith('down') ? +mode.slice(4) : 0;
const kind = mode.startsWith('down') ? 'down' : mode;
const zbar = HU - g - BARH, zled = kind === 'down' ? zbar - 1.2 : kind === 'up' ? 1.5 : HU - 1, nrm = kind === 'up' ? UP : DOWN;
// genoma: verticali [{x, u}] (u in unità da 12 mm, centrate a metà altezza), orizzontali [{y, u}] centrate in x
function cfgOf(gen) {
  const leds = [], bars = [], masks = [];
  for (const v of gen.V) { const len = v.u * UNIT; leds.push(...lineV(v.x, len, zled, nrm)); if (kind === 'down') bars.push([v.x - 5, v.x + 5, 0, BH, zbar, zbar + BARH]); if (kind === 'ceil') masks.push([v.x - 5, v.x + 5, BH / 2 - len / 2, BH / 2 + len / 2]); }
  for (const h of gen.H) { const len = h.u * UNIT; leds.push(...lineH(h.y, len, zled, nrm)); if (kind === 'down') bars.push([0, BW, h.y - 5, h.y + 5, zbar, zbar + BARH]); if (kind === 'ceil') masks.push([BW / 2 - len / 2, BW / 2 + len / 2, h.y - 5, h.y + 5]); }
  return { leds, bars, masks };
}
const units = gen => gen.V.reduce((a, v) => a + v.u, 0) + gen.H.reduce((a, h) => a + h.u, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function fix(gen) {                                                         // porta il genoma nei limiti fisici e nel budget
  gen.V.forEach(v => { v.u = clamp(Math.round(v.u), 3, 37); v.x = clamp(v.x, 5, BW - 5); });
  gen.H.forEach(h => { h.u = clamp(Math.round(h.u), 3, 38); h.y = clamp(h.y, 5, BH - 5); });
  let guard = 0;
  while (units(gen) > BUDGET && guard++ < 400) { const all = [...gen.V, ...gen.H]; all.sort((a, b) => b.u - a.u); all[0].u--; }
  return gen;
}
const score = r => r.cv * 0.6 + (1 - r.minmax) * 0.4 + (0.55 - Math.min(0.55, r.eta)) * 0.15;   // più basso = meglio
function start() {
  const nV = 4 + Math.floor(rnd() * 3);
  const V = [...Array(nV)].map((_, i) => ({ x: 5 + (BW - 10) * i / (nV - 1), u: 32 })); const H = [{ y: 5, u: 9 }, { y: BH - 5, u: 9 }];
  return fix({ V, H });
}
let best = start(), bestR = simulate(cfgOf(best)), bestS = score(bestR);
console.log('inizio', mode, JSON.stringify(best), 'cv', bestR.cv.toFixed(3), 'mm', bestR.minmax.toFixed(2));
for (let it = 0; it < iters; it++) {
  const gen = JSON.parse(JSON.stringify(best));
  const k = Math.floor(rnd() * 5);
  if (k === 0 && gen.V.length) { const v = gen.V[Math.floor(rnd() * gen.V.length)]; v.x += (rnd() - 0.5) * 60; }
  else if (k === 1 && gen.V.length) { const v = gen.V[Math.floor(rnd() * gen.V.length)]; v.u += Math.round((rnd() - 0.5) * 8); }
  else if (k === 2 && gen.H.length) { const h = gen.H[Math.floor(rnd() * gen.H.length)]; h.y += (rnd() - 0.5) * 80; }
  else if (k === 3 && gen.H.length) { const h = gen.H[Math.floor(rnd() * gen.H.length)]; h.u += Math.round((rnd() - 0.5) * 8); }
  else if (k === 4) { if (rnd() < 0.5 && gen.V.length > 2) gen.V.splice(Math.floor(rnd() * gen.V.length), 1); else if (gen.V.length < 7) gen.V.push({ x: 5 + rnd() * (BW - 10), u: 12 }); if (rnd() < 0.3) { if (gen.H.length < 6) gen.H.push({ y: 5 + rnd() * (BH - 10), u: 8 }); } }
  fix(gen);
  // riempi il budget residuo allungando i pezzi più corti
  let guard = 0; while (units(gen) < BUDGET && guard++ < 40) { const all = [...gen.V, ...gen.H]; all.sort((a, b) => a.u - b.u); const t = all[0]; t.u++; fix(gen); }
  const r = simulate(cfgOf(gen)), s = score(r);
  if (s < bestS) { best = gen; bestR = r; bestS = s; console.log(it, 'mm', (r.minmax * 100).toFixed(0) + '%', 'CV', (r.cv * 100).toFixed(1) + '%', 'resa', (r.eta * 100).toFixed(0) + '%', 'V', best.V.map(v => `${v.x.toFixed(0)}:${v.u * UNIT}`).join(' '), 'H', best.H.map(h => `${h.y.toFixed(0)}:${h.u * UNIT}`).join(' ')); }
}
fs.writeFileSync(`refine-${mode}-${seed}.json`, JSON.stringify({ mode, best, r: { minmax: bestR.minmax, cv: bestR.cv, eta: bestR.eta } }));
console.log('FINE', mode, 'minmax', (bestR.minmax * 100).toFixed(0) + '%', 'CV', (bestR.cv * 100).toFixed(1) + '%', 'resa', (bestR.eta * 100).toFixed(0) + '%');
