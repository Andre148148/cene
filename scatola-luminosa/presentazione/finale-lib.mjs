// Libreria di disegno per i PDF finali (progetto + tutorial). Coordinate in mm reali del box; scala di pagina applicata dalle funzioni.
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const T = (x, y, t, o = {}) => `<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" font-size="${o.size || 3}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}"${o.bold ? ' font-weight="700"' : ''}${o.rot ? ` transform="rotate(${o.rot} ${(+x).toFixed(2)} ${(+y).toFixed(2)})"` : ''}>${esc(t)}</text>`;
export const R = (x, y, w, h, f, st = '#222', sw = 0.2, ex = '') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${f}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
export const L = (x1, y1, x2, y2, st = '#222', sw = 0.25, ex = '') => `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${st}" stroke-width="${sw}" ${ex}/>`;
export const C = (x, y, r, f, st = '#222', sw = 0.2) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="${f}" stroke="${st}" stroke-width="${sw}"/>`;
export const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="DejaVu Sans, Arial, sans-serif">${inner}</svg>`;

/* ------------------------------------------------------------------ geometria delle due soluzioni (coordinate "interne" = dalla faccia interna della parete sinistra) */
export const GEO = { OL: 1000, OW: 500, T: 15, WH: 80, BASE: 10, DIFF: 5, IL: 970, IW: 470, BAR: 8, STRIPLEN: 456, STRIP_Y0: 7 };
export const SOL = {
  A: { id: 'A', nome: 'A · CON traverso centrale', g: 35, lines: [[60, 179, 298, 418], [0, 0, 0, 0]], divider: true, hole: 460 },
  B: { id: 'B', nome: 'B · SENZA traverso', g: 40, lines: [[61, 182, 303, 424], [546, 667, 788, 909]], divider: false, hole: 485 },
};
// A: zona destra specchiata: x_int = 970 - x_zona; verificato sotto
SOL.A.lines[1] = [970 - 418, 970 - 298, 970 - 179, 970 - 60];            // 552, 672, 791, 910
export const allLines = s => [...SOL[s].lines[0], ...SOL[s].lines[1]];

const COL = { mdf: '#e6cfa6', wall: '#d9a964', wallS: '#9b7433', floor: '#f7f6f1', bar: '#c9955a', strip: '#f2b823', stripL: '#ffe699', panel: '#b9dcf2', red: '#d01010', blk: '#111', org: '#e07000', ok: '#1a8a3a' };
export { COL };

/* ------------------------------------------------------------------ PIANTA
   opts: { s: 0.26 (mm carta per mm reale), layers:Set, hl:Set (elementi evidenziati: 'walls','divider','bars','strips','bus','hole','panel','stops','marks') } */
export function plan(sol, { x0 = 0, y0 = 0, s = 0.26, layers = [], hl = [], dims = true } = {}) {
  const S = SOL[sol], G = GEO, lay = new Set(layers), H = new Set(hl);
  const X = x => x0 + x * s, Y = y => y0 + (G.OW - y) * s;                      // y verso l'alto (sud in basso)
  const W = (x, y, w, h, f, hlk, ex = '') => R(X(x), Y(y + h), w * s, h * s, f, H.has(hlk) ? COL.org : '#444', H.has(hlk) ? 0.7 : 0.2, ex);
  let g = '';
  g += W(0, 0, G.OL, G.OW, COL.mdf, 'base');                                    // MDF
  if (lay.has('walls')) {
    g += W(G.T, G.T, G.IL, G.IW, COL.floor, 'floor');
    g += W(0, 0, G.OL, G.T, COL.wall, 'walls') + W(0, G.OW - G.T, G.OL, G.T, COL.wall, 'walls') + W(0, G.T, G.T, G.IW, COL.wall, 'walls') + W(G.OL - G.T, G.T, G.T, G.IW, COL.wall, 'walls');
  } else g += W(G.T, G.T, G.IL, G.IW, '#f0e2c4', 'floor', 'stroke-dasharray="1 0.8"');
  if (lay.has('divider') && S.divider) g += W(G.OL / 2 - G.T / 2, G.T, G.T, G.IW, COL.wall, 'divider');
  const xs = allLines(sol).map(x => x + G.T);
  if (lay.has('marks')) xs.forEach(x => { g += L(X(x), Y(G.T), X(x), Y(G.OW - G.T), COL.org, 0.2, 'stroke-dasharray="1 1"'); });
  if (lay.has('strips') || lay.has('bars')) {
    if (lay.has('strips')) xs.forEach(x => { g += R(X(x - 4), Y(G.T + G.STRIP_Y0 + G.STRIPLEN), 8 * s, G.STRIPLEN * s, COL.strip, H.has('strips') ? COL.org : '#a37a10', H.has('strips') ? 0.7 : 0.15); });
    if (lay.has('bars')) xs.forEach(x => { g += R(X(x - 4), Y(G.OW - G.T), 8 * s, G.IW * s, lay.has('strips') ? 'rgba(201,149,90,0.55)' : COL.bar, H.has('bars') ? COL.org : '#7a5a30', H.has('bars') ? 0.7 : 0.15); });
  }
  if (lay.has('stops')) {
    const st = stopPos(sol); st.forEach(p => { g += R(X(p[0] - 5), Y(p[1] + 5), 10 * s, 10 * s, '#fff', H.has('stops') ? COL.org : '#333', H.has('stops') ? 0.7 : 0.25); });
  }
  if (lay.has('bus')) g += busPlan(sol, X, Y, s, H.has('bus'));
  if (lay.has('hole')) { const hx = S.hole + G.T; g += R(X(hx - 8), Y(G.T), 16 * s, G.T * s, '#fff', H.has('hole') ? COL.org : '#c33', H.has('hole') ? 0.8 : 0.4) + T(X(hx), Y(-5), 'H Ø16', { size: 2.4, bold: true, fill: '#c33' });
    if (S.divider) { g += R(X(G.OL / 2 - 8), Y(G.T + 20), 16 * s, 16 * s, '#fff', H.has('hole') ? COL.org : '#c33', 0.4); } }
  if (lay.has('panel')) g += R(X(G.T + 1), Y(G.OW - G.T - 1), (G.IL - 2) * s, (G.IW - 2) * s, 'rgba(160,210,240,0.55)', COL.org, 0.5);
  if (dims) g += planDims(sol, X, Y, s);
  return g;
}
export const stopPos = sol => {                                                // fermi del diffusore (coordinate esterne x, y)
  const G = GEO, T = G.T, a = [];
  const longX = SOL[sol].divider ? [120, 360, 610, 850] : [121, 485, 849];
  longX.forEach(x => { a.push([x + T, T + 4], [x + T, G.OW - T - 4]); });
  if (SOL[sol].divider) { a.push([T + 4, G.OW / 2], [G.OL - T - 4, G.OW / 2]); } else { a.push([T + 4, G.OW / 2], [G.OL - T - 4, G.OW / 2]); }
  return a;
};
function busPlan(sol, X, Y, s, hl) {                                              // catena testa-coda alimentata dal centro (nodo a sud tra P2 e P3)
  const G = GEO, T = G.T, S = SOL[sol], col = hl ? COL.org : '#6a2a00'; let g = '';
  const ys = T + G.STRIP_Y0, yn = T + G.STRIP_Y0 + G.STRIPLEN, hx = S.hole + T;
  S.lines.forEach((ln, zi) => {
    const xs = ln.map(x => x + T), nodeX = (xs[1] + xs[2]) / 2, o = zi === 0 ? 1.1 : -1.1;
    // sud: nodo → P2 e P3
    g += L(X(xs[1]), Y(ys - 3), X(xs[2]), Y(ys - 3), col, 0.9) + L(X(xs[1]), Y(ys), X(xs[1]), Y(ys - 3), col, 0.7) + L(X(xs[2]), Y(ys), X(xs[2]), Y(ys - 3), col, 0.7) + C(X(nodeX), Y(ys - 3), 1.2, col, '#000', 0.3);
    // nord: P2–P1 e P3–P4
    g += L(X(xs[0]), Y(yn + 3), X(xs[1]), Y(yn + 3), col, 0.9) + L(X(xs[0]), Y(yn), X(xs[0]), Y(yn + 3), col, 0.7) + L(X(xs[1]), Y(yn), X(xs[1]), Y(yn + 3), col, 0.7);
    g += L(X(xs[2]), Y(yn + 3), X(xs[3]), Y(yn + 3), col, 0.9) + L(X(xs[2]), Y(yn), X(xs[2]), Y(yn + 3), col, 0.7) + L(X(xs[3]), Y(yn), X(xs[3]), Y(yn + 3), col, 0.7);
    // cavo USB: dal nodo al foro H lungo il pavimento (y = 12 mm dalla parete)
    const yl = T + 12 + o; g += L(X(nodeX), Y(ys - 3), X(nodeX), Y(yl), col, 0.7, 'stroke-dasharray="1.2 .8"') + L(X(nodeX), Y(yl), X(hx), Y(yl), col, 0.7, 'stroke-dasharray="1.2 .8"') + L(X(hx), Y(yl), X(hx), Y(T - 4), col, 0.7, 'stroke-dasharray="1.2 .8"');
  });
  return g;
}
function planDims(sol, X, Y, s) {
  const G = GEO, S = SOL[sol], T = G.T; let g = '';
  const yb = Y(-10);
  g += L(X(0), yb, X(G.OL), yb, '#555', 0.2) + T_(X(G.OL / 2), yb + 4.4, `${G.OL} mm`, 3);
  g += L(X(G.OL) + 4, Y(0), X(G.OL) + 4, Y(G.OW), '#555', 0.2) + T_(X(G.OL) + 8.5, Y(G.OW / 2), `${G.OW} mm`, 3, 90);
  // quote delle linee (da faccia interna parete)
  const yt = Y(G.OW) - 5;
  const pts = [0, ...allLines(sol), G.IL];
  g += L(X(T), yt, X(T + G.IL), yt, '#555', 0.2);
  allLines(sol).forEach(x => { g += L(X(x + T), yt - 1.5, X(x + T), yt + 1.5, '#555', 0.2); });
  const mark = (a, b) => T_(X(T + (a + b) / 2), yt - 1.6, `${(b - a).toFixed(0)}`, 2.1);
  const zl = S.lines[0], zr = S.lines[1];
  if (S.divider) {
    const seq = [0, ...zl, 477.5]; for (let i = 0; i < seq.length - 1; i++) g += mark(seq[i], seq[i + 1]);
    const seq2 = [492.5, ...zr, 970]; for (let i = 0; i < seq2.length - 1; i++) g += mark(seq2[i], seq2[i + 1]);
  } else { const seq = [0, ...zl, ...zr, 970]; for (let i = 0; i < seq.length - 1; i++) g += mark(seq[i], seq[i + 1]); }
  return g;
}
const T_ = (x, y, t, size, rot) => T(x, y, t, { size, fill: '#333', rot });

/* ------------------------------------------------------------------ SEZIONE (vista frontale, taglio a metà lunghezza dei listelli) */
export function section(sol, { x0 = 0, y0 = 0, s = 0.55, xmax = 520, fromLeft = true, showRays = true, hl = [] } = {}) {
  const G = GEO, S = SOL[sol], H = new Set(hl), g_ = S.g;
  const Z = z => y0 + (95 - z) * s, X = x => x0 + x * s;                          // z dal piano inferiore dell'MDF (0)
  const zTop = G.BASE + G.WH, zD = zTop - G.DIFF;                                  // 90 e 85
  const zBarTop = zD - g_, zBarBot = zBarTop - G.BAR, zLed = zBarBot - 1;
  let g = '';
  g += R(X(0), Z(G.BASE), xmax * s, G.BASE * s, COL.mdf, '#555', 0.25);                    // MDF
  g += R(X(0), Z(zTop), G.T * s, G.WH * s, COL.wall, '#555', 0.25);                         // parete sinistra
  const inner = G.T;                                                                        // x interno = 15
  g += R(X(inner), Z(zD + 0.0), (xmax - inner) * s, G.IW * 0 + 0, 'none', 'none');          // placeholder
  g += R(X(inner), Z(zD), (xmax - inner) * s, (zD - G.BASE) * s, COL.floor, 'none', 0);      // cavità
  if (S.divider && G.OL / 2 - G.T / 2 < xmax) { const dx = G.OL / 2 - G.T / 2; g += R(X(dx), Z(zD), G.T * s, (zD - G.BASE) * s, COL.wall, '#555', 0.25); }
  // pannello
  const pEnd = S.divider ? Math.min(G.OL / 2 - G.T / 2, xmax) : xmax;
  g += R(X(inner), Z(zTop), (pEnd - inner) * s, G.DIFF * s, COL.panel, '#4a8db0', 0.3);
  if (S.divider && G.OL / 2 + G.T / 2 < xmax) { g += R(X(G.OL / 2 + G.T / 2), Z(zTop), (xmax - (G.OL / 2 + G.T / 2)) * s, G.DIFF * s, COL.panel, '#4a8db0', 0.3); }
  const xs = allLines(sol).map(x => x + G.T).filter(x => x < xmax - 5);
  xs.forEach(x => {
    g += R(X(x - 4), Z(zBarTop), 8 * s, 8 * s, COL.bar, H.has('bars') ? COL.org : '#6a4a20', H.has('bars') ? 0.7 : 0.25);
    g += R(X(x - 4), Z(zBarBot - 0.6), 8 * s, 0.6 * s + 0.2, COL.strip, '#a37a10', 0.15);
    if (showRays) for (let k = -3; k <= 3; k++) { const ang = k * 24 * Math.PI / 180, len = 26; g += L(X(x), Z(zLed), X(x + Math.sin(ang) * len), Z(zLed - Math.cos(ang) * len * 0.62 - 0), '#ffb000', 0.18, 'opacity="0.7" stroke-dasharray="0.8 0.6"'); }
  });
  // quote
  g += L(X(xmax) + 4, Z(zD), X(xmax) + 4, Z(zBarTop), '#c33', 0.3) + L(X(xmax) + 2.5, Z(zD), X(xmax) + 5.5, Z(zD), '#c33', 0.3) + L(X(xmax) + 2.5, Z(zBarTop), X(xmax) + 5.5, Z(zBarTop), '#c33', 0.3);
  g += T(X(xmax) + 6.5, (Z(zD) + Z(zBarTop)) / 2 + 1, `${g_} mm`, { size: 2.6, anchor: 'start', bold: true, fill: '#c33' });
  g += L(X(xmax) + 12, Z(zD), X(xmax) + 12, Z(G.BASE), '#555', 0.25) + T(X(xmax) + 13.5, (Z(zD) + Z(G.BASE)) / 2, `${zD - G.BASE} mm utili`, { size: 2.3, anchor: 'start', fill: '#333' });
  g += T(X(inner + 3), Z(zTop) - 1.5, 'pannello opale 5 mm', { size: 2.4, anchor: 'start', fill: '#2a6a90' });
  g += T(X(7.5), Z(zD - 40), 'parete', { size: 2.4, fill: '#5a3a10', rot: -90 });
  g += T(X(xs[0]), Z(zLed - 30), 'listello 8×8 + striscia LED rivolta in basso', { size: 2.3, anchor: 'start', fill: '#7a4a10' });
  return g;
}

/* ------------------------------------------------------------------ SCHEMA ELETTRICO DI UNA STRISCIA (non in scala)
   stage 0..6: 0 = solo cavo USB e nodo; 1 = bus; 2..5 = pezzo k; 6 = tutto + test */
export function schem(stage = 6, { x0 = 0, y0 = 0, w = 170, h = 80 } = {}) {
  let g = '';
  const bx = x0 + 0.12 * w, by = y0 + h - 14, px = [0.34, 0.52, 0.70, 0.88].map(f => x0 + f * w);
  const hlC = COL.org;
  const nw = k => stage === k;
  // spina + cavo
  g += R(x0 + 0.5, by - 7, 8, 9, '#cfd8e0', stage === 0 ? hlC : '#445', stage === 0 ? 0.7 : 0.3) + T(x0 + 4.5, by - 8.5, 'USB', { size: 2.4, bold: true });
  g += L(x0 + 8.5, by - 3.6, bx, by - 3.6, COL.red, 0.7) + L(x0 + 8.5, by - 1.4, bx, by - 1.4, COL.blk, 0.7);
  g += C(bx, by - 2.5, 1.7, '#222', stage === 0 ? hlC : '#000', stage === 0 ? 0.7 : 0.2) + T(bx - 2, by + 4.6, 'nodo', { size: 2.2 });
  g += T(x0 + 10, by - 9, 'cavo USB', { size: 2, anchor: 'start', fill: '#555' });
  if (stage >= 1) {
    const ex = stage >= 5 ? px[3] : stage >= 4 ? px[2] : stage >= 3 ? px[1] : stage >= 2 ? px[0] : px[0];
    g += L(bx, by - 3.6, px[3] + 2, by - 3.6, COL.red, 0.8, stage === 1 ? `stroke="${hlC}"` : '') + L(bx, by - 1.4, px[3] + 2, by - 1.4, COL.blk, 0.8);
    if (stage === 1) g += L(bx, by - 2.5, px[3] + 2, by - 2.5, hlC, 3, 'opacity="0.35"');
    g += T((bx + px[3]) / 2 + 10, by + 4.6, 'dorsale (bus) rosso + nero lungo la parete sud', { size: 2.2, fill: '#555' });
  }
  const names = ['P1', 'P2', 'P3', 'P4'];
  names.forEach((nm, i) => {
    const k = i + 2, on = stage >= k || stage === 6, now = stage === k;
    const x = px[i];
    // pezzo (verticale)
    const top = y0 + 5, bot = by - 12;
    g += R(x - 3, top, 6, bot - top, on ? COL.strip : 'none', now ? hlC : on ? '#a37a10' : '#aaa', now ? 0.8 : 0.3, on ? '' : 'stroke-dasharray="1 0.8"');
    g += T(x + 6, (top + bot) / 2, `${nm} · 456 mm`, { size: 2.4, anchor: 'start', fill: now ? '#b05000' : '#555', bold: now, rot: 0 });
    if (on) {
      // clip + derivazione
      g += R(x - 2.5, bot, 5, 3.2, '#222', now ? hlC : '#000', now ? 0.7 : 0.1);
      g += L(x - 0.8, bot + 3.2, x - 0.8, by - 3.6, COL.red, 0.5) + L(x + 0.8, bot + 3.2, x + 0.8, by - 1.4, COL.blk, 0.5);
      g += C(x - 0.8, by - 3.6, 0.7, '#fff', '#000', 0.2) + C(x + 0.8, by - 1.4, 0.7, '#fff', '#000', 0.2);
      g += T(x, bot + 6.8, 'clip', { size: 1.9, fill: '#444' });
      g += T(x - 3.4, top + 4, '+', { size: 3, fill: COL.red, bold: true, anchor: 'end' }) + T(x + 3.4, top + 4, '', { size: 3 });
    } else g += T(x, bot + 4, 'da fare', { size: 1.9, fill: '#aaa' });
  });
  if (stage === 6) { g += T(x0 + w / 2, y0 + 2.4, 'Collega la spina al caricatore 5 V ≥ 3 A: tutti e 4 i pezzi si accendono', { size: 2.6, bold: true, fill: COL.ok }); }
  return g;
}

export const secSvg = (sol, { xmax = 250, s = 0.5, showRays = true, hl = [] } = {}) => svg(+(xmax * s + 44).toFixed(1), +(95 * s + 6).toFixed(1), section(sol, { x0: 2, y0: 2, s, xmax, showRays, hl }));

/* ------------------------------------------------------------------ SCHEMA DI UNA STRISCIA, CATENA TESTA-CODA ALIMENTATA DAL CENTRO
   stage 0: cavo USB + nodo · 1: P2 · 2: P3 · 3: P1 (via P2) · 4: P4 (via P3) · 5: collaudo */
export function schemChain(stage = 5, { x0 = 0, y0 = 0, w = 170, h = 80 } = {}) {
  let g = '';
  const px = [0.34, 0.50, 0.66, 0.82].map(f => x0 + f * w), top = y0 + 17, bot = y0 + h - 15, hl = COL.org;
  const lit = [stage >= 3 || stage === 5, stage >= 1, stage >= 2, stage >= 4 || stage === 5];
  if (stage === 5) lit[0] = lit[1] = lit[2] = lit[3] = true;
  const now = [stage === 3, stage === 1, stage === 2, stage === 4];
  const nodeX = (px[1] + px[2]) / 2, ny = bot + 8;
  // spina e cavo
  g += R(x0 + 0.5, ny - 4.5, 8, 9, '#cfd8e0', stage === 0 ? hl : '#445', stage === 0 ? 0.7 : 0.3) + T(x0 + 4.5, ny - 6, 'USB', { size: 2.4, bold: true });
  g += L(x0 + 8.5, ny - 1.2, nodeX, ny - 1.2, COL.red, 0.7) + L(x0 + 8.5, ny + 1.2, nodeX, ny + 1.2, COL.blk, 0.7) + C(nodeX, ny, 1.6, '#222', stage === 0 ? hl : '#000', stage === 0 ? 0.7 : 0.2) + T(nodeX, ny + 6, 'nodo (al centro)', { size: 2.1 });
  g += T(x0 + 10, ny - 3.6, 'cavo USB tagliato', { size: 1.9, anchor: 'start', fill: '#555' });
  ['P1', 'P2', 'P3', 'P4'].forEach((nm, i) => {
    const x = px[i], on = lit[i];
    g += R(x - 3, top, 6, bot - top, on ? COL.strip : 'none', now[i] ? hl : on ? '#a37a10' : '#aaa', now[i] ? 0.8 : 0.3, on ? '' : 'stroke-dasharray="1 .8"');
    g += T(x, top - 9, nm + ' · 456', { size: 2.2, bold: now[i], fill: now[i] ? '#b05000' : '#555' });
  });
  const cl = (x, y, nw) => R(x - 2.5, y, 5, 3, '#222', nw ? hl : '#000', nw ? 0.7 : 0.1);
  // sud: nodo → P2, P3
  [1, 2].forEach(i => { if (stage >= i || stage === 5) { const nw = stage === i, x = px[i]; g += cl(x, bot, nw) + L(x - 0.8, bot + 3, x - 0.8, ny - 1.2, nw ? hl : COL.red, nw ? 1.2 : 0.5) + L(x + 0.8, bot + 3, x + 0.8, ny + 1.2, nw ? hl : COL.blk, nw ? 1.2 : 0.5); } });
  // nord: P2–P1, P3–P4
  [[1, 0, 3], [2, 3, 4]].forEach(([a, b, st]) => { if (stage >= st || stage === 5) { const nw = stage === st, ya = top - 5; g += cl(px[a], top - 3, false) + cl(px[b], top - 3, nw) + L(px[a], top - 3, px[a], ya, nw ? hl : '#333', 0.5) + L(px[b], top - 3, px[b], ya, nw ? hl : '#333', 0.5) + L(px[a], ya, px[b], ya, nw ? hl : '#333', nw ? 1.2 : 0.6); } });
  if (stage === 5) g += T(x0 + w / 2, y0 + 3, 'Spina nel caricatore 5 V ≥ 3 A: si accendono tutti e 4 i pezzi', { size: 2.6, bold: true, fill: COL.ok });
  g += T(x0 + w - 2, ny + 6, 'sud', { size: 2, anchor: 'end', fill: '#888' }) + T(x0 + w - 2, y0 + 3, 'nord', { size: 2, anchor: 'end', fill: '#888' });
  return g;
}
