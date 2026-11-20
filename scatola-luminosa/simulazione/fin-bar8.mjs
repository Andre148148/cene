import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const mk = (xs, g, bw) => { const zbar = HU - g - 8, leds = [], bars = []; for (const x of xs) { leds.push(...lineV(x, 444, zbar - 1.2, DOWN)); bars.push([x - bw / 2, x + bw / 2, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const f = r => `${(r.minmax * 100).toFixed(0)}% / ${(r.cv * 100).toFixed(1)}% / ${(r.eta * 100).toFixed(0)}%`;
if (BW < 600) { const A = [40, 176, 302, 438]; for (const bw of [8, 10]) for (const g of [30, 35, 40]) console.log('zona bar', bw, 'g', g, f(simulate(mk(A, g, bw)))); }
else { const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1)); for (const bw of [8]) for (const g of [35, 40, 45]) console.log('intera bar', bw, 'g', g, f(simulate(mk(uni(8, 55), g, bw)))); }
