import fs from 'node:fs';
import { simulate, lineV, DOWN, UP, BW, BH, HU, GX, GY } from './radiosity.mjs';   // BW=970
const here = new URL('.', import.meta.url).pathname;
const zl = JSON.parse(fs.readFileSync(here + 'zone-L.json'));
const vert = (xs, g, up, len = 444) => { const zbar = HU - g - 8, leds = [], bars = []; for (const x of xs) { leds.push(...lineV(x, len, up ? 1.5 : zbar - 1.2, up ? UP : DOWN)); if (!up) bars.push([x - 4, x + 4, 0, BH, zbar, zbar + 8]); } return { leds, bars, masks: [] }; };
const uni = (n, e) => [...Array(n)].map((_, i) => e + i * (BW - 2 * e) / (n - 1));
const col = v => { const k = Math.max(0, Math.min(1, v / 1.6)); return `rgb(${Math.round(25 + 230 * k)},${Math.round(28 + 216 * k)},${Math.round(45 + 170 * k)})`; };
const W = 128, H = W * BH / BW, cell = (x, y, w, h, v) => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(w + .05).toFixed(2)}" height="${(h + .05).toFixed(2)}" fill="${col(v)}"/>`;
const heatFull = (L, x0, y0) => { const m = L.reduce((a, b) => a + b, 0) / L.length, cw = W / GX, ch = H / GY; let s = ''; for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) s += cell(x0 + i * cw, y0 + (GY - 1 - j) * ch, cw, ch, L[j * GX + i] / m); return s + `<rect x="${x0}" y="${y0}" width="${W}" height="${H.toFixed(2)}" fill="none" stroke="#222" stroke-width=".3"/>`; };
const heatZones = (x0, y0) => { const L = zl.L, m = L.reduce((a, b) => a + b, 0) / L.length, zw = W * 477.5 / 970, dw = W * 15 / 970, cw = zw / zl.GX, ch = H / zl.GY; let s = '';
  for (let j = 0; j < zl.GY; j++) for (let i = 0; i < zl.GX; i++) { const v = L[j * zl.GX + i] / m, y = y0 + (zl.GY - 1 - j) * ch; s += cell(x0 + i * cw, y, cw, ch, v) + cell(x0 + zw + dw + (zl.GX - 1 - i) * cw, y, cw, ch, v); }
  s += `<rect x="${(x0 + zw).toFixed(2)}" y="${y0}" width="${dw.toFixed(2)}" height="${H.toFixed(2)}" fill="${col(0.12)}"/>`; return s + `<rect x="${x0}" y="${y0}" width="${W}" height="${H.toFixed(2)}" fill="none" stroke="#222" stroke-width=".3"/>`; };
const D = [];
const add = (t, sub, r, draw) => D.push({ t, sub, r, draw });
add('A · CON traverso centrale (2 zone da 4 linee)', 'listelli a 35 mm dal pannello, linee a x = 40, 176, 302, 438 mm da ogni parete esterna', { minmax: zl.minmax, cv: zl.cv, eta: zl.eta }, (x, y) => heatZones(x, y));
let r = simulate(vert(uni(8, 55), 40, false)); add('B · SENZA traverso, 8 linee (4+4)', 'listelli a 40 mm, linee a 55 mm dalle pareti, passo 123 mm', r, (x, y) => heatFull(r.L, x, y));
r = simulate(vert(uni(6, 85), 40, false)); const r6 = r; add('C · SENZA traverso, 6 linee (3+3)', 'listelli a 40 mm, linee a 85 mm dalle pareti, passo 160 mm', r6, (x, y) => heatFull(r6.L, x, y));
const r9 = simulate(vert(uni(9, 45), 0, true, 432)); add('D · SENZA traverso, led a terra verso l\'alto, 9 linee', 'senza listelli: più luce (resa +25%), un po\' meno uniforme', r9, (x, y) => heatFull(r9.L, x, y));
let g = `<text x="12" y="12" font-size="4.2" font-weight="700" fill="#111">Mappe di luminosità sul pannello 970 × 470 mm – colore = luce relativa alla media di ogni mappa</text>`;
D.forEach((x, i) => { const cx = 12 + (i % 2) * 143, cy = 28 + Math.floor(i / 2) * 82;
  g += `<text x="${cx}" y="${cy - 3}" font-size="3.3" font-weight="700" fill="#111">${x.t}</text>` + x.draw(cx, cy);
  g += `<text x="${cx}" y="${(cy + H + 4.5).toFixed(1)}" font-size="2.8" fill="#333">zona scura/chiara ${(x.r.minmax * 100).toFixed(0)}% · variazione ${(x.r.cv * 100).toFixed(1)}% · resa ${(x.r.eta * 100).toFixed(0)}%</text><text x="${cx}" y="${(cy + H + 8.5).toFixed(1)}" font-size="2.4" fill="#666">${x.sub}</text>`; });
fs.writeFileSync(here + 'report2.html', `<!DOCTYPE html><html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="1600" height="1131" font-family="DejaVu Sans, Arial, sans-serif"><rect width="297" height="210" fill="#fff"/>${g}</svg></body></html>`);
console.log(D.map(x => `${x.t}: ${(x.r.minmax * 100).toFixed(0)}/${(x.r.cv * 100).toFixed(1)}/${(x.r.eta * 100).toFixed(0)}`).join('\n'));
