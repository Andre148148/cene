import { simulate, lineV, DOWN, setParams, BW, BH, HU } from './radiosity.mjs';
const mk = (xs, g) => { const zbar = HU - g - 8, leds = [], bars = []; for (const x of xs) { leds.push(...lineV(x, 456, zbar - 1.2, DOWN)); bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1));
const p = (t, r) => console.log(t.padEnd(66), `${(r.minmax * 100).toFixed(1)}% / ${(r.cv * 100).toFixed(1)}%`);
if (BW < 600) {
  for (const g of [30, 35, 40]) {
    console.log('--- zona, g =', g);
    p('attuale 40/176/302/438 (passi 136-126-136, margine 40)', simulate(mk([40, 176, 302, 438], g)));
    p('equidistanti, margine 40 (40/172,5/305/437,5: passo 132,5)', simulate(mk(uni(4, 40), g)));
    p('campate uguali: margine = mezzo passo (59,7 · passo 119,4)', simulate(mk(uni(4, BW / 8), g)));
    for (const e of [45, 50, 55]) p(`equidistanti, margine ${e}`, simulate(mk(uni(4, e), g)));
  }
  console.log('--- robustezza g=35, ρ pareti'); for (const rho of [0.8, 0.9]) { setParams({ rho }); p(`ρ ${rho} margine 40`, simulate(mk(uni(4, 40), 35))); p(`ρ ${rho} campate uguali`, simulate(mk(uni(4, BW / 8), 35))); }
} else {
  for (const g of [35, 40]) { console.log('--- intera, g =', g); p('attuale: margine 55, passo 123', simulate(mk(uni(8, 55), g))); p('campate uguali: margine 60,6 (mezzo passo), passo 121,3', simulate(mk(uni(8, BW / 16), g))); p('margine 40', simulate(mk(uni(8, 40), g))); }
}
