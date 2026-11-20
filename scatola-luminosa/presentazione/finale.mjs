// Genera i due PDF finali (HTML → PDF): progetto + tutorial di montaggio. Uso: node presentazione/finale.mjs && node presentazione/finale.cjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { esc, T, R, L, C, svg, plan, section, schem, SOL, GEO, COL, allLines, stopPos } from './finale-lib.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));

const CSS = `
@page{size:297mm 210mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:"DejaVu Sans",Arial,sans-serif;color:#1b1b1b;font-size:3.5mm}
.page{width:297mm;height:210mm;position:relative;overflow:hidden;page-break-after:always;background:#fff}
header{position:absolute;left:0;top:0;right:0;height:17mm;background:#1d2733;color:#fff;padding:3.2mm 12mm}header .t{font-size:6.2mm;font-weight:700}header .s{font-size:3mm;opacity:.75;margin-top:.8mm}
footer{position:absolute;left:12mm;right:12mm;bottom:4mm;font-size:2.7mm;color:#666;display:flex;justify-content:space-between}
.body{position:absolute;left:12mm;right:12mm;top:21mm;bottom:11mm}
.col{position:absolute;top:0;bottom:0}h2{font-size:4.4mm;margin:0 0 1.6mm}h3{font-size:3.7mm;margin:2.4mm 0 1mm}p{margin:0 0 1.6mm;line-height:1.38}
ul{margin:0 0 1.6mm;padding-left:4.4mm}li{margin-bottom:.9mm;line-height:1.33}
.card{border:.3mm solid #c9cfd6;border-radius:2mm;padding:3mm;background:#fafbfc}.ok{background:#e9f6ec;border-color:#9ccaa7}.warn{background:#fff4e2;border-color:#e5b873}.bad{background:#fdeaea;border-color:#e3a0a0}
table{border-collapse:collapse;width:100%;font-size:3.1mm}td,th{border:.25mm solid #c9cfd6;padding:1mm 1.6mm;text-align:left;vertical-align:top}th{background:#eef1f5}
.tag{display:inline-block;font-size:2.6mm;font-weight:700;border-radius:1mm;padding:.3mm 1.4mm;margin-right:1mm;color:#fff}.tA{background:#2d6cdf}.tB{background:#8a4fd0}.tAB{background:#555}
.n{display:inline-block;width:8mm;height:8mm;border-radius:50%;background:#e07000;color:#fff;font-weight:700;text-align:center;line-height:8mm;margin-right:2mm;font-size:4.4mm}
.chk{margin-top:2mm;padding:2mm 3mm;background:#e9f6ec;border-left:1.2mm solid #1a8a3a;font-size:3.2mm}.big{font-size:5.4mm;font-weight:700}
small{color:#666}`;
const doc = (title, pages) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${pages.join('')}</body></html>`;
const mkPage = (sub, N) => { let n = 0; return (title, body) => { n++; return `<section class="page"><header><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div></header><div class="body">${body}</div><footer><span>Tutte le misure in mm · listelli 8×8 · striscia BTF-Lighting FCOB 5 V 8 mm</span><span>${n} / ${N}</span></footer></section>`; }; };
const tg = k => k === 'A' ? '<span class="tag tA">A · con traverso</span>' : k === 'B' ? '<span class="tag tB">B · senza traverso</span>' : '<span class="tag tAB">A e B</span>';

/* ================================================================== dati simulazione */
const zl = JSON.parse(fs.readFileSync(path.join(here, '../simulazione/zone-L.json')));
const SIM = { A: { mm: zl.minmax, cv: zl.cv, eta: zl.eta }, B: { mm: 0.79, cv: 0.048, eta: 0.63 } };
const pc = v => (v * 100).toFixed(0) + '%';

/* ================================================================== disegni composti */
const planBoth = (layers, hl = []) => svg(175, 176, ['A', 'B'].map((k, i) => T(2, i * 88 + 3, k === 'A' ? 'A · con traverso' : 'B · senza traverso', { size: 3, anchor: 'start', bold: true, fill: k === 'A' ? '#2d6cdf' : '#8a4fd0' }) + plan(k, { x0: 6, y0: i * 88 + 14, s: 0.135, layers, hl })).join(''));
const planFig = (sol, o) => planBoth(o.layers, o.hl);
const fig = (w, h, inner) => svg(w, h, inner);
// diagramma di taglio di una barra
function cutBar(x, y, w, total, label, pieces) {
  const s = w / total; let g = T(x, y - 1.8, label, { size: 2.7, anchor: 'start', bold: true }), cx = x;
  g += R(x, y, w, 7, '#f1e3c7', '#7a5a30', 0.3);
  pieces.forEach(p => { g += R(cx, y, p.len * s, 7, p.col || '#e9b96e', '#5a3a10', 0.35) + T(cx + p.len * s / 2, y + 4.4, p.name, { size: 2.4, bold: true }); cx += p.len * s; });
  g += T(x + w, y + 11, `${total} mm`, { size: 2.2, anchor: 'end', fill: '#555' });
  const rest = total - pieces.reduce((a, p) => a + p.len, 0); if (rest > 150) g += T(cx + (x + w - cx) / 2, y + 4.4, `avanzo ${rest}`, { size: 2, fill: '#666' });
  return g;
}

/* ================================================================== PDF 1 · PROGETTO */
const NP = 7, P = mkPage('Progetto finale · scatola luminosa 100 × 50 cm · due soluzioni', NP), prog = [];

// 1. riepilogo
prog.push(P('Scatola luminosa · progetto finale', `
<div class="col" style="left:0;width:138mm">
 <div class="card ok" style="height:100%"><span class="tag tA">SOLUZIONE A</span><span class="big">CON traverso centrale</span>
 <div style="margin:2mm 0">${svg(130, 70, plan('A', { x0: 2, y0: 2, s: 0.13, layers: ['walls', 'divider', 'strips', 'bars', 'hole', 'bus'], dims: false }))}${svg(130, 28, section('A', { x0: 2, y0: 2, s: 0.26, xmax: 500 }))}</div>
 <ul><li>2 zone indipendenti da 477,5 × 470 mm, ognuna con la sua striscia e il suo caricatore: accendi una zona sola o entrambe.</li>
 <li><b>4 linee LED</b> per zona, rivolte in basso, ognuna sotto un listello 8×8, <b>35 mm sotto il pannello</b>.</li>
 <li>Posizione dei centri dalla parete esterna: <b>40 · 176 · 302 · 438 mm</b> (zona destra specchiata).</li>
 <li>Simulazione: zona scura/chiara <b>${pc(SIM.A.mm)}</b> · variazione <b>${(SIM.A.cv * 100).toFixed(1)}%</b> · resa ${pc(SIM.A.eta)}.</li>
 <li>Traverso 15 × 75 mm alto come la cavità: sostiene il pannello al centro. Sopra di esso resta una banda scura di ~15 mm.</li></ul></div>
</div>
<div class="col" style="left:147mm;width:138mm">
 <div class="card ok" style="height:100%"><span class="tag tB">SOLUZIONE B</span><span class="big">SENZA traverso</span>
 <div style="margin:2mm 0">${svg(130, 70, plan('B', { x0: 2, y0: 2, s: 0.13, layers: ['walls', 'strips', 'bars', 'hole', 'bus'], dims: false }))}${svg(130, 28, section('B', { x0: 2, y0: 2, s: 0.26, xmax: 500 }))}</div>
 <ul><li>Un solo vano da 970 × 470 mm, luce continua su tutto il pannello. Le due strisce restano indipendenti (metà sinistra e metà destra).</li>
 <li><b>8 linee LED</b> (4+4) rivolte in basso, sotto listelli 8×8, <b>40 mm sotto il pannello</b>.</li>
 <li>Centri dalla parete: <b>55 · 178 · 301 · 424 · 546 · 669 · 792 · 915 mm</b>.</li>
 <li>Simulazione: zona scura/chiara <b>${pc(SIM.B.mm)}</b> · variazione <b>${(SIM.B.cv * 100).toFixed(1)}%</b> · resa ${pc(SIM.B.eta)}.</li>
 <li>Nessuna banda scura centrale. Un solo pannello da 968 × 468 mm.</li></ul></div>
</div>`));

// 2. striscia
prog.push(P('La striscia LED BTF-Lighting FCOB 5 V', `
<div class="col" style="left:0;width:140mm"><h2>Scheda tecnica (dal sito BTF-Lighting)</h2>
<table><tr><th>Caratteristica</th><th>Valore</th></tr>
<tr><td>Prodotto</td><td>DC5V USB FCOB LED strip, 8 mm PCB, 320 LEDs, Ra90, dimmerabile</td></tr>
<tr><td>Alimentazione</td><td>DC 5 V da spina USB</td></tr>
<tr><td>Potenza</td><td>7 W/m</td></tr>
<tr><td>Densità</td><td>320 LED/m (FCOB: linea di luce continua, senza punti)</td></tr>
<tr><td>Larghezza circuito (FPCB)</td><td>8 mm</td></tr>
<tr><td>Temperatura colore</td><td>3000 K / <b>4000 K luce naturale</b> / 6000 K</td></tr>
<tr><td>Resa cromatica</td><td>Ra &gt; 90</td></tr>
<tr><td>Angolo di emissione</td><td>180°</td></tr>
<tr><td>Temperatura d'uso</td><td>−20 … +45 °C</td></tr>
<tr><td>Confezione</td><td>set USB da 1 m o 2 m</td></tr></table>
<p style="margin-top:2mm"><small>Fonte: pagina prodotto sul sito btf-lighting.com. Non sono indicati lumen/m, corrente, spessore e passo di taglio.</small></p></div>
<div class="col" style="left:150mm;width:135mm"><h2>Cosa ne ricavo per il progetto</h2>
<ul><li><b>Corrente:</b> 7 W a 5 V = <b>1,4 A al metro</b> (calcolato). Un pezzo da 444 mm assorbe 0,62 A.</li>
<li><b>Una striscia per zona:</b> 4 × 444 = 1776 mm ≈ 12,4 W ≈ <b>2,5 A</b>. Serve un caricatore 5 V da almeno <b>3 A (15 W)</b> per striscia: due caricatori, uno per zona.</li>
<li><b>Cadute di tensione:</b> con pezzi da 444 mm alimentati da un'estremità con cavo 0,5 mm² la caduta è di pochi decimi di volt: nessun problema di uniformità.</li>
<li><b>Angolo 180°</b>: l'emissione è lambertiana, come nel modello di calcolo.</li>
<li><b>Taglio:</b> nel progetto uso il passo di taglio da 12 mm che mi hai indicato; verifica sulla tua striscia dove sono i segni di forbice. I pezzi da 444 mm sono 37 passi.</li>
<li><b>Spessore del circuito</b> non indicato: la striscia è sottile, ma lo spessore delle clip (≈ 3–4 mm) va tenuto sotto il listello: nella pianta le clip stanno all'estremità sud del pezzo, dove c'è il margine di 13 mm.</li>
<li><b>Dimmerabile:</b> il set non include il controller; non è necessario per questo progetto. In alternativa un dimmer PWM 5 V in serie al caricatore.</li></ul>
<div class="card warn"><b>Da verificare appena arriva:</b> larghezza reale 8 mm, posizione dei segni di taglio, polarità stampata (+5V/GND) e lunghezza del cavo USB del set.</div></div>`));

// 3. simulazione
prog.push(P('Come ho scelto la configurazione · simulazione', `
<div class="col" style="left:0;width:100mm"><h2>Il modello</h2>
<ul><li>Radiosità <b>multi-rimbalzo</b> sulla cavità interna: pareti e fondo bianco opaco (riflettanza 0,85), pannello opale 5 mm (trasmette 55%, riflette 40%).</li>
<li>LED lambertiani a passo 8 mm; listelli come ostacoli (la luce che li colpisce viene in parte riflessa); diffusione laterale nel pannello.</li>
<li>Bilancio energetico controllato al 100%. Circa 400 configurazioni provate: con/senza listelli, led su/giù/laterali/inclinati/incollati al pannello, 3–12 linee, distanza listello-pannello da 0 a 50 mm, margini dalle pareti, ricerca libera su posizioni e lunghezze.</li></ul>
<h3>Cosa è emerso</h3>
<ul><li>La <b>distanza listello–pannello</b> è decisiva: 0 mm → 28%, 20 mm → 70%, 35–40 mm → ~80%. A 50 mm peggiora di nuovo.</li>
<li>Le linee vanno <b>staccate dalle pareti</b> (40–55 mm): attaccate al muro illuminano il muro e lasciano il bordo scuro.</li>
<li>Solo <b>linee parallele equidistanti</b>: orizzontali e cornici concentrano la luce ai bordi.</li>
<li>4 linee per zona è l'ottimo: 3 danno risultati simili ma meno margine, 5–6 fanno ombre ravvicinate (73% e 58%).</li>
<li>Led a terra rivolti verso l'alto: +25% di luce ma 73% / 6,8%: meno uniforme.</li>
<li>Robustezza: pareti ρ 0,80–0,90 e pannello più/meno trasparente → 76–82%.</li></ul>
<p><small>"Zona scura/chiara" = punto più scuro / più chiaro (più alto è meglio). "Variazione" = dispersione (più bassa è meglio). "Resa" = luce LED che esce dal pannello.</small></p></div>
<div class="col" style="left:106mm;width:179mm"><img src="img/simulazione-mappe2.png" style="width:179mm;border:.3mm solid #ccc"/>
<p style="margin-top:1.5mm"><small>Mappe del pannello (stessa scala di colore ripetuta per ogni mappa). A include una banda scura sopra il traverso, disegnata come ipotesi (non calcolata). Il traverso deve arrivare al pannello e va verniciato di bianco.</small></p></div>`));

// 4-5. soluzioni
const legend = `<div class="card" style="font-size:3mm"><b>Legenda</b><br><span style="color:#d9a964">■</span> pareti / traverso<br><span style="color:#c9955a">■</span> listello 8×8<br><span style="color:#f2b823">■</span> striscia LED<br><span style="color:#6a2a00">━</span> dorsale (rosso+nero)<br>□ fermo del pannello<br><span style="color:#c33">□</span> foro Ø16</div>`;
const solPage = (k, title, body, secXmax) => P(title, `
<div class="col" style="left:0;width:220mm">${svg(220, 125, plan(k, { x0: 4, y0: 10, s: 0.215, layers: ['walls', 'divider', 'strips', 'bars', 'stops', 'hole', 'bus'] }))}</div>
<div class="col" style="left:226mm;width:59mm">${legend}</div>
<div class="col" style="left:0;top:122mm;width:120mm"><h3>Sezione (${k === 'A' ? 'zona sinistra' : 'metà sinistra'})</h3>${svg(120, 50, section(k, { x0: 2, y0: 2, s: 0.4, xmax: 500 }))}</div>
<div class="col" style="left:126mm;top:122mm;width:159mm">${body}</div>`);
prog.push(solPage('A', 'Soluzione A · CON traverso centrale', `<ul style="font-size:3.1mm">
<li><b>Linee:</b> centri a 40 · 176 · 302 · 438 mm dalla parete esterna; destra specchiata (532 · 668 · 794 · 930 dalla parete sinistra).</li>
<li><b>Listelli</b> 8×8 × 469 mm, cima a <b>40 mm dal bordo superiore del muro</b> (= 35 mm sotto il pannello). Striscia da 444 mm incollata sotto, 13 mm di margine dalle pareti lunghe.</li>
<li><b>Traverso</b> 15 × 75 mm (rifilato da una doga 15×80): la faccia superiore a 85 mm sostiene il pannello.</li>
<li><b>Foro H</b> Ø16 nella parete sud (x = 460); foro Ø16 nel traverso (a 25 mm dalla parete sud) per il cavo della zona destra.</li>
<li><b>Fermi pannello:</b> 10 pezzi, faccia superiore a 85 mm. <b>Pannello:</b> 2 pezzi 476 × 468 mm, oppure 1 da 968 × 468 (la zona spenta si illumina un po' per diffusione).</li></ul>`));
prog.push(solPage('B', 'Soluzione B · SENZA traverso', `<ul style="font-size:3.1mm">
<li><b>Linee:</b> 55 · 178 · 301 · 424 · 546 · 669 · 792 · 915 mm dalla parete sinistra (passo 123 mm).</li>
<li><b>Listelli</b> 8×8 × 469 mm, cima a <b>45 mm dal bordo superiore del muro</b> (= 40 mm sotto il pannello). Striscia 1: le 4 linee di sinistra; striscia 2: le 4 di destra.</li>
<li><b>Foro H</b> Ø16 nella parete sud a metà (x = 485): le due spine escono dallo stesso foro, un cavo verso sinistra e uno verso destra.</li>
<li><b>Fermi pannello:</b> 8 pezzi (6 sulle pareti lunghe, 2 sulle corte). <b>Pannello:</b> 968 × 468 mm in un solo pezzo.</li>
<li>Alternativa più semplice: 6 linee (3+3) a 85 mm dalle pareti → 74% / 5,0%.</li></ul>`));

// 6. taglio + schema
const cutSvg = (() => { let g = '';
  g += T(2, 4, 'Una striscia da 2 m (uguale per A e B, per ogni zona/metà)', { size: 3, anchor: 'start', bold: true });
  const s = 270 / 2000, x0 = 6, y0 = 12; let cx = x0;
  g += R(x0, y0, 2000 * s, 8, '#fff', '#222', 0.3);
  g += R(cx, y0, 8 * s, 8, '#b8c0c8', '#222', 0.3) + T(cx + 10, y0 - 1.2, 'cavo USB', { size: 2.2, anchor: 'start' }); cx += 8 * s;
  ['P1', 'P2', 'P3', 'P4'].forEach(n => { g += R(cx, y0, 444 * s, 8, COL.strip, '#a37a10', 0.4) + T(cx + 444 * s / 2, y0 + 5, n + ' · 444', { size: 2.6, bold: true }); cx += 444 * s; });
  g += R(cx, y0, 216 * s, 8, '#eee', '#999', 0.3, 'stroke-dasharray="1 .8"') + T(cx + 216 * s / 2, y0 + 5, 'avanzo 216', { size: 2.3, fill: '#666' });
  g += L(x0 + 8 * s, y0 + 8, x0 + 8 * s, y0 + 12, '#c33', 0.4) + T(x0 + 8 * s + 1, y0 + 14.5, 'taglia qui il cavo (al primo segno di forbice utile)', { size: 2.2, anchor: 'start', fill: '#c33' });
  g += T(x0, y0 + 24, '1776 mm usati = 37 passi × 4 pezzi (passo di taglio 12 mm) · 216 mm di avanzo: tienili come pezzo di ricambio/prova', { size: 2.5, anchor: 'start', fill: '#333' });
  return svg(285, 38, g); })();
prog.push(P('Taglio della striscia e schema elettrico (per ogni striscia)', `
<div class="col" style="left:0;width:285mm;height:38mm">${cutSvg}</div>
<div class="col" style="left:0;top:40mm;width:178mm">${svg(178, 90, T(89, 5, 'Schema elettrico di una striscia (non in scala)', { size: 3.4, bold: true }) + schem(6, { x0: 4, y0: 10, w: 170, h: 80 }))}</div>
<div class="col" style="left:184mm;top:40mm;width:101mm"><h3>Regole di collegamento</h3>
<ul style="font-size:3.1mm"><li>Il cavo USB viene <b>tagliato dalla striscia</b> e usato come alimentazione: i due fili (rosso +, nero −) arrivano a un nodo.</li>
<li>Dal nodo parte la <b>dorsale</b> a due fili 0,5 mm² lungo la parete sud, sul pavimento, fissata con nastro.</li>
<li>Ogni pezzo ha una <b>clip</b> sul bordo sud e una derivazione di ~30 mm saldata alla dorsale (rosso con rosso, nero con nero).</li>
<li><b>Tutti i pezzi con il + dallo stesso lato</b> (cioè i pad stampati nello stesso verso, tutti verso sud).</li>
<li>Corrente totale 2,5 A: caricatore ≥ 3 A. Niente prolunghe sottili: la dorsale è corta.</li>
<li>Prova ogni pezzo a banco <b>prima</b> di incollarlo.</li></ul>
<div class="card warn" style="font-size:3mm">Un solo caricatore per due strisce (5 A) non va bene con i cavi USB: usa un caricatore per striscia.</div></div>`));

// 7. materiali
prog.push(P('Distinta materiali e taglio del legname', `
<div class="col" style="left:0;width:140mm"><h2>Materiali</h2>
<table><tr><th>Voce</th><th>A (traverso)</th><th>B (senza)</th></tr>
<tr><td>Pannello MDF 1000×500×10</td><td>1</td><td>1</td></tr>
<tr><td>Doghe 15×80 da 2 m (hai già)</td><td>2</td><td>2</td></tr>
<tr><td>Listelli 8×8 da 2 m</td><td>2 (→ 8 pezzi da 469)</td><td>2 (→ 8 pezzi da 469)</td></tr>
<tr><td>Strisce BTF FCOB 5 V 4000K, set USB 2 m</td><td>2</td><td>2</td></tr>
<tr><td>Caricatori USB 5 V ≥ 3 A</td><td>2</td><td>2</td></tr>
<tr><td>Clip 2 pin 8 mm</td><td>8 (+2 scorta)</td><td>8 (+2 scorta)</td></tr>
<tr><td>Cavo 0,5 mm² rosso + nero</td><td>3 m + 3 m</td><td>3 m + 3 m</td></tr>
<tr><td>Fermi pannello (bulloni/blocchetti)</td><td>10</td><td>8</td></tr>
<tr><td>Pannello opale 5 mm</td><td>2 × 476×468<br>(o 1 × 968×468)</td><td>1 × 968×468</td></tr>
<tr><td>Colla ibrida, squadrette, vernice bianca opaca (hai già)</td><td colspan="2">sì</td></tr>
<tr><td>Saldatore + stagno, termorestringente 2 mm, nastro</td><td colspan="2">sì</td></tr></table></div>
<div class="col" style="left:150mm;width:135mm"><h2>Taglio delle doghe da 2 m</h2>
${svg(135, 70,
  cutBar(2, 8, 130, 2000, 'Doga 1 · A e B', [{ len: 1000, name: '1000 lato' }, { len: 470, name: '470' }, { len: 470, name: '470' }]) +
  cutBar(2, 28, 130, 2000, 'Doga 2 · A (con traverso)', [{ len: 1000, name: '1000 lato' }, { len: 470, name: '470 corto' }, { len: 470, name: '470→75', col: '#c9d6ff' }]) +
  cutBar(2, 48, 130, 2000, 'Doga 2 · B (senza traverso)', [{ len: 1000, name: '1000 lato' }]))}
<p style="font-size:3.1mm">Il pezzo da 470 azzurrato (A) è il <b>traverso</b>: va rifilato a <b>15 × 75 mm</b> (togli 5 mm di altezza con il seghetto o la pialla). Tieni conto dello spessore del taglio (~3 mm): 1940 + 6 mm ≤ 2000.</p>
<h3>Listelli 8×8</h3><p style="font-size:3.1mm">8 pezzi da <b>469 mm</b> da 2 barre da 2 m (4 pezzi per barra, 1876 mm). Si incollano tra i muri lunghi (interno 470): 0,5 mm di gioco per lato.</p></div>`));

fs.writeFileSync(path.join(here, 'finale-progetto.html'), doc('Scatola luminosa · progetto finale', prog));

/* ================================================================== PDF 2 · TUTORIAL */
const stepsMeta = [];
const TUT = []; const NT = 18, Q = mkPage('Tutorial di montaggio passo passo · soluzioni A (con traverso) e B (senza)', NT);
const stepPage = (n, title, left, figureSvg, check) => Q(`Passo ${n} · ${title}`, `<div class="col" style="left:0;width:104mm">${left}${check ? `<div class="chk"><b>Controllo:</b> ${check}</div>` : ''}</div><div class="col" style="left:110mm;width:175mm">${figureSvg}</div>`);

TUT.push(Q('Prima di iniziare', `
<div class="col" style="left:0;width:140mm"><h2>Ordine di lavoro (e perché)</h2>
<ol style="line-height:1.45;margin:0;padding-left:5mm"><li><b>Taglia</b> tutti i pezzi di legno.</li><li><b>Incolla</b> pareti (e traverso) e listelli sul <u>legno nudo</u>: la colla tiene meglio sul legno che sulla vernice.</li><li><b>Verniciare</b> tutto l'interno di bianco opaco (2 mani), lasciando mascherata la fascia sotto i listelli dove andrà la striscia.</li><li><b>Prepara le strisce</b> a banco: taglio, clip, prova.</li><li><b>Incolla le strisce</b> sotto i listelli e <b>cabla</b> la dorsale.</li><li><b>Prova</b> tutto con il pannello ancora aperto.</li><li><b>Posa il pannello</b> e fissalo.</li></ol>
<div class="card warn" style="margin-top:3mm">Non incollare le strisce prima di aver finito di verniciare: la vernice fresca rovina l'adesivo e i fumi anneriscono i contatti.</div></div>
<div class="col" style="left:150mm;width:135mm"><h2>Attrezzi</h2><ul><li>Seghetto/sega circolare, metro, squadra, matita</li><li>Morsetti o fascette per tenere i pezzi durante la colla</li><li>Colla ibrida (già scelta) + squadrette in acciaio</li><li>Trapano con punta a tazza o a forstner <b>Ø16</b></li><li>Pennello/rullino, nastro da carrozziere</li><li>Forbici, spelafili, saldatore e stagno, termorestringente, tester</li><li>2 caricatori USB 5 V ≥ 3 A per le prove</li></ul>
<h3>Le due soluzioni</h3><p>${tg('A')} due zone con traverso.<br>${tg('B')} un unico vano. I passi sono uguali salvo dove indicato con i tag colorati.</p></div>`));

TUT.push(stepPage(1, 'Taglio del legname', `<p>${tg('AB')}<b>Doghe da 2 m</b> (vedi schema): tagli puliti e a squadra, tieni conto dello spessore del taglio.</p>
<ul><li>2 lati lunghi da 1000 mm</li><li>2 lati corti da 470 mm</li><li>${tg('A')} 1 traverso da 470 mm, poi rifilato a <b>15 × 75 mm</b></li><li>8 listelli 8×8 da <b>469 mm</b></li></ul>
<p>Levigare leggermente gli spigoli (bambini).</p>`,
  fig(175, 150, T(2, 6, 'Doga 1 (identica in A e B)', { size: 3, anchor: 'start', bold: true }) + cutBar(2, 12, 168, 2000, '', [{ len: 1000, name: '1000' }, { len: 470, name: '470' }, { len: 470, name: '470' }]) +
    T(2, 36, 'Doga 2 · A', { size: 3, anchor: 'start', bold: true }) + cutBar(2, 42, 168, 2000, '', [{ len: 1000, name: '1000' }, { len: 470, name: '470' }, { len: 470, name: 'traverso 470', col: '#c9d6ff' }]) +
    T(2, 66, 'Doga 2 · B', { size: 3, anchor: 'start', bold: true }) + cutBar(2, 72, 168, 2000, '', [{ len: 1000, name: '1000' }]) +
    T(2, 96, 'Listelli 8×8 da 2 m (2 barre → 8 pezzi)', { size: 3, anchor: 'start', bold: true }) + cutBar(2, 102, 168, 2000, '', [{ len: 469, name: '469' }, { len: 469, name: '469' }, { len: 469, name: '469' }, { len: 469, name: '469' }]) + cutBar(2, 120, 168, 2000, '', [{ len: 469, name: '469' }, { len: 469, name: '469' }, { len: 469, name: '469' }, { len: 469, name: '469' }]) +
    T(2, 142, `${tg('A') ? '' : ''}Il traverso (azzurro) si rifila: 15 mm di spessore × 75 mm di altezza (da 80).`, { size: 2.8, anchor: 'start', fill: '#335' })),
  'lati lunghi 1000 ±1 mm, corti 470 ±1 mm, 8 listelli uguali.'));

TUT.push(stepPage(2, 'Pareti sul pannello MDF', `<p>${tg('AB')}Le doghe stanno <b>in piedi</b> (15 mm di spessore, 80 di altezza) <b>sopra</b> l'MDF, con i bordi esterni a filo: interno 970 × 470.</p>
<ul><li>Spalma la colla ibrida sulla base della doga, appoggia, premi e metti uno o due angolari d'acciaio per lato.</li><li>Controlla la squadra con il metro sulle diagonali (devono essere uguali).</li><li>${tg('A')} Incolla il <b>traverso</b> 15×75 al centro: tra x = 492,5 e 507,5 dall'esterno (centro del pannello), perpendicolare ai lati lunghi.</li></ul>`,
  planFig('A', { layers: ['walls', 'divider'], hl: ['walls', 'divider'] }),
  'interno 970 × 470, diagonali uguali, tutto a filo e ben fermo. Lascia indurire la colla (almeno 1 ora per la presa rapida).'));

TUT.push(stepPage(3, 'Segna altezze e posizioni', `<p>${tg('AB')}Sulle <b>facce interne dei due muri lunghi</b> traccia:</p>
<ul><li>una linea orizzontale a <b>40 mm</b> dal bordo superiore del muro ${tg('A')}, o a <b>45 mm</b> ${tg('B')}: lì va la <b>cima</b> del listello;</li>
<li>le posizioni dei listelli (centro ± 4 mm) misurate dalla faccia interna del muro sinistro:<br><b>${tg('A')}</b> 40·176·302·438 e 532·668·794·930<br><b>${tg('B')}</b> 55·178·301·424·546·669·792·915</li></ul>
<p>Segna le stesse posizioni sul muro opposto. Controlla con una riga che le coppie siano allineate (listello perpendicolare).</p>`,
  planFig('A', { layers: ['walls', 'divider', 'marks'], hl: ['marks'] }),
  'ogni coppia di segni sui due muri è sullo stesso x; il pannello opale finito sarà 5 mm più in alto: la tua linea è la cima del listello.'));

TUT.push(stepPage(4, 'Fori per i cavi', `<p>${tg('A')} <b>Foro H Ø16</b> nel muro sud a x = <b>460</b> dalla faccia interna sinistra (centro a 18 mm sopra l'MDF) + <b>foro Ø16 nel traverso</b>, a 25 mm dal muro sud, alla stessa quota.</p>
<p>${tg('B')} <b>Foro H Ø16</b> nel muro sud a metà (x = <b>485</b>), centro a 18 mm sopra l'MDF.</p>
<ul><li>Usa una punta a tazza/forstner Ø16: la spina USB-A è 12 × 4,5 mm, passa dal foro.</li><li>Smussa i bordi con carta vetrata (non devono sfregare il cavo).</li></ul>`,
  planFig('A', { layers: ['walls', 'divider', 'hole'], hl: ['hole'] }),
  'la spina USB passa dal foro senza forzare.'));

TUT.push(stepPage(5, 'Fermi del pannello', `<p>${tg('AB')}Incolla i fermi (blocchetti o bulloni a testa piatta) sulle pareti: la loro <b>faccia superiore</b> deve stare a <b>5 mm dal bordo del muro</b> (il pannello opale da 5 mm resta a filo).</p>
<ul><li>${tg('A')} 10 fermi: 4 per zona sui muri lunghi + 1 per zona sul muro corto. Il traverso (altezza 75) regge il bordo del pannello al centro.</li><li>${tg('B')} 8 fermi: 3 per muro lungo + 1 per muro corto.</li><li>Usa un blocchetto di legno da 5 mm appoggiato sul bordo come dima.</li></ul>`,
  planFig('A', { layers: ['walls', 'divider', 'stops'], hl: ['stops'] }),
  'tutti i fermi alla stessa quota: appoggia una riga sopra e controlla che non ci siano fessure.'));

TUT.push(stepPage(6, 'Incolla i listelli', `<p>${tg('AB')}Incolla i listelli da 469 mm tra i due muri lunghi, con la <b>cima sulla linea</b> segnata (40 mm ${tg('A')} · 45 mm ${tg('B')} dal bordo del muro).</p>
<ul><li>Colla ibrida sulle due testate di ogni listello e sui due punti di contatto con la parete.</li><li>Appoggia su un distanziale (dima) di 40/45 mm e controlla la squadra.</li><li>Facoltativo: una squadretta piccola per testata.</li></ul>
<p>La striscia (8 mm) andrà sotto il listello: lascia libera la sua faccia inferiore.</p>`,
  planFig('A', { layers: ['walls', 'divider', 'stops', 'bars'], hl: ['bars'] }),
  'tutti i listelli alla stessa quota (±1 mm) e a squadra; colla indurita prima di verniciare.'));

TUT.push(stepPage(7, 'Vernicia tutto di bianco opaco', `<p>${tg('AB')}Due mani di bianco opaco su <b>tutto l'interno</b>: MDF, pareti, traverso (entrambe le facce e la cima), listelli, fermi, e il bordo dei fori.</p>
<ul><li>Prima di verniciare <b>maschera con nastro</b> la fascia di 8 mm sotto ogni listello: lì andrà la striscia.</li><li>Lascia asciugare bene tra le mani (secondo la vernice).</li><li>Non verniciare dove poggerà il pannello.</li></ul>`,
  planBoth(['walls', 'divider', 'stops', 'bars'], ['walls', 'divider', 'bars', 'floor']),
  'bianco uniforme, senza zone lucide; nastro rimosso dopo l\'ultima mano.'));

TUT.push(stepPage(8, 'Prepara le strisce a banco', `<p>${tg('AB')}Per <b>ogni striscia da 2 m</b> (4 pezzi da 444 mm):</p>
<ol><li>Taglia il cavo USB dalla striscia all'attaccatura.</li><li>Taglia 4 pezzi da <b>444 mm</b> (37 passi) sui segni di forbice. Numerali P1…P4 sul retro.</li><li>Spela i due fili del cavo USB (5 mm).</li></ol>
<p>L'avanzo di 216 mm serve come ricambio o per prove.</p>`,
  fig(175, 60, (() => { let g = T(2, 5, 'Una striscia da 2 m', { size: 3, anchor: 'start', bold: true }); const s = 168 / 2000; let cx = 3; g += R(cx, 12, 8 * s, 8, '#b8c0c8', '#222', 0.3); cx += 8 * s; ['P1', 'P2', 'P3', 'P4'].forEach(n => { g += R(cx, 12, 444 * s, 8, COL.strip, '#a37a10', 0.4) + T(cx + 444 * s / 2, 17, n, { size: 3, bold: true }); cx += 444 * s; }); g += R(cx, 12, 216 * s, 8, '#eee', '#999', 0.3, 'stroke-dasharray="1 .8"') + T(cx + 216 * s / 2, 17, 'avanzo', { size: 2.4 }); g += T(3, 30, 'Taglia solo sui segni di forbice.  Ripeti per la seconda striscia.', { size: 2.8, anchor: 'start' }); return g; })()),
  'i 4 pezzi sono lunghi uguale (444 mm) e numerati.'));

TUT.push(stepPage(9, 'Clip e prova di ogni pezzo', `<p>${tg('AB')}Monta una <b>clip 2 pin</b> sul bordo del pad di ogni pezzo (sull'estremità che andrà a sud) e cavetto di ~40 mm.</p>
<ol><li>Apri la clip, infila la striscia con i pad sui contatti, chiudi.</li><li>Rispetta il + : filo rosso sul pad "+5V".</li><li>Collega temporaneamente la clip al cavo USB (rosso+nero) e al caricatore: il pezzo si accende uniforme.</li></ol>
<p>Fai la prova per <b>tutti i pezzi</b> prima di incollare.</p>`,
  fig(175, 70, schem(2, { x0: 4, y0: 2, w: 168, h: 66 })),
  'ogni pezzo si accende su tutta la lunghezza, senza zone spente.'));

TUT.push(stepPage(10, 'Incolla le strisce sotto i listelli', `<p>${tg('AB')}Stacca la protezione dell'adesivo e incolla ogni pezzo sulla <b>fascia da 8 mm sotto il listello</b>, con i LED rivolti in basso.</p>
<ul><li>Il bordo <b>sud</b> del pezzo (clip) a <b>13 mm</b> dal muro sud; l'altro bordo finisce a 13 mm dal muro nord: 444 mm centrati nei 470.</li><li>Tutti i pezzi con il + verso sud.</li><li>Premi per 20 s lungo tutta la lunghezza.</li></ul>`,
  planFig('A', { layers: ['walls', 'divider', 'stops', 'strips', 'bars', 'hole'], hl: ['strips'] }),
  'strisce dritte e centrate sotto i listelli, nessuna piegatura.'));

// pagine del cablaggio (2): fasi 0..5
const wiringPages = [
  [0, 'Cavo USB e nodo', '<p>Attacca il cavo USB tagliato alla striscia: uno dei fili va nel nodo (saldatura), poi l\'altro. Isola con termorestringente.</p>'],
  [1, 'Dorsale lungo la parete sud', '<p>Stendi la dorsale a due fili (rosso + nero) sul pavimento lungo il muro sud, dal nodo fino al quarto listello. Fissala con nastro trasparente.</p>'],
  [2, 'Pezzo P1', '<p>Salda la derivazione di P1 alla dorsale (rosso con rosso, nero con nero) e collegala alla clip di P1. Prova: P1 acceso.</p>'],
  [3, 'Pezzo P2', '<p>Come P1: derivazione, clip, prova. P1 e P2 accesi.</p>'],
  [4, 'Pezzo P3', '<p>Come P1: derivazione, clip, prova. P1, P2, P3 accesi.</p>'],
  [5, 'Pezzo P4', '<p>Come P1: derivazione, clip, prova. Tutti e 4 i pezzi accesi.</p>'],
];
const wcell = (st, t, body) => `<div style="position:absolute;width:140mm;height:70mm"><div class="card" style="height:100%;padding:2mm"><b>${st + 1}. ${t}</b>${svg(134, 54, schem(st, { x0: 1, y0: 1, w: 132, h: 50 }))}</div></div>`;
TUT.push(Q('Passo 11 · Cablaggio di una striscia (1/2)', `
${[0, 1, 2].map((i, k) => `<div style="position:absolute;left:${(k % 2) * 143}mm;top:${Math.floor(k / 2) * 90}mm;width:140mm;height:86mm"><div class="card" style="height:100%;padding:2mm"><b>${i + 1}. ${wiringPages[i][1]}</b>${svg(134, 52, schem(wiringPages[i][0], { x0: 1, y0: 1, w: 132, h: 52 }))}<div style="font-size:3.2mm">${wiringPages[i][2]}</div></div></div>`).join('')}
<div style="position:absolute;left:143mm;top:90mm;width:140mm;height:86mm"><div class="card warn" style="height:100%;font-size:3.2mm"><b>Prima di cominciare</b><ul><li>Taglia i cavetti a misura: la derivazione è ~30 mm.</li><li>Solda a stagno e usa termorestringente da 2 mm.</li><li>Rosso sempre con rosso (+5 V).</li><li>Fai tutta una striscia, poi la seconda: ${tg('A')} zona sinistra/destra, ${tg('B')} metà sinistra/destra.</li></ul></div></div>`));
TUT.push(Q('Passo 11 · Cablaggio di una striscia (2/2)', `
${[3, 4, 5].map((i, k) => `<div style="position:absolute;left:${(k % 2) * 143}mm;top:${Math.floor(k / 2) * 90}mm;width:140mm;height:86mm"><div class="card" style="height:100%;padding:2mm"><b>${i + 1}. ${wiringPages[i][1]}</b>${svg(134, 52, schem(wiringPages[i][0], { x0: 1, y0: 1, w: 132, h: 52 }))}<div style="font-size:3.2mm">${wiringPages[i][2]}</div></div></div>`).join('')}
<div style="position:absolute;left:143mm;top:90mm;width:140mm;height:86mm"><div class="card ok" style="height:100%"><b>7. Collaudo della striscia</b>${svg(134, 52, schem(6, { x0: 1, y0: 1, w: 132, h: 52 }))}<div style="font-size:3mm">Collega la spina al caricatore: i 4 pezzi si accendono insieme e uniformi. Ripeti l'intero passo 11 per la seconda striscia.</div></div></div>`));

TUT.push(stepPage(12, 'Uscita dei cavi dal foro H', `<p>${tg('AB')}Fai passare le due spine USB dal foro <b>H</b> (dall'interno verso l'esterno) in modo che escano dallo stesso punto.</p>
<ul><li>${tg('A')} il cavo della zona destra attraversa il foro del traverso e poi esce da H insieme all'altro.</li><li>${tg('B')} i due cavi escono da H, uno da sinistra e uno da destra.</li><li>Fai un nodo semplice o un passacavo dentro al foro come fermo di trazione.</li></ul>
<p>Collega ciascuna spina a un caricatore 5 V ≥ 3 A e accendi.</p>`,
  planFig('A', { layers: ['walls', 'divider', 'stops', 'strips', 'bars', 'bus', 'hole'], hl: ['bus', 'hole'] }),
  'A: puoi accendere una zona sola o entrambe · B: i due caricatori accendono metà ciascuno.'));

TUT.push(stepPage(13, 'Posa il pannello opale', `<p>${tg('AB')}Pulisci l'interno (niente polvere sui led) e appoggia il pannello sui fermi, a filo con il bordo dei muri.</p>
<ul><li>${tg('A')} 2 pannelli 476 × 468 mm (zone indipendenti) oppure 1 da 968 × 468.</li><li>${tg('B')} 1 pannello 968 × 468 mm.</li><li>Per i bambini: bloccalo con piccole viti dai muri o con silicone trasparente nei 4 angoli.</li></ul>`,
  planBoth(['walls', 'divider', 'stops', 'strips', 'bars', 'bus', 'hole', 'panel'], ['panel']),
  'pannello piano, nessun gioco, nessun filo visibile dal lato frontale.'));

TUT.push(stepPage(14, 'Prova finale e regolazioni', `<p>${tg('AB')}Accendi in una stanza poco illuminata.</p>
<ul><li>Cerca zone più chiare/scure o strisce visibili: sono normali solo i bordi (~2 cm) e, in ${tg('A')}, la banda sopra il traverso.</li><li>Se vedi i led come punti: la distanza listello–pannello è troppo bassa o il pannello non è abbastanza opale.</li><li>Se un pezzo è spento: controlla clip, derivazione e polarità.</li></ul>`,
  planBoth(['walls', 'divider', 'stops', 'strips', 'bars', 'bus', 'hole', 'panel'], []),
  'luce uniforme, nessun punto luminoso visibile, nessun odore di caldo dai cavi.'));

TUT.push(Q('Passo 15 · Sicurezza (bambini) e manutenzione', `
<div class="col" style="left:0;width:138mm"><h2>Sicurezza</h2><ul><li>Bassissima tensione (5 V): niente rischio di scossa, ma usa caricatori certificati.</li><li>I led scaldano poco, ma non coprire il pannello con tessuti.</li><li>Pannello fissato (viti/silicone) e cavi con fermo di trazione.</li><li>Spigoli levigati, cavi non raggiungibili.</li></ul></div>
<div class="col" style="left:148mm;width:137mm"><h2>Manutenzione</h2><ul><li>Pulisci il pannello con un panno umido (niente solventi: opacizzano l'acrilico).</li><li>Se una striscia si spegne: ricontrolla la clip del pezzo e la derivazione.</li><li>Tieni l'avanzo di striscia (216 mm) come ricambio.</li></ul></div>`));

TUT.push(Q('Passo 16 · Riepilogo veloce', `
<div class="col" style="left:0;width:285mm"><table><tr><th>#</th><th>Cosa</th><th>${tg('A')}</th><th>${tg('B')}</th></tr>
<tr><td>1</td><td>Taglio legname</td><td colspan="2">2 lunghi 1000, 2 corti 470, 8 listelli 469 (+ traverso A)</td></tr>
<tr><td>2</td><td>Pareti su MDF</td><td>+ traverso 15×75 al centro</td><td>solo perimetro</td></tr>
<tr><td>3</td><td>Segni</td><td>cima listello a 40 mm; 8 posizioni specchiate</td><td>cima a 45 mm; 8 posizioni equidistanti</td></tr>
<tr><td>4</td><td>Fori</td><td>H a x = 460 + foro nel traverso</td><td>H a x = 485</td></tr>
<tr><td>5</td><td>Fermi pannello</td><td>10</td><td>8</td></tr>
<tr><td>6–7</td><td>Listelli, vernice</td><td colspan="2">colla sul legno nudo → poi bianco opaco, fascia sotto il listello mascherata</td></tr>
<tr><td>8–9</td><td>Strisce</td><td colspan="2">4 × 444 mm per striscia, clip, prova a banco</td></tr>
<tr><td>10–12</td><td>Incollaggio e cablaggio</td><td colspan="2">13 mm di margine; dorsale sud; caricatore 5 V ≥ 3 A per striscia</td></tr>
<tr><td>13–14</td><td>Pannello e prova</td><td>2 pannelli 476×468 o 1 da 968×468</td><td>1 pannello 968×468</td></tr></table></div>`));

fs.writeFileSync(path.join(here, 'finale-tutorial.html'), doc('Tutorial di montaggio', TUT));
console.log('ok', prog.length, TUT.length);
