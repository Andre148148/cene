import { simulate, lineV, DOWN, UP, setParams, BW, BH, HU } from './radiosity.mjs';
const mk = (xs, g, len = 444, up = false) => { const zbar = HU - g - 8, leds = [], bars = []; for (const x of xs) { leds.push(...lineV(x, len, up ? 1.5 : zbar - 1.2, up ? UP : DOWN)); if (!up) bars.push([x - 5, x + 5, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const f = r => `${(r.minmax * 100).toFixed(0)}% / ${(r.cv * 100).toFixed(1)}% / ${(r.eta * 100).toFixed(0)}%`;
const A = [40, 176, 302, 438], U = [40, 132.5 + 40, 305, 437.5];
console.log('g-sensibilità, linee x=40,176,302,438'); for (const g of [20, 25, 30, 35, 40, 45, 50]) console.log(' g', g, f(simulate(mk(A, g))));
console.log('tolleranza posizione (g=40): tutte +4 mm / -4 mm / alternate ±4'); for (const d of [[4, 4, 4, 4], [-4, -4, -4, -4], [4, -4, 4, -4], [-6, 6, -6, 6]]) console.log(' ', d.join(','), f(simulate(mk(A.map((x, i) => x + d[i]), 40))));
console.log('materiali g=40: rho pareti 0.80/0.85/0.90 ; pannello T/R');
for (const [rho, rd, td] of [[0.80, 0.40, 0.55], [0.90, 0.40, 0.55], [0.85, 0.30, 0.65], [0.85, 0.50, 0.45], [0.85, 0.40, 0.55]]) { setParams({ rho, rd, td }); console.log(` rho ${rho} R ${rd} T ${td}`, f(simulate(mk(A, 40)))); }
setParams({ rho: 0.85, rd: 0.40, td: 0.55 });
console.log('lunghezza linea 444 vs 420 vs 396 (g=40)'); for (const L of [444, 420, 396]) console.log(' ', L, f(simulate(mk(A, 40, L))));
