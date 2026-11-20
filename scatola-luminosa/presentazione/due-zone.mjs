// Scatola divisa in due zone da ~477 x 470 mm con un traverso centrale; una striscia per zona.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const L = 1000, W = 500, T = 15, PL = 970, PW = 470, ZW = (PL - T) / 2;   // 477,5
const s = 0.24, ox = 18, oy = 36, X = x => ox + (x + L / 2) * s, Y = y => oy + (W / 2 - y) * s;
const R = (x, y, w, h, f, st = '#222', sw = 0.25, ex = '') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${f}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
const Tx = (x, y, t, o = {}) => `<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" font-size="${o.size || 3}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}"${o.bold ? ' font-weight="700"' : ''}>${t}</text>`;
const Ln = (x1, y1, x2, y2, st = '#222', sw = 0.25, ex = '') => `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
let g = `<defs><pattern id="wood" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="#ecd8ae"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#a07c44" stroke-width="0.35"/></pattern></defs>`;
g += Tx(18, 10, 'Scatola in due zone: un traverso al centro, una striscia da 2 m per zona', { anchor: 'start', size: 4, bold: true });
g += Tx(18, 16, 'Pianta, pannello opalino rimosso · zone da 477,5 × 470 mm · ogni striscia = 4 × 444 + 2 × 108 mm = 1992 mm (taglio ogni 12 mm)', { anchor: 'start', size: 2.6, fill: '#555' });
g += R(X(-L / 2), Y(W / 2), L * s, W * s, 'url(#wood)', '#333', 0.4);
g += R(X(-PL / 2), Y(PW / 2), PL * s, PW * s, '#fbfbf8', '#444', 0.25);
g += R(X(-T / 2), Y(PW / 2), T * s, PW * s, 'url(#wood)', '#333', 0.3);                  // traverso
const strips = [[-1, '#f2c14e', 'ZONA SINISTRA · striscia 1 (spina A)'], [1, '#ffe39a', 'ZONA DESTRA · striscia 2 (spina B)']];
strips.forEach(([sg, col, name]) => {
  const x0 = sg < 0 ? -PL / 2 : T / 2, x1 = x0 + ZW, cx = (x0 + x1) / 2;       // limiti e centro zona
  const bar = (x, y, w, h) => g += R(X(x), Y(y), w * s, h * s, '#efefe9', '#b5b5ae', 0.12);
  // listelli di supporto: 2 verticali sui lati, 2 orizzontali, 2 ponti verticali al centro
  bar(x0, PW / 2, 8, PW); bar(x1 - 8, PW / 2, 8, PW);
  bar(x0 + 8, PW / 2, ZW - 16, 8); bar(x0 + 8, -PW / 2 + 8, ZW - 16, 8);
  [-60, 60].forEach(dx => bar(cx + dx - 4, PW / 2 - 8, 8, PW - 16));
  const V = (x, len) => g += R(X(x - 4), Y(len / 2), 8 * s, len * s, col, '#a37a10', 0.2);
  const Hs = (y, len) => g += R(X(cx - len / 2), Y(y + 4), len * s, 8 * s, col, '#a37a10', 0.2);
  V(x0 + 4, 444); V(x1 - 4, 444); Hs(PW / 2 - 4, 444); Hs(-PW / 2 + 4, 444); V(cx - 60, 108); V(cx + 60, 108);
  g += Tx(X(cx), Y(0) + 0.5, '2 × 108', { size: 2.4, fill: '#7a5a00', bold: true });
  g += Tx(X(cx), Y(PW / 2) + 9, '444', { size: 2.4, fill: '#7a5a00', bold: true }) + Tx(X(cx), Y(-PW / 2) - 5.5, '444', { size: 2.4, fill: '#7a5a00', bold: true });
  g += Tx(X(x0) + (sg < 0 ? 4.3 : 4.3), Y(0), '444', { size: 2.4, fill: '#7a5a00', bold: true }) + Tx(X(x1) - 4.3, Y(0), '444', { size: 2.4, fill: '#7a5a00', bold: true });
  g += Tx(X(cx), Y(-W / 2) + 11, name, { size: 3.2, bold: true });
});
g += Tx(X(0), Y(W / 2) - 2.5, 'traverso 15 mm', { size: 2.4, fill: '#733' });
// foro comune H
g += `<circle cx="${X(-12).toFixed(2)}" cy="${(Y(W / 2) + 1.8).toFixed(2)}" r="1.8" fill="#fff" stroke="#c33" stroke-width="0.4"/>` + Tx(X(-12), Y(W / 2) + 2.6, 'H', { size: 2, bold: true, fill: '#c33' });
g += Tx(X(-12) - 4, Y(W / 2) - 5.5, 'foro H comune per le due spine', { anchor: 'end', size: 2.4, fill: '#c33' });
// risultati
const ty = 188;
g += Tx(18, ty, 'Uniformità della luce (simulazione prudente, altezza utile 75 mm): più alto = meglio', { anchor: 'start', size: 3.2, bold: true });
[['Prima: scatola unica, 6 linee + 10 tratti', '49%', '12,2%'], ['Zona, 4 lati + 1 centrale da 216', '62%', '9,0%'], ['Zona, 4 lati + 2 centrali da 108 (questo schema)', '68%', '6,7%']].forEach((r, i) => { const y = ty + 6 + i * 5.2; g += Tx(20, y, r[0], { anchor: 'start', size: 2.8, bold: i === 2 }) + Tx(140, y, 'zona scura/chiara ' + r[1], { anchor: 'start', size: 2.8, bold: i === 2 }) + Tx(200, y, 'variazione ' + r[2], { anchor: 'start', size: 2.8, bold: i === 2 }); });
fs.writeFileSync(path.join(here, 'due-zone.html'), `<!DOCTYPE html><html><body style="margin:0;background:#fff"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="1600" height="1131" font-family="DejaVu Sans, Arial, sans-serif">${g}</svg></body></html>`);
console.log('ok');
