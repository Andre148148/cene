// Linee ORIZZONTALI (lungo x) nella zona 477,5×470, listelli lunghi quanto la zona
import { simulate, lineH, DOWN, BW, BH, HU } from './radiosity.mjs';
const out = [];
const mk = (ys, g, len) => { const zbar = HU - g - 8, leds = [], bars = []; for (const y of ys) { leds.push(...lineH(y, len, zbar - 1.2, DOWN, BW / 2)); bars.push([0, BW, y - 4, y + 4, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BH - 2 * e) / (n - 1));
const LEN = { 3: 456, 4: 456, 5: 396, 6: 324 };
for (const n of [3, 4, 5, 6]) for (const g of [30, 35, 40]) { let best = null; for (let e = 20; e <= 110; e += 10) { const r = simulate(mk(uni(n, e), g, LEN[n])); const o = { n, g, e, mm: r.minmax, cv: r.cv, eta: r.eta }; if (!best || o.mm - o.cv > best.mm - best.cv) best = o; } console.log(`orizz n=${n} len=${LEN[n]} g=${g}: migliore e=${best.e}  ${(best.mm * 100).toFixed(0)}% / ${(best.cv * 100).toFixed(1)}% / resa ${(best.eta * 100).toFixed(0)}%`); }
