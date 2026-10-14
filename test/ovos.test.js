// Incubadora (13/10/2026): os ovos do Breeding do jogo em cada conta, no Simples e num card dentro do jogo.
// O jogo so mostra os ovos na janela Breeding, que pede GET /api/game/breeding?action=center a cada 20 s enquanto esta aberta
// (build de 11/10/2026: eggs[{id, rank, killsDone, killsRequired, ready, shinyChild}], unlocked, unlockLevel, slots). O coletor
// pede a mesma rota no poll de 30 s e guarda so o resumo em P.egg; o READ_STATE leva pro app (stSane), o Simples desenha a
// secao Incubadoras e o OVO_UI desenha o card no jogo. Roda o codigo REAL do index.html: coletor e card num vm com pagina
// falsa, stSane e ovosHtml recortados, e o Simples com a janela falsa do bh5-telas.
// Roda com: node test/ovos.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const corta = (a, fim) => { const i = s.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 50)); const j = s.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 50)); return s.slice(i, j + fim.length); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");
const READ_STATE = tpl('const READ_STATE = ');
const OVOS = corta('  function ovosHtml(E, T) {', '\n  }\n');
const ovosHtml = new Function(OVOS + 'return ovosHtml;')();
const OVO_UI = new Function(OVOS + corta('  const OVO_UI = (T) => `', '})()`;') + '\nreturn OVO_UI;')();
const stSane = new Function(corta('  function stSane(d) {', '\n  }\n') + 'return stSane;')();
const sem = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// o centro do Breeding como o jogo manda (com o que o app nao guarda: gold, ids, pais) e o resumo que vira P.egg
const CENTRO = { unlocked: true, unlockLevel: 50, level: 312, gold: 98765432, slots: 3, maxSlots: 6, usedSlots: 2, nextSlotCost: 500, instantHatchCost: 120, shinyPartner: { min: 1.6, hardCap: 2 },
  eggs: [{ id: 'egg-a1', speciesId: 25, parent1: 'pai-1', parent2: 'pai-2', rank: 'B', killsDone: 756, killsRequired: 3000, ready: false, shinyChild: false },
    { id: 'egg-b2', speciesId: 133, rank: 'S', killsDone: 10000, killsRequired: 10000, ready: true, shinyChild: true }] };
const RESUMO = { un: true, ul: 50, sl: 3, eggs: [{ r: false, sh: false, rk: 'B', d: 756, n: 3000 }, { r: true, sh: true, rk: 'S', d: 10000, n: 10000 }] };
// cores das notas da Tierlist (TL_TIERS do app), que o ovoTxt manda em T.rk
const TL = Object.fromEntries([...(/const TL_TIERS = (\[[^\n]*\]);/.exec(s) || [, '[]'])[1].matchAll(/'([A-Z])', '(#[0-9a-f]{6})'/gi)].map((m) => [m[1], m[2]]));
const RK = { S: TL.S, A: TL.A, B: TL.B, C: TL.C, D: TL.D, E: TL.D };
const T_PT = { loc: 'pt-BR', titulo: 'Incubadora', ovo: 'Ovo', pronto: 'Pronto pra chocar', abates: 'abates', vazio: 'Nenhum ovo incubando', trava: 'O Breeding libera no nível {n}', espera: 'Aguardando resposta do jogo…', dica: 'Clique pra recolher ou abrir · arraste pra mover', rk: RK };
const TOK = Object.fromEntries([...((/:root \{([^}]*)\}/.exec(s) || [])[1] || '').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().toLowerCase()]));

// pagina do jogo com o coletor: fetch responde pela URL inteira ou so pelo caminho, timers guardados
function pagina(corpos, tokens) {
  const agora = 1_700_000_000_000;
  const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(agora); } static now() { return agora; } };
  function FakeWS() { this.readyState = 1; this.ls = []; }
  FakeWS.prototype.addEventListener = function (t, f) { if (t === 'message') this.ls.push(f); };
  FakeWS.prototype.send = function () {};
  const pedidos = [], ctl = { adia: false, status: {}, fila: [] }; // adia: as respostas esperam o solta(i), pra montar corrida
  const resp = (b, st) => ({ ok: st < 300, status: st, clone() { return resp(b, st); }, json: async () => b });
  const ss = new Map(tokens ? [['pokeweb:tokens', JSON.stringify(tokens)]] : []);
  const win = { WebSocket: FakeWS, atob: (b) => Buffer.from(b, 'base64').toString('binary'), document: { querySelector: () => null },
    fetch: (u, o) => {
      u = String(u); pedidos.push({ u, auth: o && o.headers && o.headers.Authorization });
      const b = u in corpos ? corpos[u] : corpos[u.split('?')[0]], r = resp(b === undefined ? {} : JSON.parse(JSON.stringify(b)), ctl.status[u] || 200);
      return ctl.adia ? new Promise((ok2) => ctl.fila.push(() => ok2(r))) : Promise.resolve(r);
    },
    sessionStorage: { getItem: (k) => (ss.has(k) ? ss.get(k) : null) }, localStorage: { getItem: () => null } };
  win.window = win;
  const tos = [];
  const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: () => 0, setTimeout: (f, ms) => { tos.push({ f, ms }); return 0; }, clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map, escape, decodeURIComponent }));
  vm.runInContext(COLETOR, ctx);
  vm.runInContext('new WebSocket("wss://x")', ctx);
  const run = (c) => vm.runInContext(c, ctx);
  const espera = async () => { for (let k = 0; k < 6; k++) await vez(); };
  return { pedidos, tos, run, corpos, espera, ctl, solta: (i) => ctl.fila[i](),
    busca: async (u, o) => { run('fetch(' + JSON.stringify(u) + (o ? ', ' + JSON.stringify(o) : '') + ')'); await espera(); },
    egg: () => run('JSON.stringify(window.__poke.egg)') };
}

// pagina do jogo so com o que o card usa: head/body, localStorage, location, tamanho da janela e o setInterval guardado
function jogo(o = {}) {
  const store = new Map(Object.entries(o.ls || {}));
  class CL { constructor() { this.s = new Set(); } add(c) { this.s.add(c); } remove(c) { this.s.delete(c); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.style = {}; this.classList = new CL(); this.ev = {}; this.innerHTML = ''; this.title = ''; this.pai = null; this.filhos = []; }
    set className(v) { String(v).split(' ').forEach((c) => this.classList.add(c)); }
    get parentNode() { return this.pai; }
    appendChild(c) { c.remove(); c.pai = this; this.filhos.push(c); return c; } // como no DOM: anexar move o no
    remove() { if (this.pai) { this.pai.filhos = this.pai.filhos.filter((x) => x !== this); this.pai = null; } }
    get isConnected() { return !!this.pai; }
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); }
    setPointerCapture() {}
    get offsetWidth() { return this.classList.contains('rec') ? 40 : 190; }
    get offsetHeight() { return this.classList.contains('rec') ? 40 : 150; }
    get offsetLeft() { return parseFloat(this.style.left) || 0; }
    get offsetTop() { return parseFloat(this.style.top) || 0; }
  }
  const head = new El('head'), body = new El('body'), ints = [], resizes = [];
  // a interface do jogo mora no .game-root (fixed, camada propria); o.semRoot: pagina sem ele (login, carregando)
  const root = new El('div'); root.className = 'game-root'; if (!o.semRoot) body.appendChild(root);
  const obst = []; // elementos do jogo no canto (o Ir ao Mercado): { vis, r: {left, top, right, bottom, width, height} }
  const win = { document: { createElement: (t) => new El(t), head, body, querySelector: (q) => (q === '.game-root' && root.pai ? root : null), querySelectorAll: (q) => (q === '.market-cta, .cap-panel' ? obst.filter((e) => e.vis).map((e) => ({ getBoundingClientRect: () => e.r })) : []) }, location: { pathname: o.path || '/play' }, innerWidth: 800, innerHeight: 450,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) }, addEventListener: (t, f) => { if (t === 'resize') resizes.push(f); }, setInterval: (f) => { ints.push(f); return 1; } };
  win.window = win;
  const ctx = vm.createContext(win);
  const card = () => root.filhos.concat(body.filhos).find((c) => c.classList.contains('pg-ovo')) || null;
  const ev = (t, x, y, b) => { const c = card(); (c.ev[t] || []).forEach((f) => f({ button: 0, buttons: b == null ? 1 : b, pointerId: 1, clientX: x, clientY: y, stopPropagation() {} })); };
  return { win, store, card, body, head, root, ev, obst,
    injeta: (T) => vm.runInContext(OVO_UI(T || T_PT), ctx),
    tique: () => ints.forEach((f) => f()),
    redimensiona: (w, h) => { win.innerWidth = w; win.innerHeight = h; resizes.forEach((f) => f()); },
    clica: (x = 700, y = 400) => { ev('pointerdown', x, y); ev('pointerup', x, y, 0); },
    arrasta: (x0, y0, x1, y1) => { ev('pointerdown', x0, y0); ev('pointermove', (x0 + x1) / 2, (y0 + y1) / 2); ev('pointermove', x1, y1); ev('pointerup', x1, y1, 0); } };
}

// janela do app com DOM falso (o harness do bh5-telas, so com o que esta suite le)
const realST = setTimeout;
const PRAZO = +((/function lePainel\(w, js\) \{[^\n]*?r\(null\), (\d+)\)/.exec(code) || [])[1] || 3000);
function monta(opts = {}) {
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
    executeJavaScript() { return Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() {} reloadIgnoringCache() {} loadURL() { return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid'), byId = new Map();
  document = {
    getElementById: (id) => { if (id === 'grid') return grid; if (!byId.has(id)) byId.set(id, new El(id === 'tlLevel' || id === 'tlTm' || /^sc(Url|Name)$/.test(id) ? 'input' : 'div', id)); return byId.get(id); },
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: () => [],
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, appVersion: '1.5.38' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  const exporta = '\n;return { refreshCards, cardsSet: (v) => { cardsOn = v; }, stCache, get cardsEl() { return cardsEl; }, t, stSane, I18N, cardsCfg, webviews };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const sT = (f, ms) => { if (ms === PRAZO) realST(() => { try { f(); } catch {} }, 5); return 1; };
  return fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, { reload() {} }, noop, noop, sT, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
}

(async () => {
  await secao('coletor: pede a incubadora no poll e guarda so o resumo', async () => {
    const m = pagina({ '/api/characters/me': { character: { id: 'c1', name: 'Ash' } }, '/api/game/breeding?action=center': CENTRO }, { accessToken: 'TK' });
    ok(m.egg() === undefined, 'antes de o jogo responder: sem P.egg (o Simples mostra "aguardando")');
    const poll = m.tos.find((x) => x.ms === 9000); poll.f(); await m.espera();
    const pd = m.pedidos.find((p) => p.u === '/api/game/breeding?action=center');
    ok(!!pd && pd.auth === 'Bearer TK', 'o poll pede o centro do Breeding com o token do jogo, como a janela Breeding faz: ' + JSON.stringify(pd));
    ok(m.egg() === JSON.stringify(RESUMO), 'P.egg = resumo (liberado, nivel, slots e, por ovo, pronto, shiny, rank e abates): ' + m.egg());
    const api = m.run('Object.keys(window.__poke.api).join()');
    ok(!/breeding/.test(api) && !/98765432|egg-a1|pai-1/.test(m.run('JSON.stringify(window.__poke)')), 'nada da resposta crua fica na pagina (gold, ids dos ovos e dos pais); P.api = ' + api);
  });

  await secao('coletor: cotacao, choco, trava e dado torto', async () => {
    const m = pagina({ '/api/game/breeding?action=center': CENTRO });
    await m.busca('/api/game/breeding?action=center');
    const q = '/api/game/breeding?action=quote&parent1=a&parent2=b&free=0';
    m.corpos[q] = { goldFee: 10, stones: { baseOk: true }, delta: { cap: 2 } };
    await m.busca(q);
    ok(m.egg() === JSON.stringify(RESUMO), 'a cotacao do par (mesma rota, sem a lista) nao apaga os ovos');
    m.corpos['/api/game/breeding'] = { child: { id: 'n1', name: 'Pikachu' } };
    await m.busca('/api/game/breeding', { method: 'POST', body: '{"action":"hatch","eggId":"egg-b2"}' });
    ok(m.egg() === JSON.stringify(RESUMO), 'o choco (POST que volta so o filhote) tambem nao');
    m.corpos['/api/game/breeding'] = Object.assign({}, CENTRO, { eggs: CENTRO.eggs.slice(0, 1), usedSlots: 1 });
    await m.busca('/api/game/breeding', { method: 'POST', body: '{"action":"buy-slot"}' });
    ok(JSON.parse(m.egg()).eggs.length === 1, 'resposta com a lista (cruzar, comprar slot) atualiza na hora, sem esperar o poll');
    m.corpos['/api/game/breeding?action=center'] = { unlocked: false, unlockLevel: 50, level: 12 };
    await m.busca('/api/game/breeding?action=center');
    ok(m.egg() === JSON.stringify({ un: false, ul: 50, sl: 0, eggs: [] }), 'Breeding travado: so o nivel que libera: ' + m.egg());
    m.corpos['/api/game/breeding?action=center'] = { unlocked: true, slots: 99, eggs: Array.from({ length: 30 }, () => ({ rank: '<img src=x onerror=alert(1)>', killsDone: 'x', killsRequired: 3000 })).concat([null]) };
    await m.busca('/api/game/breeding?action=center');
    const E = JSON.parse(m.egg());
    ok(E.eggs.length === 12 && E.eggs.every((e) => e.rk === '' && e.d === 0 && e.n === 3000), 'no maximo 12 ovos, rank so uma letra (E a S) e numero torto vira 0');
  });

  await secao('coletor: resposta velha, erro do servidor e poll enxuto', async () => {
    const m = pagina({ '/api/game/breeding?action=center': CENTRO }, { accessToken: 'TK' });
    m.ctl.adia = true;
    m.run("fetch('/api/game/breeding?action=center')"); // o GET do poll sai antes de o jogador criar um ovo...
    m.corpos['/api/game/breeding'] = Object.assign({}, CENTRO, { eggs: CENTRO.eggs.concat([{ rank: 'C', killsDone: 0, killsRequired: 2000 }]), usedSlots: 3 });
    m.run("fetch('/api/game/breeding', { method: 'POST' })");
    m.solta(1); await m.espera(); m.solta(0); await m.espera(); // ...e a resposta dele chega depois da do POST
    ok(JSON.parse(m.egg()).eggs.length === 3, 'a resposta velha do poll nao desfaz o ovo que acabou de ser criado: ' + JSON.parse(m.egg()).eggs.length + ' ovos');
    m.ctl.adia = false;
    m.ctl.status['/api/game/breeding?action=center'] = 500; m.corpos['/api/game/breeding?action=center'] = { unlocked: false, unlockLevel: 999 };
    await m.busca('/api/game/breeding?action=center');
    ok(JSON.parse(m.egg()).un === true, 'resposta de erro do servidor nao vira incubadora travada');
    const semTk = pagina({ '/api/game/breeding?action=center': CENTRO });
    semTk.tos.find((x) => x.ms === 9000).f(); await semTk.espera();
    ok(!semTk.pedidos.some((p) => p.u.startsWith('/api/game/breeding')), 'sem token (tela de login): o poll nao pede a incubadora (era um 401 a cada 30 s)');
    const trav = pagina({ '/api/game/breeding?action=center': { unlocked: false, unlockLevel: 50, level: 12 } }, { accessToken: 'TK' });
    const poll = trav.tos.find((x) => x.ms === 9000).f;
    for (let k = 0; k < 40; k++) { poll(); await trav.espera(); }
    const n = trav.pedidos.filter((p) => p.u === '/api/game/breeding?action=center').length;
    ok(n === 2, 'Breeding travado (nivel baixo): 40 polls (20 min) viram ' + n + ' pedidos, um a cada 10 min');
  });

  await secao('coletor: outra conta no mesmo painel', async () => {
    const m = pagina({ '/api/characters/me': { character: { id: 'c1' } }, '/api/game/breeding?action=center': CENTRO });
    await m.busca('/api/characters/me'); await m.busca('/api/game/breeding?action=center');
    m.corpos['/api/characters/me'] = { character: { id: 'c2' } };
    await m.busca('/api/characters/me');
    ok(m.egg() === 'null', 'Sair do jogo e entrar com outra conta sem recarregar: os ovos da anterior somem ate o proximo poll');
  });

  await secao('READ_STATE leva o P.egg pro app', () => {
    const leitura = (P) => new Function('window', 'document', 'return ' + READ_STATE)({ __poke: P }, { querySelector: () => null });
    const base = () => ({ ws: {}, api: { '/api/characters/me': { character: { id: 'c1', name: 'Ash' } } }, sess: { start: 1, drops: {}, kills: 0 } });
    ok(JSON.stringify(leitura(Object.assign(base(), { egg: RESUMO })).egg) === JSON.stringify(RESUMO), 'com resposta do jogo: o resumo vai no estado');
    ok(leitura(base()).egg === null, 'sem resposta ainda: null');
  });

  await secao('stSane: o ovo chega por console-message e e saneado', () => {
    const sane = (egg) => stSane({ ok: true, egg }).egg;
    ok(JSON.stringify(sane(RESUMO)) === JSON.stringify(RESUMO), 'resumo valido passa igual');
    ok(sane(undefined) === null && sane('x') === null && sane(7) === null, 'sem ovo ou ovo torto: null (o Simples mostra "aguardando")');
    ok(sane({ un: false, ul: 50 }).un === false, 'travado segue travado');
    const t2 = sane({ ul: '50', sl: 1e9, eggs: [{ r: 'true', sh: 1, rk: '<b>', d: -5, n: '3000' }, null, 'x'].concat(Array.from({ length: 20 }, () => ({ r: true, rk: 'S', d: 1, n: 2 }))) });
    ok(t2.un === true && t2.ul === 50 && t2.sl === 99, 'un ausente = liberado, numeros coagidos e slots com teto');
    const e = t2.eggs[0];
    ok(t2.eggs.length <= 12 && e.r === false && e.sh === false && e.rk === '' && e.d === 0 && e.n === 3000, 'por ovo: pronto e shiny so com true, rank so letra, abates >= 0, no maximo 12: ' + JSON.stringify(e));
    ok(sane({ eggs: 'zz' }).eggs.length === 0, 'lista torta vira vazia');
  });

  await secao('ovosHtml: cada ovo e uma barra de meta, o rank e o selo da Tierlist', () => {
    ok(sem(ovosHtml(null, T_PT)) === T_PT.espera, 'sem resposta: aguardando');
    ok(sem(ovosHtml({ un: false, ul: 1500, sl: 0, eggs: [] }, T_PT)) === 'O Breeding libera no nível 1.500', 'travado: o nivel que libera');
    ok(sem(ovosHtml({ un: true, ul: 50, sl: 3, eggs: [] }, T_PT)) === T_PT.vazio, 'liberado e sem ovo');
    const h = ovosHtml(RESUMO, T_PT);
    ok(sem(h) === 'Ovo 1 B 756 / 3.000 abates · 25% ✨ Ovo 2 S Pronto pra chocar 🎉', 'texto como o das metas do Hoje (rotulo, numeros e o 🎉 ao completar): ' + sem(h));
    ok(h.includes('<div class="pg-ovo-bar"><i style="width:25%"></i></div>') && /class="pg-ovo-e pronto"/.test(h) && /width:100%/.test(h), 'barra com o % do jogo (756/3000 = 25%) e o pronto marcado (a barra fica dourada, como a meta batida)');
    ok(!!TL.S && h.includes('<b class="pg-ovo-rk" style="background:' + TL.B + '22;color:' + TL.B + '">B</b>') && h.includes('style="background:' + TL.S + '22;color:' + TL.S + '">S</b>'), 'rank no selo de nota da Tierlist, com as cores dela (B ' + TL.B + ', S ' + TL.S + ')');
    ok(ovosHtml({ un: true, sl: 1, eggs: [{ rk: 'X', d: 1, n: 2 }] }, T_PT).includes('background:' + TL.D + '22'), 'rank que o app nao conhece: selo cinza, nao some');
    ok(!/pg-ovo-rk/.test(ovosHtml({ un: true, sl: 1, eggs: [{ rk: '', d: 1, n: 2 }] }, T_PT)), 'sem rank: sem selo');
    const x = ovosHtml({ un: true, sl: 1, eggs: [{ r: false, d: 3100, n: 3000 }, { r: false, d: 5, n: 0 }] }, T_PT);
    ok(/width:100%/.test(x) && !/NaN|Infinity/.test(x), 'passou do pedido: 100%; pedido 0: sem NaN');
    ok(/3,000/.test(ovosHtml(RESUMO, Object.assign({}, T_PT, { loc: 'en-US' }))), 'milhar no formato do idioma (3,000 em ingles)');
    const inj = ovosHtml({ un: true, sl: 1, eggs: [{ rk: '"><img src=x onerror=alert(1)>', d: 1, n: 2 }] }, Object.assign({}, T_PT, { ovo: '<i>Ovo</i>' }));
    ok(!/<img src=x|<i>/.test(inj), 'texto e rank escapados (no jogo o card le o P.egg direto, sem passar pelo stSane)');
  });

  await secao('card no jogo: aparece so com o Breeding liberado e fora do login', () => {
    const g = jogo(); g.injeta();
    ok(!g.card(), 'sem resposta do jogo: nada na tela');
    g.win.__poke = { egg: { un: false, ul: 50, sl: 0, eggs: [] } }; g.tique();
    ok(!g.card(), 'Breeding travado (conta abaixo do nivel): nada na tela');
    g.win.__poke.egg = RESUMO; g.tique();
    const c = g.card();
    ok(!!c && /Incubadora/.test(c.innerHTML) && /<b>2\/3<\/b>/.test(c.innerHTML) && /25%/.test(c.innerHTML), 'com ovos: titulo, ovos/slots (2/3) e o %');
    ok(c.title === T_PT.dica && !c.innerHTML.includes(T_PT.dica), 'a dica de recolher e arrastar fica no title, como nos controles de arrastar do app');
    ok(c.classList.contains('pronto'), 'ovo pronto pra chocar: o card fica marcado');
    ok(c.style.left === '594px' && c.style.top === '284px', 'sem posicao salva: canto de baixo a direita, longe do time do jogo (' + c.style.left + ', ' + c.style.top + ')');
    g.win.location.pathname = '/login'; g.tique();
    ok(!g.card(), 'saiu pro login: o card some');
    g.win.location.pathname = '/'; g.tique();
    ok(!g.card(), 'pagina de entrada (depois de Sair do jogo): tambem nao, os ovos seriam da conta que saiu');
    g.win.location.pathname = '/play'; g.tique();
    ok(!!g.card(), 'voltou pro jogo: aparece de novo');
    g.injeta(); g.tique();
    ok(g.root.filhos.concat(g.body.filhos).filter((x) => x.classList.contains('pg-ovo')).length === 1 && g.head.filhos.length === 1, 'reinjetar (dom-ready de novo) nao duplica o card nem o CSS');
    ok(g.card().pai === g.root, 'o card mora dentro do .game-root: no body ele ficava por cima de todas as janelas do jogo (Mochila, Mercado, o Breeding)');
    const g2 = jogo({ semRoot: true }); g2.win.__poke = { egg: RESUMO }; g2.injeta();
    ok(!!g2.card() && g2.card().pai === g2.body, 'sem o .game-root ainda: no body, e muda pra dentro dele quando ele aparece');
    g2.body.appendChild(g2.root); g2.tique();
    ok(g2.card().pai === g2.root, 'apareceu o .game-root: o card entra nele');
  });

  await secao('card no jogo: clique recolhe, arrastar move, e fica salvo por painel', () => {
    const g = jogo(); g.win.__poke = { egg: RESUMO }; g.injeta();
    g.clica();
    let c = g.card();
    ok(c.classList.contains('rec') && /^<img src="\/assets\/breeding\/egg\.png"/.test(c.innerHTML) && c.title === T_PT.titulo + ' 2/3 · ' + T_PT.dica, 'clique: vira so o ovo do jogo, com o resumo e a dica no title (' + c.title + ')');
    ok(/draggable="false"/.test(c.innerHTML), 'a imagem do ovo recolhido nao tem arrasto nativo (ele roubava o arrasto do card)');
    ok(JSON.parse(g.store.get('pg:ovo')).rec === true, 'recolhido fica salvo no localStorage do jogo (um por painel)');
    g.clica();
    ok(!g.card().classList.contains('rec'), 'clique de novo: abre');
    g.arrasta(700, 400, 300, 150);
    c = g.card();
    ok(c.style.left === '194px' && c.style.top === '34px' && !c.classList.contains('rec'), 'arrastar move e nao conta como clique (' + c.style.left + ', ' + c.style.top + ')');
    const p = JSON.parse(g.store.get('pg:ovo'));
    ok(Math.abs(p.fx - 194 / 610) < 1e-9 && Math.abs(p.fy - 34 / 300) < 1e-9, 'posicao salva como fracao do espaco livre: ' + JSON.stringify(p));
    g.arrasta(300, 150, -900, -900);
    ok(g.card().style.left === '0px' && g.card().style.top === '0px', 'nao sai da tela');
    g.arrasta(10, 10, 12, 12);
    ok(g.card().classList.contains('rec'), 'tremida de menos de 5 px e clique, nao arrasto');
    const g2 = jogo({ ls: { 'pg:ovo': JSON.stringify({ fx: 1, fy: 1 }) } }); g2.win.__poke = { egg: RESUMO }; g2.injeta();
    ok(g2.card().style.left === '610px' && g2.card().style.top === '300px', 'canto de baixo a direita salvo: ' + g2.card().style.left + ', ' + g2.card().style.top);
    g2.redimensiona(1600, 900);
    ok(g2.card().style.left === '1410px' && g2.card().style.top === '750px', 'painel expandido (1600x900): o card segue no canto, nao fica no meio do jogo (' + g2.card().style.left + ', ' + g2.card().style.top + ')');
    const g3 = jogo({ ls: { 'pg:ovo': '{quebrado' } }); g3.win.__poke = { egg: RESUMO }; g3.injeta();
    ok(!!g3.card(), 'localStorage torto nao derruba o card');
    const g4 = jogo({ ls: { 'pg:ovo': JSON.stringify({ fx: 'x', fy: 9 }) } }); g4.win.__poke = { egg: RESUMO }; g4.injeta();
    ok(g4.card().style.left === '0px' && g4.card().style.top === '300px', 'fracao torta fica dentro da tela');
  });

  await secao('card no jogo: desvia do Ir ao Mercado em vez de ficar por baixo dele', () => {
    // 14/10/2026: nas cidades o jogo poe o botao Ir ao Mercado (.market-cta, 259x67, 16 px do canto de baixo a direita, z 16), bem
    // em cima do canto padrao do card, numa camada acima: o ovo sumia embaixo dele. Por cima tambem nao serve: tapava o botao
    const g = jogo(); g.win.__poke = { egg: RESUMO }; g.injeta();
    ok(g.card().style.top === '284px', 'sem o botao: no canto de sempre (284px)');
    const mercado = { vis: true, r: { left: 525, top: 367, right: 784, bottom: 434, width: 259, height: 67 } };
    g.obst.push(mercado); g.tique();
    const c = g.card();
    ok(c.style.top === '209px' && c.style.left === '594px', 'entrou na cidade (o botao aparece sem o ovo mudar): no proximo tique o card sobe pra cima do botao, 8 px acima (' + c.style.top + ')');
    mercado.vis = false; g.tique();
    ok(g.card().style.top === '284px', 'saiu da cidade: volta pro lugar');
    mercado.vis = true; g.clica(); g.tique();
    const ov = g.card();
    ok(ov.classList.contains('rec') && parseFloat(ov.style.top) + 40 <= 367 - 8, 'recolhido no canto: o ovo tambem fica acima do botao (' + ov.style.top + ')');
    g.clica(); g.arrasta(700, 300, 120, 160); g.tique(); // o arrasto parte de onde o card esta na tela (ja levantado: 594, 209)
    ok(g.card().style.left === '14px' && g.card().style.top === '69px', 'card levado pra longe do botao: fica onde o usuario pos (' + g.card().style.left + ', ' + g.card().style.top + ')');
  });

  await secao('card no jogo: arrasto nao gruda no mouse', () => {
    const g = jogo(); g.win.__poke = { egg: RESUMO }; g.injeta();
    g.ev('pointerdown', 700, 400); g.ev('pointermove', 600, 300);
    const l0 = g.card().style.left;
    g.ev('pointermove', 400, 200, 0);
    ok(g.card().style.left === l0, 'botao solto fora da janela: o proximo movimento sem botao encerra o arrasto');
    g.ev('pointermove', 300, 100, 1);
    ok(g.card().style.left === l0, 'e o card nao volta a seguir o mouse depois');
    g.ev('pointerdown', 700, 400);
    g.win.location.pathname = '/login'; g.tique(); g.win.location.pathname = '/play'; g.tique();
    const l1 = g.card().style.left;
    g.ev('pointermove', 100, 100, 1);
    ok(g.card().style.left === l1, 'o card sumiu no meio do arrasto (login) e voltou: passar o mouse nao move');
  });

  await secao('card no jogo: so redesenha quando muda, e os textos vem do app', () => {
    const g = jogo(); g.win.__poke = { egg: RESUMO }; g.injeta();
    const c = g.card(); c.innerHTML = 'X'; g.tique();
    ok(c.innerHTML === 'X', 'mesmos dados: nao reescreve o DOM a cada 2 s (o Esconder chat observa a pagina inteira)');
    g.win.__poke.egg = { un: true, ul: 50, sl: 3, eggs: [{ r: false, sh: false, rk: 'B', d: 900, n: 3000 }] }; g.tique();
    ok(/30%/.test(c.innerHTML) && !c.classList.contains('pronto'), 'abates subiram: redesenha (30%) e tira a marca de pronto');
    g.injeta(Object.assign({}, T_PT, { titulo: 'Incubator', loc: 'en-US' })); g.tique();
    ok(/Incubator/.test(c.innerHTML) && /3,000/.test(c.innerHTML), 'textos novos na proxima injecao (trocar o idioma recarrega os paineis)');
    ok(s.includes('wv.executeJavaScript(OVO_UI(ovoTxt())).catch(() => {});'), 'o app injeta o card no dom-ready');
  });

  await secao('Simples: secao Incubadoras no molde dos Times, logo abaixo da tabela por conta', async () => {
    const H = monta({ ls: { count: '3' } }); await vez();
    H.webviews[2].url = 'https://poke.idleworld.online/login';
    const conta = (extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 300, gold: 1000, diamonds: 0, a: { seconds: 900, gph: 1000, xph: 5000, kph: 100 }, team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra);
    H.stCache[0] = { t: Date.now(), d: H.stSane(conta({ hunt: 'Bug Cave', egg: JSON.parse(JSON.stringify(RESUMO)) })) };
    H.stCache[1] = { t: Date.now(), d: H.stSane(conta({ cid: 'c2', name: 'Misty' })) };
    H.cardsSet(true); await H.refreshCards(true);
    const h = H.cardsEl.innerHTML;
    const iT = h.indexOf('data-s="table"'), iO = h.indexOf('data-s="eggs"'), iH = h.indexOf('data-s="hunts"');
    ok(iT >= 0 && iT < iO && iO < iH, 'Incubadoras entre a tabela por conta e o ranking de hunts (' + [iT, iO, iH] + ')');
    const sec = h.slice(iO, h.lastIndexOf('<div', iH));
    ok(sec.includes('<div class="cd-sec"><div class="cd-h">' + H.t('cdEggs') + ' · ' + H.t('cdEggsSub') + '</div>'), 'cabecalho como o das outras secoes (titulo · explicacao, em caixa alta pelo .cd-h)');
    ok(sec.includes('grid-template-columns:repeat(2,minmax(0,1fr));gap:12px') && !/cd-ovo"|class="cd-sh"/.test(sec), 'uma coluna por conta ativa como nos Times, sem cartao dentro de cartao (e a coluna encolhe em vez de vazar)');
    const cols = [...sec.matchAll(/<div class="cd-h" style="margin-bottom:4px[^"]*">([\s\S]*?)(?=<div class="cd-h" style="margin-bottom:4px|$)/g)].map((m) => sem(m[1]));
    ok(cols.length === 2, 'so as contas ativas, como nos Times (o painel no login fica de fora): ' + cols.length);
    ok(cols[0] === 'Ash 2/3 Ovo 1 B 756 / 3.000 abates · 25% ✨ Ovo 2 S Pronto pra chocar 🎉', 'conta com ovos: ' + cols[0]);
    ok(cols[1] === 'Misty ' + H.t('ovoEspera'), 'conta que o jogo ainda nao respondeu: ' + cols[1]);
    ok(sec.includes('style="background:' + TL.B + '22;color:' + TL.B + '">B</b>'), 'o app manda as cores da Tierlist pro selo do rank');
    H.stCache[0] = H.stCache[1] = null; H.webviews[0].url = H.webviews[1].url = 'https://poke.idleworld.online/login'; await H.refreshCards(true);
    const h2 = H.cardsEl.innerHTML, s2 = h2.slice(h2.indexOf('data-s="eggs"'), h2.lastIndexOf('<div', h2.indexOf('data-s="hunts"')));
    ok(s2.includes('<div class="cd-empty">' + H.t('cdNone') + '</div>'), 'nenhuma conta ativa: o vazio de lista do Simples');
  });

  await secao('mesmo desenho do resto do app', () => {
    ok(/\.cd-goal, \.pg-ovo-bar \{/.test(s) && /\.cd-goal > i, \.pg-ovo-bar > i \{/.test(s), 'no Simples, a barra do ovo e a mesma regra da barra de meta do Hoje (.cd-goal)');
    ok(/\.cd-empty, \.pg-ovo-msg \{/.test(s), 'aguardando, travado e vazio com o texto de lista vazia do Simples (.cd-empty)');
    const js = OVO_UI(T_PT);
    const hex = [...new Set((js.match(/#[0-9a-f]{6}\b/gi) || []).map((x) => x.toLowerCase()))];
    const tok = new Set(Object.values(TOK)), fora = hex.filter((x) => !tok.has(x));
    ok(Object.keys(TOK).length > 20 && !fora.length, 'o card no jogo so usa cores dos tokens do app, escritas em hex (' + hex.length + ' cores' + (fora.length ? '; fora: ' + fora.join(', ') : '') + ')');
    ok(js.includes('background:' + TOK['--sf'] + ';border:1px solid ' + TOK['--bd2'] + ';border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.45)') && /#menu \{[^}]*background: var\(--sf\); border: 1px solid var\(--bd2\)[^}]*box-shadow: 0 10px 28px rgba\(0,0,0,\.45\)/.test(s), 'o card tem o fundo, a borda e a sombra do menu Opcoes');
    ok(js.includes('font-size:11px;font-weight:600;color:' + TOK['--mut'] + ';text-transform:uppercase;letter-spacing:.05em;margin-bottom:7px') && /\.cd-h \{ font-size: 11px; font-weight: 600; color: var\(--mut\); text-transform: uppercase; letter-spacing: \.05em; margin-bottom: 7px; \}/.test(s), 'o cabecalho do card e o das secoes do Simples (.cd-h)');
    ok(js.includes('.pg-ovo-bar{height:6px;background:' + TOK['--bd'] + ';border-radius:4px;overflow:hidden;margin-top:3px}') && js.includes('.pg-ovo-bar>i{display:block;height:100%;background:' + TOK['--ok'] + ';border-radius:4px}') && js.includes('.pg-ovo-e.pronto .pg-ovo-bar>i{background:' + TOK['--gold'] + '}'), 'e a barra e a de meta: verde, dourada ao completar');
  });

  await secao('Simples: quem ja tinha ordem salva ganha a secao no lugar certo', async () => {
    const H = monta({ ls: { count: '1', cardsCfg: JSON.stringify({ order: ['today', 'table', 'kpis', 'hunts', 'inv'], hide: { trend: true } }) } }); await vez();
    const o = H.cardsCfg.order;
    ok(o.indexOf('eggs') === o.indexOf('table') + 1, 'ordem personalizada de antes: Incubadoras entra logo depois da tabela, nao no fim (' + o.join(',') + ')');
    ok(o.slice(0, 4).join() === 'today,table,eggs,kpis' && H.cardsCfg.hide.trend === true, 'o resto da ordem e o que estava oculto ficam como o usuario deixou');
  });

  await secao('textos nos 3 idiomas, sem travessao', async () => {
    const H = monta({ ls: { count: '1' } }); await vez();
    const K = ['cdEggs', 'cdEggsSub', 'ovoTit', 'ovoOvo', 'ovoPronto', 'ovoAbates', 'ovoVazio', 'ovoTrava', 'ovoEspera', 'ovoDica'];
    for (const L of ['pt', 'en', 'es']) {
      const f = K.filter((k) => typeof H.I18N[L][k] !== 'string' || !H.I18N[L][k] || H.I18N[L][k].includes('—'));
      ok(!f.length && H.I18N[L].ovoTrava.includes('{n}'), L + ': os ' + K.length + ' textos' + (f.length ? ' (faltam ou ruins: ' + f + ')' : ''));
    }
  });

  console.log(fail ? '\nFALHOU' : '\nTUDO OK');
  process.exit(fail);
})();
