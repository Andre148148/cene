import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const big = BW > 600, X = big ? [55, 178, 301, 424, 546, 669, 792, 915] : [40, 176, 302, 438], g = big ? 40 : 35, zbar = HU - g - 8;
for (const len of [444, 456, 468]) { const leds = [], bars = []; for (const x of X) { leds.push(...lineV(x, len, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } const r = simulate({ leds, bars, masks: [] }); console.log(big ? 'B' : 'A', len, (r.minmax * 100).toFixed(1) + '% / ' + (r.cv * 100).toFixed(1) + '%'); }
