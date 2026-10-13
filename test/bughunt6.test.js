// Caca de bugs 6 (12/10/2026): seis frentes de auditoria (XSS, canais e import, paineis, contas, scripts injetados, build).
// Roda o codigo REAL do index.html (o <script> inteiro com DOM falso, ou o trecho da funcao) contra cada conserto.
// Roda com: node test/bughunt6.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { spawnSync } = require('child_process');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const corta = (a, fim) => { const i = s.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 50)); const j = s.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 50)); return s.slice(i, j + fim.length); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const secao = (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };

// ===================== o <script> inteiro com DOM falso (no molde do redesign-b) =====================
function monta(ls) {
  class CL { constructor(c) { this.s = new Set(c || []); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag) { this.tagName = String(tag || 'div').toUpperCase(); this.style = { setProperty() {}, removeProperty() {} }; this.classList = new CL(); this.dataset = {}; this.children = []; this._h = ''; this.value = ''; this.attrs = {}; this.ev = {}; }
    get innerHTML() { return this._h; } set innerHTML(h) { this._h = String(h); }
    get textContent() { return ''; } set textContent(v) {}
    get className() { return [...this.classList.s].join(' '); } set className(v) { this.classList = new CL(String(v).split(/\s+/).filter(Boolean)); }
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } removeEventListener() {}
    querySelector() { return new El('div'); } querySelectorAll() { return []; } appendChild(c) { this.children.push(c); return c; } remove() {}
    setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k] == null ? null : this.attrs[k]; } removeAttribute() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; } focus() {} blur() {} click() {} contains() { return false; } closest() { return null; }
  }
  class WV extends El { executeJavaScript() { return Promise.resolve(null); } setAudioMuted() {} setZoomFactor() {} getURL() { return 'https://poke.idleworld.online/play'; } reload() {} reloadIgnoringCache() {} loadURL() { return Promise.resolve(); } }
  const ids = new Map();
  const document = { getElementById: (id) => ids.get(id) || (ids.set(id, new El('div')), ids.get(id)), createElement: (t) => (t === 'webview' ? new WV('webview') : new El(t)), querySelector: () => new El('div'), querySelectorAll: () => [], addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head') };
  const store = new Map(Object.entries(ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = { addEventListener() {}, confirm: () => true, alert() {}, open() {}, PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js')),
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAutoStart: async (on) => !!on, setAwake: async () => true, setMinToTray: async () => true, saveBackup: async () => true, openErrorLog() {}, appVersion: '9.9.9' } };
  const exporta = '\n;return { jsonP, lsObj, lsArr, histDay, goals, huntLog, danoAm, tlPk, huntStats, amostraHunt, B, renderStats, statsEl };';
  const noop = () => 0;
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  return fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, { reload() {} }, noop, noop, noop, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
}

secao('JSON envenenado ({"toString":0}) no disco ou num backup importado: o app abre do mesmo jeito', () => {
  const V = '{"toString":0}';
  const ls = {
    histDay: JSON.stringify({ '2026-10-01': { 0: { g: { toString: 0 }, x: 1 } } }), goalsDay: '{"g":' + V + ',"c":' + V + '}',
    huntLog: '[{"p":' + V + ',"acc":' + V + ',"hunt":"x","drops":[{"n":' + V + '}]}]', statsCfg: '{"pinned":[{"id":' + V + '}],"shinyTarget":{"id":' + V + '}}',
    danoAm: '[{"r":' + V + ',"k":"a"}]', tlPk: '{"sp":' + V + ',"level":' + V + '}', huntStats2: '{"c1":{"rota":{"kph":' + V + ',"hpk":' + V + '}}}'
  };
  let api = null, erro = null;
  try { api = monta(ls); } catch (e) { erro = e; }
  ok(!!api && !erro, 'o script inteiro roda ate o fim com o disco envenenado (antes: TypeError no boot e o app nao abria mais)' + (erro ? ' -> ' + erro.message : ''));
  if (!api) return;
  const j = api.jsonP('{"a":{"toString":0,"valueOf":{},"__proto__":{"x":1},"b":2}}');
  ok(j.a.b === 2 && !Object.prototype.hasOwnProperty.call(j.a, 'toString') && !Object.prototype.hasOwnProperty.call(j.a, 'valueOf') && String(j.a) === '[object Object]' && ({}).x === undefined, 'jsonP tira toString, valueOf e __proto__: String(x) e +x voltam a funcionar');
  ok(api.histDay['2026-10-01'][0].g === 0 && api.goals.g === 0 && api.huntLog[0].p === 0 && api.huntLog[0].acc === '[object Object]', 'o valor envenenado vira 0 / texto e o resto segue (histDay, metas, log de hunts)');
});

secao('prototipo intacto com dado forjado pela pagina do jogo (bag "__proto__", conta "__proto__")', () => {
  const api = monta({});
  try { api.B.bag({ bag: [{ label: '__proto__', items: [{ id: 'x', qty: 1 }], total: 5 }] }); } catch (e) {}
  ok(({}).items === undefined && ({}).total === undefined, 'secao Bag com rotulo "__proto__": nada vai pro Object.prototype');
  api.amostraHunt('__proto__', 'rota_x', { seconds: 600, kills: 10, gph: 1, xph: 1, kph: 1, captures: 0, mvs: [] });
  api.amostraHunt('c1', '__proto__', { seconds: 600, kills: 10, gph: 1, xph: 1, kph: 1, captures: 0, mvs: [] });
  ok(({}).rota_x === undefined && !Object.prototype.hasOwnProperty.call(api.huntStats, '__proto__') && Object.getPrototypeOf(api.huntStats) === Object.prototype, 'amostrador com id ou hunt "__proto__": ignorado');
});

secao('parada: o relogio e o ultimo kill de verdade (Zerar no meio nao cala o aviso nem repete)', () => {
  let agora = 1_700_000_000_000;
  const avisos = [];
  const src = corta('  const lastK = [], lastKT = [], stallOn = [], comKill = [];', '\n  }\n');
  const S = new Function('alerta', 'Date', 'alertsOn', src + '\nreturn { checkStall, parada, lastKT, comKill };')((i, k) => avisos.push(k), { now: () => agora }, true);
  const r = (kills, lk) => ({ kills, sess: { lastKillT: lk } });
  const t0 = agora; S.checkStall(0, r(50, t0));
  agora += 5 * 60e3; S.checkStall(0, r(0, t0)); // Zerar com a conta parada ha 5 min (kills 0, o ultimo kill guardado)
  agora += 4 * 60e3; S.checkStall(0, r(0, t0));
  ok(avisos.length === 0, '9 min do ultimo kill: ainda nao avisa');
  agora += 2 * 60e3; S.checkStall(0, r(0, t0));
  ok(avisos.length === 1 && S.parada(0, agora), '11 min do ultimo kill, mesmo depois do Zerar: avisa e o cabecalho diz parada (antes calava ate o proximo kill)');
  agora += 60e3; S.checkStall(0, r(0, t0));
  ok(avisos.length === 1, 'nao repete o aviso');
  const s2 = new Function('alerta', 'Date', 'alertsOn', src + '\nreturn { checkStall, parada };')((i, k) => avisos.push('b'), { now: () => agora }, true);
  s2.checkStall(1, r(0, 0)); agora += 20 * 60e3; s2.checkStall(1, r(0, 0));
  ok(!s2.parada(1, agora) && !avisos.includes('b'), 'conta que nunca matou nada (cidade, hunt nova): nada de parada');
  ok(s.includes("if ((w.getURL() || '').startsWith('https://poke.idleworld.online/play')) checkStall(i, r); else comKill[i] = false;"), 'na landing do Modo Soneca (fora do /play) a regra de parada nao roda');
});

secao('dayKey em dias de calendario (horario de verao dos EUA)', () => {
  const dk = corta('  function dayKey(off2) {', '}\n').trim();
  const r = spawnSync(process.execPath, ['-e', dk + "\nDate.now = () => new Date(2026, 2, 9, 0, 30).getTime();\nprocess.stdout.write(dayKey(7) + ' ' + dayKey(0));"], { encoding: 'utf8', env: Object.assign({}, process.env, { TZ: 'America/New_York' }) });
  ok(r.stdout.trim() === '2026-03-02 2026-03-09', 'Nova York, 09/03 00h30 (logo depois da troca): 7 dias antes e 02/03 (com 24 h por dia dava 01/03): ' + r.stdout.trim() + (r.stderr ? ' ' + r.stderr.slice(0, 120) : ''));
});

secao('vigia do login: so no /login e so com usuario E senha na tela', () => {
  const LP = new Function(corta('  function loginPanel(wv, cred) {', '\n  }\n') + '\nreturn loginPanel;')();
  let cod = '';
  LP({ executeJavaScript: (c) => { cod = c; return Promise.resolve(); } }, { email: 'a@b.c', senha: "x'\"`${1}" });
  const pagina = (pathname, comUsuario) => {
    const ivs = [];
    class HTMLInputElement { constructor(ac) { this.autocomplete = ac; this._v = ''; } dispatchEvent() { return true; } }
    Object.defineProperty(HTMLInputElement.prototype, 'value', { get() { return this._v; }, set(v) { this._v = String(v); } });
    const campos = (comUsuario ? [new HTMLInputElement('username')] : []).concat([new HTMLInputElement('current-password')]);
    const botao = { type: 'submit', className: '', disabled: false, cliques: 0, click() { this.cliques++; } };
    const win = { document: { querySelectorAll: (q) => (q === 'input' ? campos : q === 'button' ? [botao] : []), querySelector: () => null }, HTMLInputElement, Event: class { constructor(t) { this.type = t; } }, location: { pathname } };
    win.window = win;
    vm.createContext(Object.assign(win, { setInterval: (f) => { ivs.push(f); return ivs.length; }, clearInterval: (id) => { ivs[id - 1] = null; }, setTimeout: (f) => { f(); return 0; }, Promise, Object, Array, String, JSON }));
    return { win, campos, botao, roda: () => vm.runInContext(cod, win), tick: () => ivs.forEach((f) => f && f()) };
  };
  const play = pagina('/play', false); play.roda(); for (let k = 0; k < 5; k++) play.tick();
  ok(play.campos[0].value === '', 'no /play (Configuracoes do jogo, campo de senha avulso): a senha salva NAO e escrita');
  const login = pagina('/login', true); login.roda();
  ok(login.campos[0].value === 'a@b.c' && login.campos[1].value === "x'\"`${1}", 'no /login com o formulario: preenche (senha com aspas, crase e ${ chega inteira)');
  login.win.location.pathname = '/play'; login.campos[1].value = ''; login.tick();
  ok(login.campos[1].value === '' && login.botao.cliques <= 1, 'entrou no jogo: o vigia para e nao escreve mais nada');
});

secao('troca de lider: so os botoes do HUD do time do jogo', () => {
  const src = corta('  async function trocaLider(row) {', '\n  }\n');
  let cod = '';
  const w = { executeJavaScript: (c) => { cod = c; return Promise.resolve(); } };
  const tl = new Function('webviews', 'statsIdx', 'off', 'refreshStats', 'setTimeout', src + '\nreturn trocaLider;')([w], 0, [false], () => {}, () => 0);
  tl({ dataset: { ld: '0', nm: 'pikachu', lv: '30' }, classList: { contains: () => false }, style: {} });
  const doc = (hud) => {
    const clicados = [];
    const elem = (nome, lv, extra) => Object.assign({ textContent: nome, getAttribute: () => null, dispatchEvent: (e) => { if (e.type === 'click') clicados.push(nome + (extra || '')); return true; }, querySelector: (q) => (q === '.phud-name' ? { textContent: nome } : q === '.phud-lv' ? { textContent: 'Lv.' + lv } : null) });
    const venda = elem('Pikachu Lv.30', 30, ' (linha de venda do Mark)');
    const botoes = [elem('Raichu', 80), elem('Pikachu', 30)];
    const document = { querySelector: (q) => (q === '.game-hud-tl' ? (hud ? { querySelectorAll: (q2) => (q2 === 'button.phud-mon' ? botoes : []) } : null) : null), body: { querySelectorAll: () => [venda] } };
    const r = new Function('document', 'MouseEvent', 'window', 'getComputedStyle', 'return ' + cod)(document, class { constructor(t) { this.type = t; } }, {}, () => ({ cursor: 'pointer' }));
    return { r, clicados };
  };
  const sem = doc(false);
  ok(sem.r.ok === false && sem.r.e === 'sem-hud' && !sem.clicados.length, 'Barra de Pokemon do jogo desligada: nao procura na pagina (antes clicava a linha de venda do Mark com o mesmo nome)');
  const com = doc(true);
  ok(com.r.ok === true && com.clicados.join() === 'Pikachu', 'com o HUD: clica so o botao do Pikachu do time (' + com.clicados.join() + ')');
});

// ===================== a pagina do jogo com o coletor REAL =====================
function mundo(tokens) {
  let agora = 1_700_000_000_000;
  const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(agora); } static now() { return agora; } };
  function FakeWS() { this.readyState = 1; this.ls = []; }
  FakeWS.prototype.addEventListener = function (t, f) { if (t === 'message') this.ls.push(f); };
  FakeWS.prototype.send = function () {};
  const pedidos = [];
  const resp = (b) => ({ ok: true, clone() { return resp(b); }, json: async () => b });
  const corpos = { '/api/characters/me': { character: { id: 'c1' } }, '/api/auth/login': { accessToken: 'SEGREDO', refreshToken: 'SEGREDO2' }, '/api/auth/2fa/setup': { secret: 'TOTP' } };
  const ss = new Map(tokens ? [['pokeweb:tokens', JSON.stringify(tokens)]] : []);
  const win = { WebSocket: FakeWS, atob: (b) => Buffer.from(b, 'base64').toString('binary'), document: { querySelector: () => null },
    fetch: (u, o) => { pedidos.push({ u: String(u), auth: o && o.headers && o.headers.Authorization }); return Promise.resolve(resp(corpos[String(u).split('?')[0]] || {})); },
    sessionStorage: { getItem: (k) => (ss.has(k) ? ss.get(k) : null) }, localStorage: { getItem: () => null } };
  win.window = win;
  const tos = [];
  const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: () => 0, setTimeout: (f, ms) => { tos.push({ f, ms }); return 0; }, clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map, escape, decodeURIComponent }));
  vm.runInContext(tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;"), ctx);
  const ws = vm.runInContext('new WebSocket("wss://x")', ctx);
  return { ctx, pedidos, tos, run: (c) => vm.runInContext(c, ctx), msg: (x) => ws.ls.forEach((f) => f({ data: JSON.stringify(x) })), espera: () => new Promise((r) => setImmediate(r)) };
}

(async () => {
  console.log('\n--- leitura de painel: uma pendente por painel e por script ---');
  {
    const L = new Function('setTimeout', corta('  const lendo = new WeakMap();', '\n  }\n') + '\nreturn lePainel;')(() => 0);
    let chamadas = 0;
    const soltas = []; // um resolvedor por executeJavaScript, na ordem (X primeiro)
    const w = { executeJavaScript: () => { chamadas++; return new Promise((r) => { soltas.push(r); }); } };
    L(w, 'X'); L(w, 'X'); L(w, 'X'); L(w, 'Y');
    await new Promise((r) => setImmediate(r));
    ok(chamadas === 2, 'painel preso num confirm: 3 leituras do mesmo script viram 1 executeJavaScript (antes acumulavam e rodavam todas juntas): ' + chamadas);
    soltas[0]('pronto'); await new Promise((r) => setImmediate(r));
    L(w, 'X'); await new Promise((r) => setImmediate(r));
    ok(chamadas === 3, 'a leitura voltou: a proxima sai de novo');
  }

  console.log('\n--- coletor: o que guarda, o token renovado, poke-xp e o texto do compartilhado ---');
  {
    const m = mundo({ accessToken: 'NOVO' });
    m.run("fetch('/api/auth/login', { headers: { Authorization: 'Bearer VELHO' } }); fetch('/api/auth/2fa/setup'); fetch('/api/characters/me')");
    await m.espera(); await m.espera();
    const api = m.run('Object.keys(window.__poke.api).join()');
    ok(api === '/api/characters/me', 'P.api so com o que o app le: nada de token, refresh nem segredo do 2FA na pagina (' + api + ')');
    const poll = m.tos.find((t) => t.ms === 9000); if (poll) poll.f();
    const me = m.pedidos.filter((p) => p.u === '/api/characters/me').pop();
    ok(me && me.auth === 'Bearer NOVO', 'o poll usa o token que o jogo guardou (sessionStorage), nao o ultimo header visto: ' + (me && me.auth));
    m.msg({ type: 'pokes', list: [{ id: 'p1', name: 'Pikachu', level: 50, xp: 10, team: true }] });
    m.msg({ type: 'poke-xp', id: 'p1', xp: 99, level: 51 });
    ok(m.run('window.__poke.ws.pokes.list[0].level') === 51 && m.run('window.__poke.ws.pokes.list[0].xp') === 99, 'poke-xp sobe o nivel do time no app (antes ficava no nivel antigo)');
    const b64 = Buffer.from(JSON.stringify({ k: 'poke', n: 'Flabébé ♀', iv: 100, lv: 10, q: 1.2 }), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    m.msg({ type: 'history', world: [], trade: [], help: [], guild: [], media: [{ fromName: 'Ash', body: 'olha [poke!' + b64 + ']' }] });
    const cs = m.run('JSON.stringify(window.__poke.chatShares || [])');
    ok(/Flabébé ♀/.test(cs), 'compartilhado no canal media, com acento e simbolo decodificados como o jogo (UTF-8): ' + cs.slice(0, 80));
  }

  console.log('\n--- READ_STATE na tela de login ---');
  {
    const RS = tpl('const READ_STATE = ');
    const leitura = (P) => new Function('window', 'document', 'return ' + RS)({ __poke: P }, { querySelector: () => null });
    ok(leitura({ ws: {}, api: {}, sess: { start: 1 } }).ok === false, 'sem socket e sem a conta (login): nao e leitura de conta (antes os cartoes mostravam $0 e +0/h)');
    ok(leitura({ ws: {}, api: { '/api/characters/me': { character: { id: 'c1', name: 'Ash' } } }, sess: { start: 1, drops: {}, kills: 0 } }).ok === true, 'com a conta: le normal');
  }

  console.log('\n--- Venda protegida: a mesma venda reenviada pelo jogo nao pergunta de novo ---');
  {
    let perguntas = 0;
    const win = { fetch: () => Promise.resolve({ ok: true }), confirm: () => { perguntas++; return true; }, alert() {}, prompt() {}, console: { log() {} },
      __poke: { ws: { pokes: { list: [{ id: 'p1', shiny: true, quality: 2.1, name: 'Ekans' }] } }, api: {} } };
    win.window = win;
    vm.createContext(Object.assign(win, { Date, JSON, Math, Object, Array, String, Number, Promise, Error }));
    vm.runInContext(tpl('const SELLGUARD = '), win);
    const vende = () => vm.runInContext("fetch('/api/game/pokemon/sell', { method: 'POST', body: JSON.stringify({ pokeIds: ['p1'] }) })", win);
    vende(); vende();
    ok(perguntas === 1, 'o POST repetido depois do 401 + refresh: 1 pergunta so (antes 2)');
    win.__pgSellOk.t -= 20000; vende();
    ok(perguntas === 2, 'passados 15 s, uma venda nova pergunta de novo');
  }

  console.log('\n--- CSV, cache, ranking e card de IV ---');
  {
    const CSV = corta("  const csvCel = (v) => {", "  const csvLinha = (campos) => campos.join(csvSep()) + '\\n';");
    const f = (lang) => new Function('lang', 'hlNum', CSV + '\nreturn { csvCel, csvNum, csvLinha };')(lang, (v) => +v || 0);
    const pt = f('pt'), en = f('en');
    ok(pt.csvLinha([pt.csvNum(1.5, 1), 'a']) === '1,5;a\n' && en.csvLinha([en.csvNum(1.5, 1), 'a']) === '1.5,a\n', 'separador e decimal pelo idioma: pt "1,5;a", en "1.5,a" (antes o Excel em ingles juntava tudo numa coluna)');
    ok(pt.csvCel('\t=CMD()') === "\"'\t=CMD()\"" && pt.csvCel('=1+1') === "\"'=1+1\"", 'TAB e = no comeco da celula viram texto');
    ok(s.includes('Math.round(v / Math.max(secs, 60) * 3600)'), 'taxa por hora com piso de 1 min no CSV, como no painel');
    ok(s.includes('dittoCache.clear(); tlCache = null; tlHeCache = null;'), 'Hunts por tipo: o cache zera quando o catalogo de hunts recarrega (antes mostrava 0 gold/h depois que o preco chegava)');
    ok(s.includes('(showHiddenHunts || !x.hidden)) maxSug = '), 'ranking do Simples: hunt oculta nao escala a barra das visiveis');
    ok(s.includes("p: g[6] ? 300 : (+g[1] || 0)"), 'card de IV: golpe de TM com o poder 300 do jogo, nao os 600 do creatures.json');
    ok(s.includes('const qEd = e.qualidade > 0 && e.qualidade !== d.qualidade'), 'card de IV: mudar so o nivel nao joga fora o poder do jogo');
    ok(/ivRaro\(c\.qe > 0 \? c\.qe : c\.q\)/.test(s), 'raridade pela qualidade que fecha os atributos (1,097 e Comum, nao Incomum)');
  }

  console.log('\n--- webhook, VOLTA e import ---');
  {
    ok(s.includes('setTimeout(() => { if (whFila.length < 20) { whFila.push(txt); if (!whTimer) whBombeia(); } else whRetry.delete(txt); }, 30000);'), 'webhook que falhou espera 30 s fora da fila (antes os 5 reenvios iam embora em segundos com 2+ mensagens)');
    ok(s.includes("(k2 === 'sellguard' && o[k2] === '0')) return;"), 'config importada nunca desliga a Venda protegida');
    ok(s.includes("panel.querySelector('.reload').onclick = panel.querySelector('.pg-rec').onclick = () => { if (!off[i]) { lastLogin[i] = 0;"), 'recarregar o painel no login zera a espera de 15 s (antes a pagina nova ficava 10 min sem preencher)');
  }

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('FAIL quebrou: ' + ((e && e.stack) || e)); process.exit(1); });
