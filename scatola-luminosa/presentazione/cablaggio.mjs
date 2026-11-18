// Schema dei collegamenti: dorsale + anello per campata. Uso: node presentazione/cablaggio.mjs && node presentazione/cablaggio.cjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const L = 1000, W = 500, T = 15, PL = 970, PW = 470, BAY = (PL - 2 * T) / 3;
const xs = i => -PL / 2 + i * (BAY + T);
const GAP = 12;                       // spazio lasciato alle estremità alimentate (ingombro connettore, da verificare)
const LINE = PW - 2 * GAP;            // lunghezza striscia sulle linee da 470 (445)
const s = 0.24, ox = 22, oy = 30;
const X = x => ox + (x + L / 2) * s, Y = y => oy + (W / 2 - y) * s;
const R = (x, y, w, h, f, st = '#222', sw = 0.25, ex = '') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${f}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
const Ln = (x1, y1, x2, y2, st = '#222', sw = 0.3, ex = '') => `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
const Tx = (x, y, t, o = {}) => `<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" font-size="${o.size || 3}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}"${o.bold ? ' font-weight="700"' : ''}>${t}</text>`;
let g = `<defs><pattern id="wood" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="#ecd8ae"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#a07c44" stroke-width="0.35"/></pattern></defs>`;
g += Tx(ox, 11, 'Collegamenti: dorsale + un anello di 4 pezzi per campata (3 ponticelli da 15 cm per campata)', { anchor: 'start', size: 3.6, bold: true });
g += Tx(ox, 16.5, 'Pianta, pannello opalino rimosso – scala 1:4,2 · F = foro Ø10 sulla testata · T = fori Ø8 nei traversi (a 15 mm dal lato lungo)', { anchor: 'start', size: 2.7, fill: '#555' });
g += R(X(-L / 2), Y(W / 2), L * s, W * s, 'url(#wood)', '#333', 0.4);
g += R(X(-PL / 2), Y(PW / 2), PL * s, PW * s, '#fbfbf8', '#444', 0.25);
[xs(1) - T, xs(2) - T].forEach(x => { g += R(X(x), Y(PW / 2), T * s, PW * s, 'url(#wood)', '#333', 0.25); });
const TY = 220; // quota y della dorsale
const jx = []; // punti di derivazione
const lens = { pon: [], feed: [] };
for (let i = 0; i < 3; i++) {
  const x0 = xs(i), x1 = x0 + BAY, cx = (x0 + x1) / 2, xl = x0 + 4, xr = x1 - 4;
  const yT = PW / 2 - 4, yB = -PW / 2 + 4;           // centro dei listelli sui lati lunghi
  // pezzi di striscia
  g += R(X(xl - 4), Y(PW / 2 - GAP), 8 * s, LINE * s, '#f2c14e', '#a37a10', 0.2);                // linea sinistra
  g += R(X(xr - 4), Y(PW / 2 - GAP), 8 * s, LINE * s, '#f2c14e', '#a37a10', 0.2);                // linea destra
  g += R(X(cx - 75), Y(PW / 2), 150 * s, 8 * s, '#f2c14e', '#a37a10', 0.2);                      // tratto alto
  g += R(X(cx - 75), Y(-PW / 2 + 8), 150 * s, 8 * s, '#f2c14e', '#a37a10', 0.2);                // tratto basso
  const con = (x, y, w = 3, h = 3) => R(X(x) - w / 2, Y(y) - h / 2, w, h, '#222', '#000', 0.15);
  // connettori: L alto (alimentazione), L basso, B sx, B dx, R basso, R alto, T dx
  const cLt = [xl, PW / 2 - GAP / 2], cLb = [xl, -PW / 2 + GAP / 2], cBl = [cx - 75 - 6, yB], cBr = [cx + 75 + 6, yB], cRb = [xr, -PW / 2 + GAP / 2], cRt = [xr, PW / 2 - GAP / 2], cTr = [cx + 75 + 6, yT];
  [cLt, cLb, cBl, cBr, cRb, cRt, cTr].forEach(c => { g += con(...c); });
  // ponticelli (arancio tratteggiato)
  const pon = (a, b, lab) => { g += Ln(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), '#e07000', 0.6, 'stroke-dasharray="1.2 0.6"'); lens.pon.push(Math.hypot(a[0] - b[0], a[1] - b[1])); };
  pon(cLb, cBl); pon(cBr, cRb); pon(cRt, cTr);
  // derivazione dalla dorsale al connettore di alimentazione (L alto)
  const jp = [xl, TY]; jx.push(jp[0]);
  g += Ln(X(cLt[0]), Y(cLt[1]), X(jp[0]), Y(jp[1]), '#c00', 0.6);
  lens.feed.push(Math.hypot(cLt[0] - jp[0], cLt[1] - jp[1]));
  g += `<circle cx="${X(jp[0]).toFixed(2)}" cy="${Y(jp[1]).toFixed(2)}" r="1.3" fill="#c00"/>` + Tx(X(jp[0]) + 2.2, Y(jp[1]) + 4.4, 'J' + (i + 1), { size: 2.6, fill: '#c00', bold: true, anchor: 'start' });
  g += Tx(X(cx), Y(0) - 3, 'campata ' + (i + 1), { size: 3.2, fill: '#556' });
}
// dorsale
const Fx = -L / 2 + T / 2;
g += Ln(X(Fx), Y(TY), X(jx[2]), Y(TY), '#c00', 1.0);
g += Ln(X(Fx), Y(TY) + 0.9, X(jx[2]), Y(TY) + 0.9, '#222', 1.0);
g += `<circle cx="${X(Fx).toFixed(2)}" cy="${Y(TY).toFixed(2)}" r="2.2" fill="#fff" stroke="#c33" stroke-width="0.4"/>` + Tx(X(Fx), Y(TY) + 0.8, 'F', { size: 2.2, bold: true, fill: '#c33' });
[xs(1) - T / 2, xs(2) - T / 2].forEach(x => { g += `<circle cx="${X(x).toFixed(2)}" cy="${Y(TY).toFixed(2)}" r="1.8" fill="#fff" stroke="#c33" stroke-width="0.4"/>` + Tx(X(x), Y(TY) + 0.7, 'T', { size: 1.9, bold: true, fill: '#c33' }); });
// quote dorsale
const trunk = [jx[0] - Fx, jx[1] - jx[0], jx[2] - jx[1]];
g += Tx(X((jx[0] + jx[1]) / 2), Y(TY) - 3, trunk[1].toFixed(0) + ' mm', { size: 2.4 }) + Tx(X((jx[1] + jx[2]) / 2), Y(TY) - 3, trunk[2].toFixed(0) + ' mm', { size: 2.4 });
g += Tx(X(-L / 2) + 1, Y(W / 2) - 1.5, 'F: ingresso cavo dall\'alimentatore + dimmer', { size: 2.6, anchor: 'start', fill: '#c33' });
// legenda
const ly = 160;
g += R(22, ly, 6, 3, '#f2c14e', '#a37a10', 0.2) + Tx(30, ly + 2.6, 'striscia COB', { anchor: 'start', size: 2.5 });
g += R(62, ly, 3, 3, '#222', '#000', 0.2) + Tx(67, ly + 2.6, 'connettore a clip', { anchor: 'start', size: 2.5 });
g += Ln(104, ly + 1.5, 112, ly + 1.5, '#e07000', 0.6, 'stroke-dasharray="1.2 0.6"') + Tx(114, ly + 2.6, 'ponticello 15 cm (kit)', { anchor: 'start', size: 2.5 });
g += Ln(158, ly + 1.5, 166, ly + 1.5, '#c00', 1) + Tx(168, ly + 2.6, 'dorsale / derivazioni (filo 0,5 mm²)', { anchor: 'start', size: 2.5 });
const maxPon = Math.max(...lens.pon).toFixed(0), maxFeed = Math.max(...lens.feed).toFixed(0);
const tot = trunk.reduce((a, b) => a + b, 0);
// tabella lista cavi
const rows = [
  ['Dorsale interna F→J1→J2→J3', `${tot.toFixed(0)} mm di percorso → ≈ 0,7 m per colore`, '12 V: filo doppio'],
  ['Alimentatore/dimmer → foro F', 'a tua scelta, es. 2 m (corto = meno caduta)', '12 V: filo doppio'],
  ['3 derivazioni J → connettore (0,5 mm²)', `${maxFeed} mm in linea retta → 3 × 15 cm = 0,45 m per colore`, 'filo singolo'],
  ['9 ponticelli tra i pezzi (20 AWG)', `${maxPon} mm in linea retta → i 15 cm del kit bastano`, '2 kit (10 coppie)'],
  ['Totale dalla tua bobina 2 × 7 m (0,5 mm²)', '12 V ≈ 5,9 m per colore · 24 V ≈ 3,2 m per colore', 'bastano'],
  ['Connettori a clip / Wago 221', '21 clip (2 kit) · 4 Wago da 3 posti + 2 da 2 posti', 'oppure saldature'],
];
let ty = 176;
g += Tx(22, ty - 4, 'Lista cavi e materiali', { anchor: 'start', size: 3.4, bold: true });
rows.forEach((r, i) => { const y = ty + i * 5.2; g += Tx(22, y, r[0], { anchor: 'start', size: 2.7, bold: true }) + Tx(112, y, r[1], { anchor: 'start', size: 2.6 }) + Tx(250, y, r[2], { anchor: 'start', size: 2.6, fill: '#555' }); });
fs.writeFileSync(path.join(here, 'cablaggio.html'), `<!DOCTYPE html><html><body style="margin:0;background:#fff"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="1600" height="1131" font-family="DejaVu Sans, Arial, sans-serif">${g}</svg></body></html>`);
console.log({ trunk, tot, maxPon, maxFeed, line: LINE, pieces: `4 × 445 → lines`, ponMin: Math.min(...lens.pon).toFixed(0) });
