// Genera il rapporto grafico (HTML → PNG) con classifica e mappe di luminosità dei progetti migliori.
import fs from 'node:fs';
import { simulate, lineV, lineH, DOWN, UP, BW, BH, HU, GX, GY } from './radiosity.mjs';
import { LAY, build, MOUNT } from './configs.mjs';
const here = new URL('.', import.meta.url).pathname;
const key = (l, k) => [Object.keys(LAY).find(n => n.startsWith(l + ' ')), MOUNT[k]];
const mk = (l, k) => { const [ln, m] = key(l, k); return { cfg: build(LAY[ln], m), ln, m }; };
// configurazioni da mostrare
const designs = [];
const add = (title, sub, cfg, kind) => { const r = simulate(cfg); designs.push({ title, sub, r, kind, cfg }); };
let d = mk('L1', 0); add('A · Come proposto prima', 'cornice + 2 centrali, listelli a ridosso del pannello (0 mm)', d.cfg, 'down');
d = mk('L16', 1); add('B · Listelli a 10 mm', '4 linee verticali uniformi', d.cfg, 'down');
d = mk('L16', 3); add('C · Listelli a 20 mm (CONSIGLIATA)', '4 linee verticali uniformi da parete a parete', d.cfg, 'down');
d = mk('L5', 3); add('D · Come C + 2 tratti H 108', 'usa tutta la striscia (2016 mm)', d.cfg, 'down');
d = mk('L12', 4); add('E · A terra verso l\'alto, 5 linee', 'senza listelli: più luce, meno uniforme', d.cfg, 'up');
fs.writeFileSync(here + 'report-data.json', JSON.stringify(designs.map(x => ({ title: x.title, sub: x.sub, minmax: x.r.minmax, cv: x.r.cv, eta: x.r.eta, flux: x.r.flux }))));
// SVG delle mappe
const col = v => { const k = Math.max(0, Math.min(1, v / 1.6)); const r = Math.round(25 + 230 * k), g = Math.round(28 + 216 * k), b = Math.round(45 + 170 * k); return `rgb(${r},${g},${b})`; };
const heat = (L, x0, y0, w) => { const mean = L.reduce((a, b) => a + b, 0) / L.length, cw = w / GX, ch = (w * BH / BW) / GY; let s = ''; for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) s += `<rect x="${(x0 + i * cw).toFixed(2)}" y="${(y0 + (GY - 1 - j) * ch).toFixed(2)}" width="${(cw + 0.05).toFixed(2)}" height="${(ch + 0.05).toFixed(2)}" fill="${col(L[j * GX + i] / mean)}"/>`; return s + `<rect x="${x0}" y="${y0}" width="${w}" height="${(w * BH / BW).toFixed(2)}" fill="none" stroke="#222" stroke-width="0.3"/>`; };
let g = `<text x="12" y="12" font-size="4.2" font-weight="700" fill="#111">Mappe di luminosità sul pannello (una zona 477 × 470 mm) – stesso colore = stessa luce relativa alla media</text>`;
designs.forEach((x, i) => {
  const cx = 12 + (i % 3) * 94, cy = 24 + Math.floor(i / 3) * 92;
  g += `<text x="${cx}" y="${cy - 3}" font-size="3.4" font-weight="700" fill="#111">${x.title}</text>` + heat(x.r.L, cx, cy, 72);
  g += `<text x="${cx}" y="${cy + 72 * BH / BW + 4.5}" font-size="2.7" fill="#333">zona scura/chiara ${(x.r.minmax * 100).toFixed(0)}% · variazione ${(x.r.cv * 100).toFixed(1)}% · resa ${(x.r.eta * 100).toFixed(0)}%</text>`;
  g += `<text x="${cx}" y="${cy + 72 * BH / BW + 8.5}" font-size="2.4" fill="#666">${x.sub}</text>`;
});
fs.writeFileSync(here + 'report-maps.html', `<!DOCTYPE html><html><body style="margin:0;background:#fff"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210" width="1600" height="1131" font-family="DejaVu Sans, Arial, sans-serif">${g}</svg></body></html>`);
console.log('ok', designs.map(x => `${x.title}: ${(x.r.minmax * 100).toFixed(0)}% / ${(x.r.cv * 100).toFixed(1)}% / ${(x.r.eta * 100).toFixed(0)}%`).join(' | '));
