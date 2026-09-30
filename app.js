/* Cene di famiglia — webapp locale (nessun servizio cloud).
   Dati: window.MENU_DATA (app/data/menus.js). Stato: server locale (stato.json) o localStorage. */
(function () {
  'use strict';

  const DATA = window.MENU_DATA || {};
  const MESI_DISPONIBILI = Object.keys(DATA).sort();
  const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const TESTA_CAL = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const CAT = {
    pesce: { nome: 'Pesce', icona: '🐟' },
    legumi: { nome: 'Legumi', icona: '🫘' },
    carne_bianca: { nome: 'Carne bianca', icona: '🍗' },
    carne_rossa: { nome: 'Carne rossa', icona: '🥩' },
    uova: { nome: 'Uova', icona: '🥚' },
    formaggi: { nome: 'Formaggi', icona: '🧀' },
    vegetale: { nome: 'Vegetale', icona: '🥕' },
  };
  const ORDINE_CAT = ['pesce', 'legumi', 'carne_bianca', 'uova', 'carne_rossa', 'formaggi'];
  const REPARTI = [
    ['frutta_verdura', 'Frutta e verdura', '🥕'], ['carne', 'Carne', '🍗'], ['pesce', 'Pesce', '🐟'],
    ['latticini_uova', 'Latticini e uova', '🥚'], ['pane_pasta_cereali', 'Pane, pasta e cereali', '🍝'],
    ['dispensa', 'Dispensa', '🥫'], ['surgelati', 'Surgelati', '🧊'], ['spezie_condimenti', 'Spezie e condimenti', '🧂'],
  ];
  const ORDINE_REPARTI = Object.fromEntries(REPARTI.map((r, i) => [r[0], i]));
  const NOME_REPARTO = Object.fromEntries(REPARTI.map(r => [r[0], r[2] + ' ' + r[1]]));
  const OBIETTIVI_MESE = { pesce: [8, 9], legumi: [8, 9], carne_bianca: [4, 5], uova: [2, 3], carne_rossa: [2, 2], formaggi: [0, 1] };
  const LATTOSIO = { no: 'Senza lattosio', sostituito: 'Con prodotti senza lattosio', si: 'Contiene lattosio' };
  const LS_STATO = 'cdf-stato-v1';
  const LS_UI = 'cdf-ui-v1';

  // ---------- utilità ----------
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const oggiISO = () => iso(new Date());
  const aggiungiGiorni = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
  const giorniTra = (a, b) => Math.round((pd(b) - pd(a)) / 86400000);
  const dataEstesa = s => { const d = pd(s); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; };
  const dataBreve = s => { const d = pd(s); return `${GIORNI_BREVI[d.getDay()]} ${d.getDate()}`; };
  const safeUrl = u => (/^https:\/\/(www\.)?cookidoo\.[a-z.]+\//i.test(u || '') ? u : null);

  function fmtQta(q, u) {
    if (q == null) return 'q.b.';
    if (u === 'g') {
      if (q >= 1000) return String(Math.round(q / 10) / 100).replace('.', ',') + ' kg';
      const p = q < 100 ? 5 : 10;
      return (q > 0 ? Math.max(p, Math.round(q / p) * p) : 0) + ' g';
    }
    if (u === 'pz') return Math.ceil(q - 1e-9) + ' pz';
    return String(Math.round(q * 10) / 10).replace('.', ',') + ' ' + u;
  }

  let toastTimer = null;
  function toast(msg, tipo) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast visibile' + (tipo === 'errore' ? ' errore' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
  }

  // ---------- stato ----------
  // scambi: {data: [id piatti]} ([] = sera da decidere); attesa: [{piatti, da}] piatti tolti dal calendario
  let stato = { scambi: {}, voti: {}, spesa: {}, attesa: [] };
  let modoServer = false;
  let info = null;
  let ui = { vista: 'oggi', mese: null, sett: null, filtroCat: 'tutte', cerca: '', mostraAlt: false };
  try { Object.assign(ui, JSON.parse(localStorage.getItem(LS_UI) || '{}')); } catch (e) { /* niente */ }

  function normalizzaStato(s) {
    s = s && typeof s === 'object' ? s : {};
    return { scambi: s.scambi || {}, voti: s.voti || {}, spesa: s.spesa || {}, attesa: Array.isArray(s.attesa) ? s.attesa : [] };
  }
  function salvaUI() { try { localStorage.setItem(LS_UI, JSON.stringify(ui)); } catch (e) { /* niente */ } }

  // ---------- sincronizzazione famiglia (Firebase, per la versione sugli iPhone) ----------
  const LS_FAMIGLIA = 'cdf-famiglia-v1';
  const FB_VER = '10.12.2';
  let fb = null; // { fs, ref }
  let sincronizzato = null; // ultimo stato ricevuto/inviato, per mandare solo le differenze
  let statoFamiglia = ''; // '', 'collegamento', 'ok', 'errore: ...'
  const LS_FIREBASE = 'cdf-firebase-v1';
  const copia = o => JSON.parse(JSON.stringify(o));
  const codiceFamiglia = () => { try { return localStorage.getItem(LS_FAMIGLIA) || ''; } catch (e) { return ''; } };
  const configSalvata = () => { try { return JSON.parse(localStorage.getItem(LS_FIREBASE) || 'null'); } catch (e) { return null; } };
  if (!window.CDF_FIREBASE) window.CDF_FIREBASE = configSalvata();
  // dal blocco "const firebaseConfig = {...}" copiato dalla console Firebase
  function leggiConfig(testo) {
    const out = {};
    for (const c of ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']) {
      const m = testo.match(new RegExp(c + '\\s*:\\s*["\']([^"\']+)["\']'));
      if (m) out[c] = m[1];
    }
    return out.apiKey && out.projectId && out.appId ? out : null;
  }
  // se la configurazione non sta in config.js viaggia insieme al codice famiglia: l'altro telefono incolla una cosa sola
  function codiceDaCondividere() {
    const cfg = configSalvata();
    return cfg ? 'CENE1.' + btoa(JSON.stringify({ c: cfg, f: codiceFamiglia() })) : codiceFamiglia();
  }
  function nuovoCodice() {
    const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
    const n = new Uint8Array(24);
    crypto.getRandomValues(n);
    return [...n].map(x => alfabeto[x % alfabeto.length]).join('').replace(/(.{6})(?=.)/g, '$1-');
  }
  async function avviaFamiglia(codice) {
    statoFamiglia = 'collegamento';
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [appMod, authMod, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
    const app = appMod.initializeApp(window.CDF_FIREBASE);
    const auth = authMod.getAuth(app);
    await auth.authStateReady();
    if (!auth.currentUser) await authMod.signInAnonymously(auth);
    let db;
    try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() }); } catch (e) { db = fs.getFirestore(app); }
    const ref = fs.doc(db, 'famiglie', codice);
    fb = { fs, ref };
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) await fs.setDoc(ref, Object.assign(copia(stato), { creato: fs.serverTimestamp() }));
    fs.onSnapshot(ref, s => {
      if (!s.exists()) return;
      stato = normalizzaStato(s.data());
      sincronizzato = copia(stato);
      statoFamiglia = 'ok';
      try { localStorage.setItem(LS_STATO, JSON.stringify(stato)); } catch (e) { /* niente */ }
      if (document.activeElement && document.activeElement.dataset.azione === 'cerca') return;
      render();
      if (cucina) renderCucina();
    }, err => { statoFamiglia = 'errore: ' + err.code; render(); });
  }
  // aggiornamenti per campo: le spunte e gli spostamenti fatti sui due telefoni non si cancellano a vicenda
  function differenze(prima, dopo) {
    const { deleteField, arrayUnion, arrayRemove } = fb.fs;
    const a1 = {}, a2 = {};
    for (const k of ['scambi', 'voti']) {
      const a = prima[k] || {}, b = dopo[k] || {};
      for (const x of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(x in b)) a1[`${k}.${x}`] = deleteField();
        else if (JSON.stringify(a[x]) !== JSON.stringify(b[x])) a1[`${k}.${x}`] = b[x];
      }
    }
    const sa = prima.spesa || {}, sb = dopo.spesa || {};
    for (const s of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
      if (!(s in sb)) { a1[`spesa.${s}`] = deleteField(); continue; }
      for (const campo of ['presi', 'inCasa']) {
        const A = new Set((sa[s] || {})[campo] || []), B = new Set((sb[s] || {})[campo] || []);
        const piu = [...B].filter(x => !A.has(x)), meno = [...A].filter(x => !B.has(x));
        if (piu.length) a1[`spesa.${s}.${campo}`] = arrayUnion(...piu);
        if (meno.length) (piu.length ? a2 : a1)[`spesa.${s}.${campo}`] = arrayRemove(...meno);
      }
    }
    if (JSON.stringify(prima.attesa || []) !== JSON.stringify(dopo.attesa || [])) a1.attesa = dopo.attesa || [];
    return [a1, a2].filter(x => Object.keys(x).length);
  }
  async function inviaFamiglia() {
    if (!fb || !sincronizzato) return true;
    const aggiornamenti = differenze(sincronizzato, stato);
    sincronizzato = copia(stato);
    try {
      for (const a of aggiornamenti) await fb.fs.updateDoc(fb.ref, a);
      return true;
    } catch (e) {
      toast('Sincronizzazione non riuscita: riprovo quando torna la rete', 'errore');
      return false;
    }
  }

  let timerSalva = null;
  async function salvaOra() {
    clearTimeout(timerSalva);
    if (fb) return inviaFamiglia();
    if (!modoServer) return true;
    try {
      const r = await fetch('/api/stato', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Menu-App': '1' }, body: JSON.stringify(stato),
      });
      if (!r.ok) throw new Error(r.status);
      return true;
    } catch (e) {
      toast('Non riesco a salvare sul PC: il server è acceso?', 'errore');
      return false;
    }
  }
  function salva() {
    try { localStorage.setItem(LS_STATO, JSON.stringify(stato)); } catch (e) { /* niente */ }
    if (fb) inviaFamiglia();
    else if (modoServer) { clearTimeout(timerSalva); timerSalva = setTimeout(salvaOra, 350); }
  }

  // ---------- accesso ai dati ----------
  const menu = () => DATA[ui.mese];
  const ric = id => (menu().ricette || {})[id];
  const giornoDi = s => menu().giorni.find(g => g.data === s);
  const haScambio = s => Object.prototype.hasOwnProperty.call(stato.scambi, s);
  const piattiDi = g => (!g || g.tipo !== 'cena') ? [] : (haScambio(g.data) ? stato.scambi[g.data] : (g.piatti || [])).slice();
  const daDecidere = g => !!g && g.tipo === 'cena' && piattiDi(g).length === 0;
  const principale = g => { const p = piattiDi(g).map(ric).filter(Boolean); return p.find(r => r.ruolo === 'completo' || r.ruolo === 'principale') || p[0]; };
  function categoriaDi(g) {
    if (!g || g.tipo !== 'cena') return null;
    if (!haScambio(g.data)) return g.categoria;
    const p = principale(g);
    return p ? p.categoria : null;
  }
  const titoliDi = piatti => piatti.map(ric).filter(Boolean).map(r => r.titolo).join(' + ');
  const titoloGiorno = g => g.tipo === 'pizza' ? '🍕 Pizza' : (daDecidere(g) ? '➕ Da decidere' : esc(titoliDi(piattiDi(g))));
  const catVar = c => c ? `--cat: var(--c-${c})` : '';
  const prepDel = s => (menu().prep || []).filter(p => p.data === s);
  // la base della domenica segue il piatto anche se viene spostato in un altro giorno
  let cachePrep = null;
  function prepPer(g) {
    if (!cachePrep || cachePrep.mese !== ui.mese) {
      const mappa = {};
      (menu().prep || []).forEach(p => (p.usatoIn || []).forEach(d => {
        ((giornoDi(d) || {}).piatti || []).forEach(id => { mappa[id] = mappa[id] || []; if (!mappa[id].includes(p)) mappa[id].push(p); });
      }));
      cachePrep = { mese: ui.mese, mappa };
    }
    const out = [];
    piattiDi(g).forEach(id => (cachePrep.mappa[id] || []).forEach(p => { if (!out.includes(p)) out.push(p); }));
    return out;
  }
  const voto = id => stato.voti[id] || 0;

  // ---------- spostamenti e lista d'attesa ----------
  function setPiatti(data, piatti) {
    const g = giornoDi(data);
    if (piatti.join('+') === (g.piatti || []).join('+')) delete stato.scambi[data];
    else stato.scambi[data] = piatti.slice();
  }
  function scambiaGiorni(a, b) {
    const ga = giornoDi(a), gb = giornoDi(b);
    if (!ga || !gb || a === b || ga.tipo !== 'cena' || gb.tipo !== 'cena') return false;
    const pa = piattiDi(ga), pb = piattiDi(gb);
    setPiatti(a, pb); setPiatti(b, pa);
    return true;
  }
  function mettiInAttesa(data) {
    const g = giornoDi(data);
    const p = piattiDi(g);
    if (!p.length) return false;
    stato.attesa.push({ piatti: p, da: data });
    setPiatti(data, []);
    return true;
  }
  function ripristina(data) {
    const g = giornoDi(data);
    const originale = (g.piatti || []).join('+');
    const attuali = piattiDi(g);
    const altrove = menu().giorni.find(x => x.data !== data && x.tipo === 'cena' && piattiDi(x).join('+') === originale);
    if (altrove) {
      setPiatti(altrove.data, attuali); // era stato spostato: si rimettono a posto entrambi
    } else {
      const i = stato.attesa.findIndex(v => v.piatti.join('+') === originale);
      if (i >= 0) stato.attesa.splice(i, 1);
      // se il piatto attuale è la cena originale di un altro giorno, non va perso: finisce in attesa
      const proprietario = menu().giorni.find(x => x.data !== data && (x.piatti || []).join('+') === attuali.join('+'));
      if (attuali.length && proprietario) stato.attesa.push({ piatti: attuali, da: data });
    }
    delete stato.scambi[data];
  }
  function piazzaDaAttesa(idx, data) {
    const voce = stato.attesa[idx];
    const g = giornoDi(data);
    if (!voce || !g || g.tipo !== 'cena') return false;
    const attuali = piattiDi(g);
    stato.attesa.splice(idx, 1);
    if (attuali.length) stato.attesa.push({ piatti: attuali, da: data });
    setPiatti(data, voce.piatti);
    return true;
  }

  function verdureDi(g) {
    const out = [];
    for (const r of piattiDi(g).map(ric).filter(Boolean)) {
      for (const v of ((r.verduraNascosta || {}).verdure || [])) if (!out.includes(v)) out.push(v);
    }
    for (const p of prepPer(g)) {
      const r = ric(p.ricetta);
      for (const v of ((r && r.verduraNascosta) || {}).verdure || []) if (!out.includes(v)) out.push(v);
    }
    return out;
  }
  // i grammi dei piatti comprendono già la verdura della base della domenica che usano
  const grammiVerdura = g => Math.round(piattiDi(g).map(ric).filter(Boolean)
    .reduce((tot, r) => tot + ((r.verduraNascosta || {}).grammiFamiglia || 0), 0));
  // tempo della sera = piatto principale (il contorno si prepara in parallelo o prima)
  const tempoDi = g => { const p = principale(g); return p ? Number(p.tempoMin) || 0 : 0; };

  // ---------- lista della spesa (stessa logica di menu_core.py) ----------
  function listaSpesa(settId) {
    const m = menu();
    const sett = m.settimane.find(s => s.id === settId);
    if (!sett) return null;
    const dividi = info ? info.dividiFreschi !== false : true;
    const gSpesa = sett.giornoSpesa || sett.dal;
    const prepSett = (m.prep || []).filter(p => p.data >= sett.dal && p.data <= sett.al);
    const ricPrep = new Set(prepSett.map(p => p.ricetta));
    const voci = new Map();
    const aggiungi = (rid, data, etichetta) => {
      const r = ric(rid);
      if (!r) return;
      for (const ing of (r.ingredienti || [])) {
        const nome = String(ing.nome || '').trim().toLowerCase();
        const unita = String(ing.unita || '').trim();
        if (!nome || nome === 'acqua' || ing.casa) continue; // casa: già pronto nel freezer di casa
        const reparto = ing.reparto || 'dispensa';
        let gruppo = 'principale';
        if (ing.dispensa) gruppo = 'dispensa';
        else if (dividi && (reparto === 'pesce' || reparto === 'carne') && giorniTra(gSpesa, data) >= 3) gruppo = 'freschi';
        const k = `${gruppo}|${nome}|${unita}`;
        let v = voci.get(k);
        if (!v) { v = { chiave: k, gruppo, nome, qta: null, unita, reparto, note: [], usi: [] }; voci.set(k, v); }
        if (typeof ing.qta === 'number') v.qta = (v.qta || 0) + ing.qta;
        const nota = String(ing.nota || '').trim();
        if (nota && !v.note.includes(nota)) v.note.push(nota);
        const uso = `${dataBreve(data)} · ${etichetta}`;
        if (!v.usi.includes(uso)) v.usi.push(uso);
      }
    };
    for (const g of m.giorni) {
      if (g.data < sett.dal || g.data > sett.al || g.tipo !== 'cena') continue;
      for (const rid of piattiDi(g)) {
        if (ricPrep.has(rid)) continue;
        const r = ric(rid);
        aggiungi(rid, g.data, r ? r.titolo : rid);
      }
    }
    for (const p of prepSett) aggiungi(p.ricetta, p.data, 'prep: ' + (p.titolo || ''));
    const sp = stato.spesa[settId] || {};
    const presi = new Set(sp.presi || []);
    const inCasa = new Set(sp.inCasa || []);
    const gruppi = { principale: [], freschi: [], dispensa: [] };
    [...voci.values()]
      .sort((a, b) => (ORDINE_REPARTI[a.reparto] ?? 99) - (ORDINE_REPARTI[b.reparto] ?? 99) || a.nome.localeCompare(b.nome, 'it'))
      .forEach(v => { v.preso = presi.has(v.chiave); v.inCasa = inCasa.has(v.chiave); gruppi[v.gruppo].push(v); });
    return { settimana: sett, gruppi };
  }

  function testoLista(settId) {
    const ls = listaSpesa(settId);
    const s = ls.settimana;
    const righe = [`SPESA ${s.id} · cene dal ${dataEstesa(s.dal)} a ${dataEstesa(s.al)}`];
    const blocco = (titolo, voci) => {
      voci = voci.filter(v => !v.preso && !v.inCasa);
      if (!voci.length) return;
      righe.push('', titolo.toUpperCase());
      let rep = null;
      for (const v of voci) {
        if (v.reparto !== rep) { rep = v.reparto; righe.push('— ' + (NOME_REPARTO[rep] || rep).replace(/^\S+ /, '')); }
        righe.push(`☐ ${v.nome}: ${fmtQta(v.qta, v.unita)}${v.note.length ? ` (${v.note[0]})` : ''}`);
      }
    };
    blocco('Da comprare', ls.gruppi.principale);
    blocco('Pesce/carne freschi a metà settimana (o surgelati)', ls.gruppi.freschi);
    blocco('Controlla in dispensa', ls.gruppi.dispensa);
    return righe.join('\n');
  }

  // ---------- rendering: pezzi riusabili ----------
  function chipCat(c) {
    if (!c || !CAT[c]) return '';
    return `<span class="chip cat" style="${catVar(c)}">${CAT[c].icona} ${esc(CAT[c].nome)}</span>`;
  }
  function chipsRicetta(r) {
    const out = [chipCat(r.categoria)];
    if (r.tempoMin) out.push(`<span class="chip">⏱️ ${esc(r.tempoMin)} min</span>`);
    if (r.lattosio && r.lattosio !== 'no') out.push(`<span class="chip" title="${esc(r.notaLattosio || '')}">🥛 ${esc(LATTOSIO[r.lattosio] || r.lattosio)}</span>`);
    if (r.fonte === 'personalizzata') out.push('<span class="chip">✍️ Ricetta scritta per voi</span>');
    if (Array.isArray(r.valutazioneCookidoo) && r.valutazioneCookidoo[0]) out.push(`<span class="chip">⭐ ${esc(r.valutazioneCookidoo[0])} (${esc(r.valutazioneCookidoo[1])})</span>`);
    if (voto(r.id) === 1) out.push('<span class="chip">👍 Piace</span>');
    if (voto(r.id) === -1) out.push('<span class="chip">👎 Non piace</span>');
    return `<div class="chips">${out.join('')}</div>`;
  }
  function bottoniVoto(id) {
    return `<span class="voto" role="group" aria-label="Vi è piaciuto?">
      <button type="button" data-azione="voto" data-id="${esc(id)}" data-v="1" aria-pressed="${voto(id) === 1}" title="Ai bimbi è piaciuto">👍</button>
      <button type="button" data-azione="voto" data-id="${esc(id)}" data-v="-1" aria-pressed="${voto(id) === -1}" title="Non è piaciuto">👎</button>
    </span>`;
  }

  // ---------- vista: Stasera ----------
  function vistaOggi() {
    const m = menu();
    const oggi = oggiISO();
    const cene = m.giorni;
    let g = giornoDi(oggi);
    let intestazione = 'Stasera';
    if (!g) {
      if (oggi < cene[0].data) { g = cene[0]; intestazione = `Si comincia ${dataEstesa(g.data)}`; }
      else { g = cene[cene.length - 1]; intestazione = `Ultima sera del mese: ${dataEstesa(g.data)}`; }
    } else {
      intestazione = `Stasera · ${dataEstesa(g.data)}`;
    }
    const domani = giornoDi(aggiungiGiorni(g.data, 1));
    let eroe;
    if (g.tipo === 'pizza') {
      eroe = `<section class="card pizza-eroe" style="${catVar('pizza')}">
        <div class="etichetta">${esc(intestazione)}</div>
        <div class="grande" aria-hidden="true">🍕</div>
        <h2>Sabato sera: pizza!</h2>
        <p class="muto">Ci pensate voi. Buona serata!</p></section>`;
    } else if (daDecidere(g)) {
      eroe = `<section class="card eroe">
        <div class="etichetta">${esc(intestazione)}</div>
        <h2>Sera da decidere</h2>
        <p class="muto">Il piatto di questa sera è stato messo in lista d'attesa.</p>
        <div class="azioni" style="margin-top:14px">
          ${stato.attesa.length ? `<button class="btn primario" type="button" data-azione="apri-giorno" data-data="${g.data}">⏸️ Scegli dalla lista d'attesa</button>` : ''}
          <button class="btn" type="button" data-azione="cambia" data-data="${g.data}">🔄 Scegli un'alternativa</button>
        </div>
      </section>`;
    } else {
      const piatti = piattiDi(g).map(ric).filter(Boolean);
      const p0 = piatti[0] || {};
      const vn = piatti.map(r => r.verduraNascosta || {}).find(v => v.trucco) || {};
      const verdure = verdureDi(g);
        const prepUsata = prepPer(g).map(p => `<div class="avviso info"><span>🥣</span><div>Usa la base della domenica: <b>${esc(p.titolo)}</b></div></div>`).join('');
      eroe = `<section class="card eroe" style="${catVar(categoriaDi(g))}">
        <div class="etichetta">${esc(intestazione)}${haScambio(g.data) ? ' · piatto cambiato' : ''}</div>
        <h2>${esc(p0.titolo || 'Cena')}</h2>
        ${piatti.slice(1).map(r => `<div class="piatto-2">+ ${esc(r.titolo)}</div>`).join('')}
        ${chipsRicetta(Object.assign({}, principale(g) || p0, { tempoMin: tempoDi(g), categoria: categoriaDi(g) }))}
        ${piatti.length > 1 ? `<p class="piccolo muto" style="margin:-6px 0 12px">⏱️ Il tempo è del piatto principale; ${esc(piatti.filter(r => r !== principale(g)).map(r => `${r.titolo}: ${r.tempoMin || '?'} min`).join(', '))}.</p>` : ''}
        ${verdure.length ? `<div class="nascosta"><span class="ico" aria-hidden="true">🥕</span>
          <div><b>Verdura nascosta:</b> ${esc(verdure.join(', '))} <span class="muto piccolo">(≈ ${grammiVerdura(g)} g per tutta la famiglia)</span></div>
          <div class="piccolo">${esc(vn.come || '')}${vn.trucco ? ' <b>Trucco:</b> ' + esc(vn.trucco) : ''}</div></div>` : ''}
        ${prepUsata}
        <div class="azioni" style="margin-top:14px">
          <button class="btn primario" type="button" data-azione="cucina" data-data="${g.data}">👩‍🍳 Cucina passo passo</button>
          <button class="btn" type="button" data-azione="apri-giorno" data-data="${g.data}">Dettagli e ingredienti</button>
          <button class="btn" type="button" data-azione="cambia" data-data="${g.data}">🔄 Cambia piatto</button>
        </div>
      </section>`;
    }

    const laterali = [];
    if (domani && domani.tipo === 'cena') {
      const pd2 = piattiDi(domani).map(ric).filter(Boolean);
      const scong = pd2.filter(r => r.scongelare).map(r => r.scongelare);
      laterali.push(`<section class="card" style="cursor:pointer" data-azione="apri-giorno" data-data="${domani.data}">
        <div class="etichetta">Domani · ${esc(dataEstesa(domani.data))}</div>
        <h3 style="margin:6px 0 8px">${pd2.length ? esc(pd2.map(r => r.titolo).join(' + ')) : '➕ Da decidere'}</h3>
        ${chipCat(categoriaDi(domani))}
        ${scong.length ? `<div class="avviso" style="margin-top:12px"><span>🧊</span><div>Stasera, per domani: <b>${esc(scong.join('; '))}</b></div></div>` : ''}
        ${domani.nota && !haScambio(domani.data) ? `<p class="piccolo muto" style="margin:10px 0 0">📝 ${esc(domani.nota)}</p>` : ''}
      </section>`);
    } else if (domani && domani.tipo === 'pizza') {
      laterali.push(`<section class="card"><div class="etichetta">Domani · ${esc(dataEstesa(domani.data))}</div><h3 style="margin-top:6px">🍕 Pizza</h3></section>`);
    }
    const prepOggi = prepDel(g.data);
    const prossimaPrep = (m.prep || []).find(p => p.data >= g.data);
    const pp = prepOggi[0] || prossimaPrep;
    if (pp) {
      const usi = (pp.usatoIn || []).map(dataBreve).join(', ');
      laterali.push(`<section class="card" style="cursor:pointer" data-azione="apri-ricetta" data-id="${esc(pp.ricetta)}">
        <div class="etichetta">${pp.data === g.data ? 'Preparazione di oggi' : 'Preparazione di ' + esc(dataEstesa(pp.data))}</div>
        <h3 style="margin:6px 0 6px">🥣 ${esc(pp.titolo)}</h3>
        <p class="piccolo muto" style="margin:0">${esc(pp.descrizione || '')}${usi ? ` Serve per: ${esc(usi)}.` : ''}</p>
      </section>`);
    }
    const oggiS = oggiISO();
    const prossima = m.settimane.find(s => (s.giornoSpesa || s.dal) >= oggiS) || m.settimane.find(s => s.al >= oggiS);
    if (prossima) {
      const ls = listaSpesa(prossima.id);
      const n = ls.gruppi.principale.length + ls.gruppi.freschi.length;
      laterali.push(`<section class="card">
        <div class="etichetta">Prossima spesa</div>
        <h3 style="margin:6px 0 4px">🛒 ${esc(dataEstesa(prossima.giornoSpesa || prossima.dal))}</h3>
        <p class="piccolo muto" style="margin:0 0 10px">${n} prodotti per le cene dal ${esc(dataBreve(prossima.dal))} al ${esc(dataBreve(prossima.al))}</p>
        <button class="btn piccolo" type="button" data-azione="vai-spesa" data-sett="${esc(prossima.id)}">Apri la lista</button>
      </section>`);
    }

    const inizio = g.data;
    const sette = m.giorni.filter(x => x.data > inizio).slice(0, 7);
    const lista = sette.map(x => {
      const c = categoriaDi(x);
      return `<li data-azione="apri-giorno" data-data="${x.data}"><span class="gg">${esc(GIORNI_BREVI[pd(x.data).getDay()])}<b>${pd(x.data).getDate()}</b></span>
        <span>${titoloGiorno(x)}${prepDel(x.data).length ? ' <span class="chip">🥣 prep</span>' : ''}</span>
        <span class="pallino" style="${catVar(x.tipo === 'pizza' ? 'pizza' : c)}" title="${esc(c ? CAT[c].nome : (x.tipo === 'pizza' ? 'Pizza' : 'Da decidere'))}"></span></li>`;
    }).join('');

    const invito = window.CDF_WEB && window.CDF_FIREBASE && !codiceFamiglia()
      ? `<div class="avviso info" style="margin-bottom:14px"><span>🔗</span><div>Collega il <b>codice famiglia</b> per sincronizzare questo telefono con l'altro.
          <button type="button" class="btn piccolo" data-vista="info" style="margin-left:6px">Collega</button></div></div>` : '';
    return `${invito}<div class="griglia-oggi">
      <div class="colonna">${eroe}
        ${sette.length ? `<section class="card"><div class="etichetta" style="margin-bottom:6px">I prossimi giorni</div><ul class="lista-giorni">${lista}</ul></section>` : ''}
      </div>
      <div class="colonna">${laterali.join('')}</div>
    </div>`;
  }

  // ---------- vista: Calendario ----------
  function vistaCalendario() {
    const m = menu();
    const oggi = oggiISO();
    const primo = pd(m.giorni[0].data);
    const vuote = (primo.getDay() + 6) % 7;
    let celle = TESTA_CAL.map(t => `<div class="cal-testa">${t}</div>`).join('');
    for (let i = 0; i < vuote; i++) celle += '<div class="cal-cella vuota" aria-hidden="true"></div>';
    m.giorni.forEach(g => {
      const d = pd(g.data);
      const cls = ['cal-cella'];
      if (g.data < oggi) cls.push('passato');
      if (g.data === oggi) cls.push('oggi');
      if (g.tipo === 'pizza') cls.push('pizza');
      if (daDecidere(g)) cls.push('da-decidere');
      const c = categoriaDi(g);
      const icone = [];
      if (prepDel(g.data).length) icone.push('<span title="Preparazione della domenica">🥣</span>');
      if (haScambio(g.data) && !daDecidere(g)) icone.push('<span title="Piatto cambiato o spostato">🔄</span>');
      const p = principale(g);
      if (p && voto(p.id) === 1) icone.push('<span title="Piace">👍</span>');
      const titolo = titoloGiorno(g);
      const verdure = g.tipo === 'cena' ? verdureDi(g) : [];
      const dnd = g.tipo === 'cena' ? ` data-drop="giorno" data-data-drop="${g.data}"${daDecidere(g) ? '' : ` draggable="true" data-drag="giorno:${g.data}"`}` : '';
      celle += `<button type="button" class="${cls.join(' ')}" style="${catVar(g.tipo === 'pizza' ? 'pizza' : c)}" data-azione="apri-giorno" data-data="${g.data}"${dnd}
        aria-label="${esc(dataEstesa(g.data))}: ${esc(titolo.replace(/<[^>]+>/g, ''))}">
        <span class="num"><span>${d.getDate()}<span class="gs">${esc(GIORNI_BREVI[d.getDay()])}</span></span><span class="icone">${icone.join('')}</span></span>
        <span class="tit">${titolo}</span>
        ${verdure.length ? `<span class="veg">🥕 ${esc(verdure.join(', '))}</span>` : ''}
        <span class="barra"></span></button>`;
      if (d.getDay() === 0 || g === m.giorni[m.giorni.length - 1]) {
        celle += riepilogoRiga(aggiungiGiorni(g.data, -6), g.data);
      }
    });
    const legenda = ORDINE_CAT.map(c => `<span><span class="pallino" style="${catVar(c)}"></span>${CAT[c].nome}</span>`).join('')
      + `<span><span class="pallino" style="${catVar('pizza')}"></span>Pizza</span><span>🥣 preparazione della domenica</span><span>🔄 piatto cambiato o spostato</span>`;
    return `<div class="titolo-sezione"><h2>Menu di ${esc(m.titolo || ui.mese)}</h2>
        <div class="azioni"><button class="btn" type="button" data-azione="stampa">🖨️ Stampa il menu</button></div></div>
      ${pannelloAttesa()}
      <p class="piccolo muto no-stampa" style="margin:0 0 10px">Suggerimento: trascina una cena su un altro giorno per scambiarle, oppure sulla lista d'attesa per toglierla. Da telefono usa i tasti 🔀 Sposta e ⏸️ Attesa nel dettaglio del giorno.</p>
      <div class="cal">${celle}</div>
      <div class="legenda">${legenda}</div>`;
  }
  function pannelloAttesa() {
    const voci = stato.attesa.map((v, i) => {
      const r = ric(v.piatti[0]);
      return `<div class="attesa-voce" draggable="true" data-drag="attesa:${i}">
        <div><div class="t">${esc(titoliDi(v.piatti))}</div>
          <div class="chips" style="margin-top:4px">${chipCat(r && r.categoria)}${v.da ? `<span class="chip">tolto da ${esc(dataBreve(v.da))}</span>` : ''}</div></div>
        <div class="azioni"><button type="button" class="btn piccolo primario" data-azione="piazza" data-idx="${i}">📅 Metti in un giorno</button>
          <button type="button" class="btn piccolo fantasma" data-azione="elimina-attesa" data-idx="${i}" title="Elimina dalla lista d'attesa">🗑️</button></div>
      </div>`;
    }).join('');
    return `<section class="card attesa no-stampa" data-drop="attesa">
      <div class="etichetta">⏸️ Lista d'attesa ${stato.attesa.length ? `(${stato.attesa.length})` : ''}</div>
      ${voci || '<p class="piccolo muto" style="margin:6px 0 0">Vuota. Trascina qui una cena (o usa ⏸️ nel dettaglio del giorno) per toglierla dal calendario senza perderla.</p>'}
    </section>`;
  }
  function riepilogoRiga(dal, al) {
    const cene = menu().giorni.filter(g => g.data >= dal && g.data <= al && g.tipo === 'cena');
    if (!cene.length) return '';
    const cont = {};
    cene.forEach(g => { const c = categoriaDi(g); cont[c] = (cont[c] || 0) + 1; });
    const parti = ORDINE_CAT.filter(c => cont[c]).map(c => `${CAT[c].icona} ${cont[c]} ${esc(CAT[c].nome.toLowerCase())}`);
    return `<div class="cal-sett no-stampa">Questa riga: ${parti.join(' · ')}</div>`;
  }

  // ---------- vista: Spesa ----------
  function vistaSpesa() {
    const m = menu();
    const oggi = oggiISO();
    if (!ui.sett || !m.settimane.find(s => s.id === ui.sett)) {
      ui.sett = (m.settimane.find(s => s.al >= oggi) || m.settimane[0]).id;
    }
    const ls = listaSpesa(ui.sett);
    const s = ls.settimana;
    const pillole = m.settimane.map(x => `<button type="button" data-azione="sett" data-sett="${esc(x.id)}" aria-pressed="${x.id === ui.sett}">${esc(x.id)} · ${pd(x.dal).getDate()}–${pd(x.al).getDate()} ${esc(MESI[pd(x.al).getMonth()].slice(0, 3))}</button>`).join('');
    const tutte = [...ls.gruppi.principale, ...ls.gruppi.freschi];
    const fatte = tutte.filter(v => v.preso || v.inCasa).length;
    const pct = tutte.length ? Math.round(fatte / tutte.length * 100) : 0;
    const blocco = (titolo, sottotitolo, voci, aperto = true) => {
      if (!voci.length) return '';
      let html = '';
      let rep = null;
      voci.forEach(v => {
        if (v.reparto !== rep) {
          if (rep !== null) html += '</div>';
          rep = v.reparto;
          html += `<div class="reparto"><h4>${esc(NOME_REPARTO[rep] || rep)}</h4>`;
        }
        const dett = [v.usi.join(' · '), v.note.join('; ')].filter(Boolean).join(' — ');
        html += `<label class="voce${v.preso ? ' preso' : ''}${v.inCasa ? ' casa' : ''}">
          <input type="checkbox" data-azione="preso" data-k="${esc(v.chiave)}" ${v.preso ? 'checked' : ''} aria-label="Preso: ${esc(v.nome)}">
          <span><span class="nome">${esc(v.nome)}</span>${v.inCasa ? ' <span class="chip">🏠 già in casa</span>' : ''}<span class="dett">${esc(dett)}</span></span>
          <span class="q">${esc(fmtQta(v.qta, v.unita))}</span>
          <button type="button" class="btn piccolo fantasma no-stampa" data-azione="incasa" data-k="${esc(v.chiave)}" title="${v.inCasa ? 'Rimetti in lista' : 'Ce l\'ho già in casa'}">${v.inCasa ? '↩️' : '🏠'}</button>
        </label>`;
      });
      html += '</div>';
      const corpo = `<div class="gruppo-spesa card"><h3>${esc(titolo)}</h3>${sottotitolo ? `<p class="piccolo muto" style="margin:0">${esc(sottotitolo)}</p>` : ''}${html}</div>`;
      return aperto ? corpo : `<details class="chiuso"><summary>${esc(titolo)} (${voci.length})</summary>${corpo}</details>`;
    };
    const cene = m.giorni.filter(g => g.data >= s.dal && g.data <= s.al);
    const menuSett = cene.map(g => `<li data-azione="apri-giorno" data-data="${g.data}"><span class="gg">${esc(GIORNI_BREVI[pd(g.data).getDay()])}<b>${pd(g.data).getDate()}</b></span>
      <span>${titoloGiorno(g)}${prepDel(g.data).length ? ' <span class="chip">🥣 ' + esc(prepDel(g.data)[0].titolo) + '</span>' : ''}</span>
      <span class="pallino" style="${catVar(g.tipo === 'pizza' ? 'pizza' : categoriaDi(g))}"></span></li>`).join('');
    const vuote = cene.filter(daDecidere).length;
    const daCasa = [...new Set(cene.flatMap(g => piattiDi(g).map(ric).filter(Boolean)
      .flatMap(r => (r.ingredienti || []).filter(i => i.casa).map(i => i.nome))))];
    const tg = modoServer && info && info.telegram;
    return `<div class="pillole" role="group" aria-label="Settimana">${pillole}</div>
      <div class="titolo-sezione"><div><h2>Spesa di ${esc(dataEstesa(s.giornoSpesa || s.dal))}</h2>
        <p class="muto" style="margin:4px 0 0">Per le cene da ${esc(dataEstesa(s.dal))} a ${esc(dataEstesa(s.al))}${s.nota ? ' · ' + esc(s.nota) : ''}</p></div>
        <div class="azioni">
          <button class="btn" type="button" data-azione="copia-lista">📋 Copia</button>
          <button class="btn" type="button" data-azione="stampa">🖨️ Stampa</button>
          <button class="btn" type="button" data-azione="telegram-lista" ${tg ? '' : 'disabled title="Avvia il menu con Avvia Menu.bat e configura Telegram"'}>📲 Invia su Telegram</button>
          <button class="btn fantasma" type="button" data-azione="azzera-spesa">Azzera spunte</button>
        </div></div>
      <div class="progresso" aria-hidden="true"><div style="width:${pct}%"></div></div>
      <p class="piccolo muto" style="margin:0 0 6px">${fatte} di ${tutte.length} prodotti presi o già in casa</p>
      ${vuote ? `<div class="avviso" style="margin:8px 0"><span>⚠️</span><div>${vuote === 1 ? '1 sera è' : vuote + ' sere sono'} ancora da decidere: i suoi ingredienti non sono in lista. Scegli un piatto dal calendario.</div></div>` : ''}
      ${daCasa.length ? `<div class="avviso info" style="margin:8px 0"><span>🏠</span><div>Dal tuo freezer, niente da comprare: <b>${esc(daCasa.join(', '))}</b></div></div>` : ''}
      <div class="griglia-spesa">
        <div>${blocco('Da comprare', '', ls.gruppi.principale)}
          ${blocco('Freschi da comprare a metà settimana', 'Pesce e carne per le cene di fine settimana: comprali mercoledì, oppure prendili surgelati.', ls.gruppi.freschi)}</div>
        <div>
          <section class="card gruppo-spesa no-stampa"><h3>Le cene di questa settimana</h3><ul class="lista-giorni">${menuSett}</ul></section>
          ${blocco('Controlla in dispensa', 'Olio, sale, spezie e altre basi: compra solo se mancano.', ls.gruppi.dispensa)}
        </div>
      </div>`;
  }

  // ---------- vista: Equilibrio ----------
  function semaforo(v, lo, hi) {
    if (v >= lo && v <= hi) return 'ok';
    return (v === lo - 1 || v === hi + 1) ? 'warn' : 'bad';
  }
  function vistaEquilibrio() {
    const m = menu();
    const obi = m.obiettiviSettimanali || {};
    const cene = m.giorni.filter(g => g.tipo === 'cena');
    const righe = m.settimane.map(s => {
      const cs = cene.filter(g => g.data >= s.dal && g.data <= s.al);
      const cont = {};
      cs.forEach(g => { const c = categoriaDi(g); cont[c] = (cont[c] || 0) + 1; });
      const piena = cs.length >= 6;
      const celle = ORDINE_CAT.map(c => {
        const v = cont[c] || 0;
        const r = obi[c];
        const cls = piena && r ? semaforo(v, r[0], r[1]) : 'neutro';
        return `<td><span class="val ${cls}">${v}</span></td>`;
      }).join('');
      return `<tr><td><b>${esc(s.id)}</b> <span class="muto piccolo">${pd(s.dal).getDate()}–${pd(s.al).getDate()} · ${cs.length} cene${piena ? '' : ' (parziale)'}</span></td>${celle}</tr>`;
    }).join('');
    const tot = {};
    cene.forEach(g => { const c = categoriaDi(g); tot[c] = (tot[c] || 0) + 1; });
    const rigaTot = ORDINE_CAT.map(c => {
      const r = OBIETTIVI_MESE[c];
      return `<td><span class="val ${r ? semaforo(tot[c] || 0, r[0], r[1]) : 'neutro'}">${tot[c] || 0}</span><div class="piccolo muto">${r ? (r[0] === r[1] ? r[0] : r[0] + '–' + r[1]) : ''}</div></td>`;
    }).join('');
    const rigaObi = ORDINE_CAT.map(c => `<td class="piccolo muto">${obi[c] ? obi[c][0] + '–' + obi[c][1] : '–'}</td>`).join('');

    const cereali = {};
    cene.forEach(g => {
      piattiDi(g).map(ric).filter(Boolean).forEach(r => {
        if (r.cereale && r.cereale !== 'nessuno') cereali[r.cereale] = (cereali[r.cereale] || 0) + 1;
      });
    });
    const maxC = Math.max(1, ...Object.values(cereali));
    const barreC = Object.entries(cereali).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="barra-riga"><span>${esc(k)}</span><span class="b"><div style="width:${v / maxC * 100}%;background:var(--c-legumi)"></div></span><span class="n">${v}</span></div>`).join('');

    const verdure = {};
    let totG = 0;
    cene.forEach(g => { verdureDi(g).forEach(v => { verdure[v] = (verdure[v] || 0) + 1; }); totG += grammiVerdura(g); });
    const maxV = Math.max(1, ...Object.values(verdure));
    const barreV = Object.entries(verdure).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="barra-riga"><span>${esc(k)}</span><span class="b"><div style="width:${v / maxV * 100}%"></div></span><span class="n">${v}</span></div>`).join('');
    const media = cene.length ? Math.round(totG / cene.length) : 0;
    const lattosio = cene.filter(g => piattiDi(g).map(ric).filter(Boolean).some(r => r.lattosio === 'si')).length;
    const sostituito = cene.filter(g => piattiDi(g).map(ric).filter(Boolean).some(r => r.lattosio === 'sostituito')).length;

    return `<div class="titolo-sezione"><h2>Equilibrio del mese</h2><span class="muto piccolo">Frequenze delle cene secondo le Linee guida CREA per una sana alimentazione</span></div>
      <section class="card" style="overflow-x:auto">
        <table class="tab">
          <thead><tr><th>Settimana</th>${ORDINE_CAT.map(c => `<th>${CAT[c].icona} ${esc(CAT[c].nome)}</th>`).join('')}</tr></thead>
          <tbody>${righe}
            <tr><td class="muto piccolo">Obiettivo settimana piena</td>${rigaObi}</tr>
            <tr><td><b>Totale mese</b><div class="piccolo muto">obiettivo sotto</div></td>${rigaTot}</tr></tbody>
        </table>
        <p class="piccolo muto" style="margin:10px 0 0">Verde = nell'obiettivo · giallo = scarto di 1 · rosso = da correggere. Le settimane parziali non vengono valutate. Se cambi o sposti un piatto, i conteggi si aggiornano.${cene.filter(daDecidere).length ? ` <b>${cene.filter(daDecidere).length} sere da decidere non sono conteggiate.</b>` : ''}</p>
      </section>
      <div class="griglia-2" style="margin-top:16px">
        <section class="card"><div class="etichetta">Verdura nascosta</div>
          <div class="cifra" style="margin:6px 0 2px">≈ ${media} g</div>
          <p class="piccolo muto" style="margin:0 0 14px">in media a cena per tutta la famiglia (obiettivo almeno 400 g)</p>
          <div class="barre">${barreV}</div></section>
        <section class="card"><div class="etichetta">Cereali e amidi</div>
          <p class="piccolo muto" style="margin:6px 0 14px">Quante volte compaiono nel mese: meglio variare.</p>
          <div class="barre">${barreC}</div>
          <div class="etichetta" style="margin-top:18px">Lattosio</div>
          <p class="piccolo" style="margin:6px 0 0">${sostituito} cene usano prodotti senza lattosio già in lista; ${lattosio} cene contengono lattosio (pastiglia).</p></section>
      </div>`;
  }

  // ---------- vista: Ricette ----------
  function vistaRicette() {
    const m = menu();
    const usi = {};
    m.giorni.forEach(g => piattiDi(g).forEach(id => { (usi[id] = usi[id] || []).push(g.data); }));
    (m.prep || []).forEach(p => { (usi[p.ricetta] = usi[p.ricetta] || []).push(p.data); });
    const tutte = Object.values(m.ricette || {});
    const lista = tutte.filter(r => (ui.mostraAlt || usi[r.id]) &&
      (ui.filtroCat === 'tutte' || r.categoria === ui.filtroCat) &&
      (!ui.cerca || (r.titolo + ' ' + ((r.verduraNascosta || {}).verdure || []).join(' ')).toLowerCase().includes(ui.cerca.toLowerCase())))
      .sort((a, b) => (usi[a.id] ? 0 : 1) - (usi[b.id] ? 0 : 1) || voto(b.id) - voto(a.id) || a.titolo.localeCompare(b.titolo, 'it'));
    const filtri = ['tutte', ...ORDINE_CAT, 'vegetale'].map(c => `<button type="button" class="btn piccolo${ui.filtroCat === c ? ' primario' : ''}" data-azione="filtro" data-cat="${c}">${c === 'tutte' ? 'Tutte' : CAT[c].icona + ' ' + CAT[c].nome}</button>`).join('');
    const carte = lista.map(r => `<article class="card ric-card" data-azione="apri-ricetta" data-id="${esc(r.id)}" tabindex="0" role="button">
        ${chipCat(r.categoria)}
        <h3>${esc(r.titolo)}</h3>
        <div class="piccolo muto">🥕 ${esc(((r.verduraNascosta || {}).verdure || []).join(', ') || '—')}${r.tempoMin ? ' · ⏱️ ' + esc(r.tempoMin) + ' min' : ''}</div>
        <div class="piede"><span>${usi[r.id] ? '📅 ' + usi[r.id].map(dataBreve).join(', ') : 'Alternativa'}</span>${bottoniVoto(r.id)}</div>
      </article>`).join('');
    return `<div class="titolo-sezione"><h2>Ricette</h2><span class="muto piccolo">Vota i piatti: quelli con 👍 verranno proposti più spesso nei prossimi mesi.</span></div>
      <div class="filtri">${filtri}
        <label class="btn piccolo fantasma"><input type="checkbox" data-azione="mostra-alt" ${ui.mostraAlt ? 'checked' : ''}> mostra anche le alternative</label>
        <input type="search" placeholder="Cerca per nome o verdura…" value="${esc(ui.cerca)}" data-azione="cerca" aria-label="Cerca ricette">
      </div>
      <div class="griglia-ricette">${carte || '<p class="muto">Nessuna ricetta trovata.</p>'}</div>`;
  }

  // ---------- versione per iPhone: sincronizzazione, calendario, installazione ----------
  function sezioneFamiglia() {
    const codice = codiceFamiglia();
    const cal = location.protocol === 'https:' ? `webcal://${location.host}${location.pathname.replace(/[^/]*$/, '')}cene.ics` : '';
    let sync;
    if (!window.CDF_FIREBASE) {
      sync = `<p>Per sincronizzare i due iPhone incolla qui sotto, <b>su un solo telefono</b>, il blocco di configurazione copiato da Firebase
          (Impostazioni progetto › Le tue app › tasto copia). <b>Sull'altro telefono</b> incolla invece il codice che ti manda il primo.</p>
        <textarea id="codice-famiglia" rows="5" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="incolla qui"
          style="width:100%;font:13px/1.4 ui-monospace,monospace;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink)"></textarea>
        <div class="azioni" style="margin-top:8px"><button class="btn primario" type="button" data-azione="famiglia-collega">Collega</button></div>`;
    } else if (!codice) {
      sync = `<p>Per vedere le stesse spunte e gli stessi spostamenti su tutti e due gli iPhone serve un <b>codice famiglia</b>.</p>
        <p class="piccolo muto">Sul primo telefono tocca "Crea codice", poi mandalo all'altro telefono (es. WhatsApp) e incollalo qui.</p>
        <div class="azioni"><input id="codice-famiglia" type="text" autocomplete="off" autocapitalize="none" placeholder="incolla il codice famiglia" style="font:inherit;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);flex:1 1 220px">
          <button class="btn primario" type="button" data-azione="famiglia-collega">Collega</button>
          <button class="btn" type="button" data-azione="famiglia-crea">Crea codice (primo telefono)</button></div>`;
    } else {
      const st = statoFamiglia === 'ok' ? '✅ Sincronizzato con gli altri telefoni di famiglia.'
        : statoFamiglia === 'collegamento' ? '⏳ Collegamento in corso…'
        : `⚠️ Non collegato (${esc(statoFamiglia.replace(/^errore: /, ''))}): le modifiche si sincronizzano appena torna la rete.`;
      sync = `<p>${st}</p>
        <p class="piccolo muto">Codice famiglia: <code>${esc(codice)}</code></p>
        <textarea readonly rows="3" style="width:100%;font:12px/1.4 ui-monospace,monospace;padding:6px 8px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2)" aria-label="Codice per l'altro telefono">${esc(codiceDaCondividere())}</textarea>
        <div class="azioni"><button class="btn" type="button" data-azione="famiglia-copia">📋 Copia codice per l'altro telefono</button>
          <button class="btn fantasma" type="button" data-azione="famiglia-scollega">Scollega questo telefono</button></div>`;
    }
    return `<section class="card"><div class="etichetta">Sincronizzazione di famiglia</div>${sync}
      <div class="etichetta" style="margin-top:18px">Notifiche</div>
      <p>Abbonati al calendario "Cene di famiglia": ogni giorno alle 10 "Stasera: …", la sera prima "Scongela …", il sabato la lista della spesa.</p>
      ${cal ? `<div class="azioni"><a class="btn primario" href="${esc(cal)}">📅 Abbonati al calendario</a></div>
        <p class="piccolo muto">Su iPhone tocca "Iscriviti"; poi in Impostazioni › Calendario › Account controlla che "Rimuovi avvisi" sia spento. Il calendario segue il menu previsto: se cambi un piatto qui, la notifica non lo sa.</p>` : '<p class="piccolo muto">Disponibile quando l\'app è pubblicata online.</p>'}
      <div class="etichetta" style="margin-top:18px">Installa sull'iPhone</div>
      <p class="piccolo">In Safari tocca <b>Condividi</b> › <b>Aggiungi alla schermata Home</b>: l'app si apre a tutto schermo e funziona anche senza rete. Il codice famiglia va inserito nell'app installata.</p>
    </section>`;
  }

  // ---------- vista: Info ----------
  function vistaInfo() {
    const m = menu();
    const tg = info && info.telegram;
    const note = (m.noteMese || []).map(n => `<li>${esc(n)}</li>`).join('');
    return `<div class="titolo-sezione"><h2>Info e impostazioni</h2></div>
      <div class="griglia-2">
        ${window.CDF_WEB ? sezioneFamiglia() : `<section class="card"><div class="etichetta">Dove sono salvati i dati</div>
          ${modoServer
            ? `<p>✅ Server locale attivo: scambi, voti e spunte vengono salvati in <code>stato.json</code> sul PC, e la notifica Telegram usa il menu aggiornato.</p>
               <div class="azioni"><button class="btn" type="button" data-azione="spegni">⏻ Spegni il server</button></div>`
            : `<p>⚠️ Stai usando la pagina direttamente dal file: le modifiche restano solo in questo browser e <b>Telegram non le vede</b>.
               Per salvarle sul PC chiudi questa pagina e apri <b>Avvia Menu.bat</b>.</p>`}
          <div class="etichetta" style="margin-top:18px">Telegram</div>
          ${modoServer
            ? (tg ? `<p>✅ Collegato. Notifica ogni giorno alle <b>${esc(info.orarioNotifica)}</b>${info.inviaListaGiornoSpesa ? ', con la lista della spesa nel giorno della spesa' : ''}.</p>
                     <div class="azioni"><button class="btn" type="button" data-azione="telegram-prova">📲 Manda la notifica di oggi</button></div>`
                  : '<p>Non ancora collegato: esegui <b>Configura Telegram.bat</b> nella cartella del menu (serve il token del tuo bot, lo spiega il file LEGGIMI).</p>')
            : '<p class="muto">Stato visibile solo con il server locale acceso.</p>'}
        </section>`}
        <section class="card"><div class="etichetta">Famiglia</div>
          <p style="margin-top:6px">${esc((m.famiglia || {}).descrizione || '')}.<br><span class="muto piccolo">Circa ${esc(String((m.famiglia || {}).porzioniAdultoEquivalenti || '').replace('.', ','))} porzioni adulto a cena.</span></p>
          <div class="etichetta">Esclusi</div><p style="margin-top:6px">${esc((m.esclusi || []).join(', '))}</p>
          <div class="etichetta">Intolleranze</div><p style="margin-top:6px">${esc((m.intolleranze || []).join('; '))}</p>
          ${note ? `<div class="etichetta">Note del mese</div><ul class="mods" style="margin-top:6px">${note}</ul>` : ''}
        </section>
        <section class="card"><div class="etichetta">Backup</div>
          <p class="piccolo muto">Salva o ripristina scambi, voti e spunte.</p>
          <div class="azioni"><button class="btn" type="button" data-azione="esporta">⬇️ Esporta backup</button>
            <label class="btn">⬆️ Importa backup<input type="file" accept="application/json" data-azione="importa" hidden></label>
            <button class="btn fantasma" type="button" data-azione="annulla-scambi">Annulla tutti i cambi di piatto</button></div>
        </section>
        <section class="card"><div class="etichetta">Nota</div>
          <p class="piccolo muto">Porzioni e frequenze sono indicative (linee guida CREA e LARN per l'età). Per allergie, crescita o dubbi sull'alimentazione dei bimbi fa fede il pediatra.</p>
        </section>
      </div>`;
  }

  // ---------- modale: giorno / ricetta / cambio ----------
  function sezioneRicetta(r, livello) {
    const vn = r.verduraNascosta || {};
    const ingr = (r.ingredienti || []).map(i => `<li><span>${esc(i.nome)}${i.casa ? ' <span class="chip">🏠 dal tuo freezer</span>' : ''}${i.nota ? ` <span class="muto piccolo">(${esc(i.nota)})</span>` : ''}</span><span>${esc(fmtQta(i.qta, i.unita))}</span></li>`).join('');
    const passi = (r.passi || []).map(p => `<li>${esc(p)}</li>`).join('');
    const mods = (r.modifiche || []).map(p => `<li>${esc(p)}</li>`).join('');
    const H = livello === 2 ? 'h2' : 'h3';
    return `<div class="sezione-piatto">
      <${H} ${livello === 2 ? 'id="modale-titolo"' : ''}>${esc(r.titolo)}</${H}>
      ${chipsRicetta(r)}
      <div class="azioni" style="margin-top:12px">
        <button class="btn primario" type="button" data-azione="cucina" data-id="${esc(r.id)}">👩‍🍳 Cucina passo passo</button>
        ${safeUrl(r.url) ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">Originale su Cookidoo ↗</a>` : ''}
        ${bottoniVoto(r.id)}
      </div>
      ${(vn.verdure || []).length ? `<div class="nascosta" style="margin-top:14px"><span class="ico" aria-hidden="true">🥕</span>
        <div><b>Verdura nascosta:</b> ${esc(vn.verdure.join(', '))}${vn.grammiFamiglia ? ` <span class="muto piccolo">(≈ ${esc(vn.grammiFamiglia)} g)</span>` : ''}</div>
        <div class="piccolo">${esc(vn.come || '')}${vn.trucco ? ' <b>Trucco:</b> ' + esc(vn.trucco) : ''}</div></div>` : ''}
      ${mods ? `<div class="blocco"><h4>${r.fonte === 'cookidoo' ? 'Cosa cambia rispetto a Cookidoo' : 'Note'}</h4><ul class="mods">${mods}</ul></div>` : ''}
      ${r.scongelare ? `<div class="avviso" style="margin-top:12px"><span>🧊</span><div>La sera prima tira fuori dal freezer: <b>${esc(r.scongelare)}</b></div></div>` : ''}
      ${r.notaBimbi ? `<div class="blocco"><h4>Per i bimbi</h4><p style="margin:0">${esc(r.notaBimbi)}</p></div>` : ''}
      ${r.notaLattosio && r.lattosio !== 'no' ? `<div class="blocco"><h4>Lattosio</h4><p style="margin:0">${esc(r.notaLattosio)}</p></div>` : ''}
      ${ingr ? `<div class="blocco"><h4>Ingredienti per la famiglia${r.moltiplicatore && r.moltiplicatore !== 1 ? ` (ricetta ×${esc(String(r.moltiplicatore).replace('.', ','))})` : ''}</h4><ul class="ingr">${ingr}</ul></div>` : ''}
      ${passi ? `<div class="blocco"><h4>${r.passiCompleti || r.fonte !== 'cookidoo' ? 'Procedimento Bimby TM6 (modifiche già incluse)' : 'In breve (la ricetta completa è su Cookidoo)'}</h4><ol class="passi">${passi}</ol></div>` : ''}
      ${r.perche ? `<p class="piccolo muto" style="margin-top:14px">💬 ${esc(r.perche)}</p>` : ''}
    </div>`;
  }

  function apriModale(html) {
    $('#modale-corpo').innerHTML = html;
    const mod = $('#modale');
    mod.hidden = false;
    document.body.style.overflow = 'hidden';
    const box = mod.querySelector('.modale-box');
    box.scrollTop = 0;
    mod.querySelector('.modale-chiudi').focus();
  }
  function chiudiModale() {
    $('#modale').hidden = true;
    document.body.style.overflow = '';
  }

  function apriGiorno(data) {
    const g = giornoDi(data);
    if (!g) return;
    if (g.tipo === 'pizza') {
      apriModale(`<div class="etichetta">${esc(dataEstesa(data))}</div><h2 id="modale-titolo">🍕 Sabato sera: pizza</h2><p class="muto">Nessuna ricetta: ci pensate voi.</p>`);
      return;
    }
    const piatti = piattiDi(g).map(ric).filter(Boolean);
    const prepOggi = prepDel(data).map(p => {
      const r = ric(p.ricetta);
      return `<div class="avviso info" style="margin-top:12px"><span>🥣</span><div><b>Oggi prepara anche: ${esc(p.titolo)}</b>. ${esc(p.descrizione || '')}
        ${r ? `<button type="button" class="btn piccolo" style="margin-top:6px" data-azione="apri-ricetta" data-id="${esc(r.id)}">Vedi la ricetta</button>` : ''}</div></div>`;
    }).join('');
    const ripristina = haScambio(data) ? `<button class="btn fantasma" type="button" data-azione="ripristina" data-data="${data}">↩️ Ripristina il piatto originale</button>` : '';
    if (!piatti.length) {
      const attesa = stato.attesa.map((v, i) => `<div class="opzione"><div><div class="t">${esc(titoliDi(v.piatti))}</div>
          <div class="chips" style="margin-top:4px">${chipCat((ric(v.piatti[0]) || {}).categoria)}${v.da ? `<span class="chip">tolto da ${esc(dataBreve(v.da))}</span>` : ''}</div></div>
          <button type="button" class="btn piccolo primario" data-azione="piazza-qui" data-idx="${i}" data-data="${data}">Metti qui</button></div>`).join('');
      apriModale(`<div class="etichetta">Cena di ${esc(dataEstesa(data))}</div>
        <h2 id="modale-titolo">Sera da decidere</h2>
        <div class="azioni"><button class="btn" type="button" data-azione="cambia" data-data="${data}">🔄 Scegli un'alternativa</button>${ripristina}</div>
        ${prepOggi}
        ${attesa ? `<div class="blocco"><h4>Dalla lista d'attesa</h4>${attesa}</div>` : '<p class="muto" style="margin-top:14px">La lista d\'attesa è vuota.</p>'}`);
      return;
    }
    const prep = prepPer(g).map(p => `<div class="avviso info" style="margin-top:12px"><span>🥣</span><div>Questa cena usa la base preparata ${esc(dataEstesa(p.data))}: <b>${esc(p.titolo)}</b>. ${esc(p.descrizione || '')}</div></div>`).join('');
    apriModale(`<div class="etichetta">Cena di ${esc(dataEstesa(data))}${haScambio(data) ? ' · piatto cambiato o spostato' : ''}</div>
      <h2 id="modale-titolo">${esc(piatti.map(r => r.titolo).join(' + '))}</h2>
      <div class="azioni">
        <button class="btn primario" type="button" data-azione="cucina" data-data="${data}">👩‍🍳 Cucina passo passo</button>
        <button class="btn" type="button" data-azione="cambia" data-data="${data}">🔄 Cambia piatto</button>
        <button class="btn" type="button" data-azione="sposta" data-data="${data}">🔀 Sposta in un altro giorno</button>
        <button class="btn" type="button" data-azione="attesa" data-data="${data}">⏸️ Metti in lista d'attesa</button>
        ${ripristina}</div>
      ${g.nota && !haScambio(data) ? `<p class="muto" style="margin:12px 0 0">📝 ${esc(g.nota)}</p>` : ''}
      ${prep}${prepOggi}
      <p class="piccolo muto" style="margin:12px 0 0">🥡 Le quantità comprendono la porzione in più per il pranzo di domani.</p>
      ${piatti.map(r => sezioneRicetta(r, 3)).join('')}`);
  }

  // elenco dei giorni del mese dove spostare un piatto (da un giorno o dalla lista d'attesa)
  function elencoGiorni(azione, attributi, esclusa) {
    const m = menu();
    return m.settimane.map(s => {
      const righe = m.giorni.filter(g => g.data >= s.dal && g.data <= s.al && g.tipo === 'cena' && g.data !== esclusa).map(g =>
        `<div class="opzione"><div><div class="t">${esc(dataEstesa(g.data))}</div>
          <div class="piccolo muto">${titoloGiorno(g)}</div></div>
          <button type="button" class="btn piccolo${daDecidere(g) ? ' primario' : ''}" data-azione="${azione}" data-data="${g.data}" ${attributi}>${daDecidere(g) ? 'Metti qui' : 'Scambia'}</button></div>`).join('');
      return righe ? `<div class="blocco"><h4>${esc(s.id)} · ${pd(s.dal).getDate()}–${pd(s.al).getDate()} ${esc(MESI[pd(s.al).getMonth()])}</h4>${righe}</div>` : '';
    }).join('');
  }
  function apriSposta(data) {
    const g = giornoDi(data);
    if (!g || daDecidere(g)) return;
    apriModale(`<div class="etichetta">Sposta la cena di ${esc(dataEstesa(data))}</div>
      <h2 id="modale-titolo">${esc(titoliDi(piattiDi(g)))}</h2>
      <p class="muto" style="margin:0">Scegli il giorno: le due cene si scambiano di posto. La lista della spesa segue i piatti.</p>
      ${elencoGiorni('scambia-con', `data-da="${data}"`, data)}`);
  }
  function apriPiazza(idx) {
    const v = stato.attesa[idx];
    if (!v) return;
    apriModale(`<div class="etichetta">Dalla lista d'attesa</div>
      <h2 id="modale-titolo">${esc(titoliDi(v.piatti))}</h2>
      <p class="muto" style="margin:0">Scegli il giorno. Se quel giorno ha già un piatto, finisce in lista d'attesa al suo posto.</p>
      ${elencoGiorni('piazza-qui', `data-idx="${idx}"`, null)}`);
  }

  function apriRicetta(id) {
    const r = ric(id);
    if (!r) return;
    apriModale(sezioneRicetta(r, 2));
  }

  function opzioniCambio(g) {
    const m = menu();
    const cat = categoriaDi(g) || g.categoria;
    const usati = new Set([...m.giorni.flatMap(x => piattiDi(x)), ...stato.attesa.flatMap(v => v.piatti)]);
    const attuale = piattiDi(g).join('+');
    const visti = new Set([attuale]);
    const out = { stessa: [], pool: [], altre: [] };
    const aggiungi = (arr, a, c) => {
      const k = a.join('+');
      if (visti.has(k) || !a.length || !a.every(ric)) return;
      visti.add(k);
      arr.push({ piatti: a, cat: c });
    };
    ((m.alternative || {})[cat] || []).forEach(a => aggiungi(out.stessa, a, cat));
    Object.values(m.ricette || {}).filter(r => r.categoria === cat && !usati.has(r.id) && (r.ruolo === 'completo' || (r.ruolo === 'principale' && ric(r.accompagnamentoConsigliato))))
      .forEach(r => aggiungi(out.pool, r.ruolo === 'principale' ? [r.id, r.accompagnamentoConsigliato] : [r.id], cat));
    Object.entries(m.alternative || {}).filter(([c]) => c !== cat).forEach(([c, lista]) => lista.forEach(a => aggiungi(out.altre, a, c)));
    const punteggio = o => { const r = ric(o.piatti[0]); return voto(r.id) * 10 + (r.gradimentoBimbiStimato || 0); };
    Object.values(out).forEach(arr => arr.sort((a, b) => punteggio(b) - punteggio(a)));
    return out;
  }

  function apriCambio(data) {
    const g = giornoDi(data);
    if (!g || g.tipo !== 'cena') return;
    const opz = opzioniCambio(g);
    const riga = o => {
      const rr = o.piatti.map(ric);
      const tempo = rr.reduce((s, r) => s + (Number(r.tempoMin) || 0), 0);
      const verd = [...new Set(rr.flatMap(r => (r.verduraNascosta || {}).verdure || []))];
      return `<div class="opzione"><div><div class="t">${esc(rr.map(r => r.titolo).join(' + '))}</div>
        <div class="chips" style="margin-top:4px">${chipCat(rr[0].categoria || o.cat)}${tempo ? `<span class="chip">⏱️ ${tempo} min</span>` : ''}${verd.length ? `<span class="chip">🥕 ${esc(verd.join(', '))}</span>` : ''}${voto(rr[0].id) === 1 ? '<span class="chip">👍</span>' : ''}</div></div>
        <button type="button" class="btn piccolo primario" data-azione="scegli" data-data="${data}" data-piatti="${esc(o.piatti.join('+'))}">Scegli</button></div>`;
    };
    const sez = (titolo, arr, nota) => arr.length ? `<div class="blocco"><h4>${esc(titolo)}</h4>${nota ? `<p class="piccolo muto" style="margin:0 0 8px">${esc(nota)}</p>` : ''}${arr.map(riga).join('')}</div>` : '';
    const attesa = stato.attesa.map((v, i) => `<div class="opzione"><div><div class="t">${esc(titoliDi(v.piatti))}</div>
        <div class="chips" style="margin-top:4px">${chipCat((ric(v.piatti[0]) || {}).categoria)}${v.da ? `<span class="chip">tolto da ${esc(dataBreve(v.da))}</span>` : ''}</div></div>
        <button type="button" class="btn piccolo primario" data-azione="piazza-qui" data-idx="${i}" data-data="${data}">Metti qui</button></div>`).join('');
    const cat = categoriaDi(g) || g.categoria;
    apriModale(`<div class="etichetta">Cambia la cena di ${esc(dataEstesa(data))}</div>
      <h2 id="modale-titolo">Scegli un'alternativa</h2>
      <p class="muto" style="margin:0">${daDecidere(g) ? 'Sera da decidere.' : 'Adesso: ' + esc(titoliDi(piattiDi(g))) + '.'} Lista della spesa, equilibrio e notifica Telegram si aggiornano da soli.</p>
      ${haScambio(data) ? `<div class="azioni" style="margin-top:10px"><button class="btn" type="button" data-azione="ripristina" data-data="${data}">↩️ Ripristina il piatto originale</button></div>` : ''}
      ${attesa ? `<div class="blocco"><h4>Dalla lista d'attesa</h4>${attesa}</div>` : ''}
      ${sez('Alternative consigliate · ' + (CAT[cat] || {}).nome, opz.stessa)}
      ${sez('Altre ricette della stessa categoria', opz.pool)}
      ${sez('Cambia categoria', opz.altre, 'Attenzione: cambia l\'equilibrio della settimana (controlla la scheda Equilibrio).')}`);
  }

  // ---------- cucina passo passo (pannello laterale, una pagina per passaggio) ----------
  const RX_BIMBY = /(\d+(?:[,.]\d+)?\s*(?:sec|min)\.?(?:\s*\/\s*(?:\d+\s*°C|Varoma))?(?:\s*\/\s*(?:antiorario|↺))?\s*\/\s*vel\.?\s*(?:soft|cucchiaio|\d+(?:[,.]\d+)?(?:\s*-\s*\d+(?:[,.]\d+)?)?)|Alta temperatura|Modalità [A-Z][a-zà]+)/g;
  const LS_CUCINA = 'cdf-cucina-v1';
  let cucina = null; // { chiave, piatti: [id], idx, passo }  passo 0 = ingredienti, n+1 = fine
  let wakeLock = null;
  let timer = null; // { fine, intervallo }

  const pagineDi = r => (r.passi || []).length + 2;
  function salvaCucina() {
    try {
      const tutti = JSON.parse(localStorage.getItem(LS_CUCINA) || '{}');
      tutti[cucina.chiave] = { idx: cucina.idx, passi: cucina.passi };
      localStorage.setItem(LS_CUCINA, JSON.stringify(tutti));
    } catch (e) { /* niente */ }
  }
  async function tieniAcceso() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { /* non supportato */ }
  }
  function apriCucina(piatti, chiave) {
    piatti = piatti.filter(ric);
    if (!piatti.length) return;
    chiudiModale();
    let salvato = {};
    try { salvato = JSON.parse(localStorage.getItem(LS_CUCINA) || '{}')[chiave] || {}; } catch (e) { /* niente */ }
    cucina = { chiave, piatti, idx: Math.min(salvato.idx || 0, piatti.length - 1), passi: salvato.passi || {} };
    $('#cucina').hidden = false;
    document.body.classList.add('cucina-aperta');
    tieniAcceso();
    renderCucina();
  }
  function chiudiCucina() {
    $('#cucina').hidden = true;
    document.body.classList.remove('cucina-aperta');
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    cucina = null;
  }
  function vaiPasso(delta) {
    const r = ric(cucina.piatti[cucina.idx]);
    const attuale = cucina.passi[r.id] || 0;
    const nuovo = attuale + delta;
    if (nuovo >= pagineDi(r) && cucina.idx < cucina.piatti.length - 1) { cucina.idx++; }
    else if (nuovo < 0 && cucina.idx > 0) { cucina.idx--; }
    else { cucina.passi[r.id] = Math.max(0, Math.min(pagineDi(r) - 1, nuovo)); }
    salvaCucina();
    renderCucina();
    $('#cucina-pagina').scrollTop = 0;
  }
  function evidenziaBimby(testo) {
    return esc(testo).replace(RX_BIMBY, m => `<span class="bimby">${m}</span>`);
  }
  function renderCucina() {
    if (!cucina) return;
    const r = ric(cucina.piatti[cucina.idx]);
    const n = (r.passi || []).length;
    const p = cucina.passi[r.id] || 0;
    $('#cucina-schede').innerHTML = cucina.piatti.length > 1
      ? cucina.piatti.map((id, i) => `<button type="button" data-azione="cucina-scheda" data-i="${i}" aria-pressed="${i === cucina.idx}">${esc(ric(id).titolo)}</button>`).join('')
      : '';
    $('#cucina-barra').style.width = `${Math.round(p / (pagineDi(r) - 1) * 100)}%`;
    let html;
    if (p === 0) {
      const vn = r.verduraNascosta || {};
      const prep = (menu().prep || []).filter(x => x.ricetta === r.id);
      html = `<div class="etichetta">Prima di iniziare</div><h2>${esc(r.titolo)}</h2>
        ${chipsRicetta(r)}
        ${r.passiCompleti ? '' : `<div class="avviso" style="margin-top:12px"><span>ℹ️</span><div>Procedimento riassunto: la ricetta completa è su Cookidoo.${safeUrl(r.url) ? ` <a href="${esc(r.url)}" target="_blank" rel="noopener">Apri</a>` : ''}</div></div>`}
        ${r.scongelare ? `<div class="avviso" style="margin-top:12px"><span>🧊</span><div>Serve già scongelato: <b>${esc(r.scongelare)}</b></div></div>` : ''}
        ${prep.length ? `<div class="avviso info" style="margin-top:12px"><span>🥣</span><div>Base della domenica: ${esc(prep[0].descrizione || '')}</div></div>` : ''}
        <div class="blocco"><h4>Ingredienti (spunta mentre li prepari)</h4><ul class="ingr-check">${(r.ingredienti || []).map(i => `<li><label><input type="checkbox"><span>${esc(i.nome)}${i.casa ? ' 🏠' : ''}${i.nota ? ` <span class="muto piccolo">(${esc(i.nota)})</span>` : ''}</span><b>${esc(fmtQta(i.qta, i.unita))}</b></label></li>`).join('')}</ul></div>
        ${vn.trucco ? `<div class="nascosta" style="margin-top:14px"><span class="ico">🥕</span><div><b>Trucco:</b> ${esc(vn.trucco)}</div></div>` : ''}
        ${r.notaBimbi ? `<div class="blocco"><h4>Per i bimbi</h4><p style="margin:0">${esc(r.notaBimbi)}</p></div>` : ''}`;
    } else if (p <= n) {
      const testo = r.passi[p - 1];
      const min = (testo.match(/(\d+)\s*min/) || [])[1];
      html = `<div class="etichetta">${esc(r.titolo)}</div>
        <div class="passo-num">${p}<span class="piccolo muto" style="font-size:16px"> / ${n}</span></div>
        <div class="passo-testo">${evidenziaBimby(testo)}</div>
        ${min ? `<div class="azioni" style="margin-top:18px"><button type="button" class="btn" data-azione="cucina-timer" data-min="${min}">⏱️ Timer ${min} min</button></div>` : ''}`;
    } else {
      html = r.ruolo === 'base'
        ? `<div style="text-align:center;padding-top:30px"><div style="font-size:60px">🥣</div><h2>Base pronta!</h2>
        <p class="muto">Dividila nelle vaschette, scrivi etichetta e data e mettile in frigo o in congelatore come indicato.</p>`
        : `<div style="text-align:center;padding-top:30px"><div style="font-size:60px">🍽️</div><h2>Fatto: buon appetito!</h2>
        <p class="muto">🥡 Metti da parte la porzione per il pranzo di domani.</p>
        <p>Ai bimbi è piaciuto?</p>${bottoniVoto(r.id)}`;
      html += `
        ${cucina.idx < cucina.piatti.length - 1 ? `<div class="azioni" style="justify-content:center;margin-top:18px"><button type="button" class="btn primario" data-azione="cucina-avanti">Ora: ${esc(ric(cucina.piatti[cucina.idx + 1]).titolo)} ▶</button></div>` : ''}</div>`;
    }
    $('#cucina-pagina').innerHTML = html;
    $('#cucina-conta').textContent = p === 0 ? 'Ingredienti' : (p <= n ? `Passo ${p} di ${n}` : 'Fine');
    const ultimo = p === pagineDi(r) - 1 && cucina.idx === cucina.piatti.length - 1;
    $('#cucina-avanti').textContent = p === 0 ? 'Inizia ▶' : (ultimo ? 'Chiudi' : 'Avanti ▶');
    $('#cucina-avanti').dataset.azione = ultimo ? 'cucina-chiudi' : 'cucina-avanti';
  }
  function avviaTimer(minuti) {
    fermaTimer();
    const el = $('#cucina-timer');
    const fine = Date.now() + minuti * 60000;
    const tick = () => {
      const s = Math.max(0, Math.round((fine - Date.now()) / 1000));
      el.textContent = `⏱️ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (s === 0) {
        el.classList.add('scaduto');
        clearInterval(timer.intervallo);
        suona();
        toast(`Timer di ${minuti} minuti finito`);
      }
    };
    el.hidden = false;
    el.classList.remove('scaduto');
    el.title = 'Tocca per fermare il timer';
    timer = { fine, intervallo: setInterval(tick, 1000) };
    tick();
  }
  function fermaTimer() {
    if (timer) clearInterval(timer.intervallo);
    timer = null;
    const el = $('#cucina-timer');
    el.hidden = true;
    el.classList.remove('scaduto');
  }
  function suona() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach(t => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.25, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.3);
      });
      if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    } catch (e) { /* niente audio */ }
  }
  document.addEventListener('visibilitychange', () => { if (cucina && document.visibilityState === 'visible') tieniAcceso(); });
  let tocco = null;
  document.addEventListener('touchstart', e => { if (cucina && e.target.closest('#cucina-pagina')) tocco = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!cucina || tocco == null) return;
    const dx = e.changedTouches[0].clientX - tocco;
    tocco = null;
    if (Math.abs(dx) > 60) vaiPasso(dx < 0 ? 1 : -1);
  }, { passive: true });

  // ---------- render principale ----------
  function render() {
    if (!MESI_DISPONIBILI.length) {
      $('#vista').innerHTML = `<div class="vuoto"><div class="grande">🍳</div><h2>Il menu non è ancora pronto</h2><p class="muto">Manca il file dei dati (app/data/menus.js).</p></div>`;
      return;
    }
    if (!ui.mese || !DATA[ui.mese]) {
      const corr = oggiISO().slice(0, 7);
      ui.mese = DATA[corr] ? corr : (MESI_DISPONIBILI.find(m => m >= corr) || MESI_DISPONIBILI[MESI_DISPONIBILI.length - 1]);
    }
    const m = menu();
    $('#sottotitolo').textContent = `${m.titolo || ui.mese} · solo cene · verdure di stagione nascoste`;
    const sel = $('#mese-sel');
    if (MESI_DISPONIBILI.length > 1) {
      $('#mese-sel-wrap').hidden = false;
      sel.innerHTML = MESI_DISPONIBILI.map(k => `<option value="${k}" ${k === ui.mese ? 'selected' : ''}>${esc(DATA[k].titolo || k)}</option>`).join('');
    }
    const modo = $('#modo');
    const famigliaOk = fb && statoFamiglia === 'ok';
    modo.textContent = modoServer ? '● Salvato sul PC' : famigliaOk ? '● Sincronizzato'
      : statoFamiglia === 'collegamento' ? '… Collegamento' : '○ Solo su questo dispositivo';
    modo.className = 'modo' + (modoServer || famigliaOk ? ' server' : '');
    modo.title = modoServer ? 'Server locale attivo' : famigliaOk ? 'Sincronizzato con gli altri telefoni di famiglia'
      : window.CDF_FIREBASE ? 'Collega il codice famiglia nella scheda Info' : 'Apri con Avvia Menu.bat per salvare sul PC';
    document.querySelectorAll('#schede button').forEach(b => b.setAttribute('aria-current', b.dataset.vista === ui.vista ? 'page' : 'false'));
    const viste = { oggi: vistaOggi, calendario: vistaCalendario, spesa: vistaSpesa, equilibrio: vistaEquilibrio, ricette: vistaRicette, info: vistaInfo };
    $('#vista').innerHTML = (viste[ui.vista] || vistaOggi)();
  }

  function aggiornaModaleAperta() {
    // dopo un voto, ridisegna i bottoni nella modale senza chiuderla
    document.querySelectorAll('#modale .voto').forEach(el => {
      const id = el.querySelector('button').dataset.id;
      el.outerHTML = bottoniVoto(id);
    });
  }

  // ---------- eventi ----------
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-azione], [data-vista]');
    if (!el) return;
    if (el.dataset.vista) {
      ui.vista = el.dataset.vista; salvaUI(); render(); $('#vista').focus({ preventScroll: true }); window.scrollTo({ top: 0 });
      return;
    }
    const a = el.dataset.azione;
    if (el.tagName === 'INPUT' && (a === 'preso' || a === 'mostra-alt')) return; // gestiti da 'change'
    switch (a) {
      case 'chiudi-modale': chiudiModale(); break;
      case 'apri-giorno': apriGiorno(el.dataset.data); break;
      case 'apri-ricetta': apriRicetta(el.dataset.id); break;
      case 'cambia': apriCambio(el.dataset.data); break;
      case 'scegli':
        setPiatti(el.dataset.data, el.dataset.piatti.split('+'));
        salva(); chiudiModale(); render(); toast('Piatto cambiato: lista della spesa aggiornata');
        break;
      case 'ripristina':
        ripristina(el.dataset.data); salva(); chiudiModale(); render(); toast('Ripristinato il piatto originale');
        break;
      case 'cucina': {
        const g = el.dataset.data ? giornoDi(el.dataset.data) : null;
        const piatti = el.dataset.id ? [el.dataset.id] : piattiDi(g);
        apriCucina(piatti, el.dataset.data || el.dataset.id);
        break;
      }
      case 'famiglia-crea': {
        const c = nuovoCodice();
        try { localStorage.setItem(LS_FAMIGLIA, c); } catch (err) { /* niente */ }
        collegaFamiglia(c);
        try { await navigator.clipboard.writeText(c); toast('Codice creato e copiato: mandalo all\'altro telefono'); } catch (err) { toast('Codice creato: copialo dalla scheda Info'); }
        break;
      }
      case 'famiglia-collega': {
        const testo = ($('#codice-famiglia').value || '').trim();
        let c = testo.toLowerCase().replace(/\s+/g, '');
        const cfg = leggiConfig(testo);
        try {
          if (cfg) { // primo telefono: configurazione Firebase + nuovo codice famiglia
            localStorage.setItem(LS_FIREBASE, JSON.stringify(cfg));
            window.CDF_FIREBASE = cfg;
            c = nuovoCodice();
          } else if (testo.replace(/\s+/g, '').startsWith('CENE1.')) { // secondo telefono: codice completo
            const o = JSON.parse(atob(testo.replace(/\s+/g, '').slice(6)));
            localStorage.setItem(LS_FIREBASE, JSON.stringify(o.c));
            window.CDF_FIREBASE = o.c;
            c = o.f;
          }
        } catch (err) { toast('Codice non valido', 'errore'); break; }
        if (!window.CDF_FIREBASE || c.replace(/-/g, '').length < 20) { toast('Il codice non è completo', 'errore'); break; }
        try { localStorage.setItem(LS_FAMIGLIA, c); } catch (err) { /* niente */ }
        collegaFamiglia(c);
        if (cfg) {
          try { await navigator.clipboard.writeText(codiceDaCondividere()); toast('Collegato! Codice per l\'altro telefono copiato: mandalo (es. WhatsApp)'); }
          catch (err) { toast('Collegato! Copia il codice per l\'altro telefono dalla scheda Info'); }
        }
        break;
      }
      case 'famiglia-copia':
        try { await navigator.clipboard.writeText(codiceDaCondividere()); toast('Codice copiato: mandalo all\'altro telefono'); } catch (err) { toast('Selezionalo e copialo a mano', 'errore'); }
        break;
      case 'famiglia-scollega':
        if (confirm('Scollegare questo telefono dalla sincronizzazione di famiglia?')) { try { localStorage.removeItem(LS_FAMIGLIA); } catch (err) { /* niente */ } location.reload(); }
        break;
      case 'cucina-chiudi': chiudiCucina(); break;
      case 'cucina-avanti': vaiPasso(1); break;
      case 'cucina-indietro': vaiPasso(-1); break;
      case 'cucina-scheda': cucina.idx = Number(el.dataset.i); salvaCucina(); renderCucina(); break;
      case 'cucina-timer': avviaTimer(Number(el.dataset.min)); break;
      case 'cucina-stop-timer': fermaTimer(); break;
      case 'sposta': apriSposta(el.dataset.data); break;
      case 'scambia-con':
        if (scambiaGiorni(el.dataset.da, el.dataset.data)) { salva(); chiudiModale(); render(); toast(`Cene scambiate: ${dataBreve(el.dataset.da)} ↔ ${dataBreve(el.dataset.data)}`); }
        break;
      case 'attesa':
        if (mettiInAttesa(el.dataset.data)) { salva(); chiudiModale(); render(); toast('Messo in lista d\'attesa: lo trovi nel Calendario'); }
        break;
      case 'piazza': apriPiazza(Number(el.dataset.idx)); break;
      case 'piazza-qui':
        if (piazzaDaAttesa(Number(el.dataset.idx), el.dataset.data)) { salva(); chiudiModale(); render(); toast(`Piatto messo ${dataEstesa(el.dataset.data)}`); }
        break;
      case 'elimina-attesa': {
        const v = stato.attesa[Number(el.dataset.idx)];
        if (v && confirm(`Togliere "${titoliDi(v.piatti)}" dalla lista d'attesa?`)) { stato.attesa.splice(Number(el.dataset.idx), 1); salva(); render(); }
        break;
      }
      case 'voto': {
        e.preventDefault(); e.stopPropagation();
        const id = el.dataset.id; const v = Number(el.dataset.v);
        if (stato.voti[id] === v) delete stato.voti[id]; else stato.voti[id] = v;
        salva(); aggiornaModaleAperta(); if ($('#modale').hidden) render(); if (cucina) renderCucina();
        break;
      }
      case 'vai-spesa': ui.vista = 'spesa'; ui.sett = el.dataset.sett; salvaUI(); render(); window.scrollTo({ top: 0 }); break;
      case 'sett': ui.sett = el.dataset.sett; salvaUI(); render(); break;
      case 'incasa': {
        e.preventDefault();
        const sp = stato.spesa[ui.sett] = stato.spesa[ui.sett] || { presi: [], inCasa: [] };
        sp.inCasa = sp.inCasa || [];
        const k = el.dataset.k;
        sp.inCasa = sp.inCasa.includes(k) ? sp.inCasa.filter(x => x !== k) : [...sp.inCasa, k];
        salva(); render();
        break;
      }
      case 'azzera-spesa':
        if (confirm('Vuoi togliere tutte le spunte di questa settimana?')) { delete stato.spesa[ui.sett]; salva(); render(); }
        break;
      case 'copia-lista': {
        const testo = testoLista(ui.sett);
        try { await navigator.clipboard.writeText(testo); toast('Lista copiata: incollala dove vuoi'); }
        catch (err) { apriModale(`<h2 id="modale-titolo">Lista della spesa</h2><textarea style="width:100%;height:60vh;font:inherit" readonly>${esc(testo)}</textarea>`); }
        break;
      }
      case 'telegram-lista': {
        el.disabled = true;
        await salvaOra();
        try {
          const r = await fetch('/api/telegram/lista', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Menu-App': '1' }, body: JSON.stringify({ mese: ui.mese, settimana: ui.sett }) });
          const j = await r.json();
          toast(j.ok ? 'Lista inviata su Telegram 📲' : 'Invio non riuscito: ' + (j.errore || ''), j.ok ? '' : 'errore');
        } catch (err) { toast('Server non raggiungibile', 'errore'); }
        el.disabled = false;
        break;
      }
      case 'telegram-prova': {
        el.disabled = true;
        await salvaOra();
        try {
          const r = await fetch('/api/telegram/prova', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Menu-App': '1' }, body: '{}' });
          const j = await r.json();
          toast(j.ok ? 'Notifica di prova inviata 📲' : 'Invio non riuscito: ' + (j.errore || ''), j.ok ? '' : 'errore');
        } catch (err) { toast('Server non raggiungibile', 'errore'); }
        el.disabled = false;
        break;
      }
      case 'stampa': window.print(); break;
      case 'filtro': ui.filtroCat = el.dataset.cat; salvaUI(); render(); break;
      case 'esporta': {
        const blob = new Blob([JSON.stringify(stato, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `cene-di-famiglia-backup-${oggiISO()}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        break;
      }
      case 'annulla-scambi':
        if (confirm('Vuoi annullare tutti i cambi e gli spostamenti, svuotare la lista d\'attesa e tornare al menu originale?')) { stato.scambi = {}; stato.attesa = []; salva(); render(); toast('Menu originale ripristinato'); }
        break;
      case 'spegni':
        if (confirm('Spegnere il server? Per riaprire il menu usa Avvia Menu.bat.')) {
          await salvaOra();
          try { await fetch('/api/spegni', { method: 'POST', headers: { 'X-Menu-App': '1' } }); } catch (err) { /* niente */ }
          modoServer = false; render(); toast('Server spento');
        }
        break;
      default: break;
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    const a = el.dataset.azione;
    if (a === 'preso') {
      const sp = stato.spesa[ui.sett] = stato.spesa[ui.sett] || { presi: [], inCasa: [] };
      sp.presi = sp.presi || [];
      const k = el.dataset.k;
      sp.presi = el.checked ? [...new Set([...sp.presi, k])] : sp.presi.filter(x => x !== k);
      salva(); render();
    } else if (a === 'mostra-alt') {
      ui.mostraAlt = el.checked; salvaUI(); render();
    } else if (a === 'importa' && el.files && el.files[0]) {
      const fr = new FileReader();
      fr.onload = () => {
        try { stato = normalizzaStato(JSON.parse(fr.result)); salva(); render(); toast('Backup importato'); }
        catch (err) { toast('File non valido', 'errore'); }
      };
      fr.readAsText(el.files[0]);
    } else if (el.id === 'mese-sel') {
      ui.mese = el.value; ui.sett = null; salvaUI(); render();
    }
  });

  let timerCerca = null;
  document.addEventListener('input', e => {
    if (e.target.dataset.azione !== 'cerca') return;
    clearTimeout(timerCerca);
    const val = e.target.value;
    timerCerca = setTimeout(() => {
      ui.cerca = val; salvaUI(); render();
      const inp = document.querySelector('[data-azione="cerca"]');
      if (inp) { inp.focus(); inp.setSelectionRange(val.length, val.length); }
    }, 250);
  });

  // trascina e rilascia: giorno -> giorno (scambio), giorno -> lista d'attesa, attesa -> giorno
  let trascinato = null;
  const puliziaDrag = () => document.querySelectorAll('.trascinando, .drop-ok').forEach(x => x.classList.remove('trascinando', 'drop-ok'));
  document.addEventListener('dragstart', e => {
    const el = e.target.closest && e.target.closest('[data-drag]');
    if (!el) return;
    trascinato = el.dataset.drag;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', trascinato); } catch (err) { /* niente */ }
    el.classList.add('trascinando');
  });
  document.addEventListener('dragend', () => { trascinato = null; puliziaDrag(); });
  document.addEventListener('dragover', e => {
    const t = trascinato && e.target.closest && e.target.closest('[data-drop]');
    if (!t || (t.dataset.drop === 'attesa' && !trascinato.startsWith('giorno:'))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.drop-ok').forEach(x => { if (x !== t) x.classList.remove('drop-ok'); });
    t.classList.add('drop-ok');
  });
  document.addEventListener('drop', e => {
    const t = trascinato && e.target.closest && e.target.closest('[data-drop]');
    if (!t) return;
    e.preventDefault();
    const [tipo, valore] = trascinato.split(/:(.+)/);
    let ok = false;
    let msg = '';
    if (t.dataset.drop === 'attesa' && tipo === 'giorno') { ok = mettiInAttesa(valore); msg = 'Messo in lista d\'attesa'; }
    else if (t.dataset.drop === 'giorno' && tipo === 'giorno') { ok = scambiaGiorni(valore, t.dataset.dataDrop); msg = `Cene scambiate: ${dataBreve(valore)} ↔ ${dataBreve(t.dataset.dataDrop)}`; }
    else if (t.dataset.drop === 'giorno' && tipo === 'attesa') { ok = piazzaDaAttesa(Number(valore), t.dataset.dataDrop); msg = `Piatto messo ${dataEstesa(t.dataset.dataDrop)}`; }
    trascinato = null;
    puliziaDrag();
    if (ok) { salva(); render(); toast(msg); }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modale').hidden) chiudiModale();
    else if (cucina && $('#modale').hidden && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
      if (e.key === 'ArrowRight') vaiPasso(1);
      if (e.key === 'ArrowLeft') vaiPasso(-1);
      if (e.key === 'Escape') chiudiCucina();
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('article[data-azione]')) { e.preventDefault(); e.target.click(); }
  });

  // ---------- avvio ----------
  async function avvio() {
    const locale = (() => { try { return JSON.parse(localStorage.getItem(LS_STATO)); } catch (e) { return null; } })();
    stato = normalizzaStato(locale);
    if (location.protocol.startsWith('http')) {
      try {
        const [ri, rs] = await Promise.all([fetch('/api/info', { cache: 'no-store' }), fetch('/api/stato', { cache: 'no-store' })]);
        if (ri.ok && rs.ok) {
          info = await ri.json();
          stato = normalizzaStato(await rs.json());
          modoServer = true;
        }
      } catch (e) { /* pagina senza server */ }
    }
    render();
    if (!modoServer && window.CDF_FIREBASE && codiceFamiglia()) collegaFamiglia(codiceFamiglia());
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  function collegaFamiglia(codice) {
    avviaFamiglia(codice).catch(e => {
      statoFamiglia = 'errore: ' + (e.code || e.message || e);
      render();
    });
    render();
  }
  avvio();
})();
