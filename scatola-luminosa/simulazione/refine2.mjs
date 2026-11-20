// Ricerca locale con linee ibride: ciascuna linea può stare sotto un listello (verso il basso) oppure a terra (verso l'alto).
// Uso: node refine2.mjs <g_mm> <iterazioni> <seed> <modo: hybrid|down|up>
import fs from 'node:fs';
import { simulate, lineV, lineH, DOWN, UP, BW, BH, HU } from './radiosity.mjs';
const g = +(process.argv[2] || 15), iters = +(process.argv[3] || 100), seed = +(process.argv[4] || 1), mode = process.argv[5] || 'hybrid';
let rs = seed * 7919; const rnd = () => (rs = (rs * 1664525 + 1013904223) % 4294967296) / 4294967296;
const BARH = 8, UNIT = 12, BUDGET = 166, zbar = HU - g - BARH, zd = zbar - 1.2, zu = 1.5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function cfgOf(gen) {
  const leds = [], bars = [];
  for (const l of gen) {
    const len = l.u * UNIT, down = l.o === 'd';
    if (l.t === 'V') { leds.push(...lineV(l.pos, len, down ? zd : zu, down ? DOWN : UP)); if (down) bars.push([l.pos - 5, l.pos + 5, 0, BH, zbar, zbar + BARH]); }
    else { leds.push(...lineH(l.pos, len, down ? zd : zu, down ? DOWN : UP)); if (down) bars.push([0, BW, l.pos - 5, l.pos + 5, zbar, zbar + BARH]); }
  }
  return { leds, bars };
}
const units = gen => gen.reduce((a, l) => a + l.u, 0);
function fix(gen) {
  gen.forEach(l => { l.u = clamp(Math.round(l.u), 3, l.t === 'V' ? 37 : 38); l.pos = clamp(l.pos, 5, (l.t === 'V' ? BW : BH) - 5); if (mode !== 'hybrid') l.o = mode === 'up' ? 'u' : 'd'; });
  let guard = 0; while (units(gen) > BUDGET && guard++ < 400) { gen.sort((a, b) => b.u - a.u); gen[0].u--; }
  guard = 0; while (FILL && units(gen) < BUDGET && guard++ < 60) { gen.sort((a, b) => a.u - b.u); const t = gen[0]; if (t.u < (t.t === 'V' ? 37 : 38)) t.u++; else break; }
  return gen;
}
const score = r => r.cv * 0.6 + (1 - r.minmax) * 0.4;
const o0 = mode === 'up' ? 'u' : 'd';
const INIT = process.env.INIT || 'start5', FILL = process.env.FILL !== '0';
let best = INIT === 'L16' ? fix([...Array(4)].map((_, i) => ({ t: 'V', pos: 5 + (BW - 10) * i / 3, u: 37, o: o0 })))
  : INIT === 'L5' ? fix([...Array(4)].map((_, i) => ({ t: 'V', pos: 5 + (BW - 10) * i / 3, u: 37, o: o0 })).concat([{ t: 'H', pos: 5, u: 9, o: o0 }, { t: 'H', pos: BH - 5, u: 9, o: o0 }]))
  : fix([...Array(5)].map((_, i) => ({ t: 'V', pos: 5 + (BW - 10) * i / 4, u: 30, o: o0 })).concat([{ t: 'H', pos: 5, u: 8, o: o0 }, { t: 'H', pos: BH - 5, u: 8, o: o0 }]));
console.log('INIT', INIT);
let bestR = simulate(cfgOf(best)), bestS = score(bestR);
for (let it = 0; it < iters; it++) {
  const gen = JSON.parse(JSON.stringify(best)), k = Math.floor(rnd() * 6), l = gen[Math.floor(rnd() * gen.length)];
  if (k === 0) l.pos += (rnd() - 0.5) * 70;
  else if (k === 1) l.u += Math.round((rnd() - 0.5) * 10);
  else if (k === 2 && mode === 'hybrid') l.o = l.o === 'd' ? 'u' : 'd';
  else if (k === 3 && gen.length > 3) gen.splice(gen.indexOf(l), 1);
  else if (k === 4 && gen.length < 10) gen.push({ t: rnd() < 0.7 ? 'V' : 'H', pos: 5 + rnd() * 400, u: 10, o: mode === 'hybrid' ? (rnd() < 0.5 ? 'd' : 'u') : o0 });
  else if (k === 5) { const l2 = gen[Math.floor(rnd() * gen.length)]; const d = Math.round((rnd() - 0.5) * 6); l.u += d; l2.u -= d; }
  fix(gen);
  const r = simulate(cfgOf(gen)), s = score(r);
  if (s < bestS) { best = gen; bestR = r; bestS = s; console.log(it, 'mm', (r.minmax * 100).toFixed(0) + '%', 'CV', (r.cv * 100).toFixed(1) + '%', 'resa', (r.eta * 100).toFixed(0) + '%', best.map(l => `${l.t}${l.o}${l.pos.toFixed(0)}:${l.u * UNIT}`).join(' ')); }
}
fs.writeFileSync(`ref2-${INIT}-${mode}-g${g}-s${seed}.json`, JSON.stringify({ mode, g, best, r: { minmax: bestR.minmax, cv: bestR.cv, eta: bestR.eta } }));
console.log('FINE', mode, 'g' + g, 'minmax', (bestR.minmax * 100).toFixed(0) + '%', 'CV', (bestR.cv * 100).toFixed(1) + '%', 'resa', (bestR.eta * 100).toFixed(0) + '%');
