// Caca de bugs 8 (14/10/2026): varredura em 6 frentes (coletor, telas injetadas no jogo, janela do app, logica, calculos e
// processo principal). Aqui fica o que roda na janela e nas paginas do jogo; o processo principal ficou no
// processo-principal.test.js dos repos, a aba Golpes no iv-integrada/iv-visual e o arquivo de hunts no cacada-1521.
// Roda o <script> REAL numa janela falsa (o molde do bughunt7, com cota de armazenamento e timers manuais).
// Roda com: node test/bughunt8.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const vezes = async (n) => { for (let k = 0; k < (n || 10); k++) await vez(); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const corta = (a, fim) => { const i = s.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 60)); const j = s.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim); return s.slice(i, j + fim.length); };
const READ_ALERTS = tpl('const READ_ALERTS = ');
const READ_STATE = tpl('const READ_STATE = ');
const COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");
const QOL_UI = tpl('const QOL_UI = ');
const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));

// pagina do jogo com o coletor (o molde do bughunt7): socket falso
function pagina() {
  function FakeWS(u) { this.u = String(u); this.readyState = 1; this.ls = {}; this.saiu = []; }
  FakeWS.prototype.addEventListener = function (t, f) { (this.ls[t] = this.ls[t] || []).push(f); };
  FakeWS.prototype.send = function (d) { this.saiu.push(JSON.parse(d)); };
  const resp = (b) => ({ ok: true, status: 200, clone() { return resp(b); }, json: async () => b });
  const win = { WebSocket: FakeWS, atob: (b) => Buffer.from(b, 'base64').toString('binary'), document: { querySelector: () => null }, fetch: () => Promise.resolve(resp({})),
    sessionStorage: { getItem: (k) => (k === 'pokeweb:tokens' ? JSON.stringify({ accessToken: 'TK' }) : null) }, localStorage: { getItem: () => null },
    location: { href: 'https://poke.idleworld.online/play', host: 'poke.idleworld.online', pathname: '/play' }, URL };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, clearTimeout() {}, escape, decodeURIComponent }));
  vm.runInContext(COLETOR, ctx);
  const run = (c) => vm.runInContext(c, ctx);
  const so = run("new WebSocket('wss://poke.idleworld.online/ws?token=TK&v=2')"); (so.ls.open || []).forEach((f) => f({}));
  return { P: () => run('window.__poke'), msg: (x) => (so.ls.message || []).forEach((f) => f({ data: JSON.stringify(x) })) };
}

// janela do app com DOM falso: exec responde o executeJavaScript dos paineis, ints/tos guardam os timers (nada roda sozinho),
// localStorage com a cota do Chromium (chave + valor em caracteres) quando opts.quota vem
function monta(opts = {}) {
  let document;
  const ints = [], tos = [], store = new Map(Object.entries(opts.ls || {}));
  const quota = opts.quota || Infinity;
  const usado = () => { let n = 0; for (const [k, v] of store) n += k.length + v.length; return n; };
  const docEv = {}, calls = [];
  class CL { constructor() { this.s = new Set(); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag, id) { this.tagName = String(tag || 'div').toUpperCase(); this.id = id || ''; this.style = { setProperty() {}, removeProperty() {} }; this.classList = new CL(); this.dataset = {}; this.children = []; this._h = ''; this._t = ''; this.value = ''; this.checked = false; this.title = ''; this.options = [{}, {}]; this.childElementCount = 0; this.offsetHeight = 40; this.scrollTop = 0; this.ev = {}; this.attrs = {}; }
    get innerHTML() { return this._h; } set innerHTML(h) { this._h = String(h); this.children = []; this.childElementCount = 0; this._q = {}; }
    get textContent() { return this._t; } set textContent(v) { this._t = String(v); this.children = []; }
    get firstChild() { return this.children[0] || (this._h ? {} : null); }
    get outerHTML() { return ''; } set outerHTML(v) {}
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } removeEventListener() {}
    querySelector(q) { this._q = this._q || {}; return this._q[q] || (this._q[q] = new El('div')); }
    querySelectorAll(q) { return (opts.qsa && opts.qsa(this, q, (t) => new El(t))) || []; }
    appendChild(c) { this.children.push(c); c.parentNode = this; this.childElementCount = this.children.length; return c; }
    remove() { if (this.parentNode) { const p = this.parentNode; p.children = p.children.filter((x) => x !== this); p.childElementCount = p.children.length; } }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; }
    focus() { document.activeElement = this; } blur() { if (document.activeElement === this) document.activeElement = null; } select() {}
    click() { if (this.onclick) this.onclick({ target: this, stopPropagation() {}, detail: 1 }); }
    contains(x) { return x === this; } closest() { return null; }
  }
  class WV extends El {
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; this.n = WV.n = (WV.n || 0) + 1; }
    executeJavaScript(c) { return opts.exec ? opts.exec(String(c), this) : Promise.resolve(null); }
    setAudioMuted(m) { calls.push(['mute', this.n, m]); } setZoomFactor() {} getURL() { return this.url; }
    reload() { calls.push(['reload', this.n]); } reloadIgnoringCache() { calls.push(['reloadIC', this.n]); } loadURL(u) { calls.push(['loadURL', this.n, u]); return Promise.resolve(); } getWebContentsId() { return this.n; }
  }
  const grid = new El('div', 'grid'), byId = new Map();
  document = {
    getElementById: (id) => { if (id === 'grid') return grid; if (!byId.has(id)) byId.set(id, new El(id === 'tlLevel' || id === 'tlTm' || /^sc(Url|Name)$/.test(id) ? 'input' : 'div', id)); return byId.get(id); },
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: (q) => (opts.qsa && opts.qsa(document, q, (t) => new El(t))) || [],
    addEventListener(t, f) { (docEv[t] = docEv[t] || []).push(f); }, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { v = String(v); const ant = store.has(k) ? k.length + store.get(k).length : 0; if (usado() - ant + k.length + v.length > quota) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } store.set(k, v); },
    removeItem: (k) => store.delete(k)
  };
  const lsProxy = new Proxy(localStorage, { ownKeys: () => [...store.keys()], getOwnPropertyDescriptor: (t, k) => (store.has(k) ? { value: store.get(k), enumerable: true, configurable: true } : (k in t ? { value: t[k], enumerable: false, configurable: true } : undefined)), get: (t, k) => (k in t ? t[k] : store.get(k)) });
  const api = Object.assign({ loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, clearAccount: async () => true, fetchUserScript: async () => ({ ok: false }), appVersion: '1.5.39' }, opts.api || {});
  const window = { addEventListener() {}, confirm: () => true, alert() {}, open() {}, pokeAPI: api, PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js')) };
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', 'ResizeObserver', 'pokeAPI', code + '\n;return {' + (opts.exporta || '') + '};');
  const noop = () => 0;
  const out = fn(window, document, lsProxy, { clipboard: { writeText: async () => {} } }, { reload() { calls.push(['location.reload']); }, pathname: '/x/index.html' }, (f, ms) => { ints.push({ f, ms }); return ints.length; }, noop, (f, ms) => { tos.push({ f, ms }); return tos.length; }, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, opts.FileReader || function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null, function () { return { observe() {}, unobserve() {} }; }, api);
  return Object.assign(out, { ints, tos, store, calls, docEv, grid, document });
}
const conta = (extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 300, gold: 1000, diamonds: 0, a: { seconds: 900, gph: 1000, xph: 5000, kph: 100 }, hunt: 'Bug Cave', team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra || {});

(async () => {
  await secao('coletor: lista de pokemon em partes com total 0 ou sem total', async () => {
    for (const [rot, ch] of [['total 0', { type: 'pokes-chunk', gen: 1, seq: 0, total: 0, list: [] }], ['sem total', { type: 'pokes-chunk', gen: 2, seq: 0, list: [] }]]) {
      const pg = pagina();
      pg.msg(ch);
      ok(!pg.P().pokesBaselined, rot + ': a lista vazia nao marca a caixa como vista');
      pg.msg({ type: 'pokes', list: [{ id: 1, name: 'Pikachu', sellValue: 500, team: true }, { id: 2, name: 'Gyarados', shiny: true, sellValue: 9000 }] });
      const P = pg.P();
      ok(P.pokesBaselined && !(P.sess.shinyCapN > 0) && !(P.sess.sellG > 0) && !(P.catchLog || []).length, rot + ': a caixa de verdade vira a base, sem nada contado como captura (antes a caixa inteira virava captura: festa de shiny, webhook e gold falso)');
    }
    const pg = pagina();
    pg.msg({ type: 'pokes-chunk', gen: 5, seq: 1, total: 2, list: [{ id: 2, name: 'B' }] });
    ok(!pg.P().pokesBaselined, 'parte 2 de 2 sozinha: espera a outra');
    pg.msg({ type: 'pokes-chunk', gen: 5, seq: 0, total: 2, list: [{ id: 1, name: 'A' }] });
    const P = pg.P();
    ok(P.pokesBaselined && P.ws.pokes.list.map((x) => x.id).join() === '1,2', 'as 2 partes: junta na ordem, como o jogo, e vira a base');
  });

  await secao('janela: sprite e CSP', () => {
    const dexId = new Function('formDex', corta('  const dexId = (id) => {', '};') + '\nreturn dexId;');
    const f = dexId({ 10050: '0.png"><b>X</b><img x="', 10051: 25 });
    ok(f(10050) === 10050 && f(10051) === 25 && f('13025') === 25 && f(7) === 7, 'valor que nao e numero no catalogo de formas (forjado pela pagina) nao vai cru pro src da sprite; o dex de verdade segue');
    const csp = (/http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(s) || [])[1] || '';
    const img = (/img-src ([^;]*);/.exec(csp) || [])[1] || '';
    ok(img === "'self' data: https://poke.idleworld.online https://raw.githubusercontent.com", 'img-src so com o jogo e as sprites do GitHub (o pokexguides.com, fora de uso, era canal de vazamento depois de um XSS): ' + img);
    const icSrc = new Function(corta('      const icSrc = (u) =>', ' // so o nome do arquivo') + '\nreturn icSrc;')();
    ok(icSrc('https://pokexguides.com/x.png') === '' && icSrc('https://poke.idleworld.online/assets/items/x.png') !== '', 'e o icone de item tambem nao aponta mais pra la');
  });

  await secao('conta trocada no painel: o nome que vai pro log e pro Discord', async () => {
    let R = null; const textos = [];
    const H = monta({ ls: { count: '1', webhook: JSON.stringify({ url: 'https://discord.com/api/webhooks/1/abc', shiny: true, sum: false }) }, api: { webhook: async (u, txt) => { textos.push(txt); return true; } },
      exec: (c) => Promise.resolve(c === READ_ALERTS ? JSON.parse(JSON.stringify(R)) : null), exporta: 'tabNames, lifeShiny: () => lifeShiny, webviews' });
    await vezes(5);
    const push = (name, cid) => H.webviews[0].ev['console-message'].forEach((f) => f({ message: '__PGST__' + JSON.stringify(conta({ cid, name })) }));
    push('Ash', 'c1');
    ok(H.tabNames[0] === 'Ash', 'o push de 10 s do painel ja da o nome da conta (antes so o Resumo e o Simples davam)');
    const tique = H.ints.find((x) => x.ms === 6000), agora = Date.now();
    const base = (cid, extra) => Object.assign({ live: true, sk: true, cid, sess: { start: agora - 60e3, kills: 5 }, kills: 5, xp: 10, caps: 0, shinyN: 0, faintN: 0, saldo: 0, srv: 0, anS: 0, shinyLog: [], catchLog: [], inH: '', fa: 0, rf: 0 }, extra || {});
    R = base('c1'); tique.f(); await vezes(10);
    R = base('c2'); tique.f(); await vezes(10); // trocou de conta no painel
    push('Misty', 'c2');
    R = base('c2', { shinyN: 1, shinyLog: [{ n: 'Gyarados', sid: 130, t: Date.now(), cap: 1 }], catchLog: [{ n: 'Gyarados', sh: true, iv: 150, q: 1.8, t: Date.now() }] });
    tique.f(); await vezes(10);
    const ls = H.lifeShiny(), ult = ls[ls.length - 1] || {};
    ok(ult.acc === 'Misty' && textos.some((x) => /Misty: shiny Gyarados/.test(x)) && !textos.some((x) => /Ash: shiny/.test(x)), 'shiny capturado depois da troca: gravado e anunciado no Discord com o nome da conta nova, nao da anterior (' + ult.acc + ')');
  });

  await secao('Resumo: trocar de aba no meio da leitura', async () => {
    let soltaAsh;
    const st = (cid, name) => ({ ok: true, cid, name, level: 300, gold: 1, diamonds: 0, a: null, hunt: '', team: [], usedList: [], catchLog: [], bag: [], drops: [] });
    const H = monta({ ls: { count: '2' }, exporta: 'tabNames, refreshStats, stBody, stTabs, abre: () => { statsOpen = true; statsIdx = 0; buildStatsTabs(); }',
      exec: (c, wv) => { if (c !== READ_STATE) return Promise.resolve(null); if (wv.n === 1) return new Promise((r) => { soltaAsh = () => r(st('c1', 'Ash')); }); return Promise.resolve(st('c2', 'Misty')); } });
    await vezes(5);
    H.abre(); const p0 = H.refreshStats(); await vezes(5);
    H.stTabs.children[2].onclick(); await vezes(10); // aba do painel 2 (0 = Σ)
    soltaAsh(); await p0; await vezes(10);
    ok(H.tabNames[1] === 'Misty' && /Misty/.test(H.stBody.innerHTML) && !/Ash/.test(H.stBody.innerHTML), 'a leitura atrasada do painel 1 nao desenha na aba do painel 2 nem da o nome dela (' + JSON.stringify(H.tabNames) + ')');
  });

  await secao('contas: Salvar e numero de paineis antes de o loadCreds responder', async () => {
    const gravados = []; let solta;
    const H = monta({ ls: { count: '1' }, api: { loadCreds: () => new Promise((r) => { solta = r; }), saveCreds: async (a) => { gravados.push(a); return true; } }, exporta: 'accounts: () => accounts, webviews, setCount' });
    await vezes(5);
    H.document.getElementById('accounts').onclick();
    await H.document.getElementById('accSave').onclick(); await vezes(5);
    H.setCount(3);
    ok(gravados.length === 0 && H.webviews.length === 0, 'contas ainda carregando: o Salvar nao grava a lista vazia por cima das senhas e o numero de paineis espera (antes o painel 1 nascia duplicado)');
    solta([{ name: 'Ash', email: 'a@x', senha: 's' }]); await vezes(10);
    ok(H.accounts()[0].senha === 's' && H.webviews.length === 1, 'as contas chegam e tudo segue normal');
  });

  await secao('Treinadores: o Salvar falhou e o usuario cancelou', async () => {
    const gravados = []; let falha = true, doc;
    const H = monta({
      ls: { count: '1' },
      api: { loadCreds: async () => [{ name: 'Ash', email: 'a@x', senha: 'antiga' }], saveCreds: async (a) => { gravados.push(JSON.parse(JSON.stringify(a))); return !falha; } },
      qsa: (el, q, mk) => {
        if (q === 'input' && /acc-del/.test(el._h || '')) { if (!el._inps) el._inps = [...el._h.matchAll(/data-i="(\d+)" data-f="(\w+)"/g)].map((m) => { const e = mk('input'); e.dataset = { i: m[1], f: m[2] }; return e; }); return el._inps; }
        if (q === '#accRows input') return doc.getElementById('accRows').children.flatMap((r) => r._inps || []);
        return [];
      },
      exporta: 'accounts: () => accounts, trocou'
    });
    doc = H.document; await vezes(10);
    doc.getElementById('accounts').onclick();
    doc.getElementById('accRows').children[0]._inps.find((e) => e.dataset.f === 'senha').value = 'NOVA-nao-salva';
    await doc.getElementById('accSave').onclick(); await vezes(5);
    ok(H.accounts()[0].senha === 'antiga' && H.trocou[0] === false && doc.getElementById('dlgOverlay').classList.contains('show'), 'falhou: avisa e a memoria volta pro que esta no disco (antes a senha nao salva seguia valendo pro auto-login)');
    doc.getElementById('dlgOk').onclick({ detail: 1 });
    doc.getElementById('accCancel').onclick();
    falha = false;
    const nameEl = H.grid.children[0].querySelector('.name'); nameEl.ondblclick();
    const inp = nameEl.children[0]; inp.value = 'Ash 2'; inp.onkeydown({ key: 'Enter', stopPropagation() {} });
    await vezes(10);
    const g = gravados[gravados.length - 1][0];
    ok(g.senha === 'antiga' && g.name === 'Ash 2', 'o proximo salvar (renomear o painel) grava a senha de antes, nao a que o usuario cancelou');
  });

  await secao('renomear o painel com o salvar falhando', async () => {
    const H = monta({ ls: { count: '1' }, api: { loadCreds: async () => [{ name: 'Ash', email: 'a@x', senha: 's' }], saveCreds: async () => false } });
    await vezes(10);
    const nameEl = H.grid.children[0].querySelector('.name'); nameEl.ondblclick();
    const inp = nameEl.children[0]; inp.value = 'Conta Principal'; inp.onkeydown({ key: 'Enter', stopPropagation() {} });
    await vezes(10);
    ok(H.document.getElementById('dlgOverlay').classList.contains('show'), 'avisa que nao salvou, como o Treinadores (antes o nome sumia no proximo boot sem aviso)');
  });

  await secao('importar config: o historico importado fica, e valor torto nao passa', async () => {
    const d0 = new Date(), hoje = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0');
    const importado = { '2026-09-01': { 0: { g: 999999, x: 5, kl: 500, c: 9, sf: 1, sc: 1 } }, [hoje]: { 0: { g: 222, x: 0, kl: 2, c: 0, sf: 0, sc: 0 } } };
    let R = null;
    class FR { readAsText(f) { this.result = f._txt; setImmediate(() => this.onload()); } }
    const H = monta({ ls: { count: '1', histDay: JSON.stringify({ [hoje]: { 0: { g: 111, x: 0, kl: 1, c: 0, sf: 0, sc: 0 } } }) }, FileReader: FR, exec: (c) => Promise.resolve(c === READ_ALERTS ? JSON.parse(JSON.stringify(R)) : null) });
    await vezes(10);
    const tique = H.ints.find((x) => x.ms === 6000);
    R = { live: true, sk: true, cid: 'c1', sess: { start: Date.now() - 60e3, kills: 5 }, kills: 5, xp: 10, caps: 0, shinyN: 0, faintN: 0, saldo: 0, srv: 0, anS: 0, shinyLog: [], catchLog: [], inH: '', fa: 0, rf: 0 };
    tique.f(); await vezes(10);
    const orig = H.document.createElement; let inp; H.document.createElement = (t) => { const e = orig(t); if (t === 'input') inp = e; return e; };
    H.document.getElementById('bkImp').onclick();
    inp.files = [{ _txt: JSON.stringify({ histDay: JSON.stringify(importado), count: '2.5', statsW: '99999' }) }];
    inp.onchange(); await vezes(10);
    H.document.getElementById('dlgOk').onclick({ detail: 1 }); await vezes(20);
    R = Object.assign({}, R, { kills: 9 }); tique.f(); await vezes(10); // o tique que chega antes de a pagina descarregar
    ok(H.calls.some((c) => c[0] === 'location.reload') && '2026-09-01' in JSON.parse(H.store.get('histDay')), 'o tique entre o importar e a recarga nao regrava o historico da memoria por cima do importado');
    const H2 = monta({ ls: { count: H.store.get('count'), statsW: H.store.get('statsW') }, exporta: 'webviews, count: () => count, statsEl' });
    await vezes(10);
    ok(Number.isInteger(H2.count()) && H2.webviews.length === H2.count() && H2.statsEl.style.width === '760px', 'count 2.5 vira um numero inteiro de paineis e a largura do Resumo fica no limite do arraste (' + H2.count() + ', ' + H2.statsEl.style.width + ')');
  });

  await secao('armazenamento cheio: so poda o historico se isso fizer a gravacao caber', async () => {
    const QUOTA = 5242880;
    const hunt = (k) => ({ p: 0, acc: 'Ash', hunt: 'Bug cave', start: 1e12 + k, end: 1e12 + k + 1800e3, kills: 100, xp: 5000, caps: 2, sf: 0, sc: 0, balls: 10, pots: 1, loot: 1234, sell: 0, sup: 300, drops: Array.from({ length: 25 }, (_, j) => ({ id: j, n: 'Item numero ' + j, q: 3, g: 450 })) });
    const ls = { count: '1', huntLog: JSON.stringify(Array.from({ length: 300 }, (_, k) => hunt(k))), lifeShiny: JSON.stringify(Array.from({ length: 500 }, (_, k) => ({ n: 'Gyarados', sid: 130, t: 1e12 + k, cap: 1, p: 0, acc: 'Ash' }))) };
    ls.userScripts = JSON.stringify([{ id: 'u1', name: 'A', code: 'a'.repeat(QUOTA - Object.values(ls).reduce((n, v) => n + v.length, 0) - 100000) }]);
    const H = monta({ ls, quota: QUOTA, exporta: 'lsSet' });
    await vezes(5);
    const n = (k) => JSON.parse(H.store.get(k) || '[]').length;
    ok(H.lsSet('histDay', 'x'.repeat(400000)) === false && n('huntLog') === 300 && n('lifeShiny') === 500, 'gravacao que nao cabe nem com a poda: falha sem apagar metade do historico (antes cortava huntLog e companhia a cada tentativa)');
    ok(H.lsSet('lang', 'en-' + 'x'.repeat(150000)) === true && n('huntLog') === 150, 'gravacao que cabe depois da poda: poda e grava, como antes');
  });

  await secao('planilhas em ingles: data ISO', () => {
    const csvData = (L) => new Function('lang', 'hlNum', corta('  const csvData = ', '};') + '\nreturn csvData;')(L, (x) => +x);
    const t0 = new Date(2026, 9, 1, 13, 5, 9).getTime();
    ok(csvData('en')(t0) === '2026-10-01 13:05:09' && csvData('pt')(t0) === '01/10/2026 13:05:09', 'em ingles a data vai em ISO (o Excel americano lia 01/10 como 10 de janeiro); em portugues segue dd/mm/aaaa');
    ok(code.includes("return p.length === 3 && lang !== 'en' ? p[2] + '/' + p[1] + '/' + p[0] : k;") || /const diaBR = \(k\) => \{[^\n]*lang !== 'en'/.test(code), 'o resumo por dia tambem: em ingles fica o ISO do proprio dia');
  });

  await secao('atalhos de letra com a tecla segurada', async () => {
    const H = monta({ ls: { count: '4' }, exporta: 'alertsOn: () => alertsOn' });
    await vezes(10);
    H.document.querySelector = () => null; // nenhuma janela aberta
    const atalho = H.docEv.keydown.find((f) => /TECLAS_ATALHO/.test(String(f)));
    const aperta = (key, n) => { for (let k = 0; k < n; k++) atalho({ key, repeat: k > 0, ctrlKey: false, altKey: false, metaKey: false, preventDefault() {} }); };
    const recargas = () => H.calls.filter((c) => c[0] === 'reloadIC').length;
    const r0 = recargas(); aperta('r', 15);
    const a0 = H.alertsOn(); aperta('a', 4);
    ok(recargas() - r0 <= 4 && H.alertsOn() === !a0, 'R segurado recarrega uma vez so (antes os 4 paineis a cada repeticao, e cada recarga tira a conta da hunt); A segurado alterna uma vez (' + (recargas() - r0) + ' recargas)');
  });

  await secao('Simples aberto: tirar o mudo nao solta o som dos jogos escondidos', async () => {
    const H = monta({ ls: { count: '2', muted: '0' }, exporta: 'cardsOn: () => cardsOn' });
    await vezes(10);
    H.document.getElementById('cardsBtn').onclick();
    const mb = H.document.getElementById('muteAll'); mb.onclick(); mb.onclick();
    const ult = [1, 2].map((n) => { const m = H.calls.filter((c) => c[0] === 'mute' && c[1] === n); return m.length ? m[m.length - 1][2] : null; });
    ok(H.cardsOn() && ult.every((x) => x === true), 'Silenciar liga e desliga com o Simples aberto: os jogos seguem mudos (' + JSON.stringify(ult) + ')');
  });

  await secao('Resumo: config com secao repetida', async () => {
    const H = monta({ ls: { count: '1', statsCfg: JSON.stringify({ order: ['kpis', 'kpis', 'bag'], bagOrder: ['Loot', 'Loot'] }) }, exporta: 'cfg: () => cfg' });
    await vezes(5);
    const o = H.cfg().order, b = H.cfg().bagOrder;
    ok(o.length === new Set(o).size && b.length === new Set(b).size && o[0] === 'kpis' && b[0] === 'Loot', 'cada secao e cada categoria da Bag uma vez, na ordem salva (o Simples ja tinha esse conserto)');
  });

  await secao('rotulos e erros que nao viram ruido', () => {
    ok(["cdAllTime:'90 dias'", "cdAllTime:'90 days'", "cdAllTime:'90 días'"].every((x) => code.includes(x)) && code.includes("if (dk < dayKey(90)) delete histDay[dk];"), 'o historico guarda 90 dias, e o Simples diz "90 dias" em vez de "Total" (o total sumia depois de 3 meses)');
    ok(code.includes("try { Promise.resolve(wv.loadURL(LOGIN_URL)).catch(() => {}); } catch {} // o did-navigate cuida do preenchimento"), 'Logar equipe sem rede: a recusa do loadURL nao vira erro no relatorio');
  });

  await secao('calculos: janela dos golpes no golpes/kill e nas salvas de TM por hora', async () => {
    const H = monta({ ls: { count: '1' }, exporta: 'amostraHunt, huntStats: () => huntStats' });
    await vezes(5);
    const agora = Date.now();
    // 10 min locais: 300 kills, golpe normal 600 acertos (2 por kill), TM 60 salvas de 2 alvos (360/h); o analyzer cobre 70 min
    const S = { start: agora - 600e3, kills: 300, xp: 300 * 13508, balls: 0, captures: 3, drops: {}, shinyN: 0, shinyCapN: 0, sellG: 0, supGold: 0, supN: 0, slug: 'pidgey',
      mv: { 'Wing Attack': { n: 600, s: 0, a: 0, p: 0, pn: 0, t: agora }, 'Omega Clap': { n: 120, s: 60, a: 120, p: 0, pn: 0, t: agora } } };
    const AN = { seconds: 4200, kills: 2100, captures: 21, xpGained: 2100 * 13508, balance: 210000, lootGold: 210000, capturesGold: 0, supplyGold: 0, ballsUsed: 21, potionsUsed: 0, drops: [] };
    const P = { ws: { analyzer: AN, 'field-init': { slug: 'pidgey' }, pokes: { list: [] } }, sock: {}, api: { '/api/characters/me': { character: { id: 'c1', name: 'Ash', level: 300 } } }, sess: S };
    const d = new Function('window', 'document', 'return ' + READ_STATE)({ __poke: P }, { querySelector: () => null });
    H.amostraHunt(d.cid, d.hunt, d.a);
    const v = H.huntStats()[d.cid].pidgey;
    ok(d.a.kills === 2100 && v.hpk === 2 && v.tsh === 360, 'com o Hunt Analyzer cobrindo a hunt inteira: golpes por kill ' + v.hpk + ' (era 0,3) e salvas de TM por hora ' + v.tsh + ' (era 51), da mesma janela dos golpes');
  });

  await secao('calculos: poder no nivel lido com a qualidade terminada em 5', () => {
    const M = require(path.join(RAIZ, 'src/domain/iv-math.js'));
    const c = J.creatures.find((x) => x.name === 'Corsola');
    const KJ = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'speed'], EXP = { hp: 0.95, atk: 0.8, def: 0.8, spAtk: 0.8, spDef: 0.8, speed: 0.95 }, KM = { hp: 'hp', atk: 'atk', def: 'def', spAtk: 'spa', spDef: 'spd', speed: 'speed' };
    const B = { hp: c.baseHp, atk: c.baseAtk, def: c.baseDef, spAtk: c.baseSpAtk, spDef: c.baseSpDef, speed: c.baseSpeed }, G = { hp: 7, atk: 7, def: 30, spAtk: 3, spDef: 31, speed: 20 };
    const lv = 173, q = 1.575, S = {}; KJ.forEach((k) => { S[k] = Math.round(lv / 100 * (B[k] + 2 * G[k]) * Math.pow(q, EXP[k])); });
    const P = Math.round(KJ.reduce((t, k) => t + S[k], 0) * q);
    const pk = { level: lv, quality: +q.toFixed(2), ivTotal: 98, power: P, observedStats: {}, species: { baseStats: {} } };
    KJ.forEach((k) => { pk.observedStats[KM[k]] = S[k]; pk.species.baseStats[KM[k]] = B[k]; });
    ok(M.projectPokemon(pk, lv).power === P, 'Corsola Nv 173 ×1,575 (a tela mostra 1,57): o poder no nivel lido bate com o do jogo, ' + P + ' (antes saia ' + (P - 1) + ', sem o ≈)');
  });

  await secao('calculos: o card de IV', () => {
    const ivPwExato = new Function(corta('  const ivPwExato = ', ';') + '\nreturn ivPwExato;')();
    ok(ivPwExato({ nivel: 173 }, { exato: true, manual: false, ed: false, proj: 173 }) === true && ivPwExato({ nivel: 173 }, { exato: true, manual: false, ed: true, proj: 173 }) === false, 'qualidade ou atributo editado: o poder ganha o ≈ (o comentario ja dizia "sem edicao", o codigo nao conferia)');
    ok(code.includes('return { cat, mv, q, qe, proj, atuais, bases, temBase, manual, ed: qEd || sEd,'), 'o ivCalc diz se a leitura foi editada');
    ok(code.includes("(v, x) => (x.c.pw != null && !ivPwExato(x.d, x.c) ? '≈' : '') + nf(v) + (x.c.pw != null && !x.c.manual && x.c.proj !== x.d.nivel ? ' <small>Nv ' + x.c.proj + '</small>' : '')"), 'Comparar: o poder no nivel editado diz o nivel, e o ≈ segue a regra do card (a linha Nivel mostra o lido)');
    ok(code.includes('.concat(d.ditto ? [] : tmDiscos(c.mv).map('), 'aba Golpes: Ditto sem disco TM (o canLearnTm do jogo barra)');
    ok(code.includes('pw:+p.power||0,') && code.includes('agora: +p.pw > 0 ? +p.pw : M.projectPokemon('), 'Simples > Times: o poder atual e o que o jogo manda na lista (a conta espalhava o IV por igual e errava ate 4%)');
  });

  await secao('telas no jogo: filtro da Pokedex, Limpar jogo e Mercado', () => {
    ok(QOL_UI.includes("body.pg-dex-c .dex-window .dex-cell:not(.caught){display:none}body.pg-dex-n .dex-window .dex-cell.caught{display:none}") && !/body\.pg-dex-c \.dex-cell/.test(QOL_UI), 'o filtro ✓ Caught / ✗ Not caught vale so dentro da Pokedex: a Captura diaria tambem desenha .dex-cell e sumia');
    ok(/const grd = win\.querySelector\('\.dex-grid'\); if \(grd\) new MutationObserver\(\(\) => \{[^}]*aplicaValor\(win, true\); \}\)\.observe\(grd, \{ childList: true \}\);/.test(QOL_UI), '"$ Menor valor": celula montada depois (a busca mudou) tambem entra na ordem');
    const limpa = (/const cleanScript = \(on\) => `([\s\S]*?)`;/.exec(code) || [])[1] || '';
    ok(limpa.includes("'.cap-panel:not(:has(.cap-row.shiny)),.kc-stack,"), 'Limpar jogo: a barra de captura volta quando traz um shiny (o botao de jogar a bola e dela, e sem Auto-Catch o shiny ficava sem como capturar)');
    const src = QOL_UI.slice(QOL_UI.indexOf('    function aplicaMercado(parent) {'), QOL_UI.indexOf('    new MutationObserver(() => { dex(); mercado(); })'));
    const aplicaMercado = new Function(src + '\nreturn aplicaMercado;')();
    const linha = (n, iv, q, p) => ({ classList: { contains: () => false }, innerText: '1\n' + n + '\nIV ' + iv + '\nLendária ×' + q, querySelector: () => ({ innerText: '💲' + p }), style: { setProperty() {}, removeProperty() {}, order: '' }, n });
    const linhas = [linha('Pikachu', 131, '1.75', '1.000'), linha('Gyarados', 98, '1.32', '5.000'), linha('Dratini', 160, '2.10', '9.000')];
    for (const srt of ['iv', 'q', 'p']) {
      const pai = { querySelector: (q) => ({ '#pg-mk-r': { value: '' }, '#pg-mk-iv': { value: '' }, '#pg-mk-s': { value: srt } })[q], querySelectorAll: () => linhas, style: { setProperty() {}, removeProperty() {} } };
      aplicaMercado(pai);
      const ordem = linhas.slice().sort((a, b) => +a.style.order - +b.style.order).map((r) => r.n).join();
      ok(linhas.every((r) => +r.style.order > 0) && ordem === { iv: 'Dratini,Pikachu,Gyarados', q: 'Dratini,Pikachu,Gyarados', p: 'Pikachu,Gyarados,Dratini' }[srt], 'Mercado por ' + srt + ': ordem acima de 0, entao a barra de filtro e o cabecalho (ordem 0) ficam em cima (' + ordem + ')');
    }
  });

  console.log(fail ? '\nFALHOU' : '\nTUDO OK');
  process.exit(fail);
})();
