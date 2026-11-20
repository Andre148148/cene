// Uso dell'avanzo (216 mm per striscia) nella soluzione A: pezzi extra in una zona
import { simulate, lineV, lineH, DOWN, UP, BW, BH, HU } from './radiosity.mjs';
const g = 35, zbar = HU - g - 8, X0 = [40, 176, 302, 438];
const base = () => { const leds = [], bars = []; for (const x of X0) { leds.push(...lineV(x, 444, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const f = r => `${(r.minmax * 100).toFixed(1)}% / ${(r.cv * 100).toFixed(1)}% / resa ${(r.eta * 100).toFixed(1)}%  (f=${((r.minmax - r.cv) * 100).toFixed(1)})`;
const r0 = simulate(base()); console.log('base (4 linee)'.padEnd(46), f(r0)); const eta0 = r0.eta;
const run = (name, mod) => { const c = base(); mod(c); const r = simulate(c); console.log(name.padEnd(46), f(r), `luce ${((r.eta * (c.leds.length) / (r0.eta * 4 * 56) - 1) * 100).toFixed(0)}%`); };
const nl = (len) => len; 
for (const x of [108, 239, 370]) run(`+216 su, verticale a terra x=${x}`, c => c.leds.push(...lineV(x, 216, 1.5, UP)));
for (const x of [108, 239, 370]) run(`+216 giù con listello x=${x}`, c => { c.leds.push(...lineV(x, 216, zbar - 1.2, DOWN)); c.bars.push([x - 4, x + 4, BH / 2 - 108, BH / 2 + 108, zbar, zbar + 8]); });
for (const x of [239]) run(`+216 su, orizzontale a terra y=235 x=${x}`, c => c.leds.push(...lineH(BH / 2, 216, 1.5, UP, x)));
for (const x of [108, 239, 370]) run(`+108+108 su, verticali x=${x} (y=120/350)`, c => { c.leds.push(...lineV(x, 108, 1.5, UP, 120), ...lineV(x, 108, 1.5, UP, 350)); });
for (const y of [5, 465]) run(`+216 su, orizzontale a terra vicino parete y=${y}`, c => c.leds.push(...lineH(y + (y < 100 ? 25 : -25), 216, 1.5, UP, 239)));
run('+216 su lungo parete sx (x=15)', c => c.leds.push(...lineV(15, 216, 1.5, UP)));
run('+216 su lungo traverso (x=462)', c => c.leds.push(...lineV(462, 216, 1.5, UP)));
// allungare le 4 linee non è possibile (444 max). Alternativa: 5ª linea corta 216 ai due lati? già provato; 5 linee da 396 (1980)
const c5 = () => { const xs = [40, 139, 239, 338, 438], leds = [], bars = []; for (const x of xs) { leds.push(...lineV(x, 396, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
console.log('5 linee da 396 (usa 1980)'.padEnd(46), f(simulate(c5())));
