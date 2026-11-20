import { simulate, lineH, DOWN, BW, BH, HU } from './radiosity.mjs';
const mk = (ys, g, len) => { const zbar = HU - g - 8, leds = [], bars = []; for (const y of ys) { leds.push(...lineH(y, len, zbar - 1.2, DOWN, BW / 2)); bars.push([0, BW, y - 4, y + 4, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BH - 2 * e) / (n - 1));
for (const g of [35, 40]) for (const e of [40, 60, 80]) { const r = simulate(mk(uni(4, e), g, 960)); console.log(`intera, 4 linee orizz. da 960 mm, g=${g} e=${e}: ${(r.minmax * 100).toFixed(0)}% / ${(r.cv * 100).toFixed(1)}% / resa ${(r.eta * 100).toFixed(0)}%`); }
