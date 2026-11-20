// Scansione sistematica (modello corretto: linee mai sul piano della parete, centro ≥ 5 mm perché il listello è largo 10 mm)
import fs from 'node:fs';
import { simulate, lineV, DOWN, UP as UPV, BW, BH, HU } from './radiosity.mjs';
const BARW = 10, BARH = 8;
const mk = (xs, g, len) => { if (process.env.UP) { const leds = []; for (const x of xs) leds.push(...lineV(x, len, 1.5, UPV)); return { leds, bars: [], masks: [] }; } const zbar = HU - g - BARH, z = zbar - 1.2, leds = [], bars = [];
  for (const x of xs) { leds.push(...lineV(x, len, z, DOWN)); bars.push([x - BARW / 2, x + BARW / 2, 0, BH, zbar, zbar + BARH]); } return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1));
const LEN = { 3: 444, 4: 444, 5: 396, 6: 324 };
const out = []; const t0 = Date.now();
const gs = (process.env.G || '10,15,20,25,30,35,40,45').split(',').map(Number), ns = (process.env.N || '3,4,5,6').split(',').map(Number);
for (const n of ns) for (const g of gs) for (let e = 5; e <= 100; e += 5) {
  const xs = uni(n, e); if (n > 1 && xs[1] - xs[0] < 20) continue;
  const r = simulate(mk(xs, g, LEN[n])); out.push({ n, g, e, minmax: r.minmax, cv: r.cv, eta: r.eta });
}
fs.writeFileSync('scan4u-' + (process.env.TAG || 'all') + '.json', JSON.stringify(out)); console.log('fine', out.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
