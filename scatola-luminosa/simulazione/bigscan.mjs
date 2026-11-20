// Scatola intera 970×470 SENZA traverso: n linee verticali (lungo il lato corto), 2 strisce da 1992 mm in totale
import fs from 'node:fs';
import { simulate, lineV, lineH, DOWN, UP, BW, BH, HU } from './radiosity.mjs';
const BARW = 10, BARH = 8;
const LENS = { 6: 444, 7: 444, 8: 444, 9: 432, 10: 396, 11: 360, 12: 324 };
const vert = (xs, g, up, len) => { const zbar = HU - g - BARH, z = up ? 1.5 : zbar - 1.2, leds = [], bars = [];
  for (const x of xs) { leds.push(...lineV(x, len, z, up ? UP : DOWN)); if (!up) bars.push([x - BARW / 2, x + BARW / 2, 0, BH, zbar, zbar + BARH]); } return { leds, bars, masks: [] }; };
const horiz = (ys, g, up, len) => { const zbar = HU - g - BARH, z = up ? 1.5 : zbar - 1.2, leds = [], bars = [];
  for (const y of ys) { leds.push(...lineH(y, len, z, up ? UP : DOWN)); if (!up) bars.push([0, BW, y - BARW / 2, y + BARW / 2, zbar, zbar + BARH]); } return { leds, bars, masks: [] }; };
const uni = (n, e, L) => [...Array(n)].map((_, i) => e + i * (L - 2 * e) / (n - 1));
const out = [], t0 = Date.now(), mode = process.env.MODE || 'down';
const ns = (process.env.N || '8').split(',').map(Number);
for (const n of ns) {
  if (mode === 'horiz') { for (const g of [20, 30, 40]) for (let e = 5; e <= 120; e += 20) { const len = 960; if (n * len > 3984) continue; const r = simulate(horiz(uni(n, e, BH), g, false, len)); out.push({ mode, n, g, e, minmax: r.minmax, cv: r.cv, eta: r.eta }); } continue; }
  for (const g of mode === 'up' ? [0] : [20, 30, 40]) for (let e = 5; e <= 130; e += 10) {
    const xs = uni(n, e, BW); if (xs[1] - xs[0] < 25) continue;
    const r = simulate(vert(xs, g, mode === 'up', LENS[n])); out.push({ mode, n, g, e, minmax: r.minmax, cv: r.cv, eta: r.eta });
  }
}
fs.writeFileSync(`big-${mode}-${process.env.N.replace(/,/g, '_')}.json`, JSON.stringify(out)); console.log('fine', out.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
