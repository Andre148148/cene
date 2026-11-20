import { simulate, lineV, DOWN, setParams, BW, BH, HU } from './radiosity.mjs';
const X0 = [40, 176, 302, 438];
for (const g of [30, 35, 40]) for (const [rho] of [[0.8], [0.85], [0.9]]) { setParams({ rho }); const zbar = HU - g - 8, leds = [], bars = []; for (const x of X0) { leds.push(...lineV(x, 456, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } const r = simulate({ leds, bars, masks: [] }); console.log('A456 g', g, 'rho', rho, (r.minmax * 100).toFixed(1), (r.cv * 100).toFixed(1)); }
