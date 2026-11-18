// Guida PDF passo passo ai collegamenti, striscia per striscia, SENZA scatola. Uso: node presentazione/guida.mjs && node presentazione/guida.cjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { P, pieces, connectors, cById, jumpers, feeders, H, walk, stripLen } from '../src/layout6.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const Tx = (x, y, t, o = {}) => `<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" font-size="${o.size || 3}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}"${o.bold ? ' font-weight="700"' : ''}>${esc(t)}</text>`;
const R = (x, y, w, h, f, st = '#222', sw = 0.2, ex = '') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${f}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
const Ln = (x1, y1, x2, y2, st = '#222', sw = 0.25, ex = '') => `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
const RED = '#d01010', BLK = '#111', GOLD = ['', '#f2c14e', '#ffe39a'];
const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="DejaVu Sans, Arial, sans-serif">${inner}</svg>`;
const page = (n, N, title, body) => `<section class="page"><header><div class="t">${esc(title)}</div><div class="s">Guida ai collegamenti · striscia per striscia · senza scatola</div></header><div class="body">${body}</div><footer><span>Rosso = + 5 V · Nero = − · quadrati scuri = clip · arancio = ponticelli · tutte le misure in mm</span><span>${n} / ${N}</span></footer></section>`;
const wrap = (t, n) => { const out = []; let line = ''; t.split(' ').forEach(w => { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }); if (line) out.push(line); return out; };

const SC = 0.105, XMIN = { 1: -497, 2: -85 }, XW = 580, YMAX = 312, DW = XW * SC, DH = (YMAX + 245) * SC;
const stepsOf = set => walk.filter(w => w.set === set);

// disegno della situazione dopo il passo k (0-based) della striscia `set`
function cell(set, k, ox, oy, o = {}) {
  const seq = stepsOf(set), sgn = set === 1 ? -1 : 1;
  const X = x => ox + (x - XMIN[set]) * SC, Y = y => oy + (YMAX - y) * SC;
  const mine = pieces.filter(p => p.set === set);
  const placed = new Set(), con = new Set(), fd = new Set(), jm = new Set(); let trunkEnd = null, usb = false, newP = null;
  const news = { piece: [], con: [], fd: [], jm: [], trunk: null, usb: false };
  seq.slice(0, k + 1).forEach((w, i) => {
    const isNew = i === k;
    if (w.kind === 'usb') { usb = true; trunkEnd = w.trunkTo; if (isNew) { news.usb = true; news.trunk = [0, w.trunkTo]; } }
    if (w.kind === 'piece') { placed.add(w.piece); con.add(w.con); fd.add(w.feeder); trunkEnd = w.trunkTo; if (isNew) { news.piece.push(w.piece); news.con.push(w.con); news.fd.push(w.feeder); news.trunk = [w.trunkFrom, w.trunkTo]; } }
    if (w.kind === 'low') { placed.add(w.piece); con.add(w.ca); con.add(w.cb); jm.add(w.jumper); if (isNew) { news.piece.push(w.piece); news.con.push(w.ca, w.cb); news.jm.push(w.jumper); } }
  });
  const test = seq[k].kind === 'test';
  let g = '';
  // pezzi ancora da montare: contorno tratteggiato; montati: pieno
  mine.forEach(p => {
    const horiz = p.kind === 'seg', w = horiz ? p.len : 8, h = horiz ? 8 : p.len, cx = p.x, cy = horiz ? p.y : 0;
    const x = X(cx - w / 2), y = Y(cy + h / 2);
    const isPlaced = placed.has(p.id) || test, isNew = news.piece.includes(p.id);
    if (!isPlaced) g += R(x, y, w * SC, h * SC, 'none', '#bbb', 0.2, 'stroke-dasharray="0.8 0.6"');
    else g += R(x, y, w * SC, h * SC, test ? '#ffd45e' : GOLD[set], isNew ? '#e07000' : '#a37a10', isNew ? 0.7 : 0.2) + (test ? `<rect x="${(x - 0.8).toFixed(2)}" y="${(y - 0.8).toFixed(2)}" width="${(w * SC + 1.6).toFixed(2)}" height="${(h * SC + 1.6).toFixed(2)}" fill="none" stroke="#ffcf40" stroke-width="0.5" opacity="0.7"/>` : '');
    if (isPlaced || true) g += Tx(X(cx) + (horiz ? 0 : (set === 1 ? -3.6 : 3.6)), horiz ? (p.y > 0 ? Y(p.y) + 5.2 : Y(p.y) - 2.6) : Y(0), p.id, { size: 2.2, fill: isNew ? '#b05000' : '#9a7a20', bold: isNew });
  });
  // foro H
  g += `<circle cx="${X(0).toFixed(2)}" cy="${Y(P.W / 2 - P.T / 2).toFixed(2)}" r="1.8" fill="#fff" stroke="#c33" stroke-width="0.4"/>` + Tx(X(0), Y(P.W / 2 - P.T / 2) + 0.8, 'H', { size: 2, bold: true, fill: '#c33' });
  // dorsale
  const ty = Y(P.YTRUNK);
  if (usb || test) {
    const xe = test ? seq.filter(w => w.trunkTo !== undefined).slice(-1)[0].trunkTo : trunkEnd;
    const hl = news.trunk ? news.trunk : null;
    g += Ln(X(sgn * 6), ty - 0.35, X(xe), ty - 0.35, RED, 0.7) + Ln(X(sgn * 6), ty + 0.35, X(xe), ty + 0.35, BLK, 0.7);
    if (hl) g += Ln(X(hl[0] * (hl[0] === 0 ? 1 : 1)), ty, X(hl[1]), ty, '#ff9900', 1.5, 'opacity="0.55"');
    // cavo USB dal foro verso la spina
    g += Ln(X(sgn * 2), Y(P.W / 2 - P.T / 2) - 1.5, X(sgn * 2), Y(300), RED, 0.6) + Ln(X(sgn * 3.2), Y(P.W / 2 - P.T / 2) - 1.5, X(sgn * 3.2), Y(300), BLK, 0.6);
    g += R(X(sgn * 2.6) - 3, Y(300) - 4.5, 6, 4.5, '#cfd8e0', news.usb ? '#e07000' : '#445', news.usb ? 0.6 : 0.3) + Tx(X(sgn * 2.6), Y(300) - 1.1, 'USB ' + (set === 1 ? 'A' : 'B'), { size: 1.7, bold: true });
  }
  // derivazioni
  feeders.filter(f => fd.has(f.id)).forEach(f => { const c = cById[f.con], nw = news.fd.includes(f.id); g += Ln(X(f.x), ty, X(c.x), Y(c.y), nw ? '#e07000' : RED, nw ? 0.8 : 0.4) + `<circle cx="${X(f.x).toFixed(2)}" cy="${ty.toFixed(2)}" r="0.7" fill="#fff" stroke="#000" stroke-width="0.2"/>`; if (nw) g += Tx(X(f.x), ty - 2.2, f.id, { size: 2.2, bold: true, fill: '#b05000' }); });
  // ponticelli
  jumpers.filter(j => jm.has(j.id)).forEach(j => { const a = cById[j.a], b = cById[j.b], nw = news.jm.includes(j.id); g += Ln(X(a.x), Y(a.y), X(b.x), Y(b.y), '#e07000', nw ? 1.0 : 0.6); if (nw) g += Tx((X(a.x) + X(b.x)) / 2, Y(a.y) + 4.8, j.id, { size: 2.2, bold: true, fill: '#b05000' }); });
  // connettori
  connectors.filter(c => con.has(c.id)).forEach(c => { const nw = news.con.includes(c.id); g += R(X(c.x) - 1.1, Y(c.y) - 1.1, 2.2, 2.2, '#222', nw ? '#e07000' : '#000', nw ? 0.7 : 0.1); if (nw) g += Tx(X(c.x) + (set === 1 ? -2.4 : 2.4), Y(c.y) + (c.y > 0 ? 4.0 : 4.6), c.id, { size: 2.2, bold: true, fill: '#b05000', anchor: 'middle' }); });
  return g;
}

function stepCell(set, k, col, row) {
  const w = stepsOf(set)[k], x0 = 3 + col * 90, y0 = 2 + row * 90, ox = x0 + (90 - DW) / 2 - 1, oy = y0 + 11;
  let g = R(x0, y0, 87, 88, '#fff', '#ccc', 0.2, 'rx="1.5"');
  g += `<circle cx="${(x0 + 5).toFixed(2)}" cy="${(y0 + 4.6).toFixed(2)}" r="3.1" fill="${w.kind === 'test' ? '#3d9a5a' : '#222'}"/>` + Tx(x0 + 5, y0 + 5.6, String(k + 1), { size: 3, fill: '#fff', bold: true });
  g += Tx(x0 + 10, y0 + 5.5, w.kind === 'usb' ? 'Spina USB' : w.kind === 'piece' ? `Pezzo ${w.piece}` : w.kind === 'low' ? `Pezzo ${w.piece} (ponticello)` : 'Collaudo', { anchor: 'start', size: 3.2, bold: true });
  g += cell(set, k, ox, oy);
  const lines = wrap(w.text, 74).slice(0, 4);
  lines.forEach((l, i) => { g += Tx(x0 + 2, y0 + 11 + DH + 4.6 + i * 2.9, l, { anchor: 'start', size: 2.1 }); });
  return g;
}

const N = 5;
function pagSet(set, part) {
  const seq = stepsOf(set), idx = part === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9];
  let g = '';
  idx.forEach((k, n) => { g += stepCell(set, k, n % 3, Math.floor(n / 3)); });
  if (part === 1) {
    const x0 = 3 + 1 * 90, y0 = 2 + 90; const ps = pieces.filter(p => p.set === set), cs = connectors.filter(c => c.set === set), fs = feeders.filter(f => f.set === set), js = jumpers.filter(j => j.set === set);
    g += R(x0, y0, 177, 87, '#fffbea', '#e0c060', 0.3, 'rx="1.5"') + Tx(x0 + 4, y0 + 8, `Riepilogo striscia ${set} (spina USB ${set === 1 ? 'A' : 'B'})`, { anchor: 'start', size: 3.6, bold: true });
    [`Pezzi: ${ps.map(p => p.id).join(', ')} → ${stripLen(set)} mm in tutto (tagli ogni 12 mm).`, `Clip: ${cs.map(c => c.id).join(', ')} (${cs.length} clip).`, `Derivazioni da 80 mm: ${fs.map(f => f.id).join(', ')} (${fs.length}).`, `Ponticelli da 80 mm: ${js.map(j => j.id).join(', ')} (${js.length}).`, `Dorsale ${set === 1 ? 'A' : 'B'}: 2 fili (rosso+nero) da 630 mm, dal foro H fino all'ultimo punto di derivazione.`, `Cavo USB ${set === 1 ? 'A' : 'B'}: tagliato a ~15 cm dalla striscia, resta la spina e il cavo fino al foro H.`, 'Prima di chiudere: collega al caricatore (5 V, almeno 3 A) e controlla che si accendano tutti i pezzi.'].forEach((t, i) => { g += Tx(x0 + 4, y0 + 17 + i * 6.4, '• ' + t, { anchor: 'start', size: 2.7 }); });
  }
  return page(set === 1 ? 2 + part : 4 + part, N, `Striscia ${set} · spina USB ${set === 1 ? 'A' : 'B'} – passi ${part === 0 ? '1–6' : '7–10'}`, svg(273, 183, g));
}

function pag1() {
  let g = Tx(3, 8, 'Come si procede', { anchor: 'start', size: 4, bold: true });
  ['Ogni striscia da 2 m si monta da sola, a partire dalla sua spina USB: prima il cavo, poi un pezzo alla volta, ognuno con la sua clip e la sua derivazione dalla dorsale.', 'I tratti bassi (B1–B5) non hanno derivazione: prendono corrente dal fondo della linea verticale vicina con un ponticello.', 'In ogni disegno: contorno tratteggiato = pezzo ancora da montare; arancio = elemento aggiunto in quel passo.'].forEach((t, i) => { g += Tx(3, 15 + i * 5.5, '• ' + t, { anchor: 'start', size: 2.7 }); });
  // piano di taglio
  const cy = 46, k = 0.125; g += Tx(3, cy - 4, 'Taglio: segni ogni 12 mm, ogni striscia usata per intero (166 unità = 1992 mm)', { anchor: 'start', size: 3.2, bold: true });
  [1, 2].forEach((set, n) => { const ps = pieces.filter(p => p.set === set).sort((a, b) => b.len - a.len); let x = 12; const y = cy + n * 9.5; g += Tx(10, y + 4.6, 'S' + set, { anchor: 'end', size: 2.8, bold: true }); ps.forEach(p => { const w = p.len * k; g += R(x, y, w, 6.5, p.kind === 'line' ? GOLD[set] : '#fbe8b4', '#a37a10', 0.2) + Tx(x + w / 2, y + 4.4, p.id, { size: 2.3, bold: true }) + Tx(x + w / 2, y - 0.8, String(p.len), { size: 1.9, fill: '#555' }); x += w; }); });
  // quadro finale delle due strisce
  g += Tx(3, 78, 'Risultato finale di ciascuna striscia', { anchor: 'start', size: 3.4, bold: true });
  [1, 2].forEach((set, n) => { const ox = 8 + n * 130, oy = 82; g += cell(set, 9, ox, oy); g += Tx(ox, oy + DH + 4, `Striscia ${set}: ${stripLen(set)} mm · 8 pezzi · ${connectors.filter(c => c.set === set).length} clip`, { anchor: 'start', size: 2.6 }); });
  g += Tx(3, 176, 'Pagine 2–3: striscia 1 (spina A) · pagine 4–5: striscia 2 (spina B). Le due spine escono dallo stesso foro H.', { anchor: 'start', size: 2.7, fill: '#555' });
  return page(1, N, 'Guida ai collegamenti: panoramica e taglio', svg(273, 183, g));
}
const css = `@page{size:297mm 210mm;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#888;font-family:'DejaVu Sans',Arial,sans-serif;color:#111}
.page{width:297mm;height:210mm;position:relative;overflow:hidden;background:#fff;page-break-after:always;margin:0 auto 6mm}@media print{html,body{background:#fff}.page{margin:0}}
header{position:absolute;left:12mm;right:12mm;top:7mm;display:flex;justify-content:space-between;align-items:baseline;border-bottom:0.4mm solid #222;padding-bottom:2mm}header .t{font-size:5.2mm;font-weight:700}header .s{font-size:2.6mm;color:#555}
.body{position:absolute;left:12mm;right:12mm;top:17mm;bottom:10mm}footer{position:absolute;left:12mm;right:12mm;bottom:4mm;font-size:2.5mm;color:#666;display:flex;justify-content:space-between;border-top:0.2mm solid #bbb;padding-top:1.2mm}svg{display:block}`;
fs.writeFileSync(path.join(here, 'guida.html'), `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Guida ai collegamenti</title><style>${css}</style></head><body>${pag1()}${pagSet(1, 0)}${pagSet(1, 1)}${pagSet(2, 0)}${pagSet(2, 1)}</body></html>`);
console.log('guida.html scritta');
