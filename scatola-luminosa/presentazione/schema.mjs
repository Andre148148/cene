// Schema di collegamento esatto (3 pagine A4 orizzontali). Uso: node presentazione/schema.mjs && node presentazione/schema.cjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { P, pieces, connectors, cById, jumpers, feeders, H, trunks, barsLong, barsVert, bolts, cx, mx, stripLen } from '../src/layout6.js';
const summ = set => { const ps = pieces.filter(p => p.set === set).sort((a, b) => b.len - a.len); return ps.map(p => p.id).join(' ') + '  →  ' + [...new Set(ps.map(p => p.len))].map(l => ps.filter(p => p.len === l).length + ' × ' + l).join(' + ') + ' = ' + stripLen(set) + ' mm'; };
const here = path.dirname(fileURLToPath(import.meta.url));
const f1 = v => (Math.round(v * 10) / 10).toString().replace('.', ',');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const Tx = (x, y, t, o = {}) => `<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" font-size="${o.size || 3}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}"${o.bold ? ' font-weight="700"' : ''}${o.rot ? ` transform="rotate(${o.rot} ${(+x).toFixed(2)} ${(+y).toFixed(2)})"` : ''}>${esc(t)}</text>`;
const R = (x, y, w, h, fill, st = '#222', sw = 0.25, ex = '') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${fill}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
const Ln = (x1, y1, x2, y2, st = '#222', sw = 0.25, ex = '') => `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
const DEFS = `<defs><pattern id="wood" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="#ecd8ae"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#a07c44" stroke-width="0.35"/></pattern>
<marker id="arr" viewBox="0 0 6 6" markerWidth="2.4" markerHeight="2.4" refX="5.5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#222"/></marker></defs>`;
const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="DejaVu Sans, Arial, sans-serif">${DEFS}${inner}</svg>`;
const page = (n, title, body) => `<section class="page"><header><div class="t">${esc(title)}</div><div class="s">Scatola luminosa 100 × 50 cm · schema di collegamento · misure in mm</div></header><div class="body">${body}</div><footer><span>2 strisce FCOB 5 V USB da 2 m · 6 linee da 444 mm + 10 tratti da 132 mm (taglio ogni 12 mm)</span><span>${n} / 3</span></footer></section>`;
const RED = '#d01010', BLK = '#111';
const c = pieces; // alias

/* ---------------- Pagina 1: pianta con tutti i cavi ---------------- */
function pagina1() {
  const s = 0.24, ox = 18, oy = 40;
  const X = x => ox + (x + P.L / 2) * s, Y = y => oy + (P.W / 2 - y) * s;
  let g = Tx(ox, 9, 'Pianta (pannello opalino rimosso) – tutti i cavi', { anchor: 'start', size: 3.6, bold: true });
  g += Tx(ox, 14.5, 'Rosso = +5 V · Nero = massa · gialle = strisce COB · quadrati neri = connettori a clip C1–C21 · arancio = ponticelli PN1–PN5', { anchor: 'start', size: 2.5, fill: '#555' });
  // scatola
  g += R(X(-P.L / 2), Y(P.W / 2), P.L * s, P.W * s, 'url(#wood)', '#333', 0.4);
  g += R(X(-P.PL / 2), Y(P.PW / 2), P.PL * s, P.PW * s, '#fbfbf8', '#444', 0.25);
  // listelli (supporto)
  barsLong.forEach(b => { g += R(X(b.x0), Y(b.y + 4), (b.x1 - b.x0) * s, 8 * s, '#efefe9', '#b5b5ae', 0.12); });
  barsVert.forEach(b => { g += R(X(b.x - 4), Y(b.y1), 8 * s, (b.y1 - b.y0) * s, '#efefe9', '#b5b5ae', 0.12); });
  // bulloni di appoggio (fermi)
  bolts.forEach(b => { g += `<circle cx="${X(b.x).toFixed(2)}" cy="${Y(b.y).toFixed(2)}" r="0.9" fill="#bbb" stroke="#777" stroke-width="0.15"/>`; });
  // strisce
  pieces.forEach(p => {
    if (p.kind === 'line') g += R(X(p.x - 4), Y(p.len / 2), 8 * s, p.len * s, '#f2c14e', '#a37a10', 0.15);
    else g += R(X(p.x - p.len / 2), Y(p.y + 4), p.len * s, 8 * s, '#f2c14e', '#a37a10', 0.15);
  });
  // etichette dei pezzi
  pieces.forEach(p => {
    if (p.kind === 'line') g += Tx(X(p.x), Y(0) - 8 + (p.id.charCodeAt(1) % 2) * 0, p.id, { size: 2.6, fill: '#7a5a00', bold: true });
    else g += Tx(X(p.x), p.y > 0 ? Y(p.y) + 6.5 : Y(p.y) - 4.2, p.id, { size: 2.4, fill: '#7a5a00', bold: true });
  });
  // dorsali sul lato lungo alto (y = 232)
  const ty = Y(232);
  const tr = (t) => { const xa = X(t.x0), xb = X(t.x1); return Ln(xa, ty - 0.35, xb, ty - 0.35, RED, 0.7) + Ln(xa, ty + 0.35, xb, ty + 0.35, BLK, 0.7); };
  trunks.forEach(t => { g += tr(t); });
  // derivazioni (rosso+nero) e giunzioni
  feeders.forEach(fd => {
    const cn = cById[fd.con];
    g += Ln(X(fd.x) - 0.35, ty, X(cn.x) - 0.35, Y(cn.y), RED, 0.4) + Ln(X(fd.x) + 0.35, ty, X(cn.x) + 0.35, Y(cn.y), BLK, 0.4);
    g += `<circle cx="${X(fd.x).toFixed(2)}" cy="${ty.toFixed(2)}" r="0.8" fill="#fff" stroke="#000" stroke-width="0.2"/>`;
  });
  // ponticelli
  jumpers.forEach(j => { const a = cById[j.a], b = cById[j.b]; g += Ln(X(a.x), Y(a.y), X(b.x), Y(b.y), '#e07000', 0.7, 'stroke-dasharray="1 0.5"'); g += Tx((X(a.x) + X(b.x)) / 2, Y(a.y) + 4.2, j.id, { size: 2.1, fill: '#b05000' }); });
  // connettori
  connectors.forEach((cn, i) => {
    g += R(X(cn.x) - 1.4, Y(cn.y) - 1.4, 2.8, 2.8, cn.role === 'feed' ? '#222' : '#444', '#000', 0.12);
    const top = cn.y > 0;
    const off = [0, 0];
    g += Tx(X(cn.x) + off[0], top ? Y(cn.y) + 3.9 + (i % 2) * 2.3 + off[1] : Y(cn.y) + 4.9 + off[1], cn.id, { size: 2.0, fill: '#000' });
  });
  // foro H e cavi USB
  const hx = X(H.x), hy = Y(P.W / 2) + (P.T * s) / 2;
  g += `<circle cx="${hx.toFixed(2)}" cy="${hy.toFixed(2)}" r="2.2" fill="#fff" stroke="#c33" stroke-width="0.5"/>` + Tx(hx, hy + 0.8, 'H', { size: 2.2, bold: true, fill: '#c33' });
  const outY = oy - 14;
  g += Ln(hx - 1, hy - 2, hx - 1, outY, RED, 0.7) + Ln(hx + 0.2, hy - 2, hx + 0.2, outY, BLK, 0.7);
  g += R(hx - 11, outY - 9, 8, 9, '#cfd8e0', '#445', 0.3) + Tx(hx - 7, outY - 3.6, 'USB A', { size: 2.2, bold: true }) + Tx(hx - 7, outY - 11, 'spina A', { size: 2.2 });
  g += Ln(hx - 7, outY, hx - 1, hy - 2, '#555', 0.5) ;
  g += R(hx + 3, outY - 9, 8, 9, '#cfd8e0', '#445', 0.3) + Tx(hx + 7, outY - 3.6, 'USB B', { size: 2.2, bold: true }) + Tx(hx + 7, outY - 11, 'spina B', { size: 2.2 });
  g += Ln(hx + 7, outY, hx + 0.2, hy - 2, '#555', 0.5);
  g += Tx(hx + 16, outY - 4, '← le due spine escono dallo stesso foro H (Ø10, al centro del lato lungo)', { anchor: 'start', size: 2.5, fill: '#c33' });
    // chiavi: dorsali
  g += Tx(X(-250), Y(P.W / 2) - 2.2, '← DORSALE A (set 1): 630 mm per filo', { size: 2.4, fill: RED, bold: true });
  g += Tx(X(250), Y(P.W / 2) - 2.2, 'DORSALE B (set 2): 630 mm per filo →', { size: 2.4, fill: RED, bold: true });
  // quote
  g += Ln(X(-P.L / 2), Y(-P.W / 2) + 4, X(P.L / 2), Y(-P.W / 2) + 4, '#222', 0.2) + Tx(X(0), Y(-P.W / 2) + 7, '1000', { size: 2.6 });
  // riepilogo set
  const ly = 173;
  g += R(14, ly - 4, 4, 3, '#f2c14e', '#a37a10', 0.2) + Tx(20, ly - 1.6, 'SET 1 (spina A, metà sinistra): ' + summ(1), { anchor: 'start', size: 2.6 });
  g += R(14, ly + 1, 4, 3, '#f2c14e', '#a37a10', 0.2) + Tx(20, ly + 3.4, 'SET 2 (spina B, metà destra): ' + summ(2), { anchor: 'start', size: 2.6 });
  g += Tx(14, ly + 9, 'Connettori: 10 sul set 1 (C1–C10) + 11 sul set 2 (C11–C21) = 21 → i 2 kit da 14 bastano. Ogni connettore sporge ≈ 6 mm oltre la striscia (verifica sul kit).', { anchor: 'start', size: 2.4, fill: '#555' });
  return page(1, 'Schema di collegamento – pianta con tutti i cavi', svg(273, 183, g));
}

/* ---------------- Pagina 2: alzato del lato lungo + lista cavi ---------------- */
function pagina2() {
  const s = 0.255, sz = 0.5, ox = 14, oz = 66;
  const X = x => ox + (x + P.L / 2) * s, Z = z => oz - z * sz;
  let g = Tx(ox, 9, 'Alzato interno del lato lungo "alto" (vista dall\'interno verso il muro) – percorso dei cavi', { anchor: 'start', size: 3.6, bold: true });
  g += R(X(-P.L / 2), Z(P.WH), P.L * s, P.WH * sz, 'url(#wood)', '#333', 0.35);
  g += R(X(-P.PL / 2), Z(P.BACK), P.PL * s, P.BACK * sz, '#d8b98d', '#555', 0.2);                 // MDF in sezione
  barsLong.filter(b => b.y > 0).forEach(b => { g += R(X(b.x0), Z(P.ZD), (b.x1 - b.x0) * s, P.BAR * sz, '#fff', '#555', 0.2); });
  pieces.filter(p => p.y > 0 && p.kind === 'seg').forEach(p => { g += R(X(p.x - p.len / 2), Z(P.ZSTRIP), p.len * s, 1.2 * sz + 0.3, '#f2c14e', '#a37a10', 0.15); g += Tx(X(p.x), Z(P.ZSTRIP) - 1.5, p.id, { size: 2.1, fill: '#7a5a00', bold: true }); });
  // vertici delle linee verticali (viste di testa) con le loro etichette
  pieces.filter(p => p.kind === 'line').forEach(p => { g += R(X(p.x - 4), Z(P.ZSTRIP), 8 * s, 1.2 * sz + 0.3, '#f2c14e', '#a37a10', 0.15); g += Tx(X(p.x), Z(P.ZSTRIP) + 11.5, p.id, { size: 2.1, fill: '#7a5a00', bold: true }); });
  // dorsale
  const zt = Z(P.ZTRUNK);
  g += Ln(X(-481), zt - 0.3, X(481), zt - 0.3, RED, 0.6) + Ln(X(-481), zt + 0.3, X(481), zt + 0.3, BLK, 0.6);
  // derivazioni e connettori
  connectors.filter(cn => cn.y > 0).forEach(cn => {
    g += Ln(X(cn.x) - 0.3, zt, X(cn.x) - 0.3, Z(P.ZCON), RED, 0.35) + Ln(X(cn.x) + 0.3, zt, X(cn.x) + 0.3, Z(P.ZCON), BLK, 0.35);
    g += R(X(cn.x) - 1.1, Z(P.ZCON) - 1.4, 2.2, 2.8, '#222', '#000', 0.1);
    g += `<circle cx="${X(cn.x).toFixed(2)}" cy="${zt.toFixed(2)}" r="0.7" fill="#fff" stroke="#000" stroke-width="0.15"/>`;
  });
  // foro H e cavi
  const hz = Z(H.z);
  g += `<circle cx="${X(0).toFixed(2)}" cy="${hz.toFixed(2)}" r="2.6" fill="#fff" stroke="#c33" stroke-width="0.5"/>` + Tx(X(0), hz + 0.8, 'H', { size: 2.2, bold: true, fill: '#c33' });
  g += Ln(X(-6), hz - 2.6, X(-6), zt, RED, 0.5) + Ln(X(6), hz - 2.6, X(6), zt, BLK, 0.5);
  g += Tx(X(0), hz + 7, 'foro H: Ø10, z = 40 dal piano MDF', { size: 2.3, fill: '#c33' });
  g += Tx(X(-250), zt + 8, '← DORSALE A (z = 56)', { size: 2.3, fill: RED, bold: true }) + Tx(X(250), zt + 8, 'DORSALE B (z = 56) →', { size: 2.3, fill: RED, bold: true });
  g += Ln(X(-P.L / 2), Z(0) + 4, X(P.L / 2), Z(0) + 4) + Tx(X(0), Z(0) + 7, '1000', { size: 2.5 });
  g += Tx(X(-P.L / 2), Z(P.WH) - 2, 'Scala verticale ingrandita 2× rispetto all\'orizzontale · listello 8×8 a z 67–75 · striscia sotto il listello · connettori a z ≈ 63 · dorsali a z = 56', { anchor: 'start', size: 2.3, fill: '#555' });
  // tabella cavi
  const ty0 = 96;
  g += Tx(14, ty0 - 5, 'Lista dei cavi con lunghezze di taglio (sezione 0,5 mm², rosso + nero)', { anchor: 'start', size: 3.4, bold: true });
  const rows = [
    ['Cavi USB A e B (dei set)', 'tagliali a ≈ 15 cm dalla striscia, tieni spina + cavo', 'uno per set', 'escono entrambi da H'],
    ['Dorsale A', 'da H a L0 (x = −481), contro il lato lungo, z = 56', `${trunks[0].cut} mm per filo`, '2 fili (rosso+nero)'],
    ['Dorsale B', 'da H a L5 (x = +481)', `${trunks[1].cut} mm per filo`, '2 fili (rosso+nero)'],
    ['Derivazioni D1–D11', 'dalla dorsale al connettore (6 sul set 1, 5 sul set 2)', '80 mm', '11 coppie'],
    ['Ponticelli PN1–PN5', 'C2→C3, C6→C7, C12→C13, C16→C17, C20→C21 (tutti 24 mm in linea retta)', '80 mm', '5 coppie dal kit (da 15 cm: accorciale)'],
    ['Totale dalla tua bobina', 'dorsali 2 × 0,63 m + derivazioni 11 × 0,08 m ≈ 2,2 m per colore', '≈ 2,2 m', 'su 7 m: bastano'],
  ];
  rows.forEach((r, i) => {
    const y = ty0 + i * 6.4;
    g += (i % 2 ? '' : R(14, y - 3.6, 258, 6, '#f6f6f2', '#f6f6f2', 0)) + Tx(15, y, r[0], { anchor: 'start', size: 2.7, bold: true }) + Tx(62, y, r[1], { anchor: 'start', size: 2.5 }) + Tx(190, y, r[2], { anchor: 'start', size: 2.6, bold: true }) + Tx(222, y, r[3], { anchor: 'start', size: 2.4, fill: '#555' });
  });
  const y2 = ty0 + rows.length * 6.4 + 6;
  g += Tx(14, y2, 'Come collegare (in quest\'ordine):', { anchor: 'start', size: 3.2, bold: true });
  ['1. Taglia le strisce a pezzi sul segno di taglio; monta le clip sui due estremi che servono (C1–C21).', '2. Posa i ponticelli (arancio): C2→C3, C6→C7, ecc. Rispetta + / −: sulle clip i fili rosso e nero vanno ai poli indicati sulla striscia.',
    '3. Passa le due spine USB dal foro H; stendi le dorsali A e B a z = 56 contro il lato lungo e fissale con colla a caldo ogni 10 cm.', '4. Salda (o morsetta) le 11 derivazioni alla dorsale, poi inseriscile nelle clip dei connettori feed (C1, C4, C5, C8, C9, C10 / C11, C14, C15, C18, C19).',
    '5. Collega i cavi USB (rosso, nero) alle dorsali A e B. Prima di chiudere accendi un set alla volta e controlla che tutti i pezzi si accendano.'].forEach((t, i) => { g += Tx(15, y2 + 5.6 + i * 5, t, { anchor: 'start', size: 2.5 }); });
  return page(2, 'Alzato del lato lungo, lista cavi e ordine dei collegamenti', svg(273, 183, g));
}

/* ---------------- Pagina 3: alimentazione ---------------- */
function pagina3() {
  let g = Tx(14, 9, 'Catena di alimentazione e controlli elettrici', { anchor: 'start', size: 3.6, bold: true });
  const box = (x, y, w, h, t1, t2, fill = '#fff') => R(x, y, w, h, fill, '#222', 0.3) + Tx(x + w / 2, y + 5.2, t1, { size: 2.9, bold: true }) + (t2 ? Tx(x + w / 2, y + 10, t2, { size: 2.4, fill: '#555' }) : '');
  const arrow = (x1, x2, y) => Ln(x1, y, x2, y, '#222', 0.5, 'marker-end="url(#arr)"');
  [['1', 22, 'A'], ['2', 48, 'B']].forEach(([n, y, k]) => {
    g += box(14, y, 52, 16, 'Caricatore porta ' + n, '5 V ≥ 3 A', '#e6f2e6');
    g += box(84, y, 56, 16, 'Dimmer USB 5 V (' + k + ')', 'inline, ≥ 3 A (opzionale)', '#fff');
    g += box(158, y, 46, 16, 'Spina USB ' + k, 'cavo del set, esce da H', '#e8eef4');
    g += box(222, y, 50, 16, 'Striscia set ' + n, '8 pezzi · 1992 mm · 14 W · 2,8 A', '#fff4cc');
    g += arrow(66, 84, y + 8) + arrow(140, 158, y + 8) + arrow(204, 222, y + 8);
  });
  g += Tx(14, 72, 'Il caricatore può essere uno a 2 porte (≥ 30 W totali, 5 V 3 A per porta) oppure due caricatori da 5 V 3 A. Un caricatore da telefono da 1–2 A non basta.', { anchor: 'start', size: 2.7 });
  g += Tx(14, 77.5, 'Le due spine escono dallo stesso foro H (Ø10): il passacavo doppio o un po\' di colla a caldo lo chiudono contro polvere e tirate.', { anchor: 'start', size: 2.7 });
  // controlli
  g += Tx(14, 121, 'Controlli prima di chiudere il pannello', { anchor: 'start', size: 3.4, bold: true });
  const checks = ['Polarità: sulla striscia i poli sono marcati +5V e −. Rosso = + ovunque (cavi USB, dorsali, derivazioni, ponticelli).',
    'Accendi un set alla volta: tutti gli 8 pezzi devono illuminarsi. Un pezzo spento = clip non a contatto (riapri e richiudi) o polarità invertita.',
    'Dopo 5 minuti a piena luce tocca clip e dorsali: devono essere tiepide, non calde. Se scaldano, il filo è troppo lungo o sottile.',
    'Differenza di luce tra le due metà: se una è più scura, il suo cavo USB è troppo lungo o sottile (cade tensione): accorcialo o raddoppia il filo.',
    'Fissa ogni connettore con una goccia di colla a caldo solo dopo il collaudo. Nessun rame scoperto: guaina termorestringente sui punti saldati.'];
  checks.forEach((t, i) => { g += Tx(15, 127 + i * 5.2, '☐  ' + t, { anchor: 'start', size: 2.6 }); });
  g += Tx(14, 158, 'Dati e ipotesi da verificare', { anchor: 'start', size: 3.4, bold: true });
  ['7 W/m dalla scheda BTF-Lighting (2 m = 14 W). Taglio ogni 12 mm (dato tuo): ogni pezzo è un multiplo di 12 mm e ogni striscia da 2 m dà 166 unità = 1992 mm.', 'L\'ingombro di 6 mm del connettore oltre la striscia e il passo dei poli (2 poli, 8 mm) vanno confermati sul kit ricevuto.',
    'Pannello opalino ipotizzato da 5 mm (listelli a 5 mm dal bordo). Con 3 mm i listelli vanno a 3 mm.', 'La posizione del foro H (centro lato lungo, z = 40) è consigliata: puoi spostarlo, ma tieni le due spine sullo stesso punto.'].forEach((t, i) => { g += Tx(15, 164 + i * 5.2, '• ' + t, { anchor: 'start', size: 2.5 }); });
  const cy = 94, k = 0.125;
  g += Tx(14, cy - 6, 'Piano di taglio: segni ogni 12 mm, ogni striscia viene usata per intero (166 unità = 1992 mm)', { anchor: 'start', size: 3.2, bold: true });
  [1, 2].forEach((set, n) => {
    const ps = pieces.filter(p => p.set === set).sort((a, b) => b.len - a.len); let x = 14; const y = cy + n * 8.5;
    g += Tx(12, y + 4.4, 'S' + set, { anchor: 'end', size: 2.6, bold: true });
    ps.forEach(p => { const w = p.len * k; g += R(x, y, w, 6, p.kind === 'line' ? '#f2c14e' : (p.len > 120 ? '#f7d98a' : '#fbe8b4'), '#a37a10', 0.2) + Tx(x + w / 2, y + 4, p.id, { size: 2.3, bold: true }) + Tx(x + w / 2, y - 0.8, String(p.len), { size: 1.9, fill: '#555' }); x += w; });
  });
  return page(3, 'Alimentazione e controlli', svg(273, 183, g));
}

const css = `@page{size:297mm 210mm;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#888;font-family:'DejaVu Sans',Arial,sans-serif;color:#111}
.page{width:297mm;height:210mm;position:relative;overflow:hidden;background:#fff;page-break-after:always;margin:0 auto 6mm}@media print{html,body{background:#fff}.page{margin:0}}
header{position:absolute;left:12mm;right:12mm;top:7mm;display:flex;justify-content:space-between;align-items:baseline;border-bottom:0.4mm solid #222;padding-bottom:2mm}header .t{font-size:5.2mm;font-weight:700}header .s{font-size:2.6mm;color:#555}
.body{position:absolute;left:12mm;right:12mm;top:17mm;bottom:10mm}footer{position:absolute;left:12mm;right:12mm;bottom:4mm;font-size:2.5mm;color:#666;display:flex;justify-content:space-between;border-top:0.2mm solid #bbb;padding-top:1.2mm}svg{display:block}`;
fs.writeFileSync(path.join(here, 'schema.html'), `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Schema di collegamento</title><style>${css}</style></head><body>${pagina1()}${pagina2()}${pagina3()}</body></html>`);
console.log('schema.html scritto; dorsali:', trunks.map(t => `${t.id}: percorso ${Math.round(t.path)} mm, taglio ${t.cut} mm`).join(' | '), '| ponticelli dritti:', jumpers.map(j => Math.round(j.straight)).join(','));
