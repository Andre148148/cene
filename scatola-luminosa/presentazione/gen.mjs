// Genera presentazione/index.html (10 pagine A4 orizzontali) con disegni tecnici in SVG.
// Uso: node presentazione/gen.mjs   (poi: node presentazione/pdf.cjs)
import { simulateBay } from '../src/sim.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

/* ---------------- Parametri (mm) ---------------- */
const L = 1000, W = 500, BACK = 8, DIFF = 3, BAR = 6, BARW = 10, STRIP_W = 8;
const H = 85, t = 15;                       // soluzione base: montanti 15x85
const Li = L - 2 * t, b = (Li - 2 * t) / 3, bh = W - 2 * t;  // b = 313,3  bh = 470
const zTop = BACK + H, TOT = zTop + DIFF;   // 93 / 96
const fmt = v => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));
const N = 10;

/* ---------------- Helper SVG ---------------- */
const DEFS = `<defs>
 <pattern id="wood" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="#ecd8ae"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#a07c44" stroke-width="0.35"/></pattern>
 <pattern id="panel" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><rect width="1.6" height="1.6" fill="#dbe8f2"/><circle cx="0.8" cy="0.8" r="0.25" fill="#8fb0c9"/></pattern>
 <marker id="arr" viewBox="0 0 6 6" markerWidth="2.4" markerHeight="2.4" refX="5.5" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 z" fill="#222"/></marker>
 <marker id="ray" viewBox="0 0 6 6" markerWidth="2.6" markerHeight="2.6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#e0a100"/></marker>
</defs>`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = (x, y, txt, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 3}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}"${o.bold ? ' font-weight="700"' : ''}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ''}>${esc(txt)}</text>`;
const R = (x, y, w, h, fill, stroke = '#222', sw = 0.25, extra = '') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const Ln = (x1, y1, x2, y2, stroke = '#222', sw = 0.2, extra = '') => `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
// quota orizzontale tra x1 e x2 (coordinate foglio), linea di quota a yl, riferimento oggetto yo. stile a tacche
function dimH(x1, x2, yo, yl, label, o = {}) {
  const d = yl > yo ? 1 : -1;
  return `<g>${Ln(x1, yo + d * 0.8, x1, yl + d * 1.2)}${Ln(x2, yo + d * 0.8, x2, yl + d * 1.2)}${Ln(x1, yl, x2, yl, '#222', 0.2)}${Ln(x1 - 0.7, yl + 0.7, x1 + 0.7, yl - 0.7, '#222', 0.3)}${Ln(x2 - 0.7, yl + 0.7, x2 + 0.7, yl - 0.7, '#222', 0.3)}${T((x1 + x2) / 2 + (o.dx || 0), yl - 0.8 + (o.dy || 0), label, { size: o.size || 2.7 })}</g>`;
}
function dimV(y1, y2, xo, xl, label, o = {}) {
  const d = xl > xo ? 1 : -1;
  return `<g>${Ln(xo + d * 0.8, y1, xl + d * 1.2, y1)}${Ln(xo + d * 0.8, y2, xl + d * 1.2, y2)}${Ln(xl, y1, xl, y2)}${Ln(xl - 0.7, y1 + 0.7, xl + 0.7, y1 - 0.7, '#222', 0.3)}${Ln(xl - 0.7, y2 + 0.7, xl + 0.7, y2 - 0.7, '#222', 0.3)}${T(xl - 0.8 * d + (o.dx || 0), (y1 + y2) / 2 + (o.dy || 0), label, { size: o.size || 2.7, rot: -90, anchor: 'middle' })}</g>`;
}
const callout = (x, y, tx, ty, txt, o = {}) => `${Ln(x, y, tx, ty, '#444', 0.18)}<circle cx="${x}" cy="${y}" r="0.5" fill="#444"/>${T(tx + (o.anchor === 'end' ? -1 : 1), ty + 0.9, txt, { size: o.size || 2.8, anchor: o.anchor === 'end' ? 'end' : 'start' })}`;
const page = (n, title, body, sub = '') => `<section class="page"><header><div class="t">${esc(title)}</div><div class="s">${esc(sub || 'Scatola luminosa 100 × 50 cm · misure in mm')}</div></header><div class="body">${body}</div><footer><span>Scatola luminosa retroilluminata – LED COB 4000K su fondo bianco opaco</span><span>${n} / ${N}</span></footer></section>`;
const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="DejaVu Sans, Arial, sans-serif">${DEFS}${inner}</svg>`;

/* ---------------- Pagina 3: viste esterne ---------------- */
function paginaViste() {
  const s = 0.19, ox = 24, oy = 22;
  let g = '';
  g += T(ox, 12, 'Vista frontale (lato pannello opalino) – scala 1:5,3', { anchor: 'start', size: 3.4, bold: true });
  g += R(ox, oy, L * s, W * s, 'url(#panel)', '#334', 0.4);
  [-Li / 2 + b + t / 2, -Li / 2 + 2 * b + 1.5 * t].forEach(x => { g += R(ox + (x - t / 2 + L / 2) * s, oy + t * s, t * s, bh * s, 'none', '#6b7c8c', 0.25, 'stroke-dasharray="1.2 0.8"'); });
  g += T(ox + L * s / 2, oy + W * s / 2, 'PANNELLO OPALINO 1000 × 500 × 3', { size: 4, fill: '#456' });
  g += T(ox + L * s / 2, oy + W * s / 2 + 6, '(tratteggio: traversi interni sotto il pannello)', { size: 2.6, fill: '#567' });
  g += dimH(ox, ox + L * s, oy + W * s, oy + W * s + 8, '1000');
  g += dimV(oy, oy + W * s, ox, ox - 8, '500');
  const py = 142, px = ox;
  g += T(px, py - 8, 'Vista laterale – scala 1:5,3', { anchor: 'start', size: 3.4, bold: true });
  g += R(px, py, W * s, TOT * s, 'url(#wood)', '#333', 0.35);
  g += R(px, py, W * s, DIFF * s, 'url(#panel)', '#334', 0.3);
  g += R(px, py + (TOT - BACK) * s, W * s, BACK * s, 'url(#wood)', '#333', 0.3);
  g += dimH(px, px + W * s, py + TOT * s, py + TOT * s + 8, '500');
  g += dimV(py, py + TOT * s, px + W * s, px + W * s + 9, '96');
  g += T(px + W * s + 14, py + 3, 'pannello 3', { anchor: 'start', size: 2.6, fill: '#444' });
  g += T(px + W * s + 14, py + 3 + DIFF * s + 4, 'cornice 85', { anchor: 'start', size: 2.6, fill: '#444' });
  g += T(px + W * s + 14, py + TOT * s - 0.5, 'tavola 8', { anchor: 'start', size: 2.6, fill: '#444' });
  const lx = 152, ly = 140;
  g += T(lx, ly - 8, 'Ingombri e dati', { anchor: 'start', size: 3.4, bold: true });
  ['Dimensioni esterne: 1000 × 500 × 96 mm', 'Cornice: montanti 15 × 85 mm', '3 campate interne da ≈ 313 × 470 mm', 'Pannello: opalino (vetro sintetico) 3 mm', 'LED: striscia COB 8 mm, 4000K, 5 V USB', 'Fissaggio a parete: da definire'].forEach((r, i) => { g += T(lx, ly + i * 5.4, '• ' + r, { anchor: 'start', size: 2.9 }); });
  return page(3, 'Viste esterne e ingombri', svg(273, 176, g));
}

/* ---------------- Pagina 4: pianta interna ---------------- */
function paginaPianta() {
  const s = 0.24, ox = 20, oy = 34;
  const X = x => ox + (x + L / 2) * s, Y = y => oy + (W / 2 - y) * s;
  let g = T(ox, 8, 'Pianta (pannello opalino rimosso) – scala 1:4,2', { anchor: 'start', size: 3.4, bold: true });
  g += R(X(-L / 2), Y(W / 2), L * s, W * s, 'url(#wood)', '#333', 0.4);
  const xs = i => -Li / 2 + i * (b + t);
  for (let i = 0; i < 3; i++) {
    const x0 = xs(i), x1 = x0 + b, y0 = -bh / 2, y1 = bh / 2;
    g += R(X(x0), Y(y1), b * s, bh * s, '#fbfbf8', '#444', 0.25);
    g += R(X(x0), Y(y1), BARW * s, bh * s, '#fff', '#777', 0.2) + R(X(x1 - BARW), Y(y1), BARW * s, bh * s, '#fff', '#777', 0.2);
    g += R(X(x0 + BARW), Y(y1), (b - 2 * BARW) * s, BARW * s, '#fff', '#777', 0.2) + R(X(x0 + BARW), Y(y0 + BARW), (b - 2 * BARW) * s, BARW * s, '#fff', '#777', 0.2);
    const sw = STRIP_W, off = (BARW - sw) / 2;
    g += R(X(x0 + off), Y(y1), sw * s, bh * s, '#f2c14e', '#a37a10', 0.15) + R(X(x1 - BARW + off), Y(y1), sw * s, bh * s, '#f2c14e', '#a37a10', 0.15);
    g += R(X(x0 + BARW), Y(y1 - off), (b - 2 * BARW) * s, sw * s, '#f2c14e', '#a37a10', 0.15) + R(X(x0 + BARW), Y(y0 + BARW - off), (b - 2 * BARW) * s, sw * s, '#f2c14e', '#a37a10', 0.15);
    g += T(X((x0 + x1) / 2), Y(0) - 6, 'campata ' + (i + 1), { size: 3.4, fill: '#556' });
    g += T(X((x0 + x1) / 2), Y(0) - 1.5, fmt(b) + ' × ' + bh, { size: 2.8, fill: '#667' });
  }
  // lavorazioni consigliate
  [xs(1) - t / 2, xs(2) - t / 2].forEach(xc => { g += R(X(xc - t / 2), Y(BARW / 2 + 5), t * s, (BARW + 10) * s, '#fff', '#c33', 0.3, 'stroke-dasharray="0.8 0.6"'); });
  g += `<circle cx="${X(-L / 2 + t / 2)}" cy="${Y(0)}" r="${5 * s + 0.4}" fill="#fff" stroke="#c33" stroke-width="0.3"/>`;
  const mark = (x, y, k, px, py) => Ln(x, y, px, py, '#c33', 0.2) + `<circle cx="${px}" cy="${py}" r="2.4" fill="#fff" stroke="#c33" stroke-width="0.3"/>` + T(px, py + 0.9, k, { size: 2.7, bold: true, fill: '#c33' });
  g += mark(X(-L / 2 + t / 2), Y(0), 'F', X(xs(0) + 40), Y(0) + 8);
  g += mark(X(xs(1) - t / 2), Y(0), 'T', X(xs(1) + 40), Y(0) + 8);
  g += mark(X(xs(2) - t / 2), Y(0), 'T', X(xs(2) + 40), Y(0) + 8);
  // quote
  g += dimH(X(-L / 2), X(L / 2), Y(-W / 2), Y(-W / 2) + 7, '1000');
  g += dimV(Y(W / 2), Y(-W / 2), X(-L / 2), X(-L / 2) - 7, '500');
  g += dimV(Y(bh / 2), Y(-bh / 2), X(L / 2), X(L / 2) + 7, '470');
  const segs = [[-L / 2, -L / 2 + t, '15'], [xs(0), xs(0) + b, fmt(b)], [xs(0) + b, xs(1), '15'], [xs(1), xs(1) + b, fmt(b)], [xs(1) + b, xs(2), '15'], [xs(2), xs(2) + b, fmt(b)], [xs(2) + b, L / 2, '15']];
  segs.forEach(([a, c, lab]) => { g += dimH(X(a), X(c), Y(W / 2), Y(W / 2) - 6, lab, { size: lab === '15' ? 2.2 : 2.7, dy: lab === '15' ? -1.4 : 0 }); });
  // legenda
  const lx = 20, ly = 168;
  [['url(#wood)', 'cornice e traversi (15 × 85)'], ['#fff', 'listello 10 × 6 (bianco)'], ['#f2c14e', 'striscia LED COB 8 mm (in basso)'], ['#fbfbf8', 'fondo bianco opaco (tavola 8 mm)']].forEach(([f, txt], i) => { g += R(lx + i * 66, ly, 5, 3.5, f, '#444', 0.2) + T(lx + i * 66 + 6.5, ly + 3, txt, { anchor: 'start', size: 2.5 }); });
  g += T(lx, ly + 9, 'F = foro Ø10 per cavo USB 5 V + interruttore (testata sinistra) · T = tacca passacavi 15 × 10 × 6 in cima ai traversi (lavorazioni consigliate).', { anchor: 'start', size: 2.5, fill: '#933' });
  g += T(lx, ly + 13.5, 'Le 4 strisce di ogni campata si collegano tra loro con connettori angolari; ogni campata è alimentata in parallelo.', { anchor: 'start', size: 2.5, fill: '#933' });
  return page(4, 'Pianta interna e disposizione delle strisce LED', svg(273, 178, g));
}

/* ---------------- Pagina 5: sezione A-A + dettaglio ---------------- */
function paginaSezioneAA() {
  let g = '';
  const s = 0.46, ox = 22, oz = 62;
  const Xp = y => ox + (y + W / 2) * s, Zp = z => oz - z * s;
  g += T(ox, 8, 'SEZIONE A–A (trasversale, al centro della campata centrale) – scala 1:2', { anchor: 'start', size: 3.4, bold: true });
  g += R(Xp(-W / 2), Zp(BACK), W * s, BACK * s, 'url(#wood)', '#222', 0.3);
  g += R(Xp(-W / 2), Zp(zTop), t * s, H * s, 'url(#wood)', '#222', 0.3) + R(Xp(W / 2 - t), Zp(zTop), t * s, H * s, 'url(#wood)', '#222', 0.3);
  g += R(Xp(-W / 2 + t), Zp(zTop), BARW * s, BAR * s, '#fff', '#222', 0.25) + R(Xp(W / 2 - t - BARW), Zp(zTop), BARW * s, BAR * s, '#fff', '#222', 0.25);
  g += R(Xp(-W / 2 + t + 1), Zp(zTop - BAR), STRIP_W * s, 1.5 * s, '#f2c14e', '#a37a10', 0.2) + R(Xp(W / 2 - t - BARW + 1), Zp(zTop - BAR), STRIP_W * s, 1.5 * s, '#f2c14e', '#a37a10', 0.2);
  g += R(Xp(-W / 2), Zp(TOT), W * s, DIFF * s, 'url(#panel)', '#234', 0.3);
  g += dimH(Xp(-W / 2), Xp(W / 2), Zp(0), Zp(0) + 7, '500');
  g += dimV(Zp(TOT), Zp(0), Xp(W / 2), Xp(W / 2) + 9, '96');
  g += dimV(Zp(zTop), Zp(BACK), Xp(-W / 2), Xp(-W / 2) - 8, '85');
  g += T(Xp(0), Zp(TOT / 2) + 1, 'interno bianco opaco – altezza utile 85', { size: 3, fill: '#777' });
  // dettaglio 2,2:1
  const s2 = 2.2, dx = 26, topY = 96, zMin = 66;
  const Xd = y => dx + (y + 250) * s2, Zd = z => topY + (TOT - z) * s2;
  g += T(dx, 86, 'DETTAGLIO D – angolo superiore (scala 2,2:1)', { anchor: 'start', size: 3.4, bold: true });
  g += R(Xd(-250), Zd(zTop), t * s2, (zTop - zMin) * s2, 'url(#wood)', '#222', 0.35);
  g += R(Xd(-250 + t), Zd(zTop), BARW * s2, BAR * s2, '#fff', '#222', 0.35);
  g += R(Xd(-250 + t + 1), Zd(zTop - BAR), STRIP_W * s2, 1.5 * s2, '#f2c14e', '#a37a10', 0.3);
  g += R(Xd(-250), Zd(TOT), 50 * s2, DIFF * s2, 'url(#panel)', '#234', 0.35);
  [[0, 8], [0, 22], [0, 38]].forEach(([a, c]) => { g += `<line x1="${Xd(-250 + t + 5).toFixed(1)}" y1="${(Zd(zTop - BAR) + 3.5).toFixed(1)}" x2="${Xd(-250 + t + 5 + c).toFixed(1)}" y2="${(Zd(zTop - BAR) + 30).toFixed(1)}" stroke="#e0a100" stroke-width="0.35" marker-end="url(#ray)"/>`; });
  g += T(Xd(-250 + t + 24), Zd(zTop - BAR) + 36, 'luce verso il fondo bianco', { size: 2.7, fill: '#9a6b00', anchor: 'start' });
  g += dimH(Xd(-250), Xd(-250 + t), Zd(zMin), Zd(zMin) + 6, '15');
  g += dimH(Xd(-250 + t), Xd(-250 + t + BARW), Zd(TOT), Zd(TOT) - 6, '10');
  g += dimV(Zd(zTop), Zd(zTop - BAR), Xd(-250 + t + BARW), Xd(-250 + t + BARW) + 7, '6');
  g += dimV(Zd(TOT), Zd(zTop), Xd(-250), Xd(-250) - 6, '3');
  g += T(Xd(-250 + t / 2), Zd(zMin) - 4, '(montante interrotto)', { size: 2.3, fill: '#777' });
  const cx = 150, cy = 100;
  [['A', 'Pannello opalino 3 mm (vetro sintetico): diffonde la luce'], ['B', 'Striscia COB 8 mm, rivolta verso il basso: nessun LED visibile'], ['C', 'Listello 10 × 6 mm, incollato sotto il bordo superiore'], ['D', 'Montante 15 × 85 mm (interno verniciato bianco opaco)'], ['E', 'Tavola di fondo 8 mm, bianco opaco: riflette e diffonde']].forEach(([k, txt], i) => { g += `<circle cx="${cx}" cy="${cy + i * 10}" r="2.8" fill="#fff" stroke="#222" stroke-width="0.3"/>` + T(cx, cy + i * 10 + 1, k, { size: 3, bold: true }) + T(cx + 6, cy + i * 10 + 1, txt, { anchor: 'start', size: 3 }); });
  const lab = (x, y, k) => `<circle cx="${x}" cy="${y}" r="2.3" fill="#fff" stroke="#222" stroke-width="0.3"/>` + T(x, y + 0.9, k, { size: 2.7, bold: true });
  g += lab(Xd(-250 + 38), Zd(TOT) + 3.3, 'A') + lab(Xd(-250 + t + 16), Zd(zTop - BAR) + 3, 'B') + lab(Xd(-250 + t + 8), Zd(zTop) + 3, 'C') + lab(Xd(-250 + 7), Zd(zTop) + 20, 'D') + lab(Xp(-100), Zp(BACK / 2), 'E');
  return page(5, 'Sezione trasversale A–A e dettaglio del listello LED', svg(273, 176, g));
}

/* ---------------- Pagina 6: sezione B-B + percorso luce ---------------- */
function paginaSezioneBB() {
  let g = '';
  const s = 0.25, ox = 14, oz = 50;
  const Xp = x => ox + (x + L / 2) * s, Zp = z => oz - z * s;
  g += T(ox, 9, 'SEZIONE B–B (longitudinale, al centro) – scala 1:4', { anchor: 'start', size: 3.4, bold: true });
  g += R(Xp(-L / 2), Zp(BACK), L * s, BACK * s, 'url(#wood)', '#222', 0.25);
  const wall = x => R(Xp(x), Zp(zTop), t * s, H * s, 'url(#wood)', '#222', 0.25);
  const xs = i => -Li / 2 + i * (b + t);
  g += wall(-L / 2) + wall(xs(1) - t) + wall(xs(2) - t) + wall(L / 2 - t);
  for (let i = 0; i < 3; i++) {
    g += R(Xp(xs(i)), Zp(zTop), BARW * s, BAR * s, '#fff', '#222', 0.2) + R(Xp(xs(i) + b - BARW), Zp(zTop), BARW * s, BAR * s, '#fff', '#222', 0.2);
    g += R(Xp(xs(i) + 1), Zp(zTop - BAR), STRIP_W * s, 1.5 * s, '#f2c14e', '#a37a10', 0.15) + R(Xp(xs(i) + b - BARW + 1), Zp(zTop - BAR), STRIP_W * s, 1.5 * s, '#f2c14e', '#a37a10', 0.15);
  }
  g += R(Xp(-L / 2), Zp(TOT), L * s, DIFF * s, 'url(#panel)', '#234', 0.25);
  g += dimH(Xp(-L / 2), Xp(L / 2), Zp(0), Zp(0) + 7, '1000');
  [[-L / 2, '15'], [xs(0), fmt(b)], [xs(0) + b, '15'], [xs(1), fmt(b)], [xs(1) + b, '15'], [xs(2), fmt(b)], [xs(2) + b, '15']].forEach(([x0, lab], i) => {
    const w = lab === '15' ? t : b;
    g += dimH(Xp(x0), Xp(x0 + w), Zp(TOT), Zp(TOT) - 5, lab, { size: 2.2, dy: lab === '15' ? -1.2 : 0 });
  });
  // percorso della luce
  const s2 = 0.44, bx = 30, bz = 122;
  const Xb = x => bx + x * s2, Zb = z => bz - z * s2;
  g += T(bx - 8, 68, 'PERCORSO DELLA LUCE in una campata (sezione, scala 1:2)', { anchor: 'start', size: 3.4, bold: true });
  g += R(Xb(-t), Zb(BACK), (b + 2 * t) * s2, BACK * s2, 'url(#wood)', '#222', 0.3);
  g += R(Xb(-t), Zb(zTop), t * s2, H * s2, 'url(#wood)', '#222', 0.3) + R(Xb(b), Zb(zTop), t * s2, H * s2, 'url(#wood)', '#222', 0.3);
  g += R(Xb(0), Zb(zTop), BARW * s2, BAR * s2, '#fff', '#222', 0.3) + R(Xb(b - BARW), Zb(zTop), BARW * s2, BAR * s2, '#fff', '#222', 0.3);
  g += R(Xb(1), Zb(zTop - BAR), STRIP_W * s2, 1.5 * s2, '#f2c14e', '#a37a10', 0.2) + R(Xb(b - BARW + 1), Zb(zTop - BAR), STRIP_W * s2, 1.5 * s2, '#f2c14e', '#a37a10', 0.2);
  g += R(Xb(-t), Zb(TOT), (b + 2 * t) * s2, DIFF * s2, 'url(#panel)', '#234', 0.3);
  const ry = zTop - BAR - 1.5;
  const ray = (x0, z0, x1, z1, col = '#e0a100') => `<line x1="${Xb(x0).toFixed(1)}" y1="${Zb(z0).toFixed(1)}" x2="${Xb(x1).toFixed(1)}" y2="${Zb(z1).toFixed(1)}" stroke="${col}" stroke-width="0.35" marker-end="url(#ray)"/>`;
  [60, 130].forEach(fx => { g += ray(6, ry, fx, BACK) + ray(fx, BACK, fx + 45, zTop - 1, '#f0b800'); });
  [250, 180].forEach(fx => { g += ray(b - 6, ry, fx, BACK) + ray(fx, BACK, fx - 45, zTop - 1, '#f0b800'); });
  g += T(Xb(b / 2), Zb(zTop / 2) + 2, 'luce riflessa dal fondo bianco opaco', { size: 3, fill: '#9a6b00' });
  g += T(Xb(b / 2), Zb(zTop - 8), 'il pannello vede solo luce già diffusa', { size: 2.8, fill: '#456' });
  // testo a destra del disegno
  const tx = 185, ty = 78;
  ['Come funziona', '1. Le strisce COB guardano verso il basso:', '    i LED non si vedono dal pannello.', '2. La luce colpisce fondo e pareti, verniciati di', '    bianco opaco, che la diffondono.', '3. La luce riflessa risale e attraversa il pannello', '    opalino: aspetto uniforme, senza punti luce.', '', 'Più è alta la cornice, più la luce si mescola:', '85 mm = buona uniformità', '60 mm = centro scuro', '100 mm = centro quasi uniforme (pag. 9)'].forEach((l, i) => { g += T(tx, ty + i * 6.2, l, { anchor: 'start', size: i === 0 ? 3.6 : 2.7, bold: i === 0 }); });
  return page(6, 'Sezione longitudinale B–B e percorso della luce', svg(273, 176, g));
}

/* ---------------- Pagina 7: vista esplosa (isometrica) ---------------- */
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join(''); };
function paginaEsploso() {
  const C = Math.cos(Math.PI / 6), S = 0.5, sc = 0.14, ox = 96, oy = 112;
  const P = (x, y, z) => [ox + (x - y) * C * sc, oy + ((x + y) * S - z) * sc];
  const poly = (pts, fill, op = 1) => `<polygon points="${pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ')}" fill="${fill}" fill-opacity="${op}" stroke="#222" stroke-width="0.2" stroke-linejoin="round"/>`;
  const box = (x0, x1, y0, y1, z0, z1, col, op = 1) => poly([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], shade(col, 0.82), op) + poly([P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)], shade(col, 0.68), op) + poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], col, op);
  const WOODC = '#e2c58f', WHITEC = '#f6f6f2', STRIPC = '#f2c14e', PANELC = '#cfe2f1';
  const xs = i => -Li / 2 + i * (b + t);
  let g = T(14, 12, 'Vista esplosa – ordine di montaggio (dal basso verso l\'alto)', { anchor: 'start', size: 3.4, bold: true });
  const f0 = BACK + 38, f1 = f0 + H;
  g += box(-L / 2, L / 2, -W / 2, W / 2, 0, BACK, WOODC);
  const frame = [[-L / 2, L / 2, -W / 2, -W / 2 + t], [-L / 2, -L / 2 + t, -W / 2 + t, W / 2 - t], [xs(1) - t, xs(1), -W / 2 + t, W / 2 - t], [xs(2) - t, xs(2), -W / 2 + t, W / 2 - t], [L / 2 - t, L / 2, -W / 2 + t, W / 2 - t], [-L / 2, L / 2, W / 2 - t, W / 2]];
  frame.sort((a, c) => (a[0] + a[1] + a[2] + a[3]) - (c[0] + c[1] + c[2] + c[3]));
  frame.forEach(([a, c, d, e]) => { g += box(a, c, d, e, f0, f1, WOODC); });
  const zs0 = f1 + 40, zb0 = zs0 + 40, zp = zb0 + BAR + 70;
  const strips = [], bars = [];
  for (let i = 0; i < 3; i++) {
    const x0 = xs(i), x1 = x0 + b, y0 = -bh / 2, y1 = bh / 2, o = (BARW - STRIP_W) / 2;
    strips.push([x0 + o, x0 + o + STRIP_W, y0, y1], [x1 - BARW + o, x1 - BARW + o + STRIP_W, y0, y1], [x0 + BARW, x1 - BARW, y0 + o, y0 + o + STRIP_W], [x0 + BARW, x1 - BARW, y1 - o - STRIP_W, y1 - o]);
    bars.push([x0, x0 + BARW, y0, y1], [x1 - BARW, x1, y0, y1], [x0 + BARW, x1 - BARW, y0, y0 + BARW], [x0 + BARW, x1 - BARW, y1 - BARW, y1]);
  }
  const srt = arr => arr.sort((a, c) => (a[0] + a[1] + a[2] + a[3]) - (c[0] + c[1] + c[2] + c[3]));
  srt(strips).forEach(([a, c, d, e]) => { g += box(a, c, d, e, zs0, zs0 + 1.5, STRIPC); });
  srt(bars).forEach(([a, c, d, e]) => { g += box(a, c, d, e, zb0, zb0 + BAR, WHITEC); });
  g += box(-L / 2, L / 2, -W / 2, W / 2, zp, zp + DIFF, PANELC, 0.62);
  const guide = (x, y, z0, z1) => { const a = P(x, y, z0), c = P(x, y, z1); return Ln(a[0], a[1], c[0], c[1], '#888', 0.2, 'stroke-dasharray="1 1"'); };
  [[-L / 2, W / 2], [L / 2, W / 2], [L / 2, -W / 2]].forEach(([x, y]) => { g += guide(x, y, BACK, f0) + guide(x, y, f1, zp); });
  const lab = (n, pt, ty, l1, l2) => { const [x, y] = pt, tx = 186; return Ln(x, y, tx, ty, '#444', 0.18) + `<circle cx="${tx}" cy="${ty}" r="2.8" fill="#fff" stroke="#222" stroke-width="0.3"/>` + T(tx, ty + 1, n, { size: 3, bold: true }) + T(tx + 5, ty + 0.5, l1, { anchor: 'start', size: 3, bold: true }) + T(tx + 5, ty + 4.2, l2, { anchor: 'start', size: 2.6, fill: '#444' }); };
  g += lab('5', P(L / 2 - 80, 40, zp + DIFF), 34, 'Pannello opalino', '1000 × 500 × 3 mm');
  g += lab('4', P(xs(2) + b - 5, 60, zb0 + BAR), 62, 'Listelli 10 × 6 mm', '6 × 470 + 6 × 293 mm');
  g += lab('3', P(xs(2) + b - 30, -130, zs0 + 1.5), 90, 'Strisce LED COB 8 mm', '≈ 4,6 m, rivolte in basso');
  g += lab('2', P(L / 2 - 4, 40, f0 + H / 2), 118, 'Cornice', '2 montanti 1000×85×15 · 4 pezzi 470×85×15');
  g += lab('1', P(L / 2 - 20, 80, BACK / 2), 146, 'Tavola di fondo', '1000 × 500 × 8 mm');
  g += T(14, 172, 'Fondo e lati interni vanno verniciati di bianco opaco PRIMA di incollare listelli e strisce.', { anchor: 'start', size: 2.8, fill: '#933' });
  return page(7, 'Vista esplosa e componenti', svg(273, 176, g));
}

/* ---------------- Pagina 8: distinta e taglio ---------------- */
function paginaDistinta() {
  const rows = [
    ['1', 'Tavola di fondo', 'compensato / MDF', '1000 × 500 × 8', '1', 'bianco opaco sul lato interno'],
    ['2a', 'Montanti lunghi', 'abete / multistrato', '1000 × 85 × 15', '2', 'faccia interna bianca'],
    ['2b', 'Testate', 'abete / multistrato', '470 × 85 × 15', '2', 'foro Ø10 sulla testata del cavo'],
    ['2c', 'Traversi', 'abete / multistrato', '470 × 85 × 15', '2', 'tacca 15 × 10 × 6 in cima'],
    ['4a', 'Listelli lungo y', 'legno 10 × 6', '470', '6', 'sotto il bordo, lati lunghi campate'],
    ['4b', 'Listelli lungo x', 'legno 10 × 6', '293', '6', 'tra i listelli lunghi'],
    ['3', 'Striscia LED COB 8 mm', '4000K, 5 V, 320 LED/m', '≈ 4,6 m (rotolo 5 m)', '1', 'tagli: 6 × 470 + 6 × 293 mm'],
    ['5', 'Pannello opalino', 'vetro sintetico (PMMA opale)', '1000 × 500 × 3', '1', 'appoggiato sulla cornice'],
    ['6', 'Vernice bianca opaca', 'idropittura / smalto opaco', '< 0,5 L (2 mani)', '1', 'verificare finitura OPACA'],
    ['7', 'Alimentazione 5 V USB', 'con interruttore / dimmer in linea', '—', '1', 'potenza da verificare sulla scheda'],
  ];
  let h = '<table class="tb"><thead><tr><th>N.</th><th>Componente</th><th>Materiale / tipo</th><th>Misura (mm)</th><th>Q.tà</th><th>Note</th></tr></thead><tbody>';
  rows.forEach(r => { h += '<tr>' + r.map((c, i) => `<td${i === 0 || i === 4 ? ' class="c"' : ''}>${esc(c)}</td>`).join('') + '</tr>'; });
  h += '</tbody></table>';
  h += `<div class="box"><b>Controllo misure</b> – larghezza: 15 + 313,3 + 15 + 313,3 + 15 + 313,3 + 15 = 1000 mm · altezza utile 85 mm + tavola 8 + pannello 3 = 96 mm. Con montanti 100 × 18 mm (opzione): 3 campate da ≈ 309 × 464, spessore totale ≈ 111 mm.</div>`;
  h += `<div class="box warn"><b>Da verificare prima di comprare:</b> potenza e corrente della striscia COB (non leggibile dalla scheda) e dell'alimentatore USB 5 V · spessore reale del pannello opalino · finitura OPACA della vernice (la Cementite Tassani non indica la finitura in etichetta).</div>`;
  const sch = (() => { let g = T(0, 6, 'Schema di collegamento (consigliato)', { anchor: 'start', size: 3.4, bold: true });
    const bx = (x, y, w, txt, f = '#fff') => R(x, y, w, 9, f, '#222', 0.3) + T(x + w / 2, y + 5.6, txt, { size: 2.7 });
    g += bx(0, 12, 58, 'Alimentatore USB 5 V') + bx(70, 12, 52, 'Interruttore / dimmer') + Ln(58, 16.5, 70, 16.5, '#222', 0.3, 'marker-end="url(#arr)"');
    [0, 1, 2].forEach(i => { g += bx(150, 4 + i * 12, 60, 'Campata ' + (i + 1) + ' (4 tratti)', '#fff4cc') + Ln(122, 16.5, 135, 16.5, '#222', 0.3) + Ln(135, 16.5, 135, 8.5 + i * 12, '#222', 0.3) + Ln(135, 8.5 + i * 12, 150, 8.5 + i * 12, '#222', 0.3, 'marker-end="url(#arr)"'); });
    g += T(218, 18, 'ogni campata in parallelo:', { anchor: 'start', size: 2.6, fill: '#555' }) + T(218, 22.5, 'evita il calo di luce sui 5 m a 5 V', { anchor: 'start', size: 2.6, fill: '#555' });
    return g; })();
  h += `<div style="margin-top:6mm">${svg(273, 44, sch)}</div>`;
  return page(8, 'Distinta materiali e lista di taglio', h);
}

/* ---------------- Pagina 9: simulazione luce ---------------- */
function statsFor(Hh, tt) {
  const bw = (L - 4 * tt) / 3, bhh = W - 2 * tt;
  const r = simulateBay(bw, bhh, Hh, BAR, BARW);
  let mn = 1e9, mx = 0, sum = 0, n = 0;
  for (let j = 0; j < r.ny; j++) for (let i = 0; i < r.nx; i++) {
    const x = (i + .5) * 16, y = (j + .5) * 16;
    if (x < 20 || y < 20 || x > bw - 20 || y > bhh - 20) continue;
    const v = r.data[j * r.nx + i]; mn = Math.min(mn, v); mx = Math.max(mx, v); sum += v; n++;
  }
  const c = r.data[Math.floor(r.ny / 2) * r.nx + Math.floor(r.nx / 2)];
  return { r, bw, bhh, avg: sum / n, minMax: mn / mx, centre: c / (sum / n) };
}
function heat(st, x0, y0, wmm) {
  const { r, bw, bhh, avg } = st;
  const up = 2, nx = r.nx * up, ny = r.ny * up, cw = wmm / nx, ch = (wmm * bhh / bw) / ny;
  const at = (i, j) => r.data[Math.max(0, Math.min(r.ny - 1, j)) * r.nx + Math.max(0, Math.min(r.nx - 1, i))];
  const lerp = (a, c, k) => a + (c - a) * k;
  let out = '';
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const fx = (i + 0.5) / up - 0.5, fy = (j + 0.5) / up - 0.5, i0 = Math.floor(fx), j0 = Math.floor(fy), ax = fx - i0, ay = fy - j0;
    const v = lerp(lerp(at(i0, j0), at(i0 + 1, j0), ax), lerp(at(i0, j0 + 1), at(i0 + 1, j0 + 1), ax), ay) / avg;
    const k = Math.max(0, Math.min(1, v / 1.5));
    const col = [Math.round(lerp(30, 255, k)), Math.round(lerp(32, 244, k)), Math.round(lerp(40, 214, k))];
    out += `<rect x="${(x0 + i * cw).toFixed(2)}" y="${(y0 + (ny - 1 - j) * ch).toFixed(2)}" width="${(cw + 0.05).toFixed(2)}" height="${(ch + 0.05).toFixed(2)}" fill="rgb(${col})"/>`;
  }
  return out + R(x0, y0, wmm, wmm * bhh / bw, 'none', '#222', 0.3);
}
function paginaLuce() {
  let g = T(14, 12, 'Distribuzione della luce sul pannello – una campata (vista dall\'alto)', { anchor: 'start', size: 3.4, bold: true });
  const opts = [[60, 10, '60 mm  (10×60)'], [85, 15, '85 mm  (15×85) – base'], [100, 18, '100 mm  (18×100) – opzione']];
  const wmm = 62;
  opts.forEach(([hh, tt, name], i) => {
    const st = statsFor(hh, tt), x0 = 18 + i * 88, y0 = 24;
    g += T(x0, y0 - 3, name, { anchor: 'start', size: 3.2, bold: true });
    g += heat(st, x0, y0, wmm);
    const hgt = wmm * st.bhh / st.bw;
    g += T(x0, y0 + hgt + 7, `Centro / media: ${(st.centre * 100).toFixed(0)}%`, { anchor: 'start', size: 3 });
    g += T(x0, y0 + hgt + 13, `Zona scura / chiara: ${(st.minMax * 100).toFixed(0)}%`, { anchor: 'start', size: 3 });
    g += T(x0, y0 + hgt + 19, `Spessore totale: ${hh + BACK + DIFF} mm`, { anchor: 'start', size: 3 });
  });
  // legenda colori
  for (let i = 0; i < 40; i++) { const k = i / 39, col = [Math.round(30 + 225 * k), Math.round(32 + 212 * k), Math.round(40 + 174 * k)]; g += `<rect x="${18 + i * 1.6}" y="157" width="1.7" height="3.5" fill="rgb(${col})"/>`; }
  g += T(18, 165, '0%', { anchor: 'start', size: 2.5 }) + T(18 + 64, 165, '150% della luminosità media', { anchor: 'end', size: 2.5 });
  g += T(95, 160, 'Scuro = meno luce · Chiaro = più luce (rispetto alla media della campata)', { anchor: 'start', size: 2.7 });
  g += T(14, 174, 'Simulazione semplificata al primo rimbalzo (LED Lambertiani 120°, fondo bianco opaco 85%). Nella realtà i rimbalzi sulle pareti bianche attenuano le differenze: è una stima prudente.', { anchor: 'start', size: 2.5, fill: '#555' });
  g += T(14, 179, 'Per 100 mm si è ipotizzato lo spessore montante 18 mm.', { anchor: 'start', size: 2.5, fill: '#555' });
  return page(9, 'Simulazione della distribuzione di luce: 60 / 85 / 100 mm', svg(273, 182, g));
}

/* ---------------- Pagine 1, 2, 10 ---------------- */
const IMG = 'img/';
function copertina() {
  return `<section class="page cover"><div class="ch"><div class="k">PROGETTO</div><h1>Scatola luminosa retroilluminata</h1><div class="sub">1000 × 500 × 96 mm · pannello opalino · LED COB 4000K · fondo bianco opaco</div></div>
  <div class="pair"><figure><img src="${IMG}acceso.png"><figcaption>ACCESA</figcaption></figure><figure><img src="${IMG}spento.png"><figcaption>SPENTA</figcaption></figure></div>
  <div class="facts"><div><b>3 campate</b><span>da ≈ 313 × 470 mm, separate da traversi</span></div><div><b>Luce indiretta</b><span>LED rivolti in basso, nessun punto luce visibile</span></div><div><b>Interruttore</b><span>on / off (e dimmer) sull'alimentazione USB 5 V</span></div><div><b>≈ 4,6 m di LED</b><span>striscia COB 8 mm su listelli 10 × 6 mm</span></div></div>
  <footer><span>Documento di presentazione – render 3D e disegni tecnici</span><span>1 / ${N}</span></footer></section>`;
}
function gallery() {
  const f = (src, cap) => `<figure><img src="${IMG}${src}"><figcaption>${cap}</figcaption></figure>`;
  return page(2, 'Simulazioni 3D', `<div class="gal">${f('acceso.png', 'ACCESA – il pannello opalino diffonde la luce; alone sulla parete')}${f('spento.png', 'SPENTA – pannello opalino bianco, nessun LED visibile')}${f('interno.png', 'ACCESA, pannello sollevato – interno bianco, 3 campate con traversi')}<div class="note"><b>Nota</b><br>Le zone più scure al centro di ogni campata sono la stima prudente del programma di simulazione (solo primo rimbalzo): nella realtà, con rimbalzi sulle pareti bianche e diffusione nel pannello, saranno meno marcate.<br><br>Un modello 3D interattivo (interruttore on/off, sezione, altezza 60/85 mm) è nel file <i>scatola-luminosa.html</i>.</div></div>`);
}
function montaggio() {
  const steps = ['Taglia i pezzi come da distinta (pag. 8) e carteggia i bordi.', 'Assembla la cornice sulla tavola di fondo: montanti, testate e i due traversi a distanza di 313 mm dalle pareti.', 'Esegui il foro Ø10 per il cavo USB sulla testata e le tacche 15×10×6 in cima ai traversi.', 'Dai una mano di fondo e poi 2 mani di bianco OPACO su tutto l\'interno: fondo, pareti, traversi, bordi superiori. Lascia asciugare/arieggiare qualche giorno.', 'Incolla i listelli 10 × 6 sotto il bordo superiore, a filo con la cima, e su ciascuno la striscia COB (8 mm) rivolta verso il basso.', 'Collega le strisce con connettori angolari e alimentale in parallelo (un cavo per campata) per evitare cali di luminosità.', 'Prova l\'accensione con l\'interruttore/dimmer prima di chiudere.', 'Appoggia il pannello opalino sulla cornice e fissalo (colla trasparente o piccole viti con gioco).'];
  const li = steps.map((s, i) => `<li><span>${i + 1}</span>${esc(s)}</li>`).join('');
  return page(10, 'Montaggio e note importanti', `<div class="two"><ol class="steps">${li}</ol><div class="notes"><h3>Punti chiave</h3><ul><li><b>Vernice opaca</b>, bianco vero: una finitura lucida crea riflessi dei LED visibili dal pannello.</li><li><b>Listello 10 × 6</b> (non 6 × 6): la striscia è larga 8 mm.</li><li><b>Altezza 85 mm</b> consigliata; 100 mm per un centro quasi uniforme.</li><li><b>Alimentazione 5 V USB</b>: verificare potenza/corrente reali; alimentare le campate in parallelo.</li><li>Le vernici a solvente fresche possono rovinare il pannello acrilico: far asciugare bene prima di chiudere.</li></ul><h3>Dati ancora da confermare</h3><ul><li>Potenza della striscia e dell'alimentatore</li><li>Spessore e tipo del pannello opalino</li><li>Sistema di fissaggio a parete</li></ul></div></div>`);
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
.tb{width:100%;border-collapse:collapse;font-size:3.1mm}.tb th{background:#222;color:#fff;text-align:left;padding:1.6mm 2mm}.tb td{border-bottom:0.2mm solid #ccc;padding:1.5mm 2mm}.tb td.c,.tb th:first-child{text-align:center}
.box{margin-top:4mm;font-size:3.1mm;border:0.3mm solid #ccc;background:#f6f6f6;padding:3mm;border-radius:1.5mm}.box.warn{background:#fff4e0;border-color:#e0a100}
.two{display:grid;grid-template-columns:1.25fr 1fr;gap:8mm}
.steps{list-style:none;margin:0;padding:0;font-size:3.7mm}.steps li{display:flex;gap:3mm;margin-bottom:5mm;line-height:1.4}.steps li span{flex:0 0 6mm;height:6mm;border-radius:50%;background:#222;color:#fff;text-align:center;line-height:6mm;font-weight:700;font-size:3mm}
.notes{background:#faf8f0;border:0.3mm solid #ddd;padding:5mm;border-radius:1.5mm;font-size:3.5mm}.notes h3{margin:0 0 2.5mm;font-size:4.2mm}.notes ul{margin:0 0 4mm;padding-left:4.5mm}.notes li{margin-bottom:1.5mm}
`;
const pages = [copertina(), gallery(), paginaViste(), paginaPianta(), paginaSezioneAA(), paginaSezioneBB(), paginaEsploso(), paginaDistinta(), paginaLuce(), montaggio()];
fs.writeFileSync(path.join(here, 'index.html'), `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Scatola luminosa – presentazione del progetto</title><style>${css}</style></head><body>${pages.join('\n')}</body></html>`);
console.log('index.html scritto,', pages.length, 'pagine');
