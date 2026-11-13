// Genera presentazione/index.html (10 pagine A4 orizzontali) con disegni tecnici in SVG.
// Costruzione: montanti 15x80 a FIANCO del pannello MDF 10 mm; pannello opalino appoggiato sui listelli 8x8.
// Uso: node presentazione/gen.mjs   (poi: node presentazione/pdf.cjs)
import { simulateBay } from '../src/sim.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

/* ---------------- Parametri (mm) ---------------- */
const L = 1000, W = 500, T = 15, WH = 80, BACK = 10, DIFF = 3, BAR = 8, BARW = 8, STRIP_W = 8;
const PL = L - 2 * T, PW = W - 2 * T;          // 970 x 470 (MDF e luce interna)
const BAY = (PL - 2 * T) / 3;                   // 313,33
const ZD = WH - DIFF, HU = ZD - BACK;           // 77 / 67
const xs = i => -PL / 2 + i * (BAY + T);
const fmt = v => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));
const N = 10;

/* ---------------- Helper SVG ---------------- */
const DEFS = `<defs>
 <pattern id="wood" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="#ecd8ae"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#a07c44" stroke-width="0.35"/></pattern>
 <pattern id="mdf" width="1.4" height="1.4" patternUnits="userSpaceOnUse"><rect width="1.4" height="1.4" fill="#d8b98d"/><circle cx="0.35" cy="0.35" r="0.18" fill="#8a6a3c"/><circle cx="1.05" cy="1.05" r="0.18" fill="#8a6a3c"/></pattern>
 <pattern id="panel" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><rect width="1.6" height="1.6" fill="#dbe8f2"/><circle cx="0.8" cy="0.8" r="0.25" fill="#8fb0c9"/></pattern>
 <marker id="arr" viewBox="0 0 6 6" markerWidth="2.4" markerHeight="2.4" refX="5.5" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 z" fill="#222"/></marker>
 <marker id="ray" viewBox="0 0 6 6" markerWidth="2.6" markerHeight="2.6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#e0a100"/></marker>
</defs>`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T_ = (x, y, txt, o = {}) => `<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" font-size="${o.size || 3}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}"${o.bold ? ' font-weight="700"' : ''}${o.rot ? ` transform="rotate(${o.rot} ${(+x).toFixed(2)} ${(+y).toFixed(2)})"` : ''}>${esc(txt)}</text>`;
const R = (x, y, w, h, fill, stroke = '#222', sw = 0.25, extra = '') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const Ln = (x1, y1, x2, y2, stroke = '#222', sw = 0.2, extra = '') => `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
function dimH(x1, x2, yo, yl, label, o = {}) {
  const d = yl > yo ? 1 : -1;
  return `<g>${Ln(x1, yo + d * 0.8, x1, yl + d * 1.2)}${Ln(x2, yo + d * 0.8, x2, yl + d * 1.2)}${Ln(x1, yl, x2, yl)}${Ln(x1 - 0.7, yl + 0.7, x1 + 0.7, yl - 0.7, '#222', 0.3)}${Ln(x2 - 0.7, yl + 0.7, x2 + 0.7, yl - 0.7, '#222', 0.3)}${T_((x1 + x2) / 2 + (o.dx || 0), yl - 0.8 + (o.dy || 0), label, { size: o.size || 2.7 })}</g>`;
}
function dimV(y1, y2, xo, xl, label, o = {}) {
  const d = xl > xo ? 1 : -1;
  return `<g>${Ln(xo + d * 0.8, y1, xl + d * 1.2, y1)}${Ln(xo + d * 0.8, y2, xl + d * 1.2, y2)}${Ln(xl, y1, xl, y2)}${Ln(xl - 0.7, y1 + 0.7, xl + 0.7, y1 - 0.7, '#222', 0.3)}${Ln(xl - 0.7, y2 + 0.7, xl + 0.7, y2 - 0.7, '#222', 0.3)}${T_(xl - 0.8 * d + (o.dx || 0), (y1 + y2) / 2 + (o.dy || 0), label, { size: o.size || 2.7, rot: -90 })}</g>`;
}
const circ = (x, y, k, o = {}) => `<circle cx="${(+x).toFixed(2)}" cy="${(+y).toFixed(2)}" r="${o.r || 2.4}" fill="#fff" stroke="${o.col || '#222'}" stroke-width="0.3"/>` + T_(x, +y + 0.9, k, { size: o.size || 2.7, bold: true, fill: o.col || '#111' });
const page = (n, title, body, sub = '') => `<section class="page"><header><div class="t">${esc(title)}</div><div class="s">${esc(sub || 'Scatola luminosa 100 × 50 cm · misure in mm')}</div></header><div class="body">${body}</div><footer><span>Scatola luminosa retroilluminata – LED COB 4000K su fondo bianco opaco</span><span>${n} / ${N}</span></footer></section>`;
const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="DejaVu Sans, Arial, sans-serif">${DEFS}${inner}</svg>`;

/* ---------------- Pagina 3: viste esterne ---------------- */
function paginaViste() {
  const s = 0.19, ox = 24, oy = 22;
  let g = T_(ox, 12, 'Vista frontale (lato pannello opalino) – scala 1:5,3', { anchor: 'start', size: 3.4, bold: true });
  g += R(ox, oy, L * s, W * s, 'url(#wood)', '#333', 0.4);                              // cima dei montanti 15
  g += R(ox + T * s, oy + T * s, PL * s, PW * s, 'url(#panel)', '#334', 0.3);          // pannello opalino
  [xs(1) - T / 2, xs(2) - T / 2].forEach(x => { g += R(ox + (x - T / 2 + L / 2) * s, oy + T * s, T * s, PW * s, 'none', '#6b7c8c', 0.25, 'stroke-dasharray="1.2 0.8"'); });
  g += T_(ox + L * s / 2, oy + W * s / 2, 'PANNELLO OPALINO 968 × 468 × 3', { size: 4, fill: '#456' });
  g += T_(ox + L * s / 2, oy + W * s / 2 + 6, '(tratteggio: traversi interni sotto il pannello)', { size: 2.6, fill: '#567' });
  g += dimH(ox, ox + L * s, oy + W * s, oy + W * s + 8, '1000');
  g += dimV(oy, oy + W * s, ox, ox - 8, '500');
  g += T_(ox + 7.5 * s, oy - 2, '15', { size: 2.3 });
  const py = 143;
  g += T_(ox, py - 8, 'Vista laterale (lato lungo) – scala 1:5,3', { anchor: 'start', size: 3.4, bold: true });
  g += R(ox, py, L * s, WH * s, 'url(#wood)', '#333', 0.35);
  g += dimH(ox, ox + L * s, py + WH * s, py + WH * s + 8, '1000');
  g += dimV(py, py + WH * s, ox + L * s, ox + L * s + 9, '80');
  g += T_(ox + L * s / 2, py + WH * s / 2 + 1, 'montante 15 × 80 – il pannello opalino è a filo con la cima', { size: 2.6, fill: '#533' });
  const lx = 24, ly = 178;
  g += T_(lx, ly - 3, 'Spessore totale 80 mm: i montanti 15 × 80 scendono a fianco dell\'MDF da 10 mm e arrivano a filo con il pannello opalino.', { anchor: 'start', size: 2.8 });
  return page(3, 'Viste esterne e ingombri', svg(273, 178, g));
}

/* ---------------- Pagina 4: pianta interna ---------------- */
function paginaPianta() {
  const s = 0.24, ox = 20, oy = 34;
  const X = x => ox + (x + L / 2) * s, Y = y => oy + (W / 2 - y) * s;
  let g = T_(ox, 8, 'Pianta (pannello opalino rimosso) – scala 1:4,2', { anchor: 'start', size: 3.4, bold: true });
  g += R(X(-L / 2), Y(W / 2), L * s, W * s, 'url(#wood)', '#333', 0.4);              // montanti
  g += R(X(-PL / 2), Y(PW / 2), PL * s, PW * s, '#fbfbf8', '#444', 0.25);             // MDF (interno bianco)
  const y0 = -PW / 2, y1 = PW / 2;
  [xs(1) - T, xs(2) - T].forEach(x => { g += R(X(x), Y(y1), T * s, PW * s, 'url(#wood)', '#333', 0.25); });   // traversi
  for (let i = 0; i < 3; i++) {
    const x0 = xs(i), x1 = x0 + BAY;
    g += R(X(x0), Y(y1), BARW * s, PW * s, '#f6d775', '#a37a10', 0.15) + R(X(x1 - BARW), Y(y1), BARW * s, PW * s, '#f6d775', '#a37a10', 0.15);
    g += R(X(x0 + BARW), Y(y1), (BAY - 2 * BARW) * s, BARW * s, '#f6d775', '#a37a10', 0.15) + R(X(x0 + BARW), Y(y0 + BARW), (BAY - 2 * BARW) * s, BARW * s, '#f6d775', '#a37a10', 0.15);
    g += T_(X((x0 + x1) / 2), Y(0) - 6, 'campata ' + (i + 1), { size: 3.4, fill: '#556' });
    g += T_(X((x0 + x1) / 2), Y(0) - 1.5, fmt(BAY) + ' × ' + PW, { size: 2.8, fill: '#667' });
  }
  // squadrette d'acciaio negli angoli (posizione indicativa)
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
    const cx = sx * PL / 2, cy = sy * PW / 2, a = 26, th = 4, dx = -sx, dy = -sy;
    const rx = (x0, y0c, w, h) => R(X(Math.min(x0, x0 + w)), Y(Math.max(y0c, y0c + h)), Math.abs(w) * s, Math.abs(h) * s, '#555', '#222', 0.15);
    g += rx(cx, cy, dx * a, dy * th) + rx(cx, cy, dx * th, dy * a);
  });
  // foro cavo e fori passacavi
  g += `<circle cx="${X(-L / 2 + T / 2).toFixed(2)}" cy="${Y(0).toFixed(2)}" r="${(5 * s + 0.4).toFixed(2)}" fill="#fff" stroke="#c33" stroke-width="0.3"/>`;
  [xs(1) - T / 2, xs(2) - T / 2].forEach(x => { g += `<circle cx="${X(x).toFixed(2)}" cy="${Y(0).toFixed(2)}" r="${(4 * s + 0.3).toFixed(2)}" fill="#fff" stroke="#c33" stroke-width="0.3"/>`; });
  const mark = (x, y, k, px, py) => Ln(x, y, px, py, '#c33', 0.2) + circ(px, py, k, { col: '#c33' });
  g += mark(X(-L / 2 + T / 2), Y(0), 'F', X(xs(0) + 40), Y(0) + 8);
  g += mark(X(xs(1) - T / 2), Y(0), 'T', X(xs(1) + 40), Y(0) + 8);
  g += mark(X(xs(2) - T / 2), Y(0), 'T', X(xs(2) + 40), Y(0) + 8);
  // quote
  g += dimH(X(-L / 2), X(L / 2), Y(-W / 2), Y(-W / 2) + 7, '1000');
  g += dimV(Y(W / 2), Y(-W / 2), X(-L / 2), X(-L / 2) - 7, '500');
  g += dimV(Y(PW / 2), Y(-PW / 2), X(L / 2), X(L / 2) + 7, '470');
  const segs = [[-L / 2, -PL / 2, '15'], [xs(0), xs(0) + BAY, fmt(BAY)], [xs(0) + BAY, xs(1), '15'], [xs(1), xs(1) + BAY, fmt(BAY)], [xs(1) + BAY, xs(2), '15'], [xs(2), xs(2) + BAY, fmt(BAY)], [xs(2) + BAY, L / 2, '15']];
  segs.forEach(([a, c, lab]) => { g += dimH(X(a), X(c), Y(W / 2), Y(W / 2) - 6, lab, { size: lab === '15' ? 2.2 : 2.7, dy: lab === '15' ? -1.4 : 0 }); });
  // legenda
  const lx = 20, ly = 166;
  [['url(#wood)', 'montanti 15 × 80 e traversi'], ['#f6d775', 'listello 8 × 8 con striscia COB sotto'], ['#555', 'squadretta d\'acciaio (indicativa)'], ['#fbfbf8', 'MDF 10 mm, bianco opaco']].forEach(([f, txt], i) => { g += R(lx + i * 66, ly, 5, 3.5, f, '#444', 0.2) + T_(lx + i * 66 + 6.5, ly + 3, txt, { anchor: 'start', size: 2.5 }); });
  g += T_(lx, ly + 9, 'F = foro Ø10 per cavo USB 5 V (testata sinistra) · T = foro Ø8 passacavi nei traversi, sotto i listelli (lavorazioni consigliate).', { anchor: 'start', size: 2.5, fill: '#933' });
  g += T_(lx, ly + 13.5, 'I traversi poggiano sull\'MDF e sono alti 67 mm: arrivano alla quota dei listelli. Le 4 strisce di ogni campata si collegano con connettori angolari.', { anchor: 'start', size: 2.5, fill: '#933' });
  return page(4, 'Pianta interna e disposizione delle strisce LED', svg(273, 180, g));
}

/* ---------------- Pagina 5: sezione A-A + dettagli ---------------- */
function paginaSezioneAA() {
  let g = '';
  const s = 0.46, ox = 24, oz = 62;
  const Xp = y => ox + (y + W / 2) * s, Zp = z => oz - z * s;
  g += T_(ox, 8, 'SEZIONE A–A (trasversale, al centro della campata centrale) – scala 1:2,2', { anchor: 'start', size: 3.4, bold: true });
  g += R(Xp(-PW / 2), Zp(BACK), PW * s, BACK * s, 'url(#mdf)', '#222', 0.3);                                   // MDF
  g += R(Xp(-W / 2), Zp(WH), T * s, WH * s, 'url(#wood)', '#222', 0.3) + R(Xp(W / 2 - T), Zp(WH), T * s, WH * s, 'url(#wood)', '#222', 0.3);   // montanti
  g += R(Xp(-PW / 2), Zp(ZD), BARW * s, BAR * s, '#fff', '#222', 0.25) + R(Xp(PW / 2 - BARW), Zp(ZD), BARW * s, BAR * s, '#fff', '#222', 0.25);
  g += R(Xp(-PW / 2), Zp(ZD - BAR), STRIP_W * s, 1.2 * s, '#f2c14e', '#a37a10', 0.2) + R(Xp(PW / 2 - STRIP_W), Zp(ZD - BAR), STRIP_W * s, 1.2 * s, '#f2c14e', '#a37a10', 0.2);
  g += R(Xp(-PW / 2 + 1), Zp(WH), (PW - 2) * s, DIFF * s, 'url(#panel)', '#234', 0.3);
  g += dimH(Xp(-W / 2), Xp(W / 2), Zp(0), Zp(0) + 7, '500');
  g += dimV(Zp(WH), Zp(0), Xp(W / 2), Xp(W / 2) + 9, '80');
  g += dimV(Zp(ZD), Zp(BACK), Xp(-W / 2), Xp(-W / 2) - 8, '67');
  g += T_(Xp(0), Zp(40), 'interno bianco opaco – altezza utile 67', { size: 3, fill: '#777' });
  g += circ(Xp(110), Zp(WH + 1.5) + 0.2, 'A') + circ(Xp(-100), Zp(5) + 0.2, 'E') + circ(Xp(-W / 2 + T / 2), Zp(40), 'D', { r: 2.1 });
  // dettaglio D (angolo superiore)
  const s2 = 2.0, dx = 24, top = 100;
  const Xd = y => dx + (y + 250) * s2, Zd = z => top + (WH - z) * s2;
  g += T_(dx, 88, 'DETTAGLIO D – angolo superiore (2:1)', { anchor: 'start', size: 3.2, bold: true });
  g += R(Xd(-250), Zd(WH), T * s2, (WH - 56) * s2, 'url(#wood)', '#222', 0.35);
  g += R(Xd(-235), Zd(ZD), BARW * s2, BAR * s2, '#fff', '#222', 0.35);
  g += R(Xd(-235), Zd(ZD - BAR), STRIP_W * s2, 1.2 * s2, '#f2c14e', '#a37a10', 0.3);
  g += R(Xd(-234), Zd(WH), 36 * s2, DIFF * s2, 'url(#panel)', '#234', 0.35);
  [[3, 6], [3, 18], [3, 32]].forEach(([a, c]) => { g += `<line x1="${Xd(-235 + a).toFixed(1)}" y1="${(Zd(ZD - BAR) + 3).toFixed(1)}" x2="${Xd(-235 + c + 3).toFixed(1)}" y2="${(Zd(ZD - BAR) + 26).toFixed(1)}" stroke="#e0a100" stroke-width="0.35" marker-end="url(#ray)"/>`; });
  g += dimH(Xd(-250), Xd(-235), Zd(56), Zd(56) + 5, '15');
  g += dimH(Xd(-235), Xd(-227), Zd(WH), Zd(WH) - 5, '8', { size: 2.4 });
  g += dimV(Zd(ZD), Zd(ZD - BAR), Xd(-227), Xd(-227) + 6, '8', { size: 2.4 });
  g += dimV(Zd(WH), Zd(ZD), Xd(-198), Xd(-198) + 6, '3');
  g += T_(Xd(-234), Zd(WH) - 2.6, 'gioco 1', { size: 2, fill: '#777', anchor: 'start' });
  g += circ(Xd(-210), Zd(WH + 0) + 3, 'A', { r: 2 }) + circ(Xd(-221), Zd(ZD - BAR) + 8, 'B', { r: 2 }) + circ(Xd(-231), Zd(ZD) + 1.5, 'C', { r: 2 }).replace(/<circle[^>]*\/>/, m => m) + circ(Xd(-243), Zd(66), 'D', { r: 2 });
  // dettaglio E (angolo inferiore: montante - MDF)
  const dx2 = 150, top2 = 100;
  const Xe = y => dx2 + (y + 250) * s2, Ze = z => top2 + (24 - z) * s2;
  g += T_(dx2, 88, 'DETTAGLIO E – attacco montante / MDF (2:1)', { anchor: 'start', size: 3.2, bold: true });
  g += R(Xe(-250), Ze(24), T * s2, 24 * s2, 'url(#wood)', '#222', 0.35);
  g += R(Xe(-235), Ze(BACK), 37 * s2, BACK * s2, 'url(#mdf)', '#222', 0.35);
  g += Ln(Xe(-235), Ze(BACK), Xe(-235), Ze(0), '#c33', 0.5, 'stroke-dasharray="1 0.7"');
  g += dimH(Xe(-250), Xe(-235), Ze(0), Ze(0) + 5, '15');
  g += dimV(Ze(BACK), Ze(0), Xe(-198), Xe(-198) + 6, '10');
  g += T_(Xe(-232), Ze(BACK) - 4, 'giunto: stucco epossidico + squadretta', { size: 2.3, fill: '#933', anchor: 'start' });
  g += T_(Xe(-232), Ze(BACK) - 7.2, 'MDF e montante a filo in basso', { size: 2.3, fill: '#444', anchor: 'start' });
  g += circ(Xe(-216), Ze(5), 'E', { r: 2 }) + circ(Xe(-243), Ze(14), 'D', { r: 2 });
  // legenda
  const lg = [['A', 'Pannello opalino 3 mm, appoggiato sui listelli'], ['B', 'Striscia COB 8 mm, rivolta verso il basso'], ['C', 'Listello 8 × 8 mm, 3 mm sotto il bordo del montante'], ['D', 'Montante 15 × 80 mm, a fianco dell\'MDF'], ['E', 'MDF 10 mm (bianco opaco sul lato interno)']];
  lg.forEach(([k, txt], i) => { const x = i < 3 ? 24 : 150, y = 166 + (i % 3) * 5.6; g += circ(x + 2, y - 0.8, k, { r: 2 }) + T_(x + 6, y, txt, { anchor: 'start', size: 2.7 }); });
  return page(5, 'Sezione trasversale A–A e dettagli', svg(273, 178, g));
}

/* ---------------- Pagina 6: sezione B-B + percorso luce ---------------- */
function paginaSezioneBB() {
  let g = '';
  const s = 0.25, ox = 14, oz = 50;
  const Xp = x => ox + (x + L / 2) * s, Zp = z => oz - z * s;
  g += T_(ox, 9, 'SEZIONE B–B (longitudinale, al centro) – scala 1:4', { anchor: 'start', size: 3.4, bold: true });
  g += R(Xp(-PL / 2), Zp(BACK), PL * s, BACK * s, 'url(#mdf)', '#222', 0.25);
  g += R(Xp(-L / 2), Zp(WH), T * s, WH * s, 'url(#wood)', '#222', 0.25) + R(Xp(L / 2 - T), Zp(WH), T * s, WH * s, 'url(#wood)', '#222', 0.25);
  [xs(1) - T, xs(2) - T].forEach(x => { g += R(Xp(x), Zp(ZD), T * s, HU * s, 'url(#wood)', '#222', 0.25); });
  for (let i = 0; i < 3; i++) {
    const a = xs(i), c = a + BAY;
    g += R(Xp(a), Zp(ZD), BARW * s, BAR * s, '#fff', '#222', 0.2) + R(Xp(c - BARW), Zp(ZD), BARW * s, BAR * s, '#fff', '#222', 0.2);
    g += R(Xp(a), Zp(ZD - BAR), STRIP_W * s, 1.2 * s, '#f2c14e', '#a37a10', 0.15) + R(Xp(c - STRIP_W), Zp(ZD - BAR), STRIP_W * s, 1.2 * s, '#f2c14e', '#a37a10', 0.15);
  }
  g += R(Xp(-PL / 2 + 1), Zp(WH), (PL - 2) * s, DIFF * s, 'url(#panel)', '#234', 0.25);
  g += dimH(Xp(-L / 2), Xp(L / 2), Zp(0), Zp(0) + 7, '1000');
  [[-L / 2, T, '15'], [xs(0), BAY, fmt(BAY)], [xs(0) + BAY, T, '15'], [xs(1), BAY, fmt(BAY)], [xs(1) + BAY, T, '15'], [xs(2), BAY, fmt(BAY)], [xs(2) + BAY, T, '15']].forEach(([x0, w, lab]) => {
    g += dimH(Xp(x0), Xp(x0 + w), Zp(WH), Zp(WH) - 5, lab, { size: 2.2, dy: lab === '15' ? -1.2 : 0 });
  });
  g += T_(Xp(0), Zp(0) + 14, 'traversi 470 × 67 × 15: poggiano sull\'MDF e arrivano alla quota dei listelli', { size: 2.7, fill: '#533' });
  // percorso della luce in una campata
  const s2 = 0.44, bx = 30, bz = 134;
  const Xb = x => bx + x * s2, Zb = z => bz - z * s2;
  g += T_(bx - 8, 80, 'PERCORSO DELLA LUCE in una campata (sezione, scala 1:2,3)', { anchor: 'start', size: 3.4, bold: true });
  g += R(Xb(-T), Zb(BACK), (BAY + 2 * T) * s2, BACK * s2, 'url(#mdf)', '#222', 0.3);
  g += R(Xb(-T), Zb(ZD), T * s2, HU * s2, 'url(#wood)', '#222', 0.3) + R(Xb(BAY), Zb(ZD), T * s2, HU * s2, 'url(#wood)', '#222', 0.3);
  g += R(Xb(0), Zb(ZD), BARW * s2, BAR * s2, '#fff', '#222', 0.3) + R(Xb(BAY - BARW), Zb(ZD), BARW * s2, BAR * s2, '#fff', '#222', 0.3);
  g += R(Xb(0), Zb(ZD - BAR), STRIP_W * s2, 1.2 * s2, '#f2c14e', '#a37a10', 0.2) + R(Xb(BAY - STRIP_W), Zb(ZD - BAR), STRIP_W * s2, 1.2 * s2, '#f2c14e', '#a37a10', 0.2);
  g += R(Xb(-T), Zb(WH), (BAY + 2 * T) * s2, DIFF * s2, 'url(#panel)', '#234', 0.3);
  const ry = ZD - BAR - 1.5;
  const ray = (x0, z0, x1, z1, col = '#e0a100') => `<line x1="${Xb(x0).toFixed(1)}" y1="${Zb(z0).toFixed(1)}" x2="${Xb(x1).toFixed(1)}" y2="${Zb(z1).toFixed(1)}" stroke="${col}" stroke-width="0.35" marker-end="url(#ray)"/>`;
  [60, 130].forEach(fx => { g += ray(5, ry, fx, BACK) + ray(fx, BACK, fx + 40, ZD - 1, '#f0b800'); });
  [250, 180].forEach(fx => { g += ray(BAY - 5, ry, fx, BACK) + ray(fx, BACK, fx - 40, ZD - 1, '#f0b800'); });
  g += T_(Xb(BAY / 2), Zb(40) + 2, 'luce riflessa dall\'MDF bianco opaco', { size: 3, fill: '#9a6b00' });
  g += T_(Xb(BAY / 2), Zb(ZD - 8), 'il pannello vede solo luce già diffusa', { size: 2.8, fill: '#456' });
  g += dimV(Zb(ZD), Zb(BACK), Xb(BAY + T), Xb(BAY + T) + 7, '67');
  const tx = 188, ty = 94;
  ['Come funziona', '1. Le strisce COB guardano verso il basso:', '    i LED non si vedono dal pannello.', '2. La luce colpisce MDF e pareti, verniciati di', '    bianco opaco, che la diffondono.', '3. La luce riflessa risale e attraversa il pannello', '    opalino: aspetto uniforme, senza punti luce.', '', 'Altezza utile 67 mm (con i montanti a fianco', 'dell\'MDF): centro un po\' più scuro che a 80 mm.', 'Confronto a pag. 9.'].forEach((l, i) => { g += T_(tx, ty + i * 6.2, l, { anchor: 'start', size: i === 0 ? 3.6 : 2.6, bold: i === 0 }); });
  return page(6, 'Sezione longitudinale B–B e percorso della luce', svg(273, 178, g));
}

/* ---------------- Pagina 7: vista esplosa ---------------- */
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join(''); };
function paginaEsploso() {
  const C = Math.cos(Math.PI / 6), S = 0.5, sc = 0.12, ox = 94, oy = 108;
  const P = (x, y, z) => [ox + (x - y) * C * sc, oy + ((x + y) * S - z) * sc];
  const poly = (pts, fill, op = 1) => `<polygon points="${pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ')}" fill="${fill}" fill-opacity="${op}" stroke="#222" stroke-width="0.2" stroke-linejoin="round"/>`;
  const box = (x0, x1, y0, y1, z0, z1, col, op = 1) => poly([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], shade(col, 0.82), op) + poly([P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)], shade(col, 0.68), op) + poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], col, op);
  const WOODC = '#e2c58f', MDFC = '#c9a577', WHITEC = '#f6f6f2', STRIPC = '#f2c14e', PANELC = '#cfe2f1';
  let g = T_(14, 12, 'Vista esplosa – ordine di montaggio (dal basso verso l\'alto)', { anchor: 'start', size: 3.4, bold: true });
  const srt = arr => arr.sort((a, c) => (a[0] + a[1] + a[2] + a[3]) - (c[0] + c[1] + c[2] + c[3]));
  const OFF = 45;
  g += box(-PL / 2, PL / 2, -PW / 2, PW / 2, 0, BACK, MDFC);
  const walls = [[-L / 2, L / 2, -W / 2 - OFF, -PW / 2 - OFF], [-L / 2 - OFF, -PL / 2 - OFF, -PW / 2, PW / 2], [PL / 2 + OFF, L / 2 + OFF, -PW / 2, PW / 2], [-L / 2, L / 2, PW / 2 + OFF, W / 2 + OFF]];
  srt(walls).forEach(([a, c, d, e]) => { g += box(a, c, d, e, 0, WH, WOODC); });
  const dz0 = BACK + 50;
  srt([[xs(1) - T, xs(1), -PW / 2, PW / 2], [xs(2) - T, xs(2), -PW / 2, PW / 2]]).forEach(([a, c, d, e]) => { g += box(a, c, d, e, dz0, dz0 + HU, WOODC); });
  const zs0 = dz0 + HU + 40, zb0 = zs0 + 45, zp = zb0 + BAR + 60;
  const strips = [], bars = [];
  for (let i = 0; i < 3; i++) {
    const x0 = xs(i), x1 = x0 + BAY, y0 = -PW / 2, y1 = PW / 2;
    strips.push([x0, x0 + STRIP_W, y0, y1], [x1 - STRIP_W, x1, y0, y1], [x0 + BARW, x1 - BARW, y0, y0 + STRIP_W], [x0 + BARW, x1 - BARW, y1 - STRIP_W, y1]);
    bars.push([x0, x0 + BARW, y0, y1], [x1 - BARW, x1, y0, y1], [x0 + BARW, x1 - BARW, y0, y0 + BARW], [x0 + BARW, x1 - BARW, y1 - BARW, y1]);
  }
  srt(strips).forEach(([a, c, d, e]) => { g += box(a, c, d, e, zs0, zs0 + 1.5, STRIPC); });
  srt(bars).forEach(([a, c, d, e]) => { g += box(a, c, d, e, zb0, zb0 + BAR, WHITEC); });
  g += box(-PL / 2 + 1, PL / 2 - 1, -PW / 2 + 1, PW / 2 - 1, zp, zp + DIFF, PANELC, 0.62);
  const lab = (n, pt, ty, l1, l2) => { const [x, y] = pt, tx = 192; return Ln(x, y, tx, ty, '#444', 0.18) + circ(tx, ty, n, { r: 2.8, size: 3 }) + T_(tx + 5, ty + 0.5, l1, { anchor: 'start', size: 3, bold: true }) + T_(tx + 5, ty + 4.2, l2, { anchor: 'start', size: 2.5, fill: '#444' }); };
  g += lab('6', P(PL / 2 - 60, 20, zp + DIFF), 26, 'Pannello opalino', '968 × 468 × 3 mm');
  g += lab('5', P(xs(2) + BAY - 4, 40, zb0 + BAR), 54, 'Listelli 8 × 8 mm', '6 × 470 + 6 × 297 mm');
  g += lab('4', P(xs(2) + BAY - 30, -120, zs0 + 1.5), 82, 'Strisce LED COB 8 mm', '≈ 4,6 m, rivolte in basso');
  g += lab('3', P(xs(1) - 7, 110, dz0 + HU * 0.7), 110, 'Traversi', '2 × 470 × 67 × 15 mm');
  g += lab('2', P(L / 2 + OFF - 4, 70, WH * 0.6), 138, 'Montanti a fianco dell\'MDF', '2 × 1000 + 2 × 470, sezione 15 × 80 mm');
  g += lab('1', P(250, 160, BACK), 166, 'Pannello inferiore MDF', '970 × 470 × 10 mm');
  g += T_(14, 174, 'Verniciare di bianco opaco DOPO aver incollato i listelli sul legno nudo (la colla tiene meno sulla vernice).', { anchor: 'start', size: 2.7, fill: '#933' });
  return page(7, 'Vista esplosa e componenti', svg(273, 178, g));
}

/* ---------------- Pagina 8: distinta e taglio ---------------- */
function paginaDistinta() {
  const rows = [
    ['1', 'Pannello inferiore', 'MDF', '970 × 470 × 10', '1', 'da verificare (misura reale)'],
    ['2a', 'Montanti lunghi', 'doga 15 × 80', '1000 (sezione 15 × 80)', '2', 'a fianco dell\'MDF'],
    ['2b', 'Testate', 'doga 15 × 80', '470 (sezione 15 × 80)', '2', 'foro Ø10 per il cavo su una testata'],
    ['3', 'Traversi', 'doga 15 × 80', '470 × 67 × 15', '2', 'ridurre l\'altezza da 80 a 67; foro Ø8'],
    ['5a', 'Listelli 8 × 8 lungo y', 'legno 8 × 8', '470', '6', 'sotto il bordo, lati lunghi campate'],
    ['5b', 'Listelli 8 × 8 lungo x', 'legno 8 × 8', '297', '6', 'tra i listelli lunghi'],
    ['4', 'Striscia LED COB 8 mm', '4000K, 5 V, 320 LED/m', '≈ 4,6 m (rotolo 5 m)', '1', 'tagli: 6 × 470 + 6 × 297 mm'],
    ['6', 'Pannello opalino', 'vetro sintetico (PMMA opale)', '968 × 468 × 3', '1', 'appoggiato sui listelli'],
    ['—', 'Squadrette d\'acciaio', 'già acquistate', 'negli angoli', '4', 'più stucco epossidico sui giunti'],
    ['—', 'Vernice bianca opaca', 'idropittura / smalto opaco', '< 0,5 L (2 mani)', '1', 'verificare finitura OPACA'],
    ['—', 'Alimentazione 5 V USB', 'con interruttore / dimmer', '—', '1', 'potenza da verificare'],
  ];
  let h = '<table class="tb"><thead><tr><th>N.</th><th>Componente</th><th>Materiale / tipo</th><th>Misura (mm)</th><th>Q.tà</th><th>Note</th></tr></thead><tbody>';
  rows.forEach(r => { h += '<tr>' + r.map((c, i) => `<td${i === 0 || i === 4 ? ' class="c"' : ''}>${esc(c)}</td>`).join('') + '</tr>'; });
  h += '</tbody></table>';
  h += `<div class="box"><b>Controllo con i pezzi acquistati</b> – doghe 15 × 80: da ogni doga da 2 m ricavi 1000 + 470 + 470 mm = 1940 mm (resta circa 60 mm); in totale 3880 mm su 4000 ✔ (margine ridotto: scegli doghe dritte, con teste sane). Listelli 8 × 8: servono 4602 mm → 5 stecche da 1 m (meglio 6) oppure 3 da 2 m. MDF e pannello opalino: confermare 970 × 470 e 968 × 468 mm.</div>`;
  h += `<div class="box warn"><b>Se l'MDF è 1000 × 500</b> i montanti a fianco non bastano (servono ≈ 4060–4120 mm di doga) e la scatola diventa 1030 × 530. <b>Da verificare:</b> potenza della striscia e dell'alimentatore, spessore del pannello opalino, finitura OPACA della vernice.</div>`;
  const sch = (() => { let g = T_(0, 6, 'Schema di collegamento (consigliato)', { anchor: 'start', size: 3.4, bold: true });
    const bx = (x, y, w, txt, f = '#fff') => R(x, y, w, 9, f, '#222', 0.3) + T_(x + w / 2, y + 5.6, txt, { size: 2.7 });
    g += bx(0, 12, 58, 'Alimentatore USB 5 V') + bx(70, 12, 52, 'Interruttore / dimmer') + Ln(58, 16.5, 70, 16.5, '#222', 0.3, 'marker-end="url(#arr)"');
    [0, 1, 2].forEach(i => { g += bx(150, 4 + i * 12, 60, 'Campata ' + (i + 1) + ' (4 tratti)', '#fff4cc') + Ln(122, 16.5, 135, 16.5, '#222', 0.3) + Ln(135, 16.5, 135, 8.5 + i * 12, '#222', 0.3) + Ln(135, 8.5 + i * 12, 150, 8.5 + i * 12, '#222', 0.3, 'marker-end="url(#arr)"'); });
    g += T_(218, 18, 'ogni campata in parallelo:', { anchor: 'start', size: 2.6, fill: '#555' }) + T_(218, 22.5, 'evita il calo di luce sui 5 m a 5 V', { anchor: 'start', size: 2.6, fill: '#555' });
    return g; })();
  h += `<div style="margin-top:4mm">${svg(273, 40, sch)}</div>`;
  return page(8, 'Distinta materiali, taglio e controllo dei pezzi', h);
}

/* ---------------- Pagina 9: simulazione luce ---------------- */
function statsFor(Hu) {
  const r = simulateBay(BAY, PW, Hu, BAR, BARW);
  let mn = 1e9, mx = 0, sum = 0, n = 0;
  for (let j = 0; j < r.ny; j++) for (let i = 0; i < r.nx; i++) {
    const x = (i + .5) * 16, y = (j + .5) * 16;
    if (x < 20 || y < 20 || x > BAY - 20 || y > PW - 20) continue;
    const v = r.data[j * r.nx + i]; mn = Math.min(mn, v); mx = Math.max(mx, v); sum += v; n++;
  }
  const c = r.data[Math.floor(r.ny / 2) * r.nx + Math.floor(r.nx / 2)];
  return { r, avg: sum / n, minMax: mn / mx, centre: c / (sum / n) };
}
function heat(st, x0, y0, wmm) {
  const { r, avg } = st;
  const hmm = wmm * PW / BAY, up = 2, nx = r.nx * up, ny = r.ny * up, cw = wmm / nx, ch = hmm / ny;
  const at = (i, j) => r.data[Math.max(0, Math.min(r.ny - 1, j)) * r.nx + Math.max(0, Math.min(r.nx - 1, i))];
  const lerp = (a, c, k) => a + (c - a) * k;
  let out = '';
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const fx = (i + 0.5) / up - 0.5, fy = (j + 0.5) / up - 0.5, i0 = Math.floor(fx), j0 = Math.floor(fy), ax = fx - i0, ay = fy - j0;
    const v = lerp(lerp(at(i0, j0), at(i0 + 1, j0), ax), lerp(at(i0, j0 + 1), at(i0 + 1, j0 + 1), ax), ay) / avg;
    const k = Math.max(0, Math.min(1, v / 1.5));
    out += `<rect x="${(x0 + i * cw).toFixed(2)}" y="${(y0 + (ny - 1 - j) * ch).toFixed(2)}" width="${(cw + 0.05).toFixed(2)}" height="${(ch + 0.05).toFixed(2)}" fill="rgb(${Math.round(lerp(30, 255, k))},${Math.round(lerp(32, 244, k))},${Math.round(lerp(40, 214, k))})"/>`;
  }
  return out + R(x0, y0, wmm, hmm, 'none', '#222', 0.3);
}
function paginaLuce() {
  let g = T_(14, 12, 'Distribuzione della luce sul pannello – una campata (vista dall\'alto)', { anchor: 'start', size: 3.4, bold: true });
  const opts = [[60, '60 mm utili (riferimento)', 73], [HU, '67 mm utili – SCELTA ATTUALE', 80], [80, '80 mm utili – montanti sopra l\'MDF', 93]];
  opts.forEach(([hh, name, tot], i) => {
    const st = statsFor(hh), x0 = 18 + i * 88, y0 = 24, wmm = 62;
    g += T_(x0, y0 - 3, name, { anchor: 'start', size: 3, bold: true });
    g += heat(st, x0, y0, wmm);
    const hgt = wmm * PW / BAY;
    g += T_(x0, y0 + hgt + 7, `Centro / media: ${(st.centre * 100).toFixed(0)}%`, { anchor: 'start', size: 3 });
    g += T_(x0, y0 + hgt + 13, `Zona scura / chiara: ${(st.minMax * 100).toFixed(0)}%`, { anchor: 'start', size: 3 });
    g += T_(x0, y0 + hgt + 19, `Spessore totale scatola: ${tot} mm`, { anchor: 'start', size: 3 });
  });
  for (let i = 0; i < 40; i++) { const k = i / 39; g += `<rect x="${18 + i * 1.6}" y="157" width="1.7" height="3.5" fill="rgb(${Math.round(30 + 225 * k)},${Math.round(32 + 212 * k)},${Math.round(40 + 174 * k)})"/>`; }
  g += T_(18, 165, '0%', { anchor: 'start', size: 2.5 }) + T_(82, 165, '150% della luminosità media', { anchor: 'end', size: 2.5 });
  g += T_(95, 160, 'Scuro = meno luce · Chiaro = più luce (rispetto alla media della campata)', { anchor: 'start', size: 2.7 });
  g += T_(14, 174, 'Simulazione semplificata al primo rimbalzo (LED Lambertiani 120°, fondo bianco opaco 85%, listelli 8 × 8). Nella realtà i rimbalzi sulle pareti bianche attenuano le differenze: è una stima prudente.', { anchor: 'start', size: 2.5, fill: '#555' });
  return page(9, 'Simulazione della distribuzione di luce: 60 / 67 / 80 mm', svg(273, 180, g));
}

/* ---------------- Pagine 1, 2, 10 ---------------- */
const IMG = 'img/';
function copertina() {
  return `<section class="page cover"><div class="ch"><div class="k">PROGETTO</div><h1>Scatola luminosa retroilluminata</h1><div class="sub">1000 × 500 × 80 mm · montanti 15 × 80 a fianco dell'MDF · pannello opalino · LED COB 4000K</div></div>
  <div class="pair"><figure><img src="${IMG}acceso.png"><figcaption>ACCESA</figcaption></figure><figure><img src="${IMG}spento.png"><figcaption>SPENTA</figcaption></figure></div>
  <div class="facts"><div><b>3 campate</b><span>da ≈ 313 × 470 mm, separate da traversi</span></div><div><b>Luce indiretta</b><span>LED rivolti in basso, nessun punto luce visibile</span></div><div><b>Interruttore</b><span>on / off (e dimmer) sull'alimentazione USB 5 V</span></div><div><b>≈ 4,6 m di LED</b><span>striscia COB 8 mm su listelli 8 × 8 mm</span></div></div>
  <footer><span>Documento di presentazione – render 3D e disegni tecnici</span><span>1 / ${N}</span></footer></section>`;
}
function gallery() {
  const f = (src, cap) => `<figure><img src="${IMG}${src}"><figcaption>${cap}</figcaption></figure>`;
  return page(2, 'Simulazioni 3D', `<div class="gal">${f('acceso.png', 'ACCESA – il pannello opalino diffonde la luce; alone sulla parete')}${f('spento.png', 'SPENTA – pannello opalino bianco, nessun LED visibile')}${f('interno.png', 'ACCESA, pannello sollevato – MDF bianco, 3 campate con traversi')}<div class="note"><b>Nota</b><br>Le zone più scure al centro di ogni campata sono la stima prudente del programma di simulazione (solo primo rimbalzo): nella realtà, con rimbalzi sulle pareti bianche e diffusione nel pannello, saranno meno marcate.<br><br>Un modello 3D interattivo (interruttore on/off, sezione) è nel file <i>scatola-luminosa.html</i>.</div></div>`);
}
function montaggio() {
  const steps = ['Taglia le doghe 15 × 80: da ciascuna ricava 1000 + 470 + 470 mm. Scegli doghe dritte.', 'Riduci i 2 traversi da 80 a 67 mm di altezza (taglio nel senso della lunghezza, con guida).', 'Assembla i 4 montanti a fianco dell\'MDF 970 × 470: parte inferiore a filo, giunti con stucco epossidico e squadrette negli angoli.', 'Incolla i 2 traversi sull\'MDF, a 313,3 mm dalle testate e tra loro (luce delle campate).', 'Incolla i listelli 8 × 8 sul legno NUDO, con la cima 3 mm sotto il bordo (usa un pezzetto di pannello opalino come distanziale), anche ai due lati dei traversi.', 'Esegui il foro Ø10 per il cavo sulla testata e i fori Ø8 passacavi nei traversi, sotto i listelli.', 'Vernicia di bianco OPACO tutto l\'interno (2 mani), listelli compresi. Lascia arieggiare qualche giorno.', 'Incolla le strisce COB sotto i listelli, rivolte in basso; collega con connettori angolari e alimenta le campate in parallelo. Prova prima di chiudere.', 'Appoggia il pannello opalino sui listelli (gioco di 1 mm per lato) e fissalo.'];
  const li = steps.map((s, i) => `<li><span>${i + 1}</span>${esc(s)}</li>`).join('');
  return page(10, 'Montaggio e note importanti', `<div class="two"><ol class="steps">${li}</ol><div class="notes"><h3>Punti chiave</h3><ul><li><b>Altezza utile 67 mm</b>: l'MDF da 10 mm sta dentro i montanti da 80. Il centro di ogni campata è più scuro che con 80 mm utili (pag. 9).</li><li><b>Vernice opaca</b>, bianco vero: una finitura lucida crea riflessi dei LED visibili dal pannello.</li><li><b>Listello 8 × 8</b>: la striscia è larga 8 mm, quindi senza margine. Incollala ben centrata.</li><li><b>Alimentazione 5 V USB</b>: verificare potenza/corrente reali; campate in parallelo.</li><li>Le vernici a solvente fresche possono rovinare il pannello acrilico: far asciugare bene.</li></ul><h3>Dati ancora da confermare</h3><ul><li>Misure reali di MDF (970 × 470) e pannello opalino</li><li>Potenza della striscia e dell'alimentatore</li><li>Sistema di fissaggio a parete</li></ul></div></div>`);
}

/* ---------------- Assemblaggio HTML ---------------- */
const css = `
@page{size:297mm 210mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#888;font-family:'DejaVu Sans',Arial,sans-serif;color:#111}
.page{width:297mm;height:210mm;position:relative;overflow:hidden;background:#fff;page-break-after:always;margin:0 auto 6mm}
@media print{html,body{background:#fff}.page{margin:0}}
header{position:absolute;left:12mm;right:12mm;top:7mm;display:flex;justify-content:space-between;align-items:baseline;border-bottom:0.4mm solid #222;padding-bottom:2mm}
header .t{font-size:5.4mm;font-weight:700}header .s{font-size:2.8mm;color:#555}
.body{position:absolute;left:12mm;right:12mm;top:20mm;bottom:12mm}
footer{position:absolute;left:12mm;right:12mm;bottom:5mm;font-size:2.6mm;color:#666;display:flex;justify-content:space-between;border-top:0.2mm solid #bbb;padding-top:1.4mm}
svg{display:block}
.cover{background:#14161b;color:#fff}.cover footer{color:#9aa;border-color:#333}
.cover .ch{position:absolute;left:14mm;top:12mm}.cover .k{font-size:3.2mm;letter-spacing:.4em;color:#f2c14e}
.cover h1{margin:2mm 0 1mm;font-size:11mm}.cover .sub{font-size:3.6mm;color:#bbc}
.cover .pair{position:absolute;left:14mm;right:14mm;top:50mm;display:flex;gap:6mm}
.cover figure{margin:0;flex:1;position:relative}.cover figure img{width:100%;display:block;border-radius:2mm}
.cover figcaption{position:absolute;left:3mm;top:3mm;background:#f2c14e;color:#111;font-weight:700;font-size:3mm;padding:.8mm 2.4mm;border-radius:1mm}
.cover .facts{position:absolute;left:14mm;right:14mm;bottom:15mm;display:flex;gap:6mm}
.cover .facts div{flex:1;border-top:0.5mm solid #f2c14e;padding-top:2mm}.cover .facts b{display:block;font-size:4mm}.cover .facts span{font-size:2.8mm;color:#bbc}
.gal{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
.gal figure{margin:0}.gal img{width:100%;aspect-ratio:16/9.6;object-fit:cover;display:block;border-radius:1.5mm;background:#15171c}
.gal figcaption{font-size:2.9mm;margin-top:1.2mm;color:#333}
.gal .note{font-size:3mm;border:0.3mm solid #ccc;background:#faf8f0;padding:4mm;border-radius:1.5mm;align-self:start}
.tb{width:100%;border-collapse:collapse;font-size:2.9mm}.tb th{background:#222;color:#fff;text-align:left;padding:1.3mm 2mm}.tb td{border-bottom:0.2mm solid #ccc;padding:1.1mm 2mm}.tb td.c,.tb th:first-child{text-align:center}
.box{margin-top:3mm;font-size:2.9mm;border:0.3mm solid #ccc;background:#f6f6f6;padding:2.6mm;border-radius:1.5mm}.box.warn{background:#fff4e0;border-color:#e0a100}
.two{display:grid;grid-template-columns:1.25fr 1fr;gap:8mm}
.steps{list-style:none;margin:0;padding:0;font-size:3.3mm}.steps li{display:flex;gap:3mm;margin-bottom:3.2mm;line-height:1.35}.steps li span{flex:0 0 6mm;height:6mm;border-radius:50%;background:#222;color:#fff;text-align:center;line-height:6mm;font-weight:700;font-size:3mm}
.notes{background:#faf8f0;border:0.3mm solid #ddd;padding:5mm;border-radius:1.5mm;font-size:3.3mm}.notes h3{margin:0 0 2.5mm;font-size:4mm}.notes ul{margin:0 0 4mm;padding-left:4.5mm}.notes li{margin-bottom:1.5mm}
`;
const pages = [copertina(), gallery(), paginaViste(), paginaPianta(), paginaSezioneAA(), paginaSezioneBB(), paginaEsploso(), paginaDistinta(), paginaLuce(), montaggio()];
fs.writeFileSync(path.join(here, 'index.html'), `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Scatola luminosa – presentazione del progetto</title><style>${css}</style></head><body>${pages.join('\n')}</body></html>`);
console.log('index.html scritto,', pages.length, 'pagine');
