// Schema del "giro" delle strisce con 4 m: pianta + piano di taglio. Uso: node presentazione/giro.mjs  (poi giro.cjs per il PNG)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const L = 1000, W = 500, T = 15, PL = 970, PW = 470, BAY = (PL - 2 * T) / 3, BARW = 8;
const xs = i => -PL / 2 + i * (BAY + T);
const s = 0.24, ox = 22, oy = 36;
const X = x => ox + (x + L / 2) * s, Y = y => oy + (W / 2 - y) * s;
const R = (x, y, w, h, f, st = '#222', sw = 0.25, ex = '') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${f}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
const Tx = (x, y, t, o = {}) => `<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" font-size="${o.size || 3}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}"${o.bold ? ' font-weight="700"' : ''}${o.rot ? ` transform="rotate(${o.rot} ${(+x).toFixed(2)} ${(+y).toFixed(2)})"` : ''}>${t}</text>`;
let g = `<defs><pattern id="wood" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="#ecd8ae"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#a07c44" stroke-width="0.35"/></pattern><pattern id="av" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="#eee"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#aaa" stroke-width="0.3"/></pattern></defs>`;
g += Tx(ox, 12, 'Giro consigliato con 4 m di striscia: linee sui lati corti di ogni campata + 150 mm al centro dei lati lunghi', { anchor: 'start', size: 3.6, bold: true });
g += Tx(ox, 18, 'Pianta, pannello opalino rimosso – scala 1:4,2 · pezzi: 6 × 470 mm + 6 × 150 mm = 3720 mm', { anchor: 'start', size: 2.8, fill: '#555' });
g += R(X(-L / 2), Y(W / 2), L * s, W * s, 'url(#wood)', '#333', 0.4);
g += R(X(-PL / 2), Y(PW / 2), PL * s, PW * s, '#fbfbf8', '#444', 0.25);
[xs(1) - T, xs(2) - T].forEach(x => { g += R(X(x), Y(PW / 2), T * s, PW * s, 'url(#wood)', '#333', 0.25); });
for (let i = 0; i < 3; i++) {
  const x0 = xs(i), x1 = x0 + BAY, cx = (x0 + x1) / 2;
  // listelli (grigio chiaro, solo supporto)
  g += R(X(x0), Y(PW / 2), BARW * s, PW * s, '#f4f4f0', '#aaa', 0.15) + R(X(x1 - BARW), Y(PW / 2), BARW * s, PW * s, '#f4f4f0', '#aaa', 0.15);
  g += R(X(x0 + BARW), Y(PW / 2), (BAY - 2 * BARW) * s, BARW * s, '#f4f4f0', '#aaa', 0.15) + R(X(x0 + BARW), Y(-PW / 2 + BARW), (BAY - 2 * BARW) * s, BARW * s, '#f4f4f0', '#aaa', 0.15);
  // strisce attive (giallo)
  g += R(X(x0), Y(PW / 2), BARW * s, PW * s, '#f2c14e', '#a37a10', 0.2) + R(X(x1 - BARW), Y(PW / 2), BARW * s, PW * s, '#f2c14e', '#a37a10', 0.2);
  g += R(X(cx - 75), Y(PW / 2), 150 * s, BARW * s, '#f2c14e', '#a37a10', 0.2) + R(X(cx - 75), Y(-PW / 2 + BARW), 150 * s, BARW * s, '#f2c14e', '#a37a10', 0.2);
  g += Tx(X(x0) - 1.2, Y(0), '470', { size: 2.6, rot: -90, fill: '#7a5a00' }) + Tx(X(x1) + 3.2, Y(0), '470', { size: 2.6, rot: -90, fill: '#7a5a00' });
  g += Tx(X(cx), Y(PW / 2) - 1, '150', { size: 2.5, fill: '#7a5a00' }) + Tx(X(cx), Y(-PW / 2) + 4.6, '150', { size: 2.5, fill: '#7a5a00' });
  g += Tx(X(cx), Y(0) - 3, 'campata ' + (i + 1), { size: 3.3, fill: '#556' });
}
// fili in parallelo: da testata sinistra, attraverso i fori Ø8 nei traversi
const wy = Y(0) + 6;
g += `<line x1="${X(-L / 2 + 7)}" y1="${wy}" x2="${X(PL / 2 - 20)}" y2="${wy}" stroke="#c33" stroke-width="0.5" stroke-dasharray="1.4 0.8"/>`;
g += `<circle cx="${X(-L / 2 + T / 2)}" cy="${wy}" r="1.8" fill="#fff" stroke="#c33" stroke-width="0.35"/>` + Tx(X(-L / 2 + T / 2), wy + 0.9, 'F', { size: 2.2, fill: '#c33', bold: true });
[xs(1) - T / 2, xs(2) - T / 2].forEach(x => { g += `<circle cx="${X(x)}" cy="${wy}" r="1.6" fill="#fff" stroke="#c33" stroke-width="0.35"/>` + Tx(X(x), wy + 0.8, 'T', { size: 2, fill: '#c33', bold: true }); });
g += Tx(X(xs(2)) + 6, wy + 4.5, 'filo di alimentazione (rosso) in parallelo', { size: 2.4, fill: '#c33', anchor: 'start' });
// piano di taglio
const cy0 = 176 - 0, ks = 0.12, cx0 = 22;
g += Tx(cx0, cy0 - 12, 'Piano di taglio: ogni striscia da 2 m si taglia in 3 × 470 + 3 × 150 mm (restano ≈ 140 mm)', { anchor: 'start', size: 3.2, bold: true });
for (let n = 0; n < 2; n++) {
  const y = cy0 - 6 + n * 12; let x = 0;
  g += Tx(cx0 - 2, y + 4.4, 'striscia ' + (n + 1), { anchor: 'end', size: 2.6 });
  [470, 470, 470, 150, 150, 150].forEach(len => { g += R(cx0 + x * ks, y, len * ks, 6, '#f2c14e', '#a37a10', 0.25) + Tx(cx0 + (x + len / 2) * ks, y + 4, len, { size: 2.8 }); x += len + 3; });
  g += R(cx0 + x * ks, y, (2000 - x) * ks, 6, 'url(#av)', '#aaa', 0.2) + Tx(cx0 + (x + (2000 - x) / 2) * ks, y + 4, 'avanzo', { size: 2.3, fill: '#777' });
}
// confronto
g += Tx(150, 118 + 0, '', {});
fs.writeFileSync(path.join(here, 'giro.html'), `<!DOCTYPE html><html><body style="margin:0;background:#fff"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="1600" height="1131" font-family="DejaVu Sans, Arial, sans-serif">${g}</svg></body></html>`);
console.log('ok');
