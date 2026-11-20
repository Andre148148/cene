// Senza traverso: 9 linee da 444, una delle quali fatta con i due avanzi da 216 mm (gap centrale 12 mm)
import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const mk = (xs, split, g, len = 444) => { const zbar = HU - g - 8, z = zbar - 1.2, leds = [], bars = [];
  xs.forEach((x, i) => { if (i === split) { const half = (len - 12) / 2; leds.push(...lineV(x, half, z, DOWN, BH / 2 - (half / 2 + 6)), ...lineV(x, half, z, DOWN, BH / 2 + (half / 2 + 6))); } else leds.push(...lineV(x, len, z, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); });
  return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1));
const p = (t, r) => console.log(t.padEnd(48), `${(r.minmax * 100).toFixed(0)}% / ${(r.cv * 100).toFixed(1)}% / resa ${(r.eta * 100).toFixed(0)}%`);
p('RIF 8 linee da 444, g=40 e=55', simulate(mk(uni(8, 55), -1, 40)));
p('RIF 8 linee da 456, g=40 e=55', simulate(mk(uni(8, 55), -1, 40, 456)));
for (const g of [35, 40]) for (const e of [35, 50, 60]) for (const sp of [4, 0, 2]) p(`9 da 444, split=linea ${sp}, g=${g} e=${e}`, simulate(mk(uni(9, e), sp, g)));
