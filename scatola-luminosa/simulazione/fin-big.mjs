import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const mk = (xs, g, len = 444) => { const zbar = HU - g - 8, leds = [], bars = []; for (const x of xs) { leds.push(...lineV(x, len, zbar - 1.2, DOWN)); bars.push([x - 5, x + 5, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1));
const f = r => `${(r.minmax * 100).toFixed(0)}% / ${(r.cv * 100).toFixed(1)}% / ${(r.eta * 100).toFixed(0)}%`;
for (const [n, e] of [[6, 85], [8, 55], [7, 60]]) for (const g of [30, 35, 40, 45]) console.log(`n${n} e${e} g${g}`, uni(n, e).map(x => x.toFixed(0)).join(','), f(simulate(mk(uni(n, e), g))));
