import { simulate, setParams } from './radiosity.mjs';
import { LAY, build, MOUNT } from './configs.mjs';
const pick = (l, k) => [Object.keys(LAY).find(n => n.startsWith(l + ' ')), MOUNT[k]];
const fin = [['L16', 3], ['L16', 2], ['L5', 3], ['L5', 2], ['L14', 3], ['L12', 4], ['L6', 4], ['L1', 0]];
const vars = [['base', {}], ['pareti 0,80', { rho: 0.80 }], ['pareti 0,90', { rho: 0.90 }], ['pannello T 0,50 R 0,45', { td: 0.50, rd: 0.45 }], ['pannello T 0,60 R 0,35', { td: 0.60, rd: 0.35 }]];
for (const [l, k] of fin) {
  const [ln, m] = pick(l, k); const cfg = build(LAY[ln], m);
  let row = `${ln.slice(0, 40).padEnd(40)} ${m.name.slice(0, 34).padEnd(34)}`;
  for (const [vn, v] of vars) { setParams({ rho: 0.85, rd: 0.40, td: 0.55, ...v }); const r = simulate(cfg); row += ` | ${vn}: ${(r.minmax * 100).toFixed(0)}%/${(r.cv * 100).toFixed(1)}%/${(r.eta * 100).toFixed(0)}%`; }
  console.log(row);
}
