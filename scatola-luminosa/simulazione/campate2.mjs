import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const mk = (xs, g) => { const zbar = HU - g - 8, leds = [], bars = []; for (const x of xs) { leds.push(...lineV(x, 456, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const p = (t, r) => console.log(t.padEnd(40), `${(r.minmax * 100).toFixed(1)}% / ${(r.cv * 100).toFixed(1)}% / ${(r.eta * 100).toFixed(0)}%`);
if (BW < 600) for (const g of [33, 35, 37, 40]) p(`zona 60/179/298/418 g=${g}`, simulate(mk([60, 179, 298, 418], g)));
else for (const g of [35, 38, 40, 42]) p(`intera 61..909 g=${g}`, simulate(mk([61, 182, 303, 424, 546, 667, 788, 909], g)));
