import { simulate, lineV, lineH, DOWN, BW, BH, HU, GX, GY } from './radiosity.mjs';
const g = 20, zb = HU - g - 8, zl = zb - 1.2, w = 5, leds = [], bars = [];
const V = (x, len) => { leds.push(...lineV(x, len, zl, DOWN)); bars.push([x - w, x + w, w * 2, BH - w * 2, zb, zb + 8]); };
const Hz = (y, len) => { leds.push(...lineH(y, len, zl, DOWN)); bars.push([w * 2, BW - w * 2, y - w, y + w, zb, zb + 8]); };
V(5, 444); V(BW - 5, 444); Hz(5, 444); Hz(BH - 5, 444); V(BW / 2 - 60, 108); V(BW / 2 + 60, 108);
const r = simulate({ leds, bars });
const m = r.L.reduce((a, b) => a + b, 0) / r.L.length;
let out = '';
for (let j = GY - 1; j >= 0; j -= 3) { let row = ''; for (let i = 0; i < GX; i += 2) row += Math.max(0, Math.min(9, Math.round(r.L[j * GX + i] / m * 5))); out += row + '\n'; }
console.log(out);
