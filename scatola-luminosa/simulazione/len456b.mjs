import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const g = 40, zbar = HU - g - 8, xs = [55, 178, 301, 424, 546, 669, 792, 915];
for (const len of [444, 456]) { const leds = [], bars = []; for (const x of xs) { leds.push(...lineV(x, len, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } const r = simulate({ leds, bars, masks: [] }); console.log('B', len, (r.minmax * 100).toFixed(1), (r.cv * 100).toFixed(1), (r.eta * 100).toFixed(1)); }
