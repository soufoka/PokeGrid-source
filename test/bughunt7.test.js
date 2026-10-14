// Caca de bugs 7 (13/10/2026), janela do app: o que a pagina do jogo forja pelos canais do painel nao pode derrubar a
// interface, e a CSP so deixa o aviso de versao sair pra rede. (O processo principal ficou no processo-principal.test.js dos
// repos, e a Incubadora no ovos.test.js.) Roda o <script> REAL com a janela falsa do bh5-telas.
// Roda com: node test/bughunt7.test.js
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const READ_ALERTS = tpl('const READ_ALERTS = ');
const COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");
const SELLGUARD = tpl('const SELLGUARD = ');
const vm = require('vm');

// pagina do jogo com o coletor (o molde do ovos.test.js): fetch por URL, socket falso; o.local: location e URL da pagina de verdade
function pagina(corpos = {}, o = {}) {
  function FakeWS(u) { this.u = String(u); this.readyState = 1; this.ls = {}; this.saiu = []; }
  FakeWS.prototype.addEventListener = function (t, f) { (this.ls[t] = this.ls[t] || []).push(f); };
  FakeWS.prototype.send = function (d) { this.saiu.push(JSON.parse(d)); };
  const pedidos = [], tos = [];
  const resp = (b) => ({ ok: true, status: 200, clone() { return resp(b); }, json: async () => b });
  const win = { WebSocket: FakeWS, atob: (b) => Buffer.from(b, 'base64').toString('binary'), document: { querySelector: () => null },
    fetch: (u) => { u = String(u); pedidos.push(u); const b = u in corpos ? corpos[u] : corpos[u.split('?')[0]]; return Promise.resolve(resp(b === undefined ? {} : JSON.parse(JSON.stringify(b)))); },
    sessionStorage: { getItem: (k) => (k === 'pokeweb:tokens' ? JSON.stringify({ accessToken: 'TK' }) : null) }, localStorage: { getItem: () => null } };
  if (o.local) Object.assign(win, { location: { href: 'https://poke.idleworld.online' + o.local, host: 'poke.idleworld.online', pathname: o.local }, URL });
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { setInterval: () => 0, setTimeout: (f, ms) => { tos.push({ f, ms }); return 0; }, clearInterval() {}, clearTimeout() {}, escape, decodeURIComponent }));
  vm.runInContext(COLETOR, ctx);
  const run = (c) => vm.runInContext(c, ctx);
  const sock = (u) => { const s = run('new WebSocket(' + JSON.stringify(u || 'wss://poke.idleworld.online/ws?token=TK&v=2') + ')'); (s.ls.open || []).forEach((f) => f({})); return s; };
  const msg = (s, x) => (s.ls.message || []).forEach((f) => f({ data: JSON.stringify(x) }));
  return { run, sock, msg, pedidos, tos, espera: async () => { for (let k = 0; k < 6; k++) await vez(); }, busca: async (u, ini) => { run('fetch(' + JSON.stringify(u) + (ini ? ',' + JSON.stringify(ini) : '') + ')'); for (let k = 0; k < 6; k++) await vez(); } };
}

// janela do app com DOM falso (o harness do bh5-telas): exec responde o executeJavaScript dos paineis, ints guarda os setInterval
const realST = setTimeout;
const PRAZO = +((/function lePainel\(w, js\) \{[^\n]*?r\(null\), (\d+)\)/.exec(code) || [])[1] || 3000);
function monta(opts = {}) {
  let document;
  const ints = [], store = new Map(Object.entries(opts.ls || {}));
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
    executeJavaScript(c) { return opts.exec ? opts.exec(String(c), this) : Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() {} reloadIgnoringCache() {} loadURL() { return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid'), byId = new Map();
  document = {
    getElementById: (id) => { if (id === 'grid') return grid; if (!byId.has(id)) byId.set(id, new El(id === 'tlLevel' || id === 'tlTm' || /^sc(Url|Name)$/.test(id) ? 'input' : 'div', id)); return byId.get(id); },
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: () => [],
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, appVersion: '1.5.38' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  const exporta = '\n;return { refreshCards, cardsSet: (v) => { cardsOn = v; }, stCache, get cardsEl() { return cardsEl; }, t, stSane, cardsCfg, webviews };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const sT = (f, ms) => { if (ms === PRAZO) realST(() => { try { f(); } catch {} }, 5); return 1; };
  const api = fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, { reload() {} }, (f, ms) => { ints.push({ f, ms }); return ints.length; }, noop, sT, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  return Object.assign(api, { ints, store });
}
const conta = (extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 300, gold: 1000, diamonds: 0, a: { seconds: 900, gph: 1000, xph: 5000, kph: 100 }, hunt: 'Bug Cave', team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra || {});

(async () => {
  await secao('estado forjado pelo canal do painel (__PGST__) com null nos arrays', async () => {
    const H = monta({ ls: { count: '1' } }); await vez();
    const d = H.stSane(conta({ team: [null, { name: 'Pikachu', level: 50, ld: true }], usedList: [null, 7, { sid: 25, name: 'Pikachu', total: 3 }], catchLog: [null, { n: 'Rattata', iv: 90, q: 1.1, t: Date.now() }], chatShares: [null, 'x'] }));
    ok(d.team.length === 1 && d.usedList.length === 1 && d.catchLog.length === 1 && d.chatShares.length === 0, 'o stSane tira null e o que nao e objeto dos 4 arrays, como ja tirava do mvs e dos ovos');
    H.stCache[0] = { t: Date.now(), d: H.stSane(conta({ team: [null], usedList: [null], chatShares: [null], catchLog: [null] })) };
    H.cardsSet(true);
    let erro = null; try { await H.refreshCards(true); } catch (e) { erro = e.message; }
    ok(!erro && /<table class="cd-table">/.test(H.cardsEl.innerHTML), 'o Simples desenha (antes "Cannot read properties of null" e a tela ficava presa em Aguardando, a cada push de 10 s)' + (erro ? ': ' + erro : ''));
  });

  await secao('logs da pagina no READ_ALERTS (sem stSane) com null', async () => {
    const agora = Date.now();
    const r = { live: true, cid: 'c1', sess: { start: agora - 60e3, kills: 1 }, shinyN: 0, shinyLog: [null, { n: 'Pikachu', sid: 25, def: 1, t: agora - 1000 }], catchLog: [null, 3, { n: 'Rattata', iv: 90, q: 1.1, t: agora - 2000 }] };
    const H = monta({ ls: { count: '1' }, exec: (c) => Promise.resolve(c === READ_ALERTS ? JSON.parse(JSON.stringify(r)) : null) }); await vez();
    const tique = H.ints.find((x) => String(x.f).includes('READ_ALERTS'));
    let erro = null; try { tique.f(); for (let k = 0; k < 10; k++) await vez(); } catch (e) { erro = e.message; }
    const vida = JSON.parse(H.store.get('lifeCatch') || '[]');
    ok(!!tique && !erro && vida.length === 1 && vida[0].n === 'Rattata', 'o tique dos alertas segue: a captura valida entra no historico (antes o null derrubava o mergeLogs e o tique pulava historico, alertas e destrava daquela conta)');
  });

  await secao('CSP: a janela so fala com o endereco do aviso de versao', () => {
    const csp = (/http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(s) || [])[1] || '';
    const cs = (/connect-src ([^;]*);/.exec(csp) || [])[1] || '';
    const fetches = [...code.matchAll(/fetch\('(https:[^']+)'/g)].map((m) => m[1]);
    ok(cs === 'https://api.github.com/repos/soufoka/PokeGrid/releases/latest' && fetches.length === 1 && fetches[0] === cs, 'connect-src e o caminho exato do unico fetch da janela (antes o host inteiro do api.github.com): ' + cs);
  });

  await secao('ordem salva do Simples com secao repetida', async () => {
    const H = monta({ ls: { count: '1', cardsCfg: JSON.stringify({ order: ['table', 'table', 'kpis', 'eggs', 'eggs'], hide: {} }) } }); await vez();
    const o = H.cardsCfg.order;
    ok(o.length === new Set(o).size && o.indexOf('table') === 0 && o.indexOf('kpis') < o.indexOf('eggs'), 'cada secao uma vez, na ordem que o usuario deixou (config editada a mao desenhava duas): ' + o.slice(0, 4).join(','));
  });

  await secao('Venda protegida no Mercado (o unico lugar do jogo que vende shiny)', async () => {
    const chamadas = [], perguntas = [];
    let resposta = false;
    const itens = { items: [{ id: 59195, name: 'Rare Pokémon Picture' }, { id: 7001, name: 'Strange Pheromone' }, { id: 4, name: 'Ultra Ball' }, { id: 12, name: 'Potion' }] };
    const resp = (b) => ({ ok: true, clone() { return resp(b); }, json: async () => b });
    const win = { console: { log() {} }, confirm: (m) => { perguntas.push(m); return resposta; }, alert() {}, prompt() {},
      fetch: (u, ini) => { chamadas.push(String(u)); return Promise.resolve(resp(/^\/api\/game\/market\?/.test(u) ? { requests: [{ id: 'r9', name: 'Strange Pheromone', refId: 7001, price: 900 }, { id: 'r2', name: 'Potion', refId: 12, price: 5 }] } : {})); },
      __poke: { ws: { pokes: { list: [{ id: 'sh1', name: 'Gyarados', shiny: true, level: 80, ivTotal: 150, quality: 1.2 }, { id: 'dr1', name: 'Dragonite', level: 90, ivTotal: 170, quality: 2.35 }, { id: 'c1', name: 'Rattata', level: 5, ivTotal: 40, quality: 0.9 }] } }, api: { '/game/items.json': itens } } };
    win.window = win;
    const ctx = vm.createContext(win);
    vm.runInContext(SELLGUARD, ctx);
    const vende = async (corpo, ok2) => { resposta = !!ok2; const n = perguntas.length; let rec = false; try { await vm.runInContext('fetch("/api/game/market/action", { method: "POST", body: ' + JSON.stringify(JSON.stringify(corpo)) + ' })', ctx); } catch { rec = true; } return { perguntou: perguntas.length > n, texto: perguntas[perguntas.length - 1] || '', recusou: rec }; };
    let r = await vende({ action: 'sell-pokemon', capturedId: 'sh1', price: 1000, currency: 'GOLD' });
    ok(r.perguntou && /SHINY Gyarados/.test(r.texto) && /1\.000 gold/.test(r.texto) && r.recusou, 'anunciar o Gyarados shiny no Mercado: pergunta (com o preco) e, cancelado, o pedido nao sai');
    r = await vende({ action: 'sell-pokemon', capturedId: 'dr1', price: 1, currency: 'DIAMONDS' });
    ok(r.perguntou && /Dragonite/.test(r.texto) && /1 diamonds/.test(r.texto), 'Dragonite ×2,35 por 1 diamante: pergunta');
    r = await vende({ action: 'sell-pokemon', capturedId: 'c1', price: 50, currency: 'GOLD' });
    ok(!r.perguntou && !r.recusou, 'pokemon comum: sai direto');
    r = await vende({ action: 'sell', kind: 'item', refId: 59195, quantity: 2, price: 5, currency: 'GOLD' });
    ok(r.perguntou && /Rare Pokémon Picture x2/.test(r.texto), 'anunciar item da lista protegida (Rare Pokémon Picture): pergunta');
    r = await vende({ action: 'sell', kind: 'ball', refId: 4, quantity: 10, price: 5, currency: 'GOLD' });
    ok(!r.perguntou, 'anunciar pokebola: sai direto (o refId e de bola, nao de item)');
    await vm.runInContext('fetch("/api/game/market?category=All")', ctx); for (let k = 0; k < 6; k++) await vez();
    r = await vende({ action: 'request-sell', id: 'r9', quantity: 3 });
    ok(r.perguntou && /Strange Pheromone x3/.test(r.texto), 'vender pra um pedido de compra de Strange Pheromone (o corpo so traz o id): pergunta, com o nome lido da listagem do Mercado');
    r = await vende({ action: 'request-sell', id: 'r2', quantity: 3 });
    ok(!r.perguntou, 'pedido de compra de item comum: sai direto');
    resposta = false; const n0 = perguntas.length; let rec = false;
    try { await vm.runInContext('fetch("/api/game/pokemon/sell", { method: "POST", body: ' + JSON.stringify(JSON.stringify({ pokeIds: ['dr1'] })) + ' })', ctx); } catch { rec = true; }
    ok(perguntas.length === n0 + 1 && rec, 'o Mark segue protegido como antes');
  });

  await secao('coletor: so o socket do jogo, lista em partes, choco e Auto-Helper', async () => {
    const m = pagina({ '/api/game/breeding': { child: { speciesId: 147, name: 'Dratini', shiny: true } } }, { local: '/play' });
    const jogo = m.sock();
    m.run("window.__userWs = new WebSocket('wss://evil.example/feed')");
    const us = m.run('window.__userWs');
    ok(m.run('window.__poke.sock') === jogo && !(us.ls.message || []).length, 'WebSocket de userscript: nao vira o socket do jogo nem e escutado (antes recebia os enter-hunt e sujava o estado)');
    m.msg(jogo, { type: 'pokes', list: [{ id: 'a', name: 'Pikachu', speciesId: 25 }, { id: 'b', name: 'Charmander', speciesId: 4 }] }); // a caixa base
    m.msg(jogo, { type: 'pokes-chunk', gen: 7, seq: 0, total: 2, list: [{ id: 'velho', speciesId: 1 }] });
    const jogo2 = m.sock(); // caiu e reconectou no meio da lista em partes
    m.msg(jogo2, { type: 'pokes-chunk', gen: 7, seq: 1, total: 2, list: [{ id: 'b', speciesId: 4 }] });
    m.msg(jogo2, { type: 'pokes-chunk', gen: 7, seq: 0, total: 2, list: [{ id: 'a', speciesId: 25 }] });
    ok(JSON.stringify(m.run('window.__poke.ws.pokes.list.map((p) => p.id)')) === '["a","b"]', 'reconectou no meio da lista em partes: a parte da conexao velha nao entra (o jogo tambem zera ao conectar)');
    await m.busca('/api/game/breeding', { method: 'POST', body: '{"action":"hatch","eggId":"e1"}' });
    m.msg(jogo2, { type: 'pokes', list: [{ id: 'a', speciesId: 25 }, { id: 'b', speciesId: 4 }, { id: 'n1', name: 'Dratini', speciesId: 147, shiny: true, ivTotal: 100, quality: 1.1 }] });
    const st = JSON.parse(m.run('JSON.stringify({ cap: window.__poke.sess.shinyCapN, sl: (window.__poke.shinyLog || []).length, cl: (window.__poke.catchLog || []).length })'));
    ok(st.cap === 0 && st.sl === 0 && st.cl === 0, 'ovo shiny chocado: o filhote nao vira SHINY CAPTURADO (nem som, notificacao, webhook e log vitalicio) nem ultimo catch: ' + JSON.stringify(st));
    m.msg(jogo2, { type: 'pokes', list: [{ id: 'a', speciesId: 25 }, { id: 'b', speciesId: 4 }, { id: 'n1', speciesId: 147 }, { id: 'n2', name: 'Scyther', speciesId: 123, ivTotal: 120, quality: 1.3 }] });
    ok(m.run('(window.__poke.catchLog || []).map((x) => x.n).join()') === 'Scyther', 'captura de verdade depois do choco: conta normal');
    m.tos.find((x) => x.ms === 9000).f();
    ok(jogo2.saiu.some((x) => x.type === 'autohelper-get'), 'o poll pede o estado do Auto-Helper (o jogo so pede com a janela aberta, e e nele que vem o deposito cheio)');
    const entrada = pagina({}, { local: '/' }); entrada.sock();
    entrada.tos.find((x) => x.ms === 9000).f(); await entrada.espera();
    ok(!entrada.pedidos.some((u) => u.startsWith('/api/game/breeding')), 'pagina de entrada (Modo Soneca, depois de Sair): o poll nao pede a incubadora');
  });

  console.log(fail ? '\nFALHOU' : '\nTUDO OK');
  process.exit(fail);
})();
