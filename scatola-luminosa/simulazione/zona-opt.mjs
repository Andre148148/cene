// Ricerca locale libera per UNA zona (477,5 × 470, con traverso): posizioni, lunghezze, verso (giù/su), distanza listello, numero linee
import fs from 'node:fs';
import { simulate, lineV, DOWN, UP, BW, BH, HU } from './radiosity.mjs';
const BARW = 10, BARH = 8, MAXLEN = 1992;
const build = (G) => { const leds = [], bars = [];
  for (const l of G.lines) { if (l.up) leds.push(...lineV(l.x, l.len, 1.5, UP)); else { const zbar = HU - G.g - BARH; leds.push(...lineV(l.x, l.len, zbar - 1.2, DOWN)); bars.push([l.x - BARW / 2, l.x + BARW / 2, 0, BH, zbar, zbar + BARH]); } }
  return { leds, bars, masks: [] }; };
const cache = new Map();
const ev = (G) => { const k = JSON.stringify(G); if (cache.has(k)) return cache.get(k); const r = simulate(build(G)); const o = { f: r.minmax - r.cv, minmax: r.minmax, cv: r.cv, eta: r.eta }; cache.set(k, o); return o; };
const ok = (G) => G.lines.every(l => l.x >= 5 && l.x <= BW - 5 && l.len >= 120 && l.len <= 444) && G.g >= 10 && G.g <= 50 && G.lines.reduce((s, l) => s + l.len, 0) <= MAXLEN && G.lines.every((l, i) => G.lines.every((m, j) => j <= i || Math.abs(l.x - m.x) >= 25 || l.up !== m.up));
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1));
const seeds = {
  d4: { g: 30, lines: uni(4, 40).map(x => ({ x, up: false, len: 444 })) },
  d3: { g: 35, lines: uni(3, 78).map(x => ({ x, up: false, len: 444 })) },
  d5: { g: 35, lines: uni(5, 40).map(x => ({ x, up: false, len: 396 })) },
  u4: { g: 30, lines: uni(4, 60).map(x => ({ x, up: true, len: 444 })) },
  m4: { g: 30, lines: uni(4, 50).map((x, i) => ({ x, up: i % 2 === 1, len: 444 })) },
  m3: { g: 35, lines: uni(3, 78).map((x, i) => ({ x, up: i === 1, len: 444 })) },
};
const name = process.env.SEED, G0 = JSON.parse(JSON.stringify(seeds[name]));
let best = G0, bv = ev(G0); console.log('INIT', name, bv.minmax.toFixed(3), bv.cv.toFixed(3), bv.eta.toFixed(3));
const clone = (G) => JSON.parse(JSON.stringify(G));
for (let pass = 0; pass < 14; pass++) {
  let improved = false; const cands = [];
  for (let i = 0; i < best.lines.length; i++) {
    for (const d of [-12, -5, -2, 2, 5, 12]) { const G = clone(best); G.lines[i].x += d; cands.push(G); }
    for (const d of [-24, -12, 12]) { const G = clone(best); G.lines[i].len += d; cands.push(G); }
    { const G = clone(best); G.lines[i].up = !G.lines[i].up; cands.push(G); }
    if (best.lines.length > 2) { const G = clone(best); G.lines.splice(i, 1); cands.push(G); }
  }
  for (const d of [-5, 5, -10, 10]) { const G = clone(best); G.g += d; cands.push(G); }
  if (best.lines.length < 6) for (const x of [60, 120, 180, 240, 300, 360, 420]) for (const up of [false, true]) { const G = clone(best); G.lines.push({ x, up, len: Math.min(444, MAXLEN - G.lines.reduce((s, l) => s + l.len, 0)) }); cands.push(G); }
  let bc = null, bf = bv.f;
  for (const G of cands) { if (!ok(G)) continue; const r = ev(G); if (r.f > bf + 1e-4) { bf = r.f; bc = G; } }
  if (bc) { best = bc; bv = ev(bc); improved = true; console.log(`pass ${pass}: minmax ${bv.minmax.toFixed(3)} CV ${bv.cv.toFixed(3)} resa ${bv.eta.toFixed(3)} g=${best.g} ` + best.lines.map(l => `${l.up ? 'U' : 'D'}${l.x.toFixed(0)}:${l.len}`).join(' ')); }
  if (!improved) break;
}
fs.writeFileSync(`zona-opt-${name}.json`, JSON.stringify({ G: best, r: bv }));
console.log('FINE', name, bv.minmax.toFixed(3), bv.cv.toFixed(3), bv.eta.toFixed(3));
