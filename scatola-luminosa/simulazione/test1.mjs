import { simulate, lineV, lineH, DOWN, BW, BH, HU } from './radiosity.mjs';
const t0 = Date.now();
function down(g, lay) {
  const zb = HU - g - 8, zl = zb - 1.2, w = 5;
  const leds = [], bars = [];
  const V = (x, len) => { leds.push(...lineV(x, len, zl, DOWN)); bars.push([x - w, x + w, w * 2, BH - w * 2, zb, zb + 8]); };
  const Hz = (y, len) => { leds.push(...lineH(y, len, zl, DOWN)); bars.push([w * 2, BW - w * 2, y - w, y + w, zb, zb + 8]); };
  lay(V, Hz);
  return { leds, bars };
}
const frame = (V, H) => { V(5, 444); V(BW - 5, 444); H(5, 444); H(BH - 5, 444); };
for (const g of [0, 10, 20]) {
  const r = simulate(down(g, (V, H) => { frame(V, H); V(BW / 2 - 60, 108); V(BW / 2 + 60, 108); }));
  console.log('g=' + g, 'min/max', (r.minmax * 100).toFixed(0) + '%', 'CV', (r.cv * 100).toFixed(1) + '%', 'eta', (r.eta * 100).toFixed(0) + '%', 'bilancio diretto', (r.balance * 100).toFixed(0) + '%', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
