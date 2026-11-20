// Distanza listello-pannello (g) fino a 40 mm, numero/posizione delle linee verticali, margine dalle pareti
import fs from 'node:fs';
import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const BARW = 10, BARH = 8;
const mk = (xs, g, len = 444) => { const zbar = HU - g - BARH, z = zbar - 1.2, leds = [], bars = [];
  for (const x of xs) { leds.push(...lineV(x, len, z, DOWN)); bars.push([x - BARW / 2, x + BARW / 2, 0, BH, zbar, zbar + BARH]); } return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1));
const out = [], run = (name, xs, g, len) => { const r = simulate(mk(xs, g, len)); const o = { name, g, n: xs.length, xs: xs.map(x => +x.toFixed(0)), minmax: r.minmax, cv: r.cv, eta: r.eta }; out.push(o);
  console.log(`${name.padEnd(34)} g=${g} mm/max ${(r.minmax * 100).toFixed(0)}% CV ${(r.cv * 100).toFixed(1)}% resa ${(r.eta * 100).toFixed(0)}%`); };
for (const g of [15, 20, 25, 30, 35, 40]) run('4 linee, parete-parete (e=5)', uni(4, 5), g);
for (const g of [20, 30]) for (const n of [3, 4, 5, 6]) run(`${n} linee, e=5`, uni(n, 5), g);
for (const g of [20, 30]) for (const e of [5, 25, 40, 60, 80]) run(`4 linee, margine ${e}`, uni(4, e), g);
for (const g of [20, 30]) for (const e of [40, 80]) run(`5 linee, margine ${e}`, uni(5, e), g);
// linee con passo uguale e mezze-campate ai bordi (centrate): x=(i+.5)*BW/n
for (const g of [20, 30]) for (const n of [3, 4, 5]) run(`${n} linee centrate (campate uguali)`, [...Array(n)].map((_, i) => (i + .5) * BW / n), g);
fs.writeFileSync('scan3.json', JSON.stringify(out));
