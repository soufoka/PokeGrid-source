// Redesign, etapa B (03/10/2026): status do FARM no cabecalho dos paineis (statusConta, a mesma funcao da coluna Status do
// Simples), cores em variaveis do :root, papeis das cores (vermelho so marca, principal e erro), numeros neutros, potencial e
// barras do IV pela nota, tipos escuros legiveis e decimais no formato do idioma fora do card de IV.
// As checagens de CSS leem o index.html; as de comportamento rodam o <script> REAL com o DOM falso do redesign-a, mais um
// webview que dispara os eventos do Electron (did-start-loading, did-fail-load, console-message...), o vigia de 6 s e o
// relogio de 30 s guardados pra rodar na mao e um Date.now que anda.
// Roda com: node test/redesign-b.test.js   (contra outra copia, pra comparar: node test/redesign-b.test.js caminho/do/index.html)
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const ARQ = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAIZ, 'index.html');
const s = fs.readFileSync(ARQ, 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
const css = s.slice(s.indexOf('<style>'), s.indexOf('</style>'));
const html = s.slice(s.indexOf('<body>'), s.indexOf('<script>', s.indexOf('<body>')));
const TOK = Object.fromEntries([...(((/:root \{([^}]*)\}/.exec(css) || [])[1]) || '').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const cor = (v) => String(v == null ? '' : v).replace(/var\((--[\w-]+)\)/g, (x, k) => TOK[k] || x); // var(--x) -> o valor do :root
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const vezes = async (n) => { for (let k = 0; k < n; k++) await vez(); };
const realNow = Date.now; let desloc = 0; Date.now = () => realNow() + desloc; // o relogio do app anda quando o teste quer
const MIN = 60e3;
const regra = (sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : cor(css.slice(i, css.indexOf('}', i) + 1)); }; // a regra CSS com esse seletor exato, com as variaveis resolvidas
// contraste WCAG entre duas cores #rgb/#rrggbb
const lum = (h) => { const x = String(h).replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3'), n = parseInt(x.slice(1), 16), c = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * c(n >> 16 & 255) + 0.7152 * c(n >> 8 & 255) + 0.0722 * c(n & 255); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// trecho do HTML do elemento com esse id e as tags/atributos de cada id (o DOM falso nasce igual ao HTML), como no redesign-a
const TAGS = {};
for (const m of html.matchAll(/<(\w+)\b([^>]*)>/g)) { const a = {}; for (const x of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) a[x[1]] = x[2]; if (a.id) TAGS[a.id] = { tag: m[1], a }; }

function monta(opts = {}) {
  const byId = new Map(), ints = [];
  let document;
  class CL { constructor(c) { this.s = new Set(c || []); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag, id, a) {
      a = a || {}; this.tagName = String(tag || 'div').toUpperCase(); this.id = id || ''; this.attrs = Object.assign({}, a);
      this.style = { setProperty() {}, display: /display:\s*none/.test(a.style || '') ? 'none' : '' };
      this.classList = new CL(String(a.class || '').split(/\s+/).filter(Boolean)); this.dataset = {};
      this.children = []; this._h = ''; this._t = ''; this.value = ''; this.checked = false; this.title = a.title || ''; this.options = [{}, {}]; this.childElementCount = 0; this.offsetHeight = 40; this.scrollTop = 0; this.ev = {}; this.parent = null;
    }
    get innerHTML() { return this._h; } set innerHTML(h) { this._h = String(h); this.children = []; }
    get textContent() { return this._t; } set textContent(v) { this._t = String(v); this.children = []; }
    get firstChild() { return this.children[0] || (this._h ? {} : null); }
    get className() { return [...this.classList.s].join(' '); } set className(v) { this.classList = new CL(String(v).split(/\s+/).filter(Boolean)); }
    get outerHTML() { return ''; } set outerHTML(v) {}
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } removeEventListener() {}
    emit(t, e) { (this.ev[t] || []).forEach((f) => f(e || {})); }
    querySelector(q) { this._q = this._q || {}; return this._q[q] || (this._q[q] = new El('div')); }
    querySelectorAll() { return []; }
    appendChild(c) { this.children.push(c); this.childElementCount = this.children.length; c.parent = this; return c; }
    remove() { if (this.parent) { const k = this.parent.children.indexOf(this); if (k >= 0) this.parent.children.splice(k, 1); } }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; }
    focus() { document.activeElement = this; } blur() { if (document.activeElement === this) document.activeElement = null; } select() {}
    click() { if (this.onclick) this.onclick({ target: this, stopPropagation() {}, preventDefault() {} }); }
    contains(x) { for (let e = x; e; e = e.parent) if (e === this) return true; return false; }
    closest() { return null; }
  }
  // o <webview> do Electron: eventos de verdade (os ouvintes do criarPainel) e a pagina respondendo pelo opts.exec
  class WV extends El {
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; this.recarregou = 0; }
    executeJavaScript(c) { return opts.exec ? opts.exec(String(c), this) : Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() { this.recarregou++; } reloadIgnoringCache() { this.recarregou++; } loadURL(u) { this.url = u; return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid');
  const pega = (id) => {
    if (id === 'grid') return grid;
    if (!byId.has(id)) { const T = TAGS[id] || { tag: 'div', a: {} }; byId.set(id, new El(T.tag, id, T.a)); }
    return byId.get(id);
  };
  document = {
    getElementById: pega, createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: () => [],
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAutoStart: async (on) => !!on, setAwake: async () => true, setMinToTray: async () => true, saveBackup: async () => true, openErrorLog() {}, appVersion: '1.5.31' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  // o que a etapa B criou vem por typeof: contra o app antigo a checagem FALHA em vez de o harness quebrar
  const novo = (n) => 'typeof ' + n + " !== 'undefined' ? " + n + ' : null';
  const exporta = '\n;return { t, I18N, decL, stCache, webviews, off, lastK, lastKT, lastFaint, READ_ALERTS, togglePower, refreshCards, cardsSet: (v) => { cardsOn = v; }, get cardsEl() { return cardsEl; },'
    + ' ivRender, setIv: (d, i) => { ivAberto = true; ivRecebe(i, d); }, setIvAba: (a) => { ivAba = a; }, festaShiny, aggCard, renderAggregate, statsEl, setStatsOpen: (v) => { statsOpen = v; }, setStatsIdx: (v) => { statsIdx = v; },'
    + ' TIPO_COR, tipoCor, IV_POT_COR, carregaHunts, statusConta: ' + novo('statusConta') + ', pintaStatus: ' + novo('pintaStatus') + ', ivNota: ' + novo('ivNota') + ', tipoTx: ' + novo('tipoTx') + ', tipoFg: ' + novo('tipoFg') + ' };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, { reload() {} }, (f, ms) => { ints.push({ f, ms }); return ints.length; }, noop, noop, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  return Object.assign(api, { byId: pega, grid, store, ints, document });
}
// leitura empurrada de uma conta (o READ_STATE ja saneado), com o default de uma conta logada farmando
const conta = (extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 300, gold: 1000, diamonds: 5, balls: 5000, potions: 5000, a: { seconds: 900, gph: 1000, xph: 5000, kph: 100 }, team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra || {});
const push = (H, i, d) => H.webviews[i].emit('console-message', { message: '__PGST__' + JSON.stringify(d) }); // o PUSH_STATE de 10 s
// o cabecalho do painel i como o usuario ve: classe da pilula, texto, detalhe, tom do painel e o Recarregar
const cab = (H, i) => {
  const p = H.grid.children[i], st = p.querySelector('.status'), h = st.innerHTML;
  return { cls: st.className, txt: (/<span class="st-t">([^<]*)<\/span>/.exec(h) || [])[1], sub: (/<small>· ([^<]*)<\/small>/.exec(h) || [])[1] || '', er: p.classList.contains('er'), av: p.classList.contains('av'), rec: p.querySelector('.pg-rec').hidden === false };
};
// a coluna Status do Simples: classe e texto da pilula de cada linha
const colStatus = async (H) => {
  H.cardsSet(true); await H.refreshCards(true);
  const o = {}; for (const m of H.cardsEl.innerHTML.matchAll(/<tr data-i="(\d)">[\s\S]*?<td><span class="cd-st (\w+)"[^>]*>([^<]*)<\/span><\/td><\/tr>/g)) o[m[1]] = { cls: m[2], txt: m[3] };
  return o;
};
const vigiaDe = (H) => H.ints.find((x) => x.ms === 6000 && /READ_ALERTS/.test(String(x.f)));
const lendo = (H, alerta) => (c, wv) => Promise.resolve(H() && c === H().READ_ALERTS ? alerta[H().webviews.indexOf(wv)] || null : null);
const SCIZOR = { nome: 'Scizor', shiny: false, ditto: false, tipos: ['BUG', 'STEEL'], ativo: false, time: false, nivel: 80, qualidade: 1.55, ivTotal: 122, stats: { hp: 146, atk: 216, def: 159, spa: 85, spd: 154, vel: 101 }, poder: 1335, fonte: 'tooltip' };
// catalogo do jogo (bases e golpes) pelo HUNTS_JS real com a fixture de 17/09, como no bh5-telas: sem ele o card nao calcula o IV de cada atributo
const zlib = require('zlib');
let RCAT = null;
async function catalogo() {
  if (RCAT) return RCAT;
  const i0 = s.indexOf('const HUNTS_JS = '), ini = s.indexOf('`', i0) + 1, HUNTS_JS = eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`');
  const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
  RCAT = await new Function('fetch', 'return ' + HUNTS_JS)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : u.indexOf('items') >= 0 ? { items: [] } : { creatures: J.creatures }) }));
  return RCAT;
}
const comCatalogo = async (ls) => { const R = await catalogo(); const H = monta({ ls, exec: (c) => Promise.resolve(c.includes('map-markers') ? R : null) }); await vezes(3); desloc += 61e3; H.carregaHunts(); await vezes(4); return H; };

(async () => {
  await secao('statusConta: cada estado do farm, com o cabecalho e a coluna Status do Simples dizendo o mesmo', async () => {
    const alerta = {}; let H = null;
    H = monta({ exec: lendo(() => H, alerta) }); await vezes(3);
    const W = H.webviews, T = H.t;
    ok(W.length === 4 && typeof H.statusConta === 'function' && typeof H.pintaStatus === 'function', 'uma funcao so (statusConta) e quem pinta o cabecalho (pintaStatus)');
    if (typeof H.statusConta !== 'function') return;
    const sc = (i) => H.statusConta(i);
    const igual = (i, cls, txt, sub) => { const s0 = sc(i), c0 = cab(H, i); return s0.cls === cls && s0.txt === txt && (sub == null || s0.sub === sub) && c0.cls === 'status ' + cls && c0.txt === txt && (sub == null || c0.sub === sub); };
    const diz = (i) => { const s0 = sc(i), c0 = cab(H, i); return s0.cls + ' "' + s0.txt + (s0.sub ? ' · ' + s0.sub : '') + '" | cabecalho ' + c0.cls + ' "' + c0.txt + (c0.sub ? ' · ' + c0.sub : '') + '"'; };
    W.forEach((w) => { w.emit('did-start-loading'); w.emit('did-stop-loading'); });
    push(H, 0, conta({ cid: 'c0', hunt: 'Furious Scyther', a: { seconds: 2 * 3600 + 47 * 60, gph: 224000, xph: 8.3e6, kph: 612 } }));
    push(H, 1, conta({ cid: 'c1', hunt: '' }));
    push(H, 2, conta({ cid: 'c2', hunt: 'Kabutops', potions: 38, balls: 640, a: { seconds: 3960, gph: 97300, xph: 2.6e6, kph: 688, potsUsed: 31, ballsUsed: 140 } }));
    W[3].emit('did-start-loading'); W[3].emit('did-fail-load', { errorCode: -105, isMainFrame: true }); // sem rede / DNS
    ok(igual(0, 'ok', T('cdHunting'), 'Furious Scyther · 2h 47m'), 'cacando: verde com a hunt e o tempo (' + diz(0) + ')');
    ok(igual(1, 'neutro', T('cdInCity'), ''), 'logada fora da hunt: "' + T('cdInCity') + '" (' + diz(1) + '; antes "online")');
    ok(igual(2, 'av', T('stPotLow').replace('{h}', '1h'), 'Kabutops') && /^⚠ Potions p\/ ~1h$/.test(sc(2).txt) && cab(H, 2).av, 'potions pra ~1 h: aviso ambar que se le direito (' + diz(2) + '; antes "caçando potions ~1h")');
    ok(igual(3, 'er', T('stError'), T('stRetry')) && cab(H, 3).er && cab(H, 3).rec && sc(3).rec, 'erro de carga: vermelho, painel com o tom de erro e o Recarregar (' + diz(3) + ')');
    let col = await colStatus(H);
    ok([0, 1, 2, 3].every((i) => col[i] && col[i].cls === sc(i).cls && col[i].txt === sc(i).txt), 'coluna Status do Simples = cabecalho nas 4 contas (' + [0, 1, 2, 3].map((i) => col[i] ? col[i].cls + ' ' + col[i].txt : '?').join(' | ') + ')');
    // 3 falhas seguidas: o caminho do msgDown
    W[3].emit('did-fail-load', { errorCode: -105, isMainFrame: true }); W[3].emit('did-fail-load', { errorCode: -105, isMainFrame: true });
    ok(igual(3, 'er', T('stDown'), T('stAgo').replace('{t}', '1 min')) && cab(H, 3).rec, '3 falhas seguidas (o caminho do msgDown): "' + T('stDown') + '" e ha quanto tempo (' + diz(3) + ')');
    W[3].emit('did-start-loading');
    ok(igual(3, 'er', T('stDown')), 'o recuo recarregando o painel que falhou: segue "' + T('stDown') + '", sem piscar "' + T('stLoading') + '" (' + diz(3) + ')');
    // parada: o vigia de 6 s ve os kills (a regra do msgStalled), 11 min sem kill
    const vigia = vigiaDe(H);
    alerta[0] = { live: true, sk: true, kills: 900, faintN: 0, shinyN: 0, cid: 'c0' }; alerta[1] = { live: true, sk: true, kills: 300, faintN: 0, shinyN: 0, cid: 'c1' };
    vigia.f(); await vezes(3);
    desloc += 11 * MIN;
    push(H, 0, conta({ cid: 'c0', hunt: 'Furious Scyther', a: { seconds: 2 * 3600 + 58 * 60 } }));
    ok(igual(0, 'av', T('stStalled').replace('{t}', '11 min'), 'Furious Scyther') && cab(H, 0).av, 'matou nesta sessao e nada ha 11 min: "' + sc(0).txt + '" (' + diz(0) + ')');
    // time derrotado: a subida do faintN (o msgFaint)
    alerta[1] = { live: true, sk: true, kills: 300, faintN: 1, shinyN: 0, cid: 'c1' };
    vigia.f(); await vezes(3);
    push(H, 1, conta({ cid: 'c1', hunt: '' }));
    ok(igual(1, 'er', T('stFaint'), T('stAgo').replace('{t}', '1 min')) && cab(H, 1).er && !cab(H, 1).rec, 'time inteiro derrotado: vermelho, sem Recarregar (recarregar nao cura o time) (' + diz(1) + ')');
    desloc += 1000; alerta[1] = { live: true, sk: true, kills: 301, faintN: 1, shinyN: 0, cid: 'c1' }; vigia.f(); await vezes(3);
    push(H, 1, conta({ cid: 'c1', hunt: 'Rota X' }));
    ok(igual(1, 'ok', T('cdHunting')), 'voltou a matar: sai do "time derrotado" (' + diz(1) + ')');
    // tela de login, carregando, sem leitura e jogo sem a conta (sincronizando)
    W[2].url = 'https://poke.idleworld.online/login'; W[2].emit('did-navigate', { url: W[2].url });
    ok(igual(2, 'neutro', T('stLogin')), 'na tela de login (' + diz(2) + ')');
    W[2].emit('did-start-loading');
    ok(igual(2, 'neutro', T('stLoading')), 'pagina carregando (' + diz(2) + ')');
    W[2].url = 'https://poke.idleworld.online/play'; W[2].emit('did-stop-loading');
    ok(igual(2, 'neutro', T('cdWaiting')), 'no ar mas a ultima leitura tem mais de 30 s: "' + T('cdWaiting') + '" (' + diz(2) + ')');
    push(H, 2, conta({ cid: '', name: '' }));
    ok(igual(2, 'neutro', T('cdWaiting')), 'o jogo ainda sem a conta (sincronizando, /me sem personagem): nao diz que esta farmando (' + diz(2) + ')');
    H.togglePower(2);
    ok(igual(2, 'off', T('stOff')) && H.grid.children[2].querySelector('.dot').className === 'dot off', 'painel desligado: cinza e a bolinha apagada (' + diz(2) + ')');
    col = await colStatus(H);
    ok([0, 1, 2, 3].every((i) => col[i] && col[i].cls === sc(i).cls && col[i].txt === sc(i).txt), 'e o Simples continua igual ao cabecalho (' + [0, 1, 2, 3].map((i) => col[i] ? col[i].cls + ' ' + col[i].txt : '?').join(' | ') + ')');
    desloc = 0;
  });

  await secao('cabecalho depois de um push: pilula, bolinha de identidade, Recarregar e escrita so quando muda', async () => {
    const H = monta(); await vezes(3);
    const W = H.webviews, T = H.t, p = H.grid.children[0], st = p.querySelector('.status'), dot = p.querySelector('.dot');
    let escritas = 0; const d0 = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(st), 'innerHTML');
    Object.defineProperty(st, 'innerHTML', { get: () => d0.get.call(st), set: (v) => { escritas++; d0.set.call(st, v); } });
    W[0].emit('did-start-loading'); W[0].emit('dom-ready'); W[0].emit('did-stop-loading');
    push(H, 0, conta({ hunt: 'Furious Scyther', a: { seconds: 2 * 3600 + 47 * 60 } }));
    ok(st.className === 'status ok' && st.innerHTML === '<span class="st-t">' + T('cdHunting') + '</span><small>· Furious Scyther · 2h 47m</small>' && st.title === T('cdHunting') + ' · Furious Scyther · 2h 47m',
      'push de 10 s: pilula verde "' + T('cdHunting') + '" com a hunt e o tempo menores (' + st.className + ': ' + st.innerHTML + ')');
    ok(!p.classList.contains('er') && !p.classList.contains('av') && p.querySelector('.pg-rec').hidden === true, 'sem tom no painel e sem Recarregar');
    const n0 = escritas;
    push(H, 0, conta({ hunt: 'Furious Scyther', a: { seconds: 2 * 3600 + 47 * 60 + 10 } }));
    const n1 = escritas;
    push(H, 0, conta({ hunt: 'Furious Scyther', a: { seconds: 2 * 3600 + 48 * 60 } }));
    ok(n0 >= 1 && n1 === n0 && escritas === n1 + 1, 'leitura nova com o mesmo texto nao mexe no DOM; mudou o texto, uma escrita (' + n0 + ' -> ' + n1 + ' -> ' + escritas + ')');
    W[0].emit('did-fail-load', { errorCode: -106, isMainFrame: true });
    const rb = p.querySelector('.pg-rec'), r0 = W[0].recarregou;
    if (rb.onclick) rb.onclick();
    ok(st.className === 'status er' && p.classList.contains('er') && rb.hidden === false && W[0].recarregou === r0 + 1 && /class="pg-rec" hidden>\$\{t\('tReload'\)\}<\/button>/.test(code),
      'erro: pilula e painel vermelhos e o "' + T('tReload') + '" cheio, que recarrega como o ⟳ (' + st.className + ', recarregou ' + (W[0].recarregou - r0) + ')');
    ok(!/\b(ok|err)\b/.test(dot.className) && dot.style.background === '#c07bf5' && !/\.dot\.(ok|err)\b/.test(css) && /opacity: \.35;/.test(regra('.dot.off')) && !/opacity/.test(regra('.dot')),
      'a bolinha e so a identidade da conta: cor cheia sempre, sem anel de erro, apagada so desligada (' + dot.className + ')');
  });

  await secao('pilula: cores dos estados, contraste, detalhe que some primeiro e textos nos 3 idiomas', async () => {
    const ok2 = regra('.status.ok, .cd-st.ok'), av = regra('.status.av, .cd-st.av'), er = regra('.status.er, .cd-st.er'), base = regra('.status');
    const tx = (r) => (/color: (#\w+);/.exec(r) || [])[1] || '';
    ok(/color: #aff5b4; background: rgba\(46,160,67,\.14\); border-color: rgba\(46,160,67,\.45\);/.test(ok2) && /background: rgba\(210,153,34,\.14\); border-color: rgba\(210,153,34,\.5\);/.test(av)
      && /color: #ffa198; background: rgba\(248,81,73,\.12\); border-color: rgba\(248,81,73,\.5\);/.test(er) && /color: #c9d1d9;/.test(base) && /background: #12171e;/.test(base),
      'ok verde, av ambar, er vermelho e neutro #c9d1d9 em #12171e (cabecalho e coluna Status com as mesmas regras)');
    ok(tx(av) && contraste(tx(av), '#161b22') >= 4.5 && tx(av) !== '#f2c665', 'texto do aviso em ambar com ' + (tx(av) ? contraste(tx(av), '#161b22').toFixed(1) : '?') + ':1 no fundo do painel (nao o dourado do gold)');
    ok(/font-size: 11\.5px;/.test(base) && /font-weight: 600;/.test(base) && /border-radius: 999px;/.test(base) && /min-width: 0;/.test(base) && /overflow: hidden;/.test(base)
      && /text-overflow: ellipsis;/.test(regra('.status .st-t')) && /font-size: 11px;/.test(regra('.status small')), 'pilula de 11,5px/600, o detalhe menor, reticencias quando o painel e estreito');
    const enc = (r) => +((/flex: 0 (\d+(?:\.\d+)?) auto;/.exec(r) || [])[1] || NaN);
    ok(enc(regra('.status small')) >= 100 * enc(regra('.status .st-t')) && enc(regra('.status .st-t')) >= 1, 'o detalhe encolhe primeiro (fator ' + enc(regra('.status small')) + ' contra ' + enc(regra('.status .st-t')) + '; abaixo de 1 o flex nao usa o fator inteiro)');
    ok(/border-color: rgba\(248,81,73,\.5\);/.test(regra('.panel.er')) && /linear-gradient\(90deg, rgba\(248,81,73,\.12\), transparent 70%\)/.test(regra('.panel.er .panel-header')) && /linear-gradient\(90deg, rgba\(210,153,34,\.14\), transparent 70%\)/.test(regra('.panel.av .panel-header')),
      'erro: borda do painel vermelha; erro e aviso: tom da esquerda pra direita no cabecalho');
    ok(/@container \(max-width: \d+px\) \{ \.panel-header \.pg-rec \{ display: none; \} \}/.test(css) && /container-type: inline-size;/.test(regra('.panel-header')), 'painel estreito (4 lado a lado): o Recarregar sai e o ⟳ fica (nao empurra os botoes pra fora)');
    const H = monta(); await vez();
    const K = ['stLoading', 'stError', 'stOff', 'stDown', 'stRetry', 'stAgo', 'stLogin', 'stFaint', 'stStalled', 'stPotLow', 'stBallLow', 'cdWaiting', 'cdHunting', 'cdInCity'];
    ok(K.every((k) => ['pt', 'en', 'es'].every((L) => typeof H.I18N[L][k] === 'string' && H.I18N[L][k] && !/—/.test(H.I18N[L][k]))) && ['pt', 'en', 'es'].every((L) => !('stOnline' in H.I18N[L]) && !('cdOff' in H.I18N[L])),
      'textos do status nos 3 idiomas, sem travessao (e o "online" saiu)');
    ok(['pt', 'en', 'es'].map((L) => H.I18N[L].stPotLow).join(' | ') === '⚠ Potions p/ ~{h} | ⚠ Potions for ~{h} | ⚠ Pociones para ~{h}', 'o caso das potions: ' + ['pt', 'en', 'es'].map((L) => H.I18N[L].stPotLow).join(' | '));
  });

  await secao('relogio de 30 s: o "ha X min" anda sem push e a leitura velha vence', async () => {
    const H = monta(); await vezes(3);
    const W = H.webviews, T = H.t;
    const rel = H.ints.find((x) => x.ms === 30000 && /pintaStatus/.test(String(x.f)));
    ok(!!rel, 'tem um relogio de 30 s que repinta os cabecalhos');
    if (!rel) return;
    W[3].emit('did-start-loading'); [1, 2, 3].forEach(() => W[3].emit('did-fail-load', { errorCode: -106, isMainFrame: true }));
    const a = cab(H, 3).sub;
    desloc += 5 * MIN; rel.f();
    const b = cab(H, 3).sub;
    ok(a === T('stAgo').replace('{t}', '1 min') && b === T('stAgo').replace('{t}', '5 min'), 'sem rede nao tem push: o relogio leva de "' + a + '" a "' + b + '"');
    W[1].emit('did-stop-loading'); push(H, 1, conta({ hunt: 'Bug Cave' }));
    const c = cab(H, 1).txt;
    desloc += 40e3; rel.f();
    ok(c === T('cdHunting') && cab(H, 1).txt === T('cdWaiting'), 'push parou ha 40 s: "' + c + '" vira "' + cab(H, 1).txt + '" (nao fica dizendo que caca)');
    desloc = 0;
  });

  await secao('variaveis de cor: o :root com os tokens e o CSS e os estilos do JS usando elas', async () => {
    const quer = { '--bg': '#0d1117', '--sf': '#161b22', '--sf2': '#12171e', '--in': '#0b0f15', '--bd': '#21262d', '--bd2': '#30363d', '--tx': '#e6edf3', '--tx2': '#c9d1d9', '--tx3': '#adbac7', '--mut': '#8b949e',
      '--marca': '#e3350d', '--marca-bt': '#d9300b', '--marca-hv': '#e8401a', '--ok': '#3fb950', '--ok-tx': '#aff5b4', '--ok-bg': 'rgba(46,160,67,.14)', '--ok-bd': 'rgba(46,160,67,.45)',
      '--av-bg': 'rgba(210,153,34,.14)', '--av-bd': 'rgba(210,153,34,.5)', '--er': '#f85149', '--er-tx': '#ffa198', '--er-bg': 'rgba(248,81,73,.12)', '--er-bd': 'rgba(248,81,73,.5)', '--foco': '#58a6ff',
      '--gold': '#f2c665', '--xp': '#79c0ff', '--dia': '#8ab4ff', '--shiny': '#f778ba', '--iv': '#55e6d3' };
    const falta = Object.keys(quer).filter((k) => TOK[k] !== quer[k]);
    ok(!falta.length && TOK['--av-tx'], ':root com neutros, marca, principal, ok/av/er com fundo e borda, foco e as cores dos dados (' + Object.keys(TOK).length + ' variaveis' + (falta.length ? '; faltam ' + falta.join(', ') : '') + ')');
    const semRoot = css.replace(/:root \{[^}]*\}/, '');
    const usoCss = (semRoot.match(/var\(--/g) || []).length;
    const hexTok = Object.values(quer).filter((v) => v[0] === '#');
    const sobraCss = hexTok.filter((h) => semRoot.toLowerCase().includes(h));
    ok(usoCss >= 250 && !sobraCss.length, 'o bloco de CSS usa as variaveis (' + usoCss + ' var(--x)) e nao repete nenhuma cor de token em hex' + (sobraCss.length ? ' (sobrou ' + sobraCss.join(', ') + ')' : ''));
    const doApp = code.replace(/const QOL_UI = `[\s\S]*?`;/, ''); // o CSS que vai pra pagina do jogo fica em hex: la nao existe o :root do app
    const literal = [...doApp.matchAll(/(?:color|background|border(?:-color)?):\s*(?:1px solid )?(#[0-9a-f]{6})\b/gi)].map((m) => m[1].toLowerCase()).filter((h) => hexTok.includes(h));
    const usoJs = (code.match(/var\(--/g) || []).length;
    // 180 (era 200): o card de IV novo (04/10) levou os estilos soltos do JS pras classes do CSS
    ok(usoJs >= 180 && !literal.length, 'estilos montados no JS com var(--x) (' + usoJs + ') e sem cor de token escrita em hex' + (literal.length ? ' (sobrou ' + [...new Set(literal)].join(', ') + ')' : ''));
    const hexes = new Set((s.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) || []).map((h) => h.toLowerCase()));
    console.log('     (contagem: ' + hexes.size + ' hex diferentes, ' + (s.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) || []).length + ' ocorrencias de hex, ' + (s.match(/style="/g) || []).length + ' style=", ' + (s.match(/var\(--/g) || []).length + ' var(--x))');
  });

  await secao('papeis das cores: nada de vermelho em hover, foco, ligado ou arrastar dos controles secundarios', async () => {
    const vermelho = /#e3350d|rgba\(227,\s*53,\s*13|#f85149/i;
    const ruins = [];
    for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const sel = m[1].trim(), dec = cor(m[2]);
      if (!/:hover|:focus|\.on\b|dragover|cd-over|rz-on|sc-drag|\.sc-drop/.test(sel)) continue;
      if (/button\.primary|\.pg-rec|\.acc-del|\.sc-del/.test(sel)) continue; // principal e destrutivo podem ser vermelhos
      if (vermelho.test(dec)) ruins.push(sel);
    }
    ok(!ruins.length, 'nenhuma regra de hover/foco/ligado/arrastar com vermelho' + (ruins.length ? ' (sobrou ' + ruins.join(' | ') + ')' : ''));
    ok(/border-color: #8b949e; color: #e6edf3;/.test(regra('#ivCard .iv-hd button:hover')) && /border-color: #8b949e; color: #e6edf3;/.test(regra('#ivCard .iv-foot button:hover')) && /border-color: #8b949e;/.test(regra('.cd-h button:hover')),
      'hover dos botoes secundarios (card de IV, Simples) com borda neutra #8b949e');
    ok(/outline: 2px dashed #58a6ff;/.test(regra('.cd-it.cd-over')) && /outline: 2px dashed #58a6ff;/.test(regra('#stats .dsect.dragover')) && /border: 1px dashed #58a6ff;/.test(regra('.sc-drop')) && /background: #58a6ff;/.test(regra('.cd-rz:hover::before, .cd-it.rz-on .cd-rz::before')),
      'arrastar e soltar (Simples, painel lateral, .user.js) e as alcas de tamanho no azul do foco');
    ok(/background: #e6edf3;/.test(regra('#ivCard .iv-aba.on::after')) && /var\(--tabc/.test(regra('#stats .st-tab.on::after')), 'aba ativa do card de IV sublinhada em #e6edf3 (as abas do 📊 seguem na cor da conta)');
    const gear = regra('#stats .st-head .st-gear.on'), on = regra('button.on');
    ok(!vermelho.test(gear) && /color: #aff5b4;/.test(on) && (!gear || /#aff5b4/.test(gear)), 'engrenagem do Resumo ligada na cor do "ligado" (' + (gear || 'herda o ' + on) + ')');
    ok(/background: #e6edf3; border-color: #e6edf3; color: #0d1117;/.test(regra('#tlChips button.on, #dtCtl button.on')) && code.includes("(tlEl === ty ? ' class=\"on\"' : ' style=\"color:' + tipoTx(ty) + '\"')"),
      'filtro escolhido da Tierlist e do Ditto invertido como Paineis/idioma (sem o vermelho; o escolhido nao leva a cor do tipo por cima)');
    ok(/color: #e3b341; background: rgba\(210,153,34,\.14\); border: 1px solid rgba\(210,153,34,\.5\);/.test(regra('#ivCard .iv-av')) && /color: #f2c665;/.test(regra('#stats .drop .dg')) && /background: #f2c665;/.test(regra('#stats .vip'))
      && !/#e0b458|#d9a441|#f0c040/i.test(css), 'aviso do card de IV em ambar; os dourados da interface viraram um so (o gold), o VIP segue dourado');
  });

  await secao('numeros neutros: Σ por conta e suprimentos, Simples (tabela e 7 dias/Total)', async () => {
    let H = null;
    const d = conta({ name: 'Ash', balls: 3248, potions: 506, shinyEnc: 121, a: { seconds: 900, gph: 224000, xph: 8.3e6, kph: 612, captures: 6, shinyFound: 2, shinyCap: 1 } });
    H = monta({ exec: (c) => Promise.resolve(c.includes('const team = ((ws.pokes') ? JSON.parse(JSON.stringify(d)) : null) }); await vezes(3);
    const card = H.aggCard('#c07bf5', 'Ash', JSON.parse(JSON.stringify(d)));
    const span = (txt) => (new RegExp('<span([^>]*)>[^<]*' + txt + '</span>').exec(card) || [])[1];
    ok(span(' xp') === '' && span(' ' + H.t('acLife')) === '' && span(' ' + H.t('stBalls')) === '' && span(' ' + H.t('potions')) === '' && /style="color:var\(--ok\)">\+224K\/h/.test(card) && /style="color:var\(--shiny\)">✨2 enc/.test(card),
      'Σ por conta: XP, bolas em shiny, bolas e potions sem cor; gold/h no sinal e shiny em rosa (' + ['xp', 'acLife', 'stBalls', 'potions'].map((k) => k + '=' + JSON.stringify(span(k === 'xp' ? ' xp' : ' ' + H.t(k)))).join(' ') + ')');
    H.setStatsOpen(true); H.setStatsIdx(-1); await H.renderAggregate();
    const ag = H.statsEl.querySelector('.st-body').innerHTML;
    const kpi = (l) => (new RegExp('<div class="a4v"([^>]*)>[^<]*</div><div class="a4l">' + l + '</div>').exec(ag) || [])[1];
    ok(kpi(H.t('bagBalls')) === '' && kpi(H.t('potions').charAt(0).toUpperCase() + H.t('potions').slice(1)) === '', 'Σ suprimentos: "5.408 Pokébolas" sem o vermelho (e as potions sem o rosa)');
    H.stCache[0] = { t: Date.now(), d: JSON.parse(JSON.stringify(d)) };
    H.cardsSet(true); await H.refreshCards(true);
    const h = H.cardsEl.innerHTML, linha = (/<tr data-i="0">([\s\S]*?)<\/tr>/.exec(h) || [])[1] || '';
    const tds = [...linha.matchAll(/<td([^>]*)>/g)].map((m) => m[1]);
    const rod = [...((/<tfoot>([\s\S]*?)<\/tfoot>/.exec(h) || [])[1] || '').matchAll(/<td([^>]*)>/g)].map((m) => m[1]);
    ok(tds[5] === '' && rod[5] === '' && /color:var\(--ok\)">\+224K/.test(linha), 'Simples: coluna XP/h e o total sem o azul; gold/h segue no sinal (td XP: "' + tds[5] + '", total: "' + rod[5] + '")');
    const hoje = (/<div style="display:flex;gap:18px[^"]*">([\s\S]*?)<\/div><\/div>/.exec(h) || [])[1] || '';
    ok(hoje && !/var\(--xp\)|#79c0ff/.test(hoje) && !/var\(--shiny\)|#f778ba/.test(hoje), 'linha "7 dias / Total" neutra (e o rosa so com shiny visto): ' + hoje.replace(/<[^>]+>/g, '').slice(0, 90));
  });

  await secao('card de IV: potencial com o vermelho no Fraco, barras pela nota do IV e nome do atributo neutro', async () => {
    const H = await comCatalogo({ ivAba: 'leitor' });
    ok(JSON.stringify(H.IV_POT_COR) === JSON.stringify(['#f2c665', '#3fb950', '#79c0ff', '#8b949e', '#f85149']), 'potencial: Excepcional, Otimo, Bom, Mediano e Fraco = dourado, verde, azul, cinza e vermelho (o Fraco era o laranja da Lendaria): ' + H.IV_POT_COR.join(' '));
    H.setIv(Object.assign({}, SCIZOR, { ivTotal: 60 }), 0); H.ivRender();
    const fraco = H.byId('ivCard').innerHTML;
    // card novo (04/10): a cor da faixa vai uma vez so no painel (--c) e o anel, o numero e o rotulo pintam com ela
    ok(/<div class="iv-pot" style="--c:#f85149"><div class="iv-ring" style="--p:31\.3%"><span><b>31%<\/b>/.test(fraco) && /<div class="iv-pot-t">[^<]+<\/div>/.test(fraco) && /color: var\(--c\);/.test(regra('#ivCard .iv-pot-t'))
      && /color: var\(--c\);/.test(regra('#ivCard .iv-ring b')) && /var\(--c\) var\(--p\)/.test(regra('#ivCard .iv-ring')), 'IV 60/192 (31%): anel e rotulo do Fraco em #f85149');
    H.setIv(SCIZOR, 0); H.ivRender();
    const nota = (v) => (v >= 28 ? '#f2c665' : v >= 22 ? '#3fb950' : v >= 15 ? '#79c0ff' : '#8b949e');
    // card novo (04/10): uma linha por atributo (nome, barra, IV); no Leitor o melhor e o pior ganham a marca em texto
    const barras = (h) => [...h.matchAll(/<div class="iv-st(?: mx| mn| iv-st2)?"><div class="iv-st-h"><span class="iv-st-n"([^>]*)>(\w+)<\/span>(?:<small>[^<]*<\/small>)?<\/div><div class="iv-bar(?: iv-bar2)?"><i style="width:[\d.]+%;background:([^"]+)"><\/i>(?:<i class="fx"[^>]*><\/i>)?<\/div><span class="iv-st-iv">(\d+)(?:-(\d+))?<span>\/32<\/span><\/span>/g)]
      .map((m) => ({ estilo: m[1], k: m[2], v: m[5] ? (+m[4] + +m[5]) / 2 : +m[4], bg: cor(m[3]) }));
    const leitor = barras(H.byId('ivCard').innerHTML);
    ok(leitor.length === 6 && leitor.every((b) => b.bg === nota(b.v)) && new Set(leitor.map((b) => b.bg)).size >= 3, 'Leitor: cada barra na cor da nota (28+ dourado, 22+ verde, 15+ azul, abaixo cinza): ' + leitor.map((b) => b.k + ' ' + b.v + ' ' + b.bg).join(', '));
    ok(leitor.every((b) => b.estilo === '') && /color: #adbac7;/.test(regra('#ivCard .iv-st-n')), 'nome do atributo neutro (#adbac7), sem a cor decorativa de cada um');
    H.setIvAba('analise'); H.ivRender();
    const an = barras(H.byId('ivCard').innerHTML);
    ok(an.length === 6 && an.every((b) => b.bg === nota(b.v) && b.estilo === ''), 'Analise: as mesmas barras pela nota e o nome neutro (' + an.map((b) => b.k + ' ' + b.bg).join(', ') + ')');
    const N = H.ivNota;
    ok(typeof N === 'function' && cor(N([27, 29])) === '#f2c665' && cor(N([21, 22])) === '#79c0ff' && cor(N([20, 24])) === '#3fb950' && cor(N([10, 18])) === '#8b949e' && cor(N([15, 15])) === '#79c0ff', 'faixa inexata vale pelo meio (27-29 dourado, 21-22 azul, 20-24 verde, 10-18 cinza)');
    const H2 = await comCatalogo({ ivAba: 'comparar', ivFix: JSON.stringify([{ d: Object.assign({}, SCIZOR, { nome: 'Kabutops', qualidade: 1.4 }), i: 1, t: 1 }]) });
    H2.setIv(SCIZOR, 0); H2.ivRender();
    const cmp = H2.byId('ivCard').innerHTML;
    ok(/<tr><td><span class="iv-st-n">HP<\/span><\/td>/.test(cmp) && !/<span style="color:#[0-9a-f]+">HP<\/span>/.test(cmp), 'Comparar: nome do atributo neutro tambem');
    ok(/<td>×1,40 <small style="color:var\(--er\)">-0,15<\/small><\/td>/.test(cmp), 'Comparar: o valor fica neutro e so a diferenca ganha cor');
    desloc = 0;
  });

  await secao('tipos escuros: os 18 tipos com 4,5:1 como texto no fundo escuro e na pilula', async () => {
    const H = monta(); await vez();
    const tipos = Object.keys(H.TIPO_COR);
    ok(tipos.length === 18 && typeof H.tipoTx === 'function' && typeof H.tipoFg === 'function', '18 tipos e os dois ajudantes (texto e letra da pilula)');
    if (typeof H.tipoTx !== 'function') return;
    const r = tipos.map((ty) => ({ ty, tx: contraste(cor(H.tipoTx(ty)), '#161b22'), pil: contraste(cor(H.tipoFg(ty)), H.tipoCor(ty)), antes: contraste(H.tipoCor(ty), '#161b22') }));
    ok(r.every((x) => x.tx >= 4.5), 'texto no fundo do painel (#161b22) sempre 4,5:1 ou mais: ' + r.filter((x) => x.antes < 4.5).map((x) => x.ty + ' ' + x.antes.toFixed(1) + '->' + x.tx.toFixed(2)).join(', '));
    ok(r.every((x) => x.pil >= 4.5), 'pilula sempre 4,5:1 ou mais (letra branca nos 5 escuros): menor ' + Math.min(...r.map((x) => x.pil)).toFixed(2));
    ok(['fighting', 'poison', 'ghost', 'dragon', 'dark'].map((ty) => H.tipoTx(ty)).join() === '#d0645e,#b366b3,#8d79ad,#946afa,#948276' && H.tipoTx('fire') === '#f08030' && H.tipoTx('xyz', 'var(--xp)') === 'var(--xp)', 'clareados so os 5 escuros; o resto com a cor do jogo; tipo desconhecido cai no fallback');
    const linhas = code.split('\n').filter((l) => l.includes('tipoCor('));
    const textoComTipoCor = linhas.filter((l) => !/^\s*const tipoTx = /.test(l) && (/color:' \+ tipoCor\(|=> tipoCor\(ty\);|tipoCor\(\w+(\.\w+)?, '/.test(l) || !/(?:background|--tc):' \+ tipoCor\(/.test(l))); // --tc: o fundo do palco da sprite no card de IV (so fundo e borda, nunca texto)
    ok(linhas.length >= 2 && !textoComTipoCor.length && (code.match(/tipoTx\(/g) || []).length >= 5, 'todo nome de tipo escrito passa pelo tipoTx (tierlist, chips, cabecalhos, Ditto, Simples) e o tipoCor so pinta o fundo da pilula' + (textoComTipoCor.length ? ' (sobrou: ' + textoComTipoCor.map((l) => l.trim().slice(0, 70)).join(' | ') + ')' : ''));
    const H2 = monta({ ls: { ivAba: 'analise' } }); await vezes(3);
    H2.setIv(SCIZOR, 0); H2.ivRender();
    ok(/<span class="iv-tp" style="background:#a040a0;color:#fff">POISON<\/span>/.test(H2.byId('ivCard').innerHTML), 'no card (Analise do Scizor): a pilula POISON com letra branca');
  });

  await secao('decimais no formato do idioma fora do card de IV (aviso de shiny, Simples, tierlist e Ditto)', async () => {
    const toasts = {}, simples = {};
    for (const lang of ['pt', 'en', 'es']) {
      const H = monta({ ls: { lang } }); await vez();
      H.festaShiny({ n: 'Furious Scyther', sid: 10506, acc: 'RedFire', dot: '#c07bf5', iv: 152, q: 1.86, t: Date.now() });
      toasts[lang] = (/<span class="sp-q">([^<]*)<\/span>/.exec((H.byId('shinyParty').children[0] || {}).innerHTML || '') || [])[1];
      const lc = [{ n: 'Pikachu', iv: 120, q: 1.35, t: Date.now() - 60000, p: 0, acc: 'Ash', dot: '#c07bf5' }];
      const S = monta({ ls: { lang, lifeCatch: JSON.stringify(lc) } }); await vez();
      S.stCache[0] = { t: Date.now(), d: conta({ catchLog: [{ n: 'Kabutops', iv: 180, q: 1.7, t: Date.now() - 5000 }], team: [{ id: 'k1', name: 'Kabutops', level: 300, q: 1.5, ivt: 150, ld: true }], chatShares: [{ fr: 'Kaique', n: 'Dragonite', sh: false, lv: 612, q: 1.78, iv: 158, t: Date.now() - 9000 }] }) };
      S.cardsSet(true); await S.refreshCards(true);
      const h = S.cardsEl.innerHTML, v = (x) => (lang === 'en' ? x : x.replace('.', ','));
      simples[lang] = ['1.70', '1.35', '1.50', '1.78'].filter((x) => h.includes('×' + v(x) + '</span>')).map(v);
    }
    // um ok por tela juntando os 3 idiomas: o ingles ja usava ponto, quem muda e o pt e o es
    ok(toasts.pt === '×1,86' && toasts.es === '×1,86' && toasts.en === '×1.86', 'aviso de shiny capturado: virgula em pt e es, ponto em en (' + ['pt', 'en', 'es'].map((L) => L + ' ' + toasts[L]).join(', ') + ')');
    ok(['pt', 'en', 'es'].every((L) => simples[L].length === 4), 'Simples (melhor catch, ultimas capturas, times e compartilhados) no formato do idioma (' + ['pt', 'en', 'es'].map((L) => L + ' ' + simples[L].join(' ')).join(' | ') + ')');
    const semDecL = [...code.matchAll(/×' \+ \(\+[\w.]+\)\.toFixed\(2\)|\\u00d7' \+ \(Math\.round\(|cap\/h<\/b>' \+ \(x2\.md\.hpk > 0 \? ' · <b>' \+ x2\.md\.hpk/g)].map((m) => m[0]);
    ok(!semDecL.length && /' \\u00d7' \+ decL\(Math\.round\(r\.sg\.eff \* 100\) \/ 100\)/.test(code) && /decL\(R\.fix\.q\)/.test(code), 'efetividade e folga (tierlist, Ditto, Sugerido), cap/h e golpes/kill e a qualidade fixa do Ditto pelo decL' + (semDecL.length ? ' (sobrou ' + semDecL.length + ': ' + semDecL[0] + ')' : ''));
  });

  Date.now = realNow;
  await secao('deposito e bolsa cheios: cacando com o Auto-Catch pausado vira aviso no cabecalho; o Limpar jogo deixa o aviso do jogo a vista', async () => {
    const alerta = {}; let H = null;
    H = monta({ exec: lendo(() => H, alerta) }); await vezes(3);
    const W = H.webviews, T = H.t;
    W.forEach((w) => { w.emit('did-start-loading'); w.emit('did-stop-loading'); });
    push(H, 0, conta({ cid: 'c0', hunt: 'Pinsir', ahCheio: true, a: { seconds: 3600, gph: 100000, xph: 1e6, kph: 500 } }));
    push(H, 1, conta({ cid: 'c1', hunt: 'Pinsir', ahCheio: 'sim', a: { seconds: 3600, gph: 100000, xph: 1e6, kph: 500 } }));
    const s0 = H.statusConta(0), s1 = H.statusConta(1);
    ok(s0.cls === 'av' && s0.txt === T('stDepCheio') && s0.sub === T('stDepCheioSub'), 'deposito cheio: ambar "' + s0.txt + ' · ' + s0.sub + '"');
    ok(s1.cls === 'ok', 'valor forjado (nao true) nao liga o aviso');
    ok(['pt', 'en', 'es'].every((L) => H.I18N[L].stDepCheio && H.I18N[L].stDepCheioSub && !/—/.test(H.I18N[L].stDepCheio + H.I18N[L].stDepCheioSub)), 'texto nos 3 idiomas, sem travessao');
    ok(/\.ah-panel\.pg-ah-cheio\{opacity:1 !important\}/.test(code), 'Limpar jogo: o auto-helper marcado como cheio fica a vista');
  });

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})();
