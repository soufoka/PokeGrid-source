// Caca de bugs 4, lote D (25/09/2026): modelo. Piso de ritmo na tierlist por elemento e no Ditto, tempos calibrados no
// Simples, texto "tempos ajustados" sem ajuste, cache do Ditto na nova busca de precos, amostra de dano fora do "Sugerido"
// e com lider trocado, qualidade acima de 2 no modo Pokemon, select do time depois de reordenar e o aviso de precos
// depois de 5 buscas. Roda o <script> REAL da janela com DOM falso (o harness do bughunt4-C, com setInterval/setTimeout
// guardados) e o HUNTS_JS real com a fixture de 17/09 mais o loot e os precos de 19/09.
// Roda com: node test/bughunt4-D.test.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
const L = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'loot-2026-09-19.json.gz'))).toString('utf8'));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const lit = (nome) => { const i = s.indexOf('const ' + nome + ' = `'); const a = s.indexOf('`', i) + 1; return eval('`' + s.slice(a, s.indexOf('`', a)) + '`'); };
const realNow = Date.now; let desloc = 0; Date.now = () => realNow() + desloc; // relogio do app: a trava de 60 s do carregaHunts
const dedup = (h) => { const seen = {}; return (h || []).filter((x) => x && x.name && !seen[x.name + '@' + x.level] && (seen[x.name + '@' + x.level] = 1)); };
const hkey = (x) => String(x || '').toLowerCase().replace(/[_-]+/g, ' ').trim();

function monta(opts = {}) {
  const byId = new Map(), ints = [], tos = [];
  let document;
  class CL { constructor() { this.s = new Set(); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag, id) { this.tagName = String(tag || 'div').toUpperCase(); this.id = id || ''; this.style = { setProperty() {} }; this.classList = new CL(); this.dataset = {}; this.children = []; this._h = ''; this._t = ''; this.value = ''; this.checked = false; this.title = ''; this.options = [{}, {}]; this.childElementCount = 0; this.offsetHeight = 40; this.scrollTop = 0; this.ev = {}; }
    get innerHTML() { return this._h; } set innerHTML(h) { this._h = String(h); this.children = []; }
    get textContent() { return this._t; } set textContent(v) { this._t = String(v); this.children = []; }
    get firstChild() { return this._h ? {} : null; }
    get outerHTML() { return ''; } set outerHTML(v) {}
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } removeEventListener() {}
    querySelector(q) { this._q = this._q || {}; return this._q[q] || (this._q[q] = new El('div')); }
    querySelectorAll() { return []; }
    appendChild(c) { this.children.push(c); this.childElementCount = this.children.length; return c; }
    remove() {} setAttribute() {} getAttribute() { return null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; }
    focus() { document.activeElement = this; } blur() { if (document.activeElement === this) document.activeElement = null; } select() {}
    click() { if (this.onclick) this.onclick({ target: this, stopPropagation() {} }); }
    contains(x) { return x === this; } closest() { return null; }
  }
  class WV extends El {
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; }
    executeJavaScript(c) { return opts.exec ? opts.exec(String(c)) : Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() {} reloadIgnoringCache() {} loadURL() { return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid');
  document = {
    getElementById: (id) => { if (id === 'grid') return grid; if (!byId.has(id)) byId.set(id, new El(id === 'tlLevel' || id === 'tlTm' ? 'input' : 'div', id)); return byId.get(id); },
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: () => [],
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, appVersion: '1.5.27' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  const exporta = '\n;return { refreshCards, cardsSet: (v) => { cardsOn = v; }, stCache, get cardsEl() { return cardsEl; }, t, nf, tlPkControles, get tlPk() { return tlPk; }, calTexto, tempo: () => tempoCal, carregaHunts, dittoVarre, dittoAlvo, tierPoke, tierCalc, get huntsCache() { return huntsCache; }, sugCalc, danoAm: () => danoAm, renderTier, setTlNivel: (v) => { tlNivel = v; } };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, { reload() {} }, (f, ms) => ints.push({ f, ms }), noop, (f, ms) => tos.push({ f, ms }), noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  return Object.assign(api, { byId, grid, store, document, ints, tos });
}
const conta = (extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 300, a: { seconds: 900, gph: 1000, xph: 5000, kph: 100 }, team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra || {});

(async () => {
  // HUNTS_JS real: com precos (R) e com o items.json fora (R0)
  const cria = J.creatures.map((c) => Object.assign({}, c, { loot: (L.loot[c.name.toLowerCase()] || []).map(([name, chance, minCount, maxCount]) => ({ name, chance, minCount, maxCount })) }));
  const itens = { items: L.items.map(([name, npcPrice]) => ({ name, npcPrice })) };
  const HUNTS_JS = lit('HUNTS_JS');
  const roda = (semItens) => new Function('fetch', 'return ' + HUNTS_JS)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : u.indexOf('items') >= 0 ? (semItens ? null : itens) : { creatures: cria }) }));
  const R = await roda(false), R0 = await roda(true);
  const lista = dedup(R.h);
  const rota = (st) => (c) => (c.includes('map-markers') ? Promise.resolve(R) : st && c.includes('const team = ((ws.pokes') ? Promise.resolve(st) : Promise.resolve(null));
  const carrega = async (H) => { desloc += 61e3; H.carregaHunts(); await vez(); await vez(); };

  await secao('piso de ritmo na tierlist por elemento e no Ditto (MEDIA: hunt inviavel virava "melhor hunt")', async () => {
    const H = monta({ exec: rota() }); await vez(); await carrega(H);
    ok(H.huntsCache && H.huntsCache.length > 400, 'catalogo e hunts carregados pelo carregaHunts real (' + H.huntsCache.length + ')');
    const rows = H.tierCalc(600, false, 'xp');
    const inv = rows.filter((r) => !(r.sg.ritmo >= 0.15) || (r.out && !(r.out.sg.ritmo >= 0.15)));
    ok(rows.length > 100 && inv.length === 0, 'Lv600: nenhuma especie com melhor hunt (ou melhor em Outland) inviavel (' + inv.length + ' de ' + rows.length + '; antes 280 de 403, ex. Mewtwo em Seviper com 8 golpes)');
    const semPar = rows.slice(0, 60).filter((r) => !H.tierPoke({ sp: r.sp, level: +r.x.level || 1, q: 1, ivt: 96, tlv: 600, mult: 1, tms: null }, lista, 'xp').some((p) => p.x.name === r.x.name && p.x.level === r.x.level));
    ok(semPar.length === 0, 'a melhor hunt de cada uma das 60 primeiras tambem aparece no modo Pokemon (mesma especie, nivel, q 1, IV 96): ' + (semPar.slice(0, 3).map((r) => r.sp + '@' + r.x.name).join(', ') || 'todas'));
    const ger = rows.slice(0, 3).every((r) => { let soma = 0; lista.forEach((x) => { if ((+x.level || 0) > 600) return; const lvH = Math.max(1, +x.level || +((R.mv[x.sp] || {}).hl) || 1); const g = H.sugCalc({ sp: r.sp, level: lvH, q: 1, ivt: 96, tlv: 0, mult: 1, tms: null }, x); if (g && g.ritmo >= 0.15) soma += g.xph || g.ritmo; }); return Math.abs(soma - r.ger) < 1e-6 * Math.max(1, soma); });
    ok(ger, 'a nota Geral soma so as hunts viaveis');
    const D = { sp: 'shiny ditto', level: 300, q: 2.0, ivt: 119, tlv: 600 };
    const V = H.dittoVarre(D, lista);
    ok(V.hunts.length > 50 && V.hunts.every((r) => r.sg.ritmo >= 0.15) && V.rows.every((r) => r.sg.ritmo >= 0.15), 'Shiny Ditto Lv300: ranking por hunt e quadro por tipo sem forma inviavel (' + V.hunts.length + ' hunts, ' + V.rows.length + ' tipos; antes 41 inviaveis e BUG -> Scizor em Cacturne)');
    // terceiro caminho do Ditto: a hunt-alvo escolhida no Simples (dittoAlvo)
    const DA = D; // conta Lv600, como o Simples passa
    const sce = lista.find((x) => x.sp === 'sceptile' && +x.level === 580);
    const aSce = sce ? H.dittoAlvo(DA, sce) : null;
    ok(aSce && aSce.length === 0, 'hunt-alvo Sceptile Lv580 com o Shiny Ditto Lv300: nenhuma forma recomendada (' + (aSce ? aSce.length + '; antes 12, a 1a com ritmo 0,102' : 'sem a hunt na fixture') + ')');
    const ruins = lista.filter((x) => (+x.level || 0) <= 600).filter((x) => H.dittoAlvo(DA, x).some((r) => !(r.sg.ritmo >= 0.15)));
    ok(ruins.length === 0, 'nenhuma hunt ate o Lv600 mostra forma inviavel na hunt-alvo (' + ruins.length + ')');
  });

  await secao('Simples em Sugerido usa os tempos medidos sem abrir a tierlist (MEDIA)', async () => {
    const hs = { c1: {} };
    [1.2, 1.6, 2, 2.4, 2.8, 3.2].forEach((h, k) => { hs.c1['hunt ' + k] = { kph: 3600 / (3 * h + 6), hpk: h, n: 10, gph: 0, xph: 0, cph: 0, t: 1 }; }); // 3 s por golpe + 6 s por kill
    const H = monta({ exec: rota(), ls: { huntStats2: JSON.stringify(hs), huntScope: 'todas' } }); await vez(); await carrega(H);
    ok(H.tempo().n === 0 && H.tempo().a === 2.1, 'ao abrir o app os tempos estao no padrao (2,1 + 3,1)');
    for (let i = 0; i < 4; i++) H.stCache[i] = { t: Date.now(), d: conta({ cid: 'c' + (i + 1), team: [{ name: 'Kabutops', level: 300, q: 1.3, ivt: 120, ld: true }] }) };
    H.cardsSet(true);
    await H.refreshCards(true);
    const hs2 = H.cardsEl.querySelector('#cdHuntSort'); hs2.value = 'sug'; await hs2.onchange(); await vez();
    const tc = H.tempo();
    ok(tc.n === 6 && Math.abs(tc.a - 3) < 0.05 && Math.abs(tc.b - 6) < 0.1, 'so o Simples em Sugerido: tempos ajustados pras medicoes (' + tc.a + ' s por golpe + ' + tc.b + ' s por kill, ' + tc.n + ' hunts; antes 2,1 + 3,1 ate abrir a tierlist)');
    const m = /<span class="rn">([^<]+?) ?(?:<span style="color:#7d8590">Lv (\d+)<\/span>|<)(?:(?!class="cd-row)[^≈])*≈([\d.,]+) kills\/h/.exec(H.cardsEl.innerHTML);
    const x = m && lista.find((x2) => x2.name === m[1] && (+x2.level || 0) === (+m[2] || 0));
    const sg = x && H.sugCalc({ sp: 'kabutops', level: 300, q: 1.3, ivt: 120, tlv: 300, cid: 'c1', mult: 1, tms: null }, x);
    ok(!!sg && m[3] === H.nf(Math.round(sg.kh)), 'o kills/h mostrado e o do modelo calibrado (' + (m ? m[1] + ' Lv' + m[2] + ': ' + m[3] + ' contra ' + (sg ? H.nf(Math.round(sg.kh)) : '?') : 'sem linha') + ')');
  });

  await secao('texto "tempos ajustados" so quando ajustou (baixa)', async () => {
    const hs = { c1: {}, c2: {} };
    [1, 1.1, 1.2].forEach((h, k) => { hs.c1['a' + k] = { kph: 890, hpk: h, n: 10 }; hs.c2['b' + k] = { kph: 880 + k * 10, hpk: h, n: 10 }; }); // lider forte: 1,0 a 1,2 golpe em 6 hunts
    const H = monta({ ls: { huntStats2: JSON.stringify(hs) } }); await vez();
    const txt = H.calTexto(), marca = H.t('tlCalT').split('{n}')[0];
    ok(H.tempo().a === 2.1 && H.tempo().b === 3.1 && H.tempo().n === 0, 'sem golpes/kill diferentes o bastante, fica no padrao com n 0');
    ok(txt.includes('2,1') && !txt.includes(marca), 'e a dica nao diz "' + marca.trim() + '" (' + txt + ')');
    const hs2 = { c1: {} }; [1.2, 1.6, 2, 2.4, 2.8, 3.2].forEach((h, k) => { hs2.c1['h' + k] = { kph: 3600 / (2.5 * h + 4), hpk: h, n: 10 }; });
    const H2 = monta({ ls: { huntStats2: JSON.stringify(hs2) } }); await vez();
    ok(H2.calTexto().includes(H2.t('tlCalT').replace('{n}', 6)), 'com o ajuste feito, continua dizendo que ajustou com 6 hunts');
  });

  await secao('cache do Ditto nao guarda a lista sem preco quando os precos chegam (baixa)', async () => {
    const pend = [];
    const H = monta({ exec: (c) => (c.includes('map-markers') ? new Promise((r) => pend.push(r)) : Promise.resolve(null)) }); await vez();
    desloc += 61e3; H.carregaHunts(); pend.shift()(R0); await vez();
    ok(H.huntsCache && !H.huntsCache.some((x) => x.gk > 0), '1a carga sem items.json: gold por kill 0 em tudo');
    desloc += 61e3; H.carregaHunts();
    ok(pend.length === 1, 'um minuto depois o app busca os precos de novo');
    const D = { sp: 'shiny ditto', level: 300, q: 0, ivt: 0, tlv: 300 };
    H.dittoVarre(D, dedup(H.huntsCache)); // o quadro do Simples no mesmo tick, ainda com a lista velha
    pend.shift()(R); await vez();
    const nova = dedup(H.huntsCache);
    ok(nova.some((x) => x.gk > 0), 'os precos chegaram (mesmos nomes e niveis, mesma chave de antes)');
    const g = H.tierPoke(D, nova, 'gold');
    ok(g.length > 5 && g.every((r) => r.x.gk > 0 || r.sc > 0), 'tierlist do Ditto por Gold/h tem linhas (' + g.length + '; antes 0 ate a calibracao mudar)');
  });

  await secao('amostra de dano no amostrador de fundo, com o golpe do lider atual (MEDIA e baixa)', async () => {
    const xq = lista.find((x) => x.sp === 'quagsire');
    const kabN = new Set(R.mv.kabutops.a.map((g) => g[0].toLowerCase()));
    const gKab = R.mv.kabutops.a.find((g) => !g[6] && g[1] > 0)[0];
    const gVelho = R.mv.scizor.a.find((g) => !g[6] && g[1] > 0 && !kabN.has(g[0].toLowerCase()))[0];
    const st = conta({ hunt: xq.name, a: { seconds: 3600, gph: 0, xph: 0, kph: 400, mvs: [{ m: gVelho, n: 3000, s: 0, a: 0, hp: 60 }, { m: gKab, n: 400, s: 0, a: 0, hp: 25 }] },
      team: [{ name: 'Kabutops', level: 300, q: 1.3, ivt: 120, ld: true }, { name: 'Scizor', level: 300, q: 1.3, ivt: 120 }] });
    const H = monta({ exec: rota(st) }); await vez(); await carrega(H);
    const amostrador = H.ints.find((i) => i.ms === 30000);
    ok(!!amostrador, 'achei o amostrador de fundo (30 s)');
    await amostrador.f();
    const am = H.danoAm();
    const sg = H.sugCalc({ sp: 'kabutops', level: 300, q: 1.3, ivt: 120, tlv: 300, mult: 1, tms: null }, xq);
    const certo = Math.round(0.25 / sg.mg * 1000) / 1000, errado = Math.round(0.6 / sg.mg * 1000) / 1000;
    ok(am.length === 1 && am[0].k === 'c1|' + hkey(xq.name), 'Simples fechado, ordem padrao: a conta com 1 h na hunt vira uma amostra (' + am.length + '; antes so com a secao Hunts em Sugerido e a janela a vista)');
    ok(am.length === 1 && am[0].r === certo && certo !== errado, 'a amostra usa o golpe do lider atual (' + gKab + ' 25%): ' + (am[0] && am[0].r) + ', nao o do Scizor que ele trocou (' + gVelho + ' 60%, daria ' + errado + ')');
    ok(JSON.parse(H.store.get('danoAm') || '[]').length === 1, 'e fica gravada');
    const H2 = monta({ exec: (c) => (c.includes('const team = ((ws.pokes') ? Promise.resolve(st) : Promise.resolve(null)) }); await vez();
    await H2.ints.find((i) => i.ms === 30000).f();
    ok(H2.danoAm().length === 0 && JSON.parse(H2.store.get('huntStats2') || '{}').c1, 'sem o catalogo ainda: nao amostra dano, nao quebra e a medida da hunt segue');
  });

  await secao('Times & IV: pokemon acima do Lv500 nao aparece com o poder caindo (baixa)', async () => {
    const H = monta({ exec: rota() }); await vez(); await carrega(H);
    for (let i = 0; i < 4; i++) H.stCache[i] = { t: Date.now(), d: conta({ team: [{ name: 'Scizor', level: 650, q: 1.5, ivt: 150, ld: true }] }) };
    H.cardsSet(true);
    await H.refreshCards(true);
    const m = /title="[^"]*">([\d.]+)<\/span><span style="color:#8ab4ff" title="Lv(\d+)">→([\d.]+)</.exec(H.cardsEl.innerHTML);
    const num = (x) => +String(x).replace(/\./g, '');
    ok(m && num(m[3]) >= num(m[1]) && m[2] === '650', 'Scizor Lv650 com a projecao no padrao (500): projeta no proprio nivel, nunca abaixo do poder atual (' + (m ? m[1] + ' →' + m[3] + ' Lv' + m[2] : 'sem numero') + ')');
  });

  await secao('lider trocado na mesma sessao com golpe de nome comum: nao grava amostra ate a sessao mudar (baixa)', async () => {
    const xq = lista.find((x) => x.sp === 'quagsire');
    const kabN = new Set(R.mv.kabutops.a.map((g) => g[0].toLowerCase()));
    const gKab = R.mv.kabutops.a.find((g) => !g[6] && g[1] > 0)[0];
    const gComum = R.mv.scizor.a.find((g) => !g[6] && g[1] > 0 && kabN.has(g[0].toLowerCase()))[0]; // Slash e cia: o Scizor e o Kabutops aprendem
    const lider = (id, name) => [{ id, name, level: 300, q: 1.3, ivt: 120, ld: true }];
    const passo = async (H, st, seconds, team, mvs) => { st.a = { seconds, gph: 0, xph: 0, kph: 400, mvs }; st.team = team; await H.ints.find((i) => i.ms === 30000).f(); return H.danoAm().length; };
    // troca de especie: Scizor lider desde o comeco da sessao, depois o Kabutops
    let st = conta({ hunt: xq.name }), H = monta({ exec: rota(st) }); await vez(); await carrega(H);
    let n = await passo(H, st, 200, lider('s1', 'Scizor'), [{ m: gComum, n: 30, s: 0, a: 0, hp: 60 }]);
    n = await passo(H, st, 3600, lider('k1', 'Kabutops'), [{ m: gComum, n: 3000, s: 0, a: 0, hp: 60 }, { m: gKab, n: 400, s: 0, a: 0, hp: 25 }]);
    ok(n === 0, 'Scizor trocado pelo Kabutops na mesma sessao: o ' + gComum + ' acumulado pelo Scizor passa no filtro de golpes, entao nenhuma amostra (' + n + ')');
    n = await passo(H, st, 3900, lider('k1', 'Kabutops'), [{ m: gComum, n: 3000, s: 0, a: 0, hp: 60 }, { m: gKab, n: 500, s: 0, a: 0, hp: 25 }]);
    ok(n === 0, 'e continua sem amostrar enquanto a sessao for a mesma (' + n + ')');
    n = await passo(H, st, 400, lider('k1', 'Kabutops'), [{ m: gComum, n: 3000, s: 0, a: 0, hp: 60 }, { m: gKab, n: 520, s: 0, a: 0, hp: 25 }]);
    ok(n === 0, 'o lixo do Hunt Analyzer do jogo zera o analyzer mas nao os golpes: o ' + gComum + ' do Scizor continua la, nenhuma amostra (' + n + ')');
    n = await passo(H, st, 400, lider('k1', 'Kabutops'), [{ m: gKab, n: 100, s: 0, a: 0, hp: 25 }]);
    ok(n === 1, 'golpes zerados (troca de hunt ou Zerar do app): volta a amostrar (' + n + ')');
    // evolucao: mesmo pokemon (mesmo id do jogo), especie nova
    st = conta({ hunt: xq.name }); H = monta({ exec: rota(st) }); await vez(); await carrega(H);
    n = await passo(H, st, 200, lider('x1', 'Kabuto'), [{ m: gKab, n: 30, s: 0, a: 0, hp: 40 }]);
    n = await passo(H, st, 3600, lider('x1', 'Kabutops'), [{ m: gKab, n: 3000, s: 0, a: 0, hp: 40 }]);
    ok(n === 0, 'o lider evoluiu no meio da sessao (Kabuto -> Kabutops, mesmo id): nenhuma amostra (' + n + ')');
    // lider trocado antes de o app abrir: nao da pra ver (limite conhecido); sem troca vista, amostra normal
    st = conta({ hunt: xq.name }); H = monta({ exec: rota(st) }); await vez(); await carrega(H);
    n = await passo(H, st, 3600, lider('k1', 'Kabutops'), [{ m: gKab, n: 400, s: 0, a: 0, hp: 25 }]);
    ok(n === 1, 'sem troca na sessao: a amostra entra como antes (' + n + ')');
  });

  await secao('modo Pokemon: qualidade acima de 2 e o select do time depois de reordenar (baixa)', async () => {
    const H = monta({ exec: rota() }); await vez(); await carrega(H);
    const scz = { id: 's1', name: 'Scizor', level: 250, q: 2.6, ivt: 150, ld: true }, kab = { id: 'k2', name: 'Kabutops', level: 250, q: 1.2, ivt: 100 };
    H.stCache[0] = { t: Date.now(), d: conta({ team: [scz, kab] }) };
    H.setTlNivel(300); H.tlPkControles();
    const ctl = H.byId.get('tlPkCtl');
    ok(/id="tlPkQ" type="number" min="0\.5" max="10"/.test(ctl.innerHTML), 'o campo aceita ate 10 (o jogo vai ate Divina, >= 4)');
    const sel = H.document.getElementById('tlPkMine'); sel.value = '0'; sel.onchange();
    ok(H.tlPk.sp === 'scizor' && H.tlPk.q === 2.6, 'do time: Scizor q 2,6');
    const q = H.document.getElementById('tlPkQ');
    q.value = '2.7'; q.onchange();
    ok(H.tlPk.q === 2.7 && q.value === 2.7, 'digitar 2,7 fica 2,7 (antes virava 2)');
    q.value = '4.3'; q.onchange(); const q43 = H.tlPk.q;
    q.value = '99'; q.onchange();
    ok(q43 === 4.3 && H.tlPk.q === 10, 'Divina 4,3 passa; 99 para no teto');
    const selecionado = () => { const m = /<option value="\d+" selected>([^<]*)<\/option>/.exec(ctl.innerHTML); return m ? m[1] : ''; };
    sel.value = '0'; sel.onchange();
    H.stCache[0].d.team = [Object.assign({}, kab, { ld: true }), Object.assign({}, scz, { ld: false })]; // trocou o lider: Kabutops no slot 0
    H.tlPkControles();
    ok(/Scizor/.test(selecionado()) && H.tlPk.sp === 'scizor', 'time reordenado: o select continua no Scizor que esta sendo calculado (' + selecionado() + '; antes marcava o Kabutops)');
    H.stCache[0].d.team = [Object.assign({}, scz, { id: undefined }), Object.assign({}, kab, { id: undefined })]; // push sem id (versao velha no painel)
    H.tlPkControles(); sel.value = '0'; sel.onchange();
    H.stCache[0].d.team = [H.stCache[0].d.team[1], H.stCache[0].d.team[0]];
    H.tlPkControles();
    ok(selecionado() === '', 'sem id do jogo: nao marca outro Pokemon, volta pro "do meu time" (' + (selecionado() || 'nada marcado') + ')');
    const RS = lit('READ_STATE');
    const d = new Function('window', 'return ' + RS)({ __poke: { ws: { balls: { catalog: [], counts: {} }, inventory: { items: [] }, pokes: { list: [{ id: 'abc123', team: true, slot: 0, name: 'Scizor', level: 10, quality: 1.2 }, { id: 'zz9', team: false, slot: 0, name: 'Onix', level: 5 }] } }, api: { '/api/characters/me': { character: { id: 1, name: 'A', level: 10 } } }, sess: { start: 1, drops: {}, kills: 0 } } });
    ok(d && d.team.length === 1 && d.team[0].id === 'abc123', 'o READ_STATE manda o id do jogo em cada Pokemon do time');
  });

  await secao('aviso de precos depois de 5 buscas sem resultado (baixa)', async () => {
    const pend = [];
    const H = monta({ exec: (c) => (c.includes('map-markers') ? new Promise((r) => pend.push(r)) : Promise.resolve(null)), ls: { tlObj: 'gold' } }); await vez();
    desloc += 61e3; H.carregaHunts(); pend.shift()(R0); await vez();
    H.document.getElementById('tlOverlay').classList.add('show');
    const abre = () => { H.tos.length = 0; H.renderTier(); const t1 = H.tos.filter((x) => x.ms === 140).pop(); if (t1) t1.f(); return H.document.getElementById('tlBody').innerHTML; };
    ok(abre().includes(H.t('tlGoldNone')), 'sem precos: "o app tenta de novo sozinho"');
    for (let k = 0; k < 5; k++) { desloc += 61e3; H.carregaHunts(); if (pend.length) pend.shift()(R0); await vez(); }
    ok(abre().includes(H.t('tlGoldNone')), 'a 5a busca acabou de sair: a promessa ainda vale');
    desloc += 61e3; H.carregaHunts();
    ok(pend.length === 0, 'depois da 5a o app para de buscar');
    const h = abre();
    ok(h.includes(H.t('tlGoldFail')) && !h.includes(H.t('tlGoldNone')), 'e a tela diz isso: "' + H.t('tlGoldFail') + '"');
    ok(!H.tos.some((x) => x.ms === 5000), 'sem re-tentativa a cada 5 s que nao vai dar em nada');
    ok(s.split("tlGoldFail:'").length - 1 === 3 && !/tlGoldFail:'[^']*—/.test(s), 'texto novo nos 3 idiomas, sem travessao');
  });

  await secao('fator de dano gravado volta na abertura seguinte (media)', async () => {
    const am = [null, 7, { k: 'a|x', r: 0.5 }, { k: 'b|x', r: 0.4 }, { k: 'c|y', r: 0.3 }];
    const H = monta({ ls: { danoAm: JSON.stringify(am) } }); await vez();
    ok(H.danoAm().length === 3, 'as 3 amostras gravadas carregam, lixo fora (' + H.danoAm().length + '; o lsObj devolvia {} pra lista e o fator voltava a 1 toda vez)');
    ok(H.calTexto().includes(H.t('tlCal').split('{d}')[0] + '40%'), 'e a mediana (40%) ja vale sem medir de novo: "' + H.calTexto().slice(0, 70) + '"');
  });

  Date.now = realNow;
  console.log(fail ? '\nFALHOU' : '\nTUDO OK');
  process.exit(fail);
})().catch((e) => { console.log('FAIL excecao: ' + ((e && e.stack) || e)); process.exit(1); });
