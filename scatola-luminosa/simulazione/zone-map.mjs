import fs from 'node:fs';
import { simulate, lineV, DOWN, BW, BH, HU, GX, GY } from './radiosity.mjs';
const xs = [60, 179, 298, 418], g = 35, zbar = HU - g - 8, leds = [], bars = [];
for (const x of xs) { leds.push(...lineV(x, 456, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); }
const r = simulate({ leds, bars, masks: [] }); fs.writeFileSync('zone-L.json', JSON.stringify({ L: Array.from(r.L), GX, GY, minmax: r.minmax, cv: r.cv, eta: r.eta })); console.log(r.minmax, r.cv, r.eta);
