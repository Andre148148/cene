// Senza traverso: 9 e 10 linee verticali, con la lunghezza che le strisce permettono (5 pezzi da 396 mm per striscia)
import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const mk = (xs, lens, g) => { const zbar = HU - g - 8, leds = [], bars = []; xs.forEach((x, i) => { leds.push(...lineV(x, lens[i], zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); }); return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1));
const p = (t, r) => console.log(t.padEnd(52), `${(r.minmax * 100).toFixed(0)}% / ${(r.cv * 100).toFixed(1)}% / resa ${(r.eta * 100).toFixed(0)}%`);
p('RIF: 8 linee da 456 g=40 e=55', simulate(mk(uni(8, 55), Array(8).fill(456), 40)));
for (const g of [35, 40]) for (const e of [30, 45, 60, 75]) {
  p(`9 linee tutte 396 g=${g} e=${e}`, simulate(mk(uni(9, e), Array(9).fill(396), g)));
  p(`9 linee 396/456 alternate g=${g} e=${e}`, simulate(mk(uni(9, e), [...Array(9)].map((_, i) => i % 2 === 0 ? 396 : 456), g)));
}
for (const e of [40, 60]) p(`10 linee tutte 396 g=40 e=${e}`, simulate(mk(uni(10, e), Array(10).fill(396), 40)));
