// Geometria esatta del percorso scelto: 6 linee verticali + 10 tratti da 110 mm, cavità aperta.
// Sistema di riferimento (mm): x lungo il lato lungo (±485 interno), y lungo il lato corto (±235 interno),
// z verso l'alto con z = 0 sul piano inferiore dell'MDF. Il lato "alto" in pianta è y = +235.
// COSTRUZIONE: montanti 15 × 80 APPOGGIATI SOPRA l'MDF 1000 × 500 × 10; pannello opalino appoggiato sui listelli.
export const P = {
  L: 1000, W: 500, T: 15, WH: 80, BACK: 10, DIFF: 5, BAR: 8, STRIP_W: 8,
  PL: 970, PW: 470,                    // luce interna dei montanti
};
P.TOP = P.BACK + P.WH;                 // 90: cima dei montanti
P.ZD = P.TOP - P.DIFF;                 // 85: quota della cima dei listelli (appoggio del pannello opalino)
P.HU = P.ZD - P.BACK;                  // 75: altezza utile sopra l'MDF
P.ZSTRIP = P.ZD - P.BAR;               // 77: faccia inferiore del listello (la striscia sta sotto)
P.ZCON = P.ZSTRIP - 4.2;               // 72,8: centro dei connettori a clip
P.ZTRUNK = P.ZSTRIP - 11;              // 66: quota della dorsale
P.YTRUNK = 232;                        // la dorsale corre contro il lato lungo "alto"

const STEP = (P.PL - 8) / 5;          // 192,4
export const cx = k => -481 + k * STEP;                 // centri delle 6 linee, k = 0..5
export const mx = j => (cx(j - 1) + cx(j)) / 2;         // centri dei 5 scomparti, j = 1..5
// Taglio ogni 12 mm: linee 37 unità = 444 mm; tratti 11 unità = 132 mm, tutti uguali e centrati negli scomparti.
// Per striscia: 3 × 444 + 5 × 132 = 1992 mm = 166 unità = tutta la striscia.
export const CUT = 12;
const LINE_LEN = 444, SEG_LEN = 132, CLR = 6;   // il connettore sporge ~6 mm oltre la striscia (ipotesi)

// Pezzi di striscia
export const lines = [0, 1, 2, 3, 4, 5].map(k => ({ id: 'L' + k, kind: 'line', x: cx(k), y: 0, len: LINE_LEN, set: k < 3 ? 1 : 2 }));
// lato di alimentazione: i tratti alti da sinistra (dalla dorsale); i bassi dal ponticello della linea vicina
const segEnd = { T1: 'L', T2: 'L', T3: 'L', T4: 'L', T5: 'L', B1: 'L', B2: 'L', B3: 'R', B4: 'R', B5: 'R' };
const segSet = { T1: 1, T2: 1, T3: 1, T4: 2, T5: 2, B1: 1, B2: 1, B3: 2, B4: 2, B5: 2 };
const mkSeg = id => { const j = +id[1]; const x = mx(j); return { id, kind: 'seg', x, y: id[0] === 'T' ? 231 : -231, len: SEG_LEN, x0: x - SEG_LEN / 2, x1: x + SEG_LEN / 2, end: segEnd[id], set: segSet[id] }; };
export const segsTop = ['T1', 'T2', 'T3', 'T4', 'T5'].map(mkSeg);
export const segsBot = ['B1', 'B2', 'B3', 'B4', 'B5'].map(mkSeg);
export const pieces = [...lines, ...segsTop, ...segsBot];
const segCon = id => { const g = pieces.find(p => p.id === id); return g.end === 'L' ? g.x0 - CLR : g.x1 + CLR; };

// Connettori a clip (21): feed = ricevono corrente dalla dorsale; pon = collegati con ponticello
const yTop = LINE_LEN / 2 + CLR;      // 228
const con = (id, piece, x, y, role, set) => ({ id, piece, x, y, role, set });
export const connectors = [
  // set 1 (spina A, metà sinistra)
  con('C1', 'L0', cx(0), yTop, 'feed', 1), con('C2', 'L0', cx(0), -yTop, 'pon', 1), con('C3', 'B1', segCon('B1'), -231, 'pon', 1),
  con('C4', 'T1', segCon('T1'), 231, 'feed', 1),
  con('C5', 'L1', cx(1), yTop, 'feed', 1), con('C6', 'L1', cx(1), -yTop, 'pon', 1), con('C7', 'B2', segCon('B2'), -231, 'pon', 1),
  con('C8', 'T2', segCon('T2'), 231, 'feed', 1),
  con('C9', 'L2', cx(2), yTop, 'feed', 1), con('C10', 'T3', segCon('T3'), 231, 'feed', 1),
  // set 2 (spina B, metà destra)
  con('C11', 'L3', cx(3), yTop, 'feed', 2), con('C12', 'L3', cx(3), -yTop, 'pon', 2), con('C13', 'B3', segCon('B3'), -231, 'pon', 2),
  con('C14', 'T4', segCon('T4'), 231, 'feed', 2),
  con('C15', 'L4', cx(4), yTop, 'feed', 2), con('C16', 'L4', cx(4), -yTop, 'pon', 2), con('C17', 'B4', segCon('B4'), -231, 'pon', 2),
  con('C18', 'T5', segCon('T5'), 231, 'feed', 2),
  con('C19', 'L5', cx(5), yTop, 'feed', 2), con('C20', 'L5', cx(5), -yTop, 'pon', 2), con('C21', 'B5', segCon('B5'), -231, 'pon', 2),
];
export const cById = Object.fromEntries(connectors.map(c => [c.id, c]));

// Ponticelli (5) e derivazioni (11)
export const jumpers = [['PN1', 'C2', 'C3'], ['PN2', 'C6', 'C7'], ['PN3', 'C12', 'C13'], ['PN4', 'C16', 'C17'], ['PN5', 'C20', 'C21']]
  .map(([id, a, b]) => ({ id, a, b, set: cById[a].set, straight: Math.hypot(cById[a].x - cById[b].x, cById[a].y - cById[b].y) }));
export const feeders = connectors.filter(c => c.role === 'feed').map((c, i) => ({ id: 'D' + (i + 1), con: c.id, x: c.x, set: c.set }));
export const stripLen = set => pieces.filter(p => p.set === set).reduce((a, p) => a + p.len, 0);

// Foro di uscita comune per le due spine USB: centro del lato lungo "alto"
export const H = { x: 0, y: P.W / 2 - P.T / 2, z: P.BACK + 40, d: 10 };
// Dorsali: A verso sinistra (x negativi) fino a L0, B verso destra fino a L5
export const trunks = [
  { id: 'A', set: 1, x0: -8, x1: cx(0) },
  { id: 'B', set: 2, x0: 8, x1: cx(5) },
].map(t => {
  const horiz = Math.abs(t.x1 - t.x0), rise = P.ZTRUNK - H.z, run = 235 - P.YTRUNK;
  return { ...t, path: horiz + rise + run, cut: Math.round((horiz + rise + 60) * 1.15 / 10) * 10 };
});

// Listelli 8x8: 2 lunghi (954) lungo i lati lunghi + 6 verticali (454)
export const barsLong = [{ id: 'S-up', y: 231, x0: -477, x1: 477 }, { id: 'S-dn', y: -231, x0: -477, x1: 477 }];
export const barsVert = [0, 1, 2, 3, 4, 5].map(k => ({ id: 'V' + k, x: cx(k), y0: -227, y1: 227 }));
// Fermi (bulloni) sotto il pannello: 2 per scomparto
export const bolts = [1, 2, 3, 4, 5].flatMap(j => [{ x: mx(j), y: 120 }, { x: mx(j), y: -120 }]);

// Lista dei cavi con lunghezze di taglio (con scorta)
export const wireList = [
  ...trunks.map(t => ({ id: 'Dorsale ' + t.id, da: 'Foro H (giunto con cavo USB ' + t.id + ')', a: t.id === 'A' ? 'L0 (estremo sinistro)' : 'L5 (estremo destro)', cut: t.cut, qty: 2, note: 'rosso + nero, 0,5 mm²' })),
];

// Squadrette d'acciaio negli 4 angoli interni (posizione indicativa)
export const brackets = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => ({ x: sx * (P.PL / 2), y: sy * (P.PW / 2), sx, sy }));

/* ---------- Sequenza di montaggio dei collegamenti, striscia per striscia ----------
   Si parte dalla spina USB, poi un pezzo alla volta: dorsale fino al punto di derivazione, pezzo, clip, derivazione;
   i tratti bassi (B) si collegano con un ponticello dal fondo della linea vicina. */
const pcs = Object.fromEntries(pieces.map(p => [p.id, p]));
const fdByCon = Object.fromEntries(feeders.map(f => [f.con, f]));
const jmpById = Object.fromEntries(jumpers.map(j => [j.id, j]));
const defs = [
  [1, 'usb'], [1, 'piece', 'T3', 'C10'], [1, 'piece', 'L2', 'C9'], [1, 'piece', 'T2', 'C8'], [1, 'piece', 'L1', 'C5'], [1, 'low', 'B2', 'PN2'],
  [1, 'piece', 'T1', 'C4'], [1, 'piece', 'L0', 'C1'], [1, 'low', 'B1', 'PN1'], [1, 'test'],
  [2, 'usb'], [2, 'piece', 'L3', 'C11'], [2, 'low', 'B3', 'PN3'], [2, 'piece', 'T4', 'C14'], [2, 'piece', 'L4', 'C15'], [2, 'low', 'B4', 'PN4'],
  [2, 'piece', 'T5', 'C18'], [2, 'piece', 'L5', 'C19'], [2, 'low', 'B5', 'PN5'], [2, 'test'],
];
const run = { 1: -6, 2: 6 };
export const walk = defs.map(([set, kind, a, b]) => {
  const k = set === 1 ? 'A' : 'B', sgn = set === 1 ? -1 : 1, w = { set, kind, usb: k };
  if (kind === 'usb') { w.trunkFrom = 0; w.trunkTo = run[set]; w.title = `Spina USB ${k}: cavo dal foro H e inizio della dorsale ${k}`; w.text = `Passa la spina USB ${k} dal foro H (Ø10), taglia il cavo a circa 15 cm dalla striscia e spela rosso e nero. Salda i due fili all'inizio della dorsale ${k}, a ${P.ZTRUNK} mm da terra contro il lato lungo.`; }
  if (kind === 'piece') {
    const p = pcs[a], c = cById[b], f = fdByCon[b];
    Object.assign(w, { piece: p.id, con: c.id, feeder: f.id, trunkFrom: run[set], trunkTo: f.x, fx: c.x, fy: c.y });
    run[set] = f.x;
    w.title = `${p.id} (${p.len} mm): striscia, clip ${c.id}, derivazione ${f.id}`;
    w.text = `Allunga la dorsale ${k} fino a x = ${f.x.toFixed(0)} mm. Incolla ${p.id} (${p.len} mm) sotto il listello, rivolta in basso. Monta la clip ${c.id} sull'estremo, poi salda la derivazione ${f.id} (80 mm, rosso a +, nero a −) alla dorsale e infilala nella clip.`;
  }
  if (kind === 'low') {
    const p = pcs[a], j = jmpById[b], ca = cById[j.a], cb = cById[j.b];
    Object.assign(w, { piece: p.id, jumper: j.id, ca: ca.id, cb: cb.id, fx: (ca.x + cb.x) / 2, fy: ca.y, fromPiece: ca.piece });
    w.title = `${p.id} (${p.len} mm) dal fondo di ${ca.piece}: ponticello ${j.id}`;
    w.text = `Incolla ${p.id} sul lato lungo basso. Monta la clip ${ca.id} sul fondo di ${ca.piece} e la clip ${cb.id} su ${p.id}, poi unisci le due clip con il ponticello ${j.id} (80 mm, rosso a +, nero a −).`;
  }
  if (kind === 'test') {
    const n = pieces.filter(p => p.set === set).length;
    w.title = `Collaudo striscia ${set}`;
    w.text = `Collega la spina USB ${k} al caricatore (5 V, almeno 3 A) e accendi: devono illuminarsi tutti gli ${n} pezzi della striscia ${set}. Se un pezzo resta spento, riapri e richiudi la clip o controlla la polarità.`;
  }
  return w;
});
