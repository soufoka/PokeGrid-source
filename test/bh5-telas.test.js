// Caca de bugs 5 (03/10/2026), telas: Simples, aba Σ, Painel, engrenagem, tierlist, Ditto, Sugerido, scripts, idioma e numeros.
// Roda o <script> REAL da janela (index.html) com DOM falso (o harness do bughunt4-C/D, com setInterval/setTimeout guardados)
// e, onde o dado vem do jogo, o coletor e o READ_STATE REAIS num vm com WebSocket e fetch falsos (o molde do bughunt4-A).
// Catalogo de hunts: fixture de 17/09 + loot de 19/09 passando pelo HUNTS_JS real.
// Roda com: node test/bh5-telas.test.js   (contra outra copia, pra comparar: node test/bh5-telas.test.js caminho/do/index.html)
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const zlib = require('zlib');
const RAIZ = path.join(__dirname, '..');
const ARQ = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAIZ, 'index.html');
const s = fs.readFileSync(ARQ, 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
const L = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'loot-2026-09-19.json.gz'))).toString('utf8'));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const vezes = async (n) => { for (let k = 0; k < n; k++) await vez(); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");
const READ_STATE = tpl('const READ_STATE = '), READ_CATALOG = tpl('const READ_CATALOG = '), HUNTS_JS = tpl('const HUNTS_JS = ');
const ehEstado = (c) => c.includes('const team = ((ws.pokes'); // o READ_STATE que a janela manda pro painel
const realST = setTimeout;
const realNow = Date.now; let desloc = 0; Date.now = () => realNow() + desloc; // relogio do app: trava de 60 s do carregaHunts e o Hoje
// prazo da leitura de painel (lePainel): esses timers disparam de verdade (em 5 ms); os outros so ficam guardados
const PRAZO = +((/function lePainel\(w, js\) \{[^\n]*?r\(null\), (\d+)\)/.exec(code) || [])[1] || 3000);
const corre = (p, ms) => Promise.race([Promise.resolve(p).then(() => 'terminou'), new Promise((r) => realST(() => r('PENDENTE apos ' + ms + ' ms'), ms))]);

// janela do app com DOM falso: todo querySelector devolve um elemento (guardado por seletor), o foco e de verdade
function monta(opts = {}) {
  const byId = new Map(), ints = [], tos = [], alerts = [], confirms = [], abertos = [];
  const nulos = new Set(opts.nulos || []);
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
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; this.recarregou = 0; }
    executeJavaScript(c) { return opts.exec ? opts.exec(String(c), this) : Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() { this.recarregou++; } reloadIgnoringCache() { this.recarregou++; } loadURL() { return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid');
  document = {
    getElementById: (id) => { if (id === 'grid') return grid; if (nulos.has(id)) return null; if (!byId.has(id)) byId.set(id, new El(id === 'tlLevel' || id === 'tlTm' || /^sc(Url|Name)$/.test(id) ? 'input' : 'div', id)); return byId.get(id); },
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: () => [],
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: (m) => { confirms.push(m); return true; }, alert: (m) => { alerts.push(m); }, open: (u) => { abertos.push(u); },
    pokeAPI: Object.assign({ loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, appVersion: '1.5.29' }, opts.api || {}),
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  const exporta = '\n;return { refreshCards, cardsSet: (v) => { cardsOn = v; }, stCache, get cardsEl() { return cardsEl; }, t, nf, nc, ncs, esc, aggCard, renderAggregate, renderStats, refreshStats, statsEl, setStatsIdx: (v) => { statsIdx = v; }, setStatsOpen: (v) => { statsOpen = v; },'
    + ' renderSettings, loadCatalog, get cfg() { return cfg; }, carregaHunts, get huntsCache() { return huntsCache; }, get movesByName() { return movesByName; }, renderTier, webviews, off, utBase, setHuntSort: (v) => { huntSort = v; }, get huntPkSel() { return huntPkSel; },'
    + ' get huntStats() { return huntStats; }, setCardsCfgOpen: (v) => { cardsCfgOpen = v; }, cardsCfg, ivRender, setIv: (d, i) => { ivDados = d; ivFonte = i; ivAberto = true; }, atualizaScript, get userScripts() { return userScripts; }, stSane, I18N, calTexto };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const sT = (f, ms) => { tos.push({ f, ms }); if (ms === PRAZO) realST(() => { try { f(); } catch {} }, 5); return 1e6 + tos.length; };
  const api = fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, opts.location || { reload() {} }, (f, ms) => { ints.push({ f, ms }); return ints.length; }, noop, sT, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  return Object.assign(api, { byId, grid, store, document, ints, tos, alerts, confirms, abertos });
}

// pagina do jogo falsa: o coletor entra, o WebSocket e o fetch sao nossos
function mundo(api = {}) {
  let now = Date.now();
  const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  function FakeWS() { this.readyState = 1; this.ls = []; }
  FakeWS.prototype.addEventListener = function (t, f) { if (t === 'message') this.ls.push(f); };
  FakeWS.prototype.send = function () {};
  FakeWS.OPEN = 1;
  const resp = (b) => ({ ok: true, clone() { return resp(b); }, json: async () => b });
  const win = { WebSocket: FakeWS, fetch: (u) => Promise.resolve(resp(api[String((u && u.url) || u).split('?')[0]])), atob: (b) => Buffer.from(b, 'base64').toString('binary') };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map }));
  vm.runInContext(COLETOR, ctx);
  const ws = vm.runInContext('new WebSocket("wss://x")', ctx);
  return {
    msg: (m) => ws.ls.forEach((f) => f({ data: JSON.stringify(m) })),
    run: (c) => vm.runInContext(c, ctx),
    tick: (ms) => { now += ms; },
    busca: async (u) => { vm.runInContext('fetch(' + JSON.stringify(u) + ')', ctx); await vezes(5); }
  };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const push = (H, m) => ({ t: Date.now(), d: H.stSane(clone(m.run(READ_STATE))) }); // o push de 10 s: console-message -> JSON -> stSane
const conta = (extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 300, gold: 1000, diamonds: 0, a: { seconds: 900, gph: 1000, xph: 5000, kph: 100 }, team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra || {});
// colunas da linha da conta na tabela Por conta (sem tags): 0 conta, 1 pokemon, 2 hunt, 3 tempo, 4 gold/h ... 7 capturas, 9 melhor, 10 ultimo, 11 status
const colunas = (h, i) => { const m = new RegExp('<tr data-i="' + i + '">([\\s\\S]*?)</tr>').exec(h); return m ? [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : null; };
const depois = (h, marca) => { const i = h.indexOf(marca); return i < 0 ? '' : h.slice(i); };
// texto que o usuario le: sem tags e sem data-* (chave interna), com os title (tooltip)
const texto = (h) => h.replace(/\sdata-[\w-]+="[^"]*"/g, '').replace(/title="([^"]*)"/g, '> $1 <').replace(/<[^>]*>/g, ' ');

// HUNTS_JS real com a fixture: hunts, especies, golpes e precos
let RCAT = null;
async function catalogo() {
  if (RCAT) return RCAT;
  const cria = J.creatures.map((c) => Object.assign({}, c, { loot: (L.loot[c.name.toLowerCase()] || []).map(([name, chance, minCount, maxCount]) => ({ name, chance, minCount, maxCount })) }));
  const itens = { items: L.items.map(([name, npcPrice]) => ({ name, npcPrice })) };
  RCAT = await new Function('fetch', 'return ' + HUNTS_JS)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : u.indexOf('items') >= 0 ? itens : { creatures: cria }) }));
  return RCAT;
}
const dedup = (h) => { const seen = {}; return (h || []).filter((x) => x && x.name && !seen[x.name + '@' + x.level] && (seen[x.name + '@' + x.level] = 1)); };
const rota = (R) => (c) => Promise.resolve(c.includes('map-markers') ? R : null);
const carrega = async (H) => { desloc += 61e3; H.carregaHunts(); await vezes(2); };

(async () => {
  await secao('ponta a ponta: lista de pokemon em partes (pokes-chunk), analyzer e capturas chegam na linha da conta no Simples', async () => {
    // a reclamacao: Pokemon "—", Melhor catch e Ultimo catch "—" com Capturas 11/9/9/8 (o analyzer chegava, a lista de pokemon nao)
    const pk = (id, extra) => Object.assign({ id, name: 'P' + id, level: 50, team: false, quality: '1.0', ivTotal: 100, speciesId: 16, sellValue: 10 }, extra || {});
    const prepara = async (nome, cid) => {
      const m = mundo({ '/api/characters/me': { character: { id: cid, name: nome, level: 300, gold: 5000 } } });
      await m.busca('/api/characters/me');
      m.msg({ type: 'field-init', slug: 'bug_cave' });
      // socket v=2: a lista vem em 2 partes e fora de ordem; o time (Scizor lider) esta na parte 0
      m.msg({ type: 'pokes-chunk', gen: 4, seq: 1, total: 2, list: [pk(3), pk(4)] });
      m.msg({ type: 'pokes-chunk', gen: 4, seq: 0, total: 2, list: [pk(1, { name: 'Scizor', level: 300, team: true, slot: 0, leader: true, quality: '1.5', ivTotal: 150, speciesId: 212 }), pk(2, { name: 'Kabutops', level: 290, team: true, slot: 1, speciesId: 141 })] });
      [[50, 'Kabutops', 180, '1.70'], [51, 'Paras', 90, '1.0'], [52, 'Rattata', 60, '1.1']].forEach(([id, name, iv, q]) => { m.tick(30000); m.msg({ type: 'poke-delta', poke: pk(id, { name, ivTotal: iv, quality: q }) }); });
      m.msg({ type: 'analyzer', seconds: 1800, kills: 900, balance: 50000, xpGained: 90000, captures: 11, drops: [] });
      return m;
    };
    const m0 = await prepara('Ash', 7), m1 = await prepara('Misty', 8);
    let H = null;
    H = monta({ ls: { count: '2' }, exec: (c, wv) => Promise.resolve(H && ehEstado(c) && H.webviews.indexOf(wv) === 0 ? m0.run(c) : null) }); await vez();
    H.stCache[1] = push(H, m1); // painel 2 pelo push; o painel 1 sem push recente: o Simples pergunta (executeJavaScript)
    H.cardsSet(true);
    await H.refreshCards(true);
    const h = H.cardsEl.innerHTML;
    for (const i of [0, 1]) {
      const c = colunas(h, i) || [];
      const via = i ? 'push' : 'leitura direta';
      ok(/^Scizor Lv300$/.test(c[1] || ''), 'conta ' + (i + 1) + ' (' + via + '): Pokemon mostra o lider "' + c[1] + '" (era "—")');
      ok(c[7] === '11', 'conta ' + (i + 1) + ': Capturas 11 do analyzer (' + c[7] + ')');
      ok(/^Kabutops 180\/192 ×1\.70$/.test(c[9] || ''), 'conta ' + (i + 1) + ': Melhor catch "' + c[9] + '" (era "—")');
      ok(/^Rattata \d\d:\d\d/.test(c[10] || ''), 'conta ' + (i + 1) + ': Ultimo catch "' + c[10] + '" (era "—")');
    }
  });

  await secao('T1: painel parado (alert/confirm aberto, renderer travado) nao congela o Simples, a aba Σ, o Painel nem o amostrador (MEDIA)', async () => {
    let H = null, g0 = 11000;
    const dado = (i) => conta({ cid: 'c' + i, name: 'Conta' + (i + 1), hunt: 'Bug Cave', a: { seconds: 900, gph: i ? 11000 * (i + 1) : g0, xph: 1, kph: 1, captures: 0 } });
    // o painel 2 nunca responde (a promise do executeJavaScript fica pendente, como no dialogo aberto ou no renderer travado)
    H = monta({ exec: (c, wv) => { const i = H ? H.webviews.indexOf(wv) : -1; if (!ehEstado(c)) return Promise.resolve(null); return i === 1 ? new Promise(() => {}) : Promise.resolve(dado(i)); } }); await vez();
    H.cardsSet(true);
    const r1 = await corre(H.refreshCards(true), 1500);
    let h = H.cardsEl.innerHTML;
    const c0 = colunas(h, 0) || [], c1 = colunas(h, 1) || [], c3 = colunas(h, 3) || [];
    ok(r1 === 'terminou' && c0[4] === '+11K' && c3[4] === '+44K', 'Simples: o redesenho termina e mostra as contas 1 e 4 (' + r1 + '; ' + c0[4] + ', ' + c3[4] + ')');
    ok(c1[11] === H.t('cdWaiting'), 'e a conta parada fica "' + H.t('cdWaiting') + '" (' + c1[11] + ')');
    g0 = 777777;
    const r2 = await corre(H.refreshCards(true), 1500);
    ok(r2 === 'terminou' && (colunas(H.cardsEl.innerHTML, 0) || [])[4] === '+778K', 'o tique seguinte continua atualizando: conta 1 em +778K/h (' + r2 + ')');
    H.setStatsOpen(true); H.setStatsIdx(-1);
    const r3 = await corre(H.renderAggregate(), 1500);
    h = H.statsEl.querySelector('.st-body').innerHTML;
    const card2 = (/<span class="acn">Treinador 2<\/span>[\s\S]*?<\/div><div class="ac2">([\s\S]*?)<\/div><\/div>/.exec(h) || [])[1] || '';
    ok(r3 === 'terminou' && ['Conta1', 'Conta3', 'Conta4'].every((n) => h.includes('<span class="acn">' + n + '</span>')), 'aba Σ: desenha os cartoes das outras contas (' + r3 + ')');
    ok(card2.includes(H.t('statsWaiting')) && !card2.includes(H.t('statsOff')), 'e o painel parado aparece "' + H.t('statsWaiting') + '", nao desligado');
    ok(h.includes('>+855K</div><div class="kl">gold / h'), 'o total de gold/h e o das 3 que responderam (777.777 + 33.000 + 44.000)');
    H.setStatsIdx(1);
    const r4 = await corre(H.refreshStats(), 1500);
    ok(r4 === 'terminou' && H.statsEl.querySelector('.st-body').innerHTML.includes(H.t('statsWaiting')), 'Painel da conta parada: mostra que esta esperando em vez de travar (' + r4 + ')');
    const r5 = await corre(H.renderSettings(), 1500);
    ok(r5 === 'terminou' && H.statsEl.querySelector('.st-cfg').innerHTML.includes('cfgBallSel'), 'engrenagem do Painel abre com a conta parada selecionada (' + r5 + ')');
    const amostrador = H.ints.find((x) => x.ms === 30000 && /amostraHunt/.test(String(x.f)));
    const r6 = await corre(amostrador.f(), 1500);
    ok(r6 === 'terminou' && ['c0', 'c2', 'c3'].every((k) => H.huntStats[k]), 'amostrador de 30 s: termina e amostra as contas 1, 3 e 4 (' + r6 + '; ' + Object.keys(H.huntStats).join(',') + ')');
  });

  await secao('T2: conta logada parada na cidade aparece "na cidade" e nao conta como ativa (MEDIA)', async () => {
    const H0 = monta(); await vez();
    ok(['pt', 'en', 'es'].every((L2) => typeof H0.I18N[L2].cdInCity === 'string' && H0.I18N[L2].cdInCity && !/—/.test(H0.I18N[L2].cdInCity)), 'texto novo nos 3 idiomas, sem travessao');
    const mk = async (nome, cid, cidade) => {
      const m = mundo({ '/api/characters/me': { character: { id: cid, name: nome, level: 300, gold: 5000 } } });
      await m.busca('/api/characters/me');
      m.msg({ type: 'pokes', list: [{ id: 1, name: 'Scizor', level: 300, team: true, slot: 0, leader: true }] });
      m.msg({ type: 'field-init', slug: 'bug_cave' });
      for (let k = 0; k < 20; k++) { m.tick(5000); m.msg({ type: 'field-kill', xpGained: 100, loot: [] }); }
      if (cidade) { m.msg({ type: 'field-teleport-city' }); m.tick(60000); } // o jogo levou a conta pra cidade (reload, troca de idioma, servidor reiniciou)
      return m;
    };
    const caca = await mk('Ash', 7, false), cid = await mk('Misty', 8, true);
    ok(cid.run(READ_STATE).hunt === '' && caca.run(READ_STATE).hunt === 'Bug Cave', 'READ_STATE real: a da cidade vem sem hunt');
    const H = monta({ ls: { count: '2' } }); await vez();
    H.stCache[0] = push(H, caca); H.stCache[1] = push(H, cid);
    H.cardsSet(true);
    await H.refreshCards(true);
    const h = H.cardsEl.innerHTML, c0 = colunas(h, 0) || [], c1 = colunas(h, 1) || [];
    ok(c1[2] === '—' && c1[11] === H.t('cdInCity'), 'conta na cidade: Hunt "—" e Status "' + c1[11] + '" (antes "' + H.t('cdHunting') + '" em verde)');
    ok(c0[11] === H.t('cdHunting'), 'a que esta cacando continua "' + c0[11] + '"');
    const kpi = (new RegExp('<div class="v"[^>]*>([^<]*)</div><div class="l">' + H.t('cdActive')).exec(h) || [])[1];
    ok(kpi === '1 / 2' && h.includes('<td>' + H.t('cdTotal') + ' (1)</td>'), 'contas ativas 1 / 2 e Total (1) (' + kpi + ')');
  });

  await secao('T3: "Shinies Enc. Total" e "✨N vida" eram bolas jogadas em shiny: os rotulos dizem isso (MEDIA)', async () => {
    // conta que viu 2 shinies na vida: um Rattata (55 bolas ate pegar) e um Spearow (7 bolas, fugiu)
    const m = mundo({
      '/api/characters/me': { character: { id: 7, name: 'Ash', level: 120, gold: 5000 } },
      '/api/game/used-balls': { caught: [19], pokemons: [
        { dexId: 19, speciesId: 19, name: 'Rattata', shiny: false, attempts: 3, total: 10 },
        { dexId: 19, speciesId: 19, name: 'Shiny Rattata', shiny: true, attempts: 0, total: 55 },
        { dexId: 21, speciesId: 21, name: 'Shiny Spearow', shiny: true, attempts: 7, total: 7 }] }
    });
    await m.busca('/api/characters/me');
    m.msg({ type: 'pokes', list: [] });
    m.msg({ type: 'field-init', slug: 'kabutops' });
    await m.busca('/api/game/used-balls');
    const d = m.run(READ_STATE);
    ok(d.shinyEnc === 62, 'READ_STATE real: shinyEnc = ' + d.shinyEnc + ' (55 + 7 bolas, e a conta viu 2 shinies)');
    for (const lang of ['pt', 'en', 'es']) {
      const H = monta({ ls: { lang } }); await vez();
      const bola = lang === 'en' ? /\bballs\b/i : /\bbolas\b/i;
      const rot = ['stShinyLife', 'stShinyLifeAll', 'acLife'].map((k) => H.t(k));
      ok(rot.every((x) => bola.test(x) && !/found|enc\.|encontrad|\bvida\b|lifetime|—/i.test(x)), '[' + lang + '] rotulos falam de bolas: ' + rot.join(' | '));
      H.renderStats(clone(d));
      ok(H.statsEl.querySelector('.st-body').innerHTML.includes('<span class="l">' + rot[0] + '</span><span class="v" style="color:#f2c665">✨ 62</span>'), '[' + lang + '] Painel > Sessao: "' + rot[0] + '" = 62');
      ok(H.aggCard('#c07bf5', 'Ash', clone(d)).includes('✨62 ' + rot[2] + '</span>'), '[' + lang + '] Σ > cartao da conta: "✨62 ' + rot[2] + '"');
    }
  });

  await secao('T4: catalogo vazio do painel no login nao fica em cache ate fechar o app (MEDIA)', async () => {
    const roda = (P) => vm.runInContext(READ_CATALOG, vm.createContext({ window: { __poke: P } }));
    const ITENS = { items: [{ id: 201, name: 'Great Potion' }, { id: 204, name: 'Ultra Potion' }] };
    const login = roda({ ws: {}, api: {} });
    const logada = roda({ ws: { balls: { catalog: [{ id: 1, name: 'Poke Ball', priceGold: 10 }, { id: 4, name: 'Ultra Ball', priceGold: 100 }] } }, api: { '/game/items.json': ITENS } });
    ok(login.items.length === 0 && login.balls.length === 0 && logada.balls.length === 2, 'READ_CATALOG real: na tela de login o coletor ja responde, com o catalogo vazio');
    let H = null;
    H = monta({ exec: (c, wv) => Promise.resolve(c === READ_CATALOG ? (H && H.webviews.indexOf(wv) === 0 ? login : logada) : null) }); await vez();
    H.setStatsIdx(1);
    await H.renderSettings(); await vezes(4);
    const sel = H.statsEl.querySelector('.st-cfg').querySelector('#cfgBallSel');
    ok((sel.innerHTML.match(/<option/g) || []).length === 2, 'painel 1 no login, conta 2 logada: "Comprar pokebolas" lista as 2 bolas (' + (sel.innerHTML.match(/<option/g) || []).length + ')');
    let logou = false;
    const H2 = monta({ exec: (c) => Promise.resolve(c === READ_CATALOG ? (logou ? logada : login) : null) }); await vez();
    const c1 = await H2.loadCatalog();
    logou = true;
    const c2 = await H2.loadCatalog();
    ok(c1 && c1.balls.length === 0 && c2 && c2.balls.length === 2 && c2.items.length === 2, 'todas no login e depois uma loga: o catalogo chega sem reabrir o app (' + (c2 ? c2.balls.length : 0) + ' bolas)');
  });

  await secao('T5: Shinies tentados em Sessao nao contam a vida da conta que acabou de entrar no painel (baixa)', async () => {
    const H = monta({ ls: { shinyTriedMode: 'sess' } }); await vez();
    H.cardsSet(true);
    const ul = (sid, name, total) => [{ sid, name, shiny: true, total, attempts: total }];
    const sess = (nome) => { const m = new RegExp('title="' + nome + ' · ([\\d.]+) ').exec(H.cardsEl.innerHTML); return m ? m[1] : null; };
    H.stCache[0] = { t: Date.now(), d: conta({ cid: 'c1', usedList: ul(25, 'Shiny Pikachu', 100) }) };
    await H.refreshCards(true);
    H.stCache[0] = { t: Date.now(), d: conta({ cid: 'c1', usedList: ul(25, 'Shiny Pikachu', 105) }) };
    await H.refreshCards(true);
    ok(sess('Shiny Pikachu') === '5', 'conta 1: 5 bolas na sessao (' + sess('Shiny Pikachu') + ')');
    // o painel 1 loga OUTRA conta (Treinadores ou Sair e entrar), que ja jogou 4.321 bolas num Gengar shiny na vida
    H.stCache[0] = { t: Date.now(), d: conta({ cid: 'c2', name: 'Misty', usedList: ul(94, 'Shiny Gengar', 4321) }) };
    await H.refreshCards(true);
    ok(sess('Shiny Gengar') === null, 'conta recem-logada: nenhuma tentativa "da sessao" (antes ' + '4.321)');
    H.stCache[0] = { t: Date.now(), d: conta({ cid: 'c2', name: 'Misty', usedList: ul(94, 'Shiny Gengar', 4330) }) };
    await H.refreshCards(true);
    ok(sess('Shiny Gengar') === '9', 'e as bolas que ela jogar dali em diante contam (' + sess('Shiny Gengar') + ')');
  });

  await secao('T6: quadro do Ditto sem forma viavel diz "nada ainda" com o catalogo na memoria, nao "carregando" (baixa)', async () => {
    const R = await catalogo();
    const dit = [{ id: 'd1', name: 'Ditto', level: 300, q: 1.4, ivt: 89, dt: true, ld: true }];
    const H = monta({ exec: rota(R), ls: { huntScope: 'minhas' } }); await vez(); await carrega(H);
    ok(H.huntsCache && Object.keys(H.movesByName).length > 100, 'catalogo carregado pelo carregaHunts real (' + (H.huntsCache || []).length + ' hunts)');
    H.stCache[0] = { t: Date.now(), d: conta({ hunt: '', team: dit }) }; // escopo Minhas, conta na cidade, sem hunt medida: lista vazia
    H.cardsSet(true); H.setHuntSort('sug');
    await H.refreshCards(true);
    const corpo = depois(H.cardsEl.innerHTML, H.t('cdDittoH'));
    ok(corpo && !corpo.includes(H.t('cdLoading')) && corpo.includes(H.t('cdNone')), 'diz "' + H.t('cdNone') + '" (antes "' + H.t('cdLoading') + '" pra sempre)');
    const H2 = monta({ ls: { huntScope: 'minhas' } }); await vez();
    H2.stCache[0] = { t: Date.now(), d: conta({ hunt: '', team: dit }) };
    H2.cardsSet(true); H2.setHuntSort('sug');
    await H2.refreshCards(true);
    ok(H2.cardsEl.innerHTML.includes(H2.t('cdLoading')), 'sem o catalogo ainda continua "' + H2.t('cdLoading') + '"');
  });

  await secao('T7: hunt oculta (✕) sai do quadro do Ditto e da lista da hunt-alvo (baixa)', async () => {
    const R = await catalogo();
    const d = conta({ hunt: 'Bug Cave', team: [{ id: 'd1', name: 'Ditto', level: 300, q: 2, ivt: 119, dt: true, shiny: true, ld: true }] });
    const quadro = (H) => [...depois(H.cardsEl.innerHTML, H.t('cdDittoH')).matchAll(/→ [^<]+ <span style="color:#7d8590">· ([^<]+?)(?: Lv\d+)?<\/span>/g)].map((m) => m[1]);
    const abre = async (ls) => { const H = monta({ exec: rota(R), ls: Object.assign({ huntScope: 'todas' }, ls) }); await vez(); await carrega(H); H.stCache[0] = { t: Date.now(), d: clone(d) }; H.cardsSet(true); H.setHuntSort('sug'); await H.refreshCards(true); return H; };
    const H = await abre({});
    const alvo = quadro(H)[0];
    ok(!!alvo && H.cardsEl.innerHTML.includes('<option value="' + H.esc(alvo) + '"'), 'Shiny Ditto Lv300: 1a linha do quadro em ' + alvo + ', que tambem esta na lista da hunt-alvo');
    const H2 = await abre({ huntHidden: JSON.stringify({ [alvo]: 1 }) });
    const q2 = quadro(H2);
    ok(q2.length > 0 && !q2.includes(alvo), 'ocultei ' + alvo + ': sai do quadro (' + q2.length + ' tipos, agora em ' + q2[0] + ')');
    ok(!H2.cardsEl.innerHTML.includes('<option value="' + H2.esc(alvo) + '"'), 'e da lista da hunt-alvo');
  });

  await secao('T8: Inventario (bag + depot) so soma paineis ligados e logados (baixa)', async () => {
    const H = monta({ exec: (c) => Promise.resolve(c.includes('/api/game/depot') ? { 201: 50 } : null) }); await vez();
    H.stCache[0] = { t: Date.now(), d: conta({ cid: 'c1', name: 'Ash', invMap: { 204: 3 } }) };
    H.stCache[1] = { t: Date.now(), d: conta({ cid: 'c2', name: 'Misty', invMap: { 204: 1 } }) };
    H.cardsSet(true);
    await H.refreshCards(true); await vezes(2); // 1a passada busca o depot de cada painel
    await H.refreshCards(true);
    const item = (id) => { const h = depois(H.cardsEl.innerHTML, 'data-s="inv"'); const m = new RegExp('<div class="cd-row" title="([^"]*)"><span class="rn">#' + id + '</span><span style="color:#f2c665">([^<]*)<').exec(h); return m ? m[2] + ' [' + m[1] + ']' : null; };
    ok(item(201) === '100 [Ash (depot): 50 · Misty (depot): 50]', '4 paineis ligados, 2 logados: o depot dos que estao no login nao entra (' + item(201) + ')');
    H.off[1] = true; H.off[2] = true; H.off[3] = true; // desliga os paineis 2, 3 e 4
    await H.refreshCards(true);
    ok(item(201) === '50 [Ash (depot): 50]' && item(204) === '3 [Ash: 3]', 'so o painel 1 ligado: bag e depot so dele (' + item(201) + ' | ' + item(204) + ')');
  });

  await secao('T9: o Pokemon escolhido no Sugerido segue o mesmo Pokemon quando o time e reordenado (baixa)', async () => {
    const R = await catalogo();
    const golpesScz = new Set(R.mv.scizor.a.map((g) => g[0]));
    const kab = { id: 'k1', name: 'Kabutops', level: 300, q: 1.3, ivt: 120, ld: true, t1: 'ROCK', t2: 'WATER' };
    const scz = { id: 's1', name: 'Scizor', level: 300, q: 1.5, ivt: 150, ld: false, t1: 'BUG', t2: 'STEEL' };
    const onix = { id: 'o1', name: 'Onix', level: 300, q: 1, ivt: 90, ld: false, t1: 'ROCK', t2: 'GROUND' };
    const selDe = (H) => (/<select id="cdHuntPk"[^>]*>([\s\S]*?)<\/select>/.exec(H.cardsEl.innerHTML) || [])[1] || '';
    const escolhido = (H) => (/<option value="[^"]*" selected>([^<]*)<\/option>/.exec(selDe(H)) || [])[1] || '(nenhum)';
    const valorDe = (H, nome) => (new RegExp('<option value="([^"]*)"[^>]*>[^<]*' + nome).exec(selDe(H)) || [])[1];
    const golpe = (H) => (/<br><span style="font-size:10px;color:#8b949e">(?:⚔|🔮) (.+?)(?: <b| ×)/.exec(depois(H.cardsEl.innerHTML, 'id="cdHuntPk"')) || [])[1];
    const time = (H, team) => { H.stCache[0] = { t: Date.now(), d: conta({ hunt: 'Bug Cave', team: clone(team) }) }; return H.refreshCards(true); };
    const abre = async (ls) => { const H = monta({ exec: rota(R), ls: Object.assign({ huntScope: 'todas' }, ls) }); await vez(); await carrega(H); H.cardsSet(true); H.setHuntSort('sug'); return H; };
    const H = await abre({});
    await time(H, [kab, scz]);
    const sel = H.cardsEl.querySelector('#cdHuntPk'); sel.value = valorDe(H, 'Scizor'); sel.onchange(); await vez();
    ok(/Scizor/.test(escolhido(H)) && golpesScz.has(golpe(H)), 'escolhi o Scizor: select "' + escolhido(H) + '", 1a hunt com ' + golpe(H));
    await time(H, [Object.assign({}, scz, { ld: true }), Object.assign({}, kab, { ld: false })]); // no jogo o Scizor virou lider: vai pra frente
    ok(/Scizor/.test(escolhido(H)) && golpesScz.has(golpe(H)), 'Scizor virou lider (time reordenado): continua o Scizor (' + escolhido(H) + ', ' + golpe(H) + '; antes trocava pro Kabutops sem aviso)');
    await time(H, [kab, onix]); // o Scizor saiu do time e o Onix ficou na posicao dele
    ok(!/Onix/.test(escolhido(H)), 'Scizor saiu do time: nao pega o Onix que ficou na posicao (' + escolhido(H) + ')');
    // escolha salva antes desta versao ("painel:posicao"): vale a posicao uma vez e dali em diante segue o Pokemon
    const H2 = await abre({ cdHuntPk: '0:1' });
    await time(H2, [kab, scz]);
    await time(H2, [Object.assign({}, scz, { ld: true }), Object.assign({}, kab, { ld: false })]);
    ok(/Scizor/.test(escolhido(H2)) && /:s1$/.test(H2.huntPkSel), 'escolha antiga "0:1": era o Scizor e continua o Scizor depois de reordenar (' + escolhido(H2) + ', salvo ' + H2.huntPkSel + ')');
  });

  await secao('T10: hora estimada da meta diaria so aparece se cair antes da meia-noite (baixa)', async () => {
    const dk = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const as = async (hh, mm) => {
      const a = new Date(realNow()); desloc = new Date(a.getFullYear(), a.getMonth(), a.getDate(), hh, mm, 0).getTime() - realNow();
      const hd = { [dk(new Date(Date.now()))]: { 0: { g: 1000000, x: 0, kl: 10, c: 0, sf: 0, sc: 0 } } };
      const H = monta({ ls: { histDay: JSON.stringify(hd), goalsDay: JSON.stringify({ g: 4000000, c: 0 }) } }); await vez();
      H.stCache[0] = { t: Date.now(), d: conta({ a: { seconds: 3600, gph: 1000000, xph: 1, kph: 1 } }) }; // 1M/h, faltam 3M = 3 h
      H.cardsSet(true);
      await H.refreshCards(true);
      const m = new RegExp(H.t('goalEta') + ' ~(\\d\\d:\\d\\d)').exec(H.cardsEl.innerHTML);
      return m ? m[1] : null;
    };
    const noite = await as(22, 30), manha = await as(10, 0);
    desloc = 0;
    ok(noite === null, '22:30 faltando 3 h: nao promete hora nenhuma (antes "~01:30", com o Hoje ja zerado)');
    ok(manha === '13:00', '10:00 faltando 3 h: "~' + manha + '"');
  });

  await secao('T11: engrenagem do Simples: soltar uma secao em Alertas/Webhook nao mexe na ordem (baixa)', async () => {
    const H = monta(); await vez();
    H.cardsSet(true); H.setCardsCfgOpen(true);
    const linha = (sec) => ({ dataset: sec ? { s: sec } : {}, style: {}, ev: {}, addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } });
    const trend = linha('trend'), kpis = linha('kpis'), alerta = linha(null); // <div class="cd-cfg-row"><label><input id="cdAl_shiny">...
    const qsa = H.cardsEl.querySelectorAll.bind(H.cardsEl);
    H.cardsEl.querySelectorAll = (q) => (q === '.cd-cfg-row' ? [trend, kpis, alerta] : q === '.cd-cfg-row[data-s]' ? [trend, kpis] : qsa(q)); // como o navegador: [data-s] so pega as linhas de secao
    await H.refreshCards(true);
    const antes = H.cardsCfg.order.join(' ');
    trend.ev.dragstart[0]();
    if (alerta.ev.drop) { alerta.ev.dragover[0]({ preventDefault() {} }); alerta.ev.drop[0]({ preventDefault() {} }); }
    ok(H.cardsCfg.order.join(' ') === antes, 'soltar "trend" na linha do alerta de shiny: ordem igual (' + H.cardsCfg.order.join(' ') + ')');
    kpis.ev.drop[0]({ preventDefault() {} });
    ok(H.cardsCfg.order[0] === 'trend' && H.cardsCfg.order[1] === 'kpis', 'soltar numa secao continua reordenando (' + H.cardsCfg.order.slice(0, 3).join(' ') + ')');
  });

  await secao('T12: textos fixos em portugues no app em ingles/espanhol (baixa)', async () => {
    const I = monta().I18N;
    const novas = ['cdInCity', 'bagBalls', 'bagCards', 'bagClan', 'bagKeys', 'bagOther', 'potions', 'cdGoldDay', 'cdXpDay', 'cdOrreTip', 'scBtnTitle', 'rqDivine', 'rqAncient', 'rqMythic', 'rqLegendary', 'rqEpic', 'rqRare', 'rqUncommon', 'rqCommon', 'rqWeak'];
    ok(novas.every((k) => ['pt', 'en', 'es'].every((L2) => typeof I[L2][k] === 'string' && I[L2][k] && !/—/.test(I[L2][k]))), 'chaves novas nos 3 idiomas, sem travessao');
    ok(I.en.tlGeralHint.includes("the game's best"), 'tierlist Geral em ingles: "the game\'s best" (era "the games best")');
    const PT = { en: /Pokébolas|Cartas|Clã|Chaves|Outros|\bbolas\b|Gold\/dia|XP\/dia|já com o multiplicador|\b(Divina|Anciã|Mítica|Lendária|Épica|Rara|Incomum|Comum|Fraca)\b/g,
      es: /Pokébolas|Clã|Chaves|Outros|\bpotions\b|Gold\/dia|XP\/dia|já com o multiplicador|\b(Anciã|Lendária|Incomum|Comum|Fraca)\b/g };
    const sobra = (lang, h) => [...new Set(texto(h).match(PT[lang]) || [])];
    // mochila com Pokebolas, Cartas, Cla, Chaves e Outros, pelo coletor e READ_STATE reais
    const ITENS = { items: [{ id: 201, name: 'Great Potion', category: 'heal', npcPrice: 30 }, { id: 9001, name: 'Pikachu Card', category: 'card' }, { id: 9002, name: 'Clan Banner', category: 'clan' }, { id: 9003, name: 'Rusty Key', category: 'key' }, { id: 9004, name: 'Odd Thing', category: 'misc' }] };
    const m = mundo({ '/api/characters/me': { character: { id: 7, name: 'Ash', level: 120, gold: 5000, clan: { slug: 'lendas', name: 'Lendas' } } }, '/game/items.json': ITENS });
    await m.busca('/api/characters/me'); await m.busca('/game/items.json');
    m.msg({ type: 'pokes', list: [] });
    m.msg({ type: 'field-init', slug: 'bug_cave' });
    m.msg({ type: 'balls', catalog: [{ id: 1, name: 'Poke Ball', priceGold: 10 }, { id: 4, name: 'Ultra Ball', priceGold: 100 }], counts: { 1: 500, 4: 20 }, expires: {} });
    m.msg({ type: 'inventory', items: [9001, 9002, 9003, 9004, 201].map((itemId) => ({ itemId, quantity: 3 })) });
    const d = m.run(READ_STATE);
    ok(['Pokébolas', 'Cartas', 'Clã', 'Chaves', 'Outros'].every((l) => d.bag.some((g) => g.label === l)), 'rotulos que o READ_STATE manda (chave salva, nao muda): ' + d.bag.map((g) => g.label).join(', '));
    const R = await catalogo();
    const orre = dedup(R.h).find((x) => x.ar === 'orre');
    ok(!!orre, 'a fixture tem hunt de Orre pro tooltip (' + (orre && orre.name) + ')');
    const ontem = new Date(Date.now() - 864e5), hoje = new Date(Date.now()), dk = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    for (const lang of ['en', 'es']) {
      const W = { en: { balls: 'Poké Balls', cards: 'Cards', keys: 'Keys', other: 'Other', clan: 'Clan', pot: 'potions', rare: 'Rare', epic: 'Epic', gd: 'Gold/day', bl: 'balls' }, es: { balls: 'Poké Balls', cards: 'Cartas', keys: 'Llaves', other: 'Otros', clan: 'Clan', pot: 'pociones', rare: 'Rara', epic: 'Épica', gd: 'Gold/día', bl: 'bolas' } }[lang];
      // Painel + engrenagem (statsCfg com o Clã escondido: a chave salva continua em portugues e vale no idioma novo)
      let H = null;
      H = monta({ ls: { lang, statsCfg: JSON.stringify({ bagHide: { 'Clã': true } }) }, exec: (c) => Promise.resolve(ehEstado(c) ? clone(d) : null) }); await vez();
      H.renderStats(clone(d));
      const corpo = H.statsEl.querySelector('.st-body').innerHTML;
      ok(sobra(lang, corpo).length === 0 && [W.balls, W.cards, W.keys, W.other].every((x) => corpo.includes('<span class="bn">' + x + '</span>')), '[' + lang + '] Painel > Bag: ' + [W.balls, W.cards, W.keys, W.other].join(', ') + (sobra(lang, corpo).length ? ' (sobrou ' + sobra(lang, corpo) + ')' : ''));
      ok(!corpo.includes('<span class="bn">' + W.clan + '</span>') && corpo.includes('title="' + W.clan + ': lendas"'), '[' + lang + '] categoria escondida pela chave antiga ("Clã") continua escondida; tooltip do cla "' + W.clan + ': lendas"');
      await H.renderSettings();
      const eng = H.statsEl.querySelector('.st-cfg').innerHTML;
      ok(sobra(lang, eng).length === 0 && eng.includes('data-bag="Cartas"><span class="cfg-grip">⋮⋮</span><label class="cfg-chk"><input type="checkbox" data-bag="Cartas" checked> ' + W.cards + '</label>'), '[' + lang + '] engrenagem: categoria "' + W.cards + '" na tela, chave "Cartas" por baixo' + (sobra(lang, eng).length ? ' (sobrou ' + sobra(lang, eng) + ')' : ''));
      ok(eng.includes('>+' + H.nf(1000) + '</button>') && H.nf(1000) === (lang === 'en' ? '1,000' : '1.000'), '[' + lang + '] botao de compra "+' + H.nf(1000) + '"');
      H.setStatsOpen(true); H.setStatsIdx(-1);
      await H.renderAggregate();
      const sig = H.statsEl.querySelector('.st-body').innerHTML;
      ok(sobra(lang, sig).length === 0 && sig.includes('<div class="a4l">' + W.balls + '</div>') && sig.includes(' ' + W.pot + '</span>'), '[' + lang + '] Σ: "' + W.balls + '" e "' + W.pot + '"' + (sobra(lang, sig).length ? ' (sobrou ' + sobra(lang, sig) + ')' : ''));
      // Simples: estoque acabando, captura Rara, hunt de Orre favorita e 2 dias de historico
      const lc = [{ n: 'Pikachu', iv: 120, q: 1.35, t: Date.now() - 60000, p: 0, acc: 'Ash', dot: '#c07bf5' }];
      const hd = { [dk(ontem)]: { 0: { g: 1000, x: 10, kl: 1, c: 1, sf: 0, sc: 0 } }, [dk(hoje)]: { 0: { g: 2000, x: 20, kl: 1, c: 1, sf: 0, sc: 0 } } };
      const S = monta({ exec: rota(R), ls: { lang, lifeCatch: JSON.stringify(lc), histDay: JSON.stringify(hd), huntScope: 'minhas', huntFavs: JSON.stringify({ [orre.name]: 1 }) } }); await vez(); await carrega(S);
      S.stCache[0] = { t: Date.now(), d: conta({ hunt: 'Bug Cave', level: 600, balls: 300, potions: 5000, a: { seconds: 3600, gph: 1000, xph: 5000, kph: 400, ballsUsed: 200, potsUsed: 10 } }) };
      S.cardsSet(true);
      await S.refreshCards(true);
      const h = S.cardsEl.innerHTML;
      ok(sobra(lang, h).length === 0, '[' + lang + '] Simples sem texto em portugues' + (sobra(lang, h).length ? ' (sobrou ' + sobra(lang, h) + ')' : ''));
      ok(h.includes('>' + W.bl + ' ~2h</span>'), '[' + lang + '] Status: estoque acabando "' + W.bl + ' ~2h"');
      ok(h.includes('Pikachu <b style="color:#b06cff">' + W.rare + '</b>'), '[' + lang + '] Capturas: "Pikachu ' + W.rare + '"');
      ok(h.includes('title="' + S.t('cdOrreTip').replace('{t}', +orre.tr || 0) + '">ORRE') && !/já com/.test(S.t('cdOrreTip')), '[' + lang + '] tooltip ORRE: "' + S.t('cdOrreTip').replace('{t}', +orre.tr || 0) + '"');
      ok(h.includes('<span>' + W.gd + ' · 2d</span>'), '[' + lang + '] Tendencia: "' + W.gd + ' · 2d"');
      // card de IV e botao Scripts
      S.setIv({ nome: 'Scizor', qualidade: 1.55, ivTotal: 120, ivMax: 192, nivel: 80, percentual: 62.5 }, 0);
      S.ivRender();
      ok(S.byId.get('ivCard').innerHTML.includes('>' + W.epic + '</span> ×1.55'), '[' + lang + '] card de IV: "' + W.epic + ' ×1.55"');
      ok(S.byId.get('scriptsBtn').title === S.t('scBtnTitle') && !/painéis/.test(S.byId.get('scriptsBtn').title), '[' + lang + '] tooltip do botao Scripts: "' + S.byId.get('scriptsBtn').title + '"');
    }
    const P = monta(); await vez();
    P.renderStats(clone(d));
    ok(P.statsEl.querySelector('.st-body').innerHTML.includes('<span class="bn">Pokébolas</span>') && P.statsEl.querySelector('.st-body').innerHTML.includes('<span class="bn">Chaves</span>'), 'em portugues continua igual (Pokébolas, Chaves)');
  });

  await secao('T13: numeros no formato do idioma e sem "1000K" (baixa)', async () => {
    const esp = { en: ['1.5M', '1,600', '+12.3K'], pt: ['1,5M', '1.600', '+12,3K'], es: ['1,5M', '1.600', '+12,3K'] };
    for (const lang of ['en', 'pt', 'es']) {
      const H = monta({ ls: { lang } }); await vez();
      const v = [H.nc(1500000), H.nf(1600), H.ncs(12345)];
      ok(v.join() === esp[lang].join(), '[' + lang + '] nc(1500000) ' + v[0] + ', nf(1600) ' + v[1] + ', ncs(12345) ' + v[2]);
      ok(H.nc(999499) === '999K' && H.nc(999500) === '1M' && H.nc(999999) === '1M' && H.nc(-999700) === '-1M' && H.nc(1e6) === '1M', '[' + lang + '] 999.499 -> ' + H.nc(999499) + ', 999.500 -> ' + H.nc(999500) + ', 999.999 -> ' + H.nc(999999) + ' (antes 1000K)');
    }
    const H = monta({ ls: { lang: 'en' } }); await vez();
    H.stCache[0] = { t: Date.now(), d: conta({ a: { seconds: 900, gph: 1500000, xph: 999700, kph: 1600 } }) };
    H.cardsSet(true); await H.refreshCards(true);
    const k = [...H.cardsEl.innerHTML.matchAll(/<div class="cd-kpi"><div class="v"[^>]*>([^<]*)<\/div><div class="l">/g)].slice(0, 3).map((x) => x[1]);
    ok(k.join(' | ') === '+1.5M | 1M | 1,600', 'Simples em ingles: ' + k.join(' | ') + ' (antes +1,5M | 1000K | 1.600)');
    ok(/2\.1 s/.test(H.calTexto()) && !/2,1/.test(H.calTexto()), 'tempos da tierlist em ingles com ponto: "' + H.calTexto().slice(0, 60) + '"');
  });

  await secao('T14: tierlist abre com tlEl estranho no disco ou na config importada (baixa)', async () => {
    const R = await catalogo();
    for (const v of ['fire', 'constructor', 'toString', '__proto__']) {
      const H = monta({ exec: rota(R), ls: { tlEl: v, tlLevel: '300' } }); await vez(); await carrega(H);
      H.document.getElementById('tlOverlay').classList.add('show');
      H.tos.length = 0; H.renderTier();
      const t1 = H.tos.filter((x) => x.ms === 140).pop();
      let erro = null; try { t1.f(); } catch (e) { erro = e.message; }
      const corpo = H.document.getElementById('tlBody').innerHTML, n = (corpo.match(/tl-row/g) || []).length;
      if (v === 'fire') ok(!erro && n > 5, 'tlEl "fire": ' + n + ' linhas');
      else ok(!erro && corpo.includes('cd-empty') && !corpo.includes('⏳'), 'tlEl "' + v + '": abre vazio, sem quebrar (' + (erro || 'ok') + ')');
    }
  });

  await secao('IV13: "Atualizar" script que passa de 4 MB nao diz "atualizado" nem recarrega (baixa)', async () => {
    const url = 'https://raw.githubusercontent.com/a/b/main/x.user.js';
    let novo = null;
    const H = monta({ ls: { userScripts: JSON.stringify([{ id: 'u1', name: 'X', code: '// v1', url }]), scriptsOn: JSON.stringify({ u1: true }) }, api: { fetchUserScript: async () => ({ ok: true, url, code: novo }) } }); await vez();
    novo = '// ==UserScript==\n// @version 2\n// ==/UserScript==\n//' + 'x'.repeat(4.3 * 1024 * 1024);
    await H.atualizaScript('u1');
    ok(H.alerts.length === 1 && H.alerts[0] === H.t('scGrande'), 'avisa so que nao coube (' + H.alerts.map((a) => String(a).slice(0, 40)).join(' | ') + ')');
    ok(H.confirms.length === 0 && H.webviews.every((w) => !w.recarregou), 'nao pergunta se recarrega nem recarrega painel');
    ok(H.userScripts[0].code === '// v1' && JSON.parse(H.store.get('userScripts'))[0].code === '// v1', 'o script continua o de antes, na memoria e no disco');
    novo = '// ==UserScript==\n// @version 2\n// ==/UserScript==\nconsole.log(2)';
    H.alerts.length = 0; H.confirms.length = 0;
    await H.atualizaScript('u1');
    ok(H.alerts.length === 1 && H.alerts[0].startsWith(H.t('scAtualizado') + ' v2') && JSON.parse(H.store.get('userScripts'))[0].code === novo, 'atualizacao que cabe continua: "' + H.alerts[0] + '"');
  });

  await secao('SH13: selo de versao nova manda o instalador pros downloads do instalador e o codigo-fonte pro repositorio dele (baixa)', async () => {
    const REL = 'https://github.com/soufoka/PokeGrid/releases/latest', SRC = 'https://github.com/soufoka/PokeGrid-source';
    const clica = async (pathname) => {
      const H = monta({ ls: { verNova: JSON.stringify({ t: Date.now(), tag: 'v9.9.9' }) }, nulos: ['appVerNew'], location: { pathname, reload() {} } }); await vez();
      const selo = H.byId.get('appVer').children.find((c) => c.id === 'appVerNew');
      if (!selo) return null;
      selo.onclick(); return H.abertos.pop();
    };
    const casos = [['/C:/Users/Ash/AppData/Local/Programs/PokeGrid/resources/app.asar/index.html', REL, 'instalador do Windows'],
      ['/C:/Users/Ash/AppData/Local/Temp/2kQ8x/resources/app.asar/index.html', REL, 'portatil (extraida no Temp)'],
      ['/Applications/PokeGrid.app/Contents/Resources/app.asar/index.html', REL, 'Mac'],
      ['/C:/Users/Ash/PokeGrid-portatil/resources/app/index.html', REL, 'pasta resources/app sem asar'],
      ['/C:/Users/Ash/Downloads/PokeGrid-source-main/index.html', SRC, 'codigo-fonte (iniciar.bat, electron .)']];
    for (const [p, alvo, rot] of casos) { const u = await clica(p); ok(u === alvo, rot + ': ' + u); }
    const mj = fs.readFileSync(path.join(RAIZ, 'main.js'), 'utf8');
    if (!mj.includes("'" + REL + "'")) console.log('AVISO o main.js so deixa a janela abrir os links do LINKS (will-navigate/setWindowOpenHandler) e ' + REL + ' nao esta la: ate entrar, o clique no selo do instalador nao abre nada');
  });

  Date.now = realNow;
  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('ERRO', e.stack); process.exit(1); });
