import { simulate, lineH, DOWN, setParams, BW, BH, HU } from './radiosity.mjs';
const mk = (ys, g, len) => { const zbar = HU - g - 8, leds = [], bars = []; for (const y of ys) { leds.push(...lineH(y, len, zbar - 1.2, DOWN, BW / 2)); bars.push([0, BW, y - 4, y + 4, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BH - 2 * e) / (n - 1));
const p = (t, r) => console.log(t.padEnd(44), `${(r.minmax * 100).toFixed(0)}% / ${(r.cv * 100).toFixed(1)}% / resa ${(r.eta * 100).toFixed(0)}%`);
for (const e of [30, 35, 40, 45, 50]) p(`948 mm g=35 e=${e}`, simulate(mk(uni(4, e), 35, 948)));
p('924 mm g=35 e=40', simulate(mk(uni(4, 40), 35, 924)));
for (const g of [30, 40, 45]) p(`948 mm g=${g} e=40`, simulate(mk(uni(4, 40), g, 948)));
for (const [rho, rd, td] of [[0.8, .4, .55], [0.9, .4, .55], [0.85, .3, .65], [0.85, .5, .45]]) { setParams({ rho, rd, td }); p(`948 g=35 e=40 ρ${rho} R${rd} T${td}`, simulate(mk(uni(4, 40), 35, 948))); }
