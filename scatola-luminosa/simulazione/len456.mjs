import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const g = 35, zbar = HU - g - 8, X0 = [40, 176, 302, 438];
for (const len of [420, 444, 456, 464]) { const leds = [], bars = []; for (const x of X0) { leds.push(...lineV(x, len, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } const r = simulate({ leds, bars, masks: [] }); console.log(len, (r.minmax * 100).toFixed(1), (r.cv * 100).toFixed(1), (r.eta * 100).toFixed(1)); }
