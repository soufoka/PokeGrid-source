// Caca de bugs 5 (03/10/2026), recuperacao dos paineis: sessao dada como morta por token velho do coletor, /login que
// nunca tentava de novo, VOLTA e destrava agindo em conta estacionada de proposito, field-lost com a tela na cidade,
// relogin sem VOLTA, Logar equipe na soneca, Zerar no meio da parada, recuo em painel removido e userscript vivo no /login.
// Roda o coletor, o READ_ALERTS, o vigia de 6 s, o destrava, o RESET_SESS, o loginPanel, o loginAll e o criarPainel
// INTEIRO (dom-ready, did-fail-load, autoLogin, did-navigate*) REAIS do index.html contra paginas do jogo falsas
// (WebSocket, fetch, tela de login e relogio nossos). Roda com: node test/bh5-paineis.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const corta = (a, fim, inclui = true) => { const i = s.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 60)); const j = s.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 40)); return s.slice(i, inclui ? j + fim.length : j); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const linha = (marca) => { const i = s.indexOf(marca); if (i < 0) throw new Error('sem ' + marca); return s.slice(i, s.indexOf('\n', i)); };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const espera = async () => { for (let k = 0; k < 8; k++) await vez(); };

const COLETOR_OK = !!tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");
const READ_ALERTS = tpl('const READ_ALERTS = ');
const DESTRAVA = corta('  const rec = [], rfVisto = [];', '\n  }\n');
const VIGIA = corta('  const pendA = [0, 0, 0, 0];', '}, 6000);');
const VOLTA_JS = new Function(linha('const VOLTA_JS = ') + '\nreturn VOLTA_JS;')();
const ENTRA_JS = new Function(linha('const ENTRA_JS = ') + '\nreturn ENTRA_JS;')();
const RSF_JS = new Function(linha('const RSF_JS = ') + '\nreturn RSF_JS;')();
const RESET_SESS = new Function(linha('const RESET_SESS = ') + '\nreturn RESET_SESS;')();
const CRIAR = corta('  function criarPainel(i) {', '\n  // ----- Numero de paineis', false);
const LOGIN_PANEL = corta('  function loginPanel(wv, cred) {', '\n  }\n');
const LOGIN_ALL = corta('  function loginAll() {', '\n  async function save()', false);
const SCRIPTS = corta('  const usNoLoginUrl = ', '  async function applyScriptToAll', false);

const relogio = { now: 1_700_000_000_000 };
const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(relogio.now); } static now() { return relogio.now; } };
const JOGO = 'https://poke.idleworld.online', PLAY = JOGO + '/play', LOGIN_URL = JOGO + '/login';
const noLogin = (u) => String(u).startsWith(LOGIN_URL);
// userscript de terceiro que embrulha o value dos inputs (o que qualquer script ligado conseguiria fazer)
const ESPIAO = "window.__roubado=[];const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');Object.defineProperty(HTMLInputElement.prototype,'value',{configurable:true,get(){return d.get.call(this)},set(v){if(this.autocomplete==='current-password')window.__roubado.push(String(v));d.set.call(this,v)}});";

// um documento do jogo: socket, /me, timers, a janela "Servidor reiniciado" e, nas URLs de login, o formulario
// (dois campos, o botao, o turnstile se est.captcha != null e a tela do codigo 2FA se est.otp)
function pagina(url, http = 200) {
  const sent = [], ivs = [], tos = [];
  const est = { meOk: !noLogin(url), cid: 'c1', modal: false, rsf: 0, cliques: 0, otp: false, captcha: null, erro: http >= 500 };
  const p = { url, sent, est, ws: null };
  function FakeWS() { this.readyState = 1; this.ls = { message: [], open: [], close: [] }; }
  FakeWS.prototype.addEventListener = function (t, f) { if (this.ls[t]) this.ls[t].push(f); };
  FakeWS.prototype.send = function (d) { sent.push(JSON.parse(d)); };
  FakeWS.OPEN = 1;
  class Event { constructor(t) { this.type = t; } }
  class HTMLInputElement { constructor(ac) { this.autocomplete = ac; this._v = ''; } dispatchEvent() { return true; } }
  Object.defineProperty(HTMLInputElement.prototype, 'value', { configurable: true, get() { return this._v; }, set(v) { this._v = String(v); } });
  const campos = [new HTMLInputElement('username'), new HTMLInputElement('current-password')];
  const botao = { type: 'submit', className: 'auth-imgbtn', disabled: false, click() { est.cliques++; } };
  const form = () => noLogin(p.url) && !est.erro && !est.otp;
  const win = {};
  const btnRsf = { click() { est.rsf++; est.modal = false; win.__poke && win.__poke.sock && win.__poke.sock.send(JSON.stringify({ type: 'restart-resume' })); } };
  const document = {
    querySelectorAll: (q) => (!form() ? [] : q === 'input' ? campos : q === 'button' ? [botao] : []),
    querySelector: (q) => (q === '.rsf-overlay .rsf-cta:not([disabled])' ? (est.modal ? btnRsf : null)
      : q === 'input[name=cf-turnstile-response]' ? (form() && est.captcha != null ? { value: est.captcha } : null)
      : q === 'input[autocomplete=one-time-code]' ? (est.otp ? {} : null) : null),
  };
  const resp = (b) => ({ ok: true, clone() { return resp(b); }, json: async () => b });
  Object.assign(win, { WebSocket: FakeWS, document, HTMLInputElement, Event, atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    fetch: (u) => Promise.resolve(resp(String(u).includes('characters/me') ? (est.meOk ? { character: { id: est.cid } } : { message: 'Unauthorized' }) : {})) });
  win.window = win;
  vm.createContext(Object.assign(win, { Date: DateF, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map,
    setInterval: (f, ms) => { ivs.push({ f, ms, prox: relogio.now + ms }); return ivs.length; }, clearInterval: (id) => { if (ivs[id - 1]) ivs[id - 1].morto = 1; },
    setTimeout: (f, ms) => { tos.push({ f, quando: relogio.now + (ms || 0) }); return 0; }, clearTimeout() {} }));
  return Object.assign(p, {
    campos,
    run: (code) => vm.runInContext(code, win),
    // o GameSocketProvider abre o socket depois do coletor (que embrulha window.WebSocket)
    abreSocket() { if (p.ws) p.ws.readyState = 3; p.ws = vm.runInContext('new WebSocket("wss://x")', win); p.ws.ls.open.forEach((f) => f({})); },
    msg: (x) => p.ws.ls.message.forEach((f) => f({ data: JSON.stringify(x) })),
    fecha: (code) => { p.ws.readyState = 3; p.ws.ls.close.forEach((f) => f({ code })); }, // o servidor fecha o socket com um codigo
    envia: (x) => vm.runInContext('window.__poke.sock.send(' + JSON.stringify(JSON.stringify(x)) + ')', win), // o proprio jogo mandando
    timers() {
      for (let k = 0; k < ivs.length; k++) { const t = ivs[k]; while (!t.morto && t.prox <= relogio.now) { t.prox += t.ms; try { t.f(); } catch {} } }
      for (let k = 0; k < tos.length; k++) { const t = tos[k]; if (!t.feito && t.quando <= relogio.now) { t.feito = 1; try { t.f(); } catch {} } }
    },
  });
}
// o <webview>: eventos de verdade (os listeners do criarPainel), executeJavaScript no documento atual
function webview() {
  return {
    pg: pagina('about:blank'), ls: {}, nav: [], reloads: 0, solto: false, est: {},
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); },
    emit(t, e) { (this.ls[t] || []).forEach((f) => f(e || {})); },
    getURL() { return this.pg.url; },
    reload() { if (this.solto) throw new Error('The WebView must be attached to the DOM and the dom-ready event emitted before this method can be called.'); this.reloads++; },
    reloadIgnoringCache() { this.reload(); },
    loadURL(u) { this.nav.push(u); return vez().then(() => navega(this, u)); },
    executeJavaScript(code) { try { return Promise.resolve(this.pg.run(code)).then((v) => JSON.parse(JSON.stringify(v === undefined ? null : v))); } catch (e) { return Promise.reject(e); } },
    setAttribute() {}, setAudioMuted() {}, setZoomFactor() {},
  };
}
// navegacao completa (documento novo): did-start-loading, did-navigate (com o codigo HTTP), dom-ready, did-stop-loading
function navega(w, url, http = 200) {
  w.pg = pagina(url, http); Object.assign(w.pg.est, w.est);
  w.emit('did-start-loading');
  w.emit('did-navigate', { url, httpResponseCode: http });
  w.emit('dom-ready');
  w.emit('did-stop-loading');
}

// o app: vigia de 6 s + destrava REAIS e o criarPainel REAL, com os mesmos arrays (sessSnap, rec, dlgT) entre eles
function app(o = {}) {
  let tick = null;
  const log = [], timers = [], webviews = [];
  const accounts = o.accounts || [0, 1, 2, 3].map(() => ({ email: 'a@b.c', senha: 'x' }));
  const env = {
    webviews, off: [false, false, false, false], accounts, deadT: [0, 0, 0, 0], LOGIN_URL, READ_ALERTS, RESET_SESS, ENTRA_JS, RSF_JS, voltaHuntOn: o.volta !== false,
    lowOn: [{}, {}, {}, {}], lastShiny: [], lastFaint: [], lastK: [], stallOn: [], alertsOn: true, sndShinyOn: false, BALL_MIN: 100, POTION_MIN: 15,
    registraHunt() {}, mergeLogs() {}, accumHist() {}, addShinyLife() {}, beepShiny() {}, alerta() {}, checkStall() {}, checkLow() {},
    window: { pokeAPI: { logError: (_o, m) => log.push(m) } }, setInterval: (fn, ms) => { tick = { fn, ms }; }, Date: DateF,
  };
  const nomes = Object.keys(env);
  const A = new Function(...nomes, DESTRAVA + '\n' + VIGIA + '\nreturn { pendA, dlgT, sessSnap, rec };')(...nomes.map((k) => env[k]));
  // regra dos userscripts REAL (nunca no login), com um script "espiao" ligado quando o teste pede
  const SC = new Function('allScripts', 'scriptsOn', 'getScriptCode', 'window', SCRIPTS + '\nreturn { usNoLoginUrl, injectScripts };')(() => [{ id: 'u1', name: 'Espiao' }], { u1: !!o.espiao }, async () => ESPIAO, env.window);
  const lastLogin = [0, 0, 0, 0], trocou = [false, false, false, false];
  const elemento = () => { const q = {}; return { className: '', innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, querySelector: (sel) => q[sel] || (q[sel] = { className: '', textContent: '', style: {} }) }; };
  let proximo = null;
  const escopo = {
    document: { createElement: (tg) => (tg === 'webview' ? proximo : elemento()) }, grid: { appendChild() {} }, webviews, accounts, defName: (i) => 'Conta ' + (i + 1), ACOR: [],
    lsGet: () => null, lsSet() {}, t: (k) => k, off: env.off, dlgT: A.dlgT, stCache: {}, stSane: () => null, dtPush() {}, ivRecebe() {}, muted: false, cardsOn: false, leve: () => false,
    sessSnap: A.sessSnap, rec: A.rec, LOGIN_URL, START_URL: LOGIN_URL + '?ref=X', voltaHuntOn: env.voltaHuntOn, VOLTA_JS, injectScripts: SC.injectScripts, usNoLoginUrl: SC.usNoLoginUrl,
    loginPanel: new Function(LOGIN_PANEL + '\nreturn loginPanel;')(), alerta() {}, lastLogin, trocou, window: env.window, Date: DateF,
    setTimeout: (f, ms) => { timers.push({ f, quando: relogio.now + (ms || 0) }); return 0; }, toggleExpand() {}, save() {},
  };
  // o resto (scripts de interface injetados no dom-ready: eco, popup, chat...) vira texto vazio
  const nada = () => '';
  const criarPainel = new Function('E', 'with (E) { return (' + CRIAR + '); }')(new Proxy(escopo, {
    has: (_t, k) => typeof k === 'string',
    get: (t, k) => (typeof k !== 'string' ? undefined : k in t ? t[k] : k in globalThis ? globalThis[k] : nada),
    set: (t, k, v) => { t[k] = v; return true; },
  }));
  const api = { log, accounts, lastLogin, trocou, sessSnap: A.sessSnap, rec: A.rec, deadT: env.deadT };
  api.painel = async (i, url, opt = {}) => { proximo = webview(); Object.assign(proximo.est, opt.est); criarPainel(i); navega(proximo, url, opt.http); await espera(); return proximo; };
  // passos de 6 s: a pagina faz o que faz (cada), os timers das paginas e do app vencem e o vigia roda
  api.anda = async (seg, cada) => {
    for (let t = 0; t < seg; t += 6) {
      relogio.now += 6000;
      if (cada) cada();
      webviews.forEach((w) => w.pg.timers());
      for (const tm of timers) if (!tm.feito && tm.quando <= relogio.now) { tm.feito = 1; tm.f(); }
      tick.fn(); await espera();
    }
  };
  return api;
}
const tipos = (p, i0 = 0) => p.sent.slice(i0).filter((x) => /^(enter-hunt|leave-hunt|set-city)$/.test(x.type)).map((x) => x.type + ':' + (x.slug || '')).join(',');
const farm = (w) => () => { w.pg.msg({ type: 'field', seq: 1 }); w.pg.msg({ type: 'field-kill', xpGained: 10, loot: [] }); };
async function farmando(a, w, seg = 120) {
  w.pg.abreSocket(); w.pg.envia({ type: 'set-city', slug: 'cerulean' }); w.pg.envia({ type: 'enter-hunt', slug: 'rota_x' });
  w.pg.msg({ type: 'field-init', slug: 'rota_x' }); w.pg.msg({ type: 'inventory', items: [] });
  await a.anda(seg, farm(w));
}
// reload (Atualizar, vigia de 60 s, crash, troca de idioma): documento novo que nasce em Cerulean e manda set-city ao montar
async function recarrega(a, w) { navega(w, PLAY); await espera(); w.pg.abreSocket(); const i0 = w.pg.sent.length; w.pg.envia({ type: 'set-city', slug: 'cerulean' }); w.pg.msg({ type: 'inventory', items: [] }); return i0; }
const umTiro = (w) => { relogio.now += 12000; w.pg.timers(); }; // so o primeiro tiro do VOLTA (12 s): sem o field-init do servidor ele repetiria
const voltaDispara = (w) => { relogio.now += 12000; w.pg.timers(); relogio.now += 24000; w.pg.timers(); }; // os tiros do VOLTA (12 s, ate 3)

(async () => {
  ok(COLETOR_OK, 'coletor, READ_ALERTS, vigia, destrava, criarPainel, loginPanel e loginAll extraidos do index.html');

  await secao('P1: token velho do coletor + queda comum do servidor nao vira relogin (MEDIA)', async () => {
    for (const [cod, espera1] of [[1006, 0], [4001, 1]]) {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w);
      w.pg.est.meOk = false; // o token que o coletor guardou venceu: o /me dele volta 401 (o jogo renova pelo socket)
      await a.anda(10 * 60, farm(w));
      ok(w.pg.run('window.__poke.meMiss') >= 2 && w.nav.length === 0, cod + ': 10 min farmando com o /me do coletor recusado e o socket aberto: nada acontece');
      w.pg.fecha(cod); await a.anda(90);
      ok(w.nav.length === espera1, cod === 1006 ? 'socket caiu com 1006 (restart do servidor) por 90 s: o painel fica, o jogo reconecta e remanda a hunt sozinho (antes: relogin aos 60 s)' : 'socket fechado com 4001 (o jogo desistiu de renovar): sessao morta, o deadT manda pro login aos 60 s');
      if (cod === 4001) ok(a.log.some((x) => /^painel 1: sessao caiu \(60s sem conta viva no jogo\), indo pro login$/.test(x)), 'e o relogin fica no 🐞 Erros: ' + (a.log.find((x) => /sessao caiu/.test(x)) || 'NADA'));
    }
    const a = app(), w = await a.painel(0, PLAY);
    await farmando(a, w); w.pg.est.meOk = false; await a.anda(120, farm(w));
    w.pg.fecha(4001); w.pg.abreSocket(); await a.anda(90, farm(w)); // 4001 com refresh que deu certo: o jogo reconecta na hora
    ok(w.nav.length === 0 && w.pg.run('window.__poke.wc') === 0, 'token renovado e socket reaberto depois do 4001: segue vivo (o open zera o codigo)');
  });

  await secao('P2: no /login o app tenta de novo, sem atropelar captcha nem 2FA (MEDIA)', async () => {
    {
      const a = app(), w = await a.painel(0, LOGIN_URL);
      ok(w.pg.campos[1].value === 'x' && w.pg.run('window.__loginWatch') === true, 'o autoLogin preencheu e o vigia de captcha do loginPanel esta rodando');
      await a.anda(6);
      ok(w.pg.est.cliques === 1 && w.pg.run('window.__loginWatch') === false, 'sem captcha: clicou uma vez e o vigia parou (o login falhou: API fora no restart)');
      await a.anda(98 * 6);
      ok(w.nav.length === 0 && w.reloads === 0, '9 min e 54 s no login: ainda espera');
      await a.anda(6);
      ok(w.nav.length === 1 && w.nav[0] === LOGIN_URL, '10 min no login sem entrar: abre o login de novo (' + JSON.stringify(w.nav) + ')');
      await espera();
      ok(w.pg.campos[1].value === 'x' && w.pg.run('window.__loginWatch') === true && a.deadT[0] === 0, 'a pagina nova e preenchida e enviada de novo, e o deadT continua parado no login');
      ok(a.log.some((x) => /^painel 1: 10 min no login sem entrar, abrindo o login de novo$/.test(x)), 'fica no 🐞 Erros');
    }
    {
      const a = app(), w = await a.painel(0, LOGIN_URL, { est: { captcha: '' } }); // turnstile esperando alguem
      await a.anda(100 * 6);
      ok(w.nav.length === 0 && w.pg.run('window.__loginWatch') === true, '10 min com o captcha esperando: o vigia de captcha ainda roda, nada recarrega');
      await a.anda(12);
      ok(w.nav.length === 1, 'o vigia de captcha desistiu (10 min): ai sim o login abre de novo');
    }
    {
      const a = app(), w = await a.painel(0, LOGIN_URL);
      await a.anda(6);
      w.pg.est.otp = true; // o servidor pediu o codigo 2FA: o jogo troca o formulario pelo campo do codigo (one-time-code)
      await a.anda(30 * 60);
      ok(w.nav.length === 0 && w.reloads === 0, '30 min com a tela do codigo 2FA aberta: nunca recarrega por cima');
      w.pg.est.otp = false; await a.anda(6);
      ok(w.nav.length === 1, 'saiu da tela do codigo e segue no login: abre o login de novo');
    }
    {
      const a = app({ accounts: [{ email: '', senha: '' }] }), w = await a.painel(0, LOGIN_URL);
      await a.anda(30 * 60);
      ok(w.nav.length === 0 && w.reloads === 0, 'sem senha salva: o login e com a pessoa, nada recarrega');
    }
    {
      const a = app(), w = await a.painel(0, LOGIN_URL, { http: 502 }); // Cloudflare 502 com pagina: carga "bem-sucedida", sem did-fail-load
      ok(a.lastLogin[0] === 0 && w.pg.run('window.__loginWatch') == null, 'pagina de erro 502: o autoLogin nao gasta nela a tentativa (cooldown de 15 s)');
      await a.anda(6);
      ok(w.reloads === 1, 'e o recuo do did-fail-load recarrega em 6 s (did-navigate com HTTP 5xx)');
      navega(w, LOGIN_URL); await espera(); // o reload voltou 200
      ok(w.pg.campos[1].value === 'x' && w.pg.run('window.__loginWatch') === true, 'o login que voltou e preenchido na hora');
    }
  });

  await secao('P3: VOLTA e destrava respeitam a conta estacionada de proposito (MEDIA)', async () => {
    for (const [nome, sai] of [
      ['viajou pra cidade (leave-hunt + set-city)', (p) => { p.envia({ type: 'leave-hunt' }); p.envia({ type: 'set-city', slug: 'cerulean' }); }],
      ['trocou de cidade pela tela (set-city longe do open)', (p) => { p.envia({ type: 'set-city', slug: 'pewter' }); }],
      ['time derrotado (field-teleport-city: o jogo bloqueia viajar com o lider desmaiado)', (p) => { p.msg({ type: 'field-teleport-city' }); }],
      ['servidor recusou a hunt (field-none)', (p) => { p.msg({ type: 'field-none', slug: 'rota_x' }); }]]) {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w); sai(w.pg); await a.anda(180);
      const i0 = await recarrega(a, w); voltaDispara(w);
      ok(tipos(w.pg, i0) === 'set-city:cerulean' && !a.log.some((x) => /recarregou farmando/.test(x)), nome + ', reload 3 min depois: o VOLTA deixa na cidade (' + tipos(w.pg, i0) + ')');
    }
    {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w);
      let i0 = await recarrega(a, w); umTiro(w);
      ok(tipos(w.pg, i0) === 'set-city:cerulean,enter-hunt:rota_x', 'controle: recarregou farmando, o VOLTA leva de volta (' + tipos(w.pg, i0) + ')');
      await a.anda(6); // a foto da pagina nova antes do field-init: o set-city da montagem nao conta como saida
      i0 = await recarrega(a, w); umTiro(w);
      ok(tipos(w.pg, i0) === 'set-city:cerulean,enter-hunt:rota_x', 'controle: segundo reload antes do field-init, o VOLTA ainda arma (' + tipos(w.pg, i0) + ')');
    }
    {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w);
      navega(w, PLAY); await espera(); w.pg.abreSocket(); relogio.now += 5000; w.pg.envia({ type: 'set-city', slug: 'cerulean' }); // tela que monta devagar
      await a.anda(6);
      const i0 = await recarrega(a, w); umTiro(w);
      ok(tipos(w.pg, i0) === 'set-city:cerulean,enter-hunt:rota_x', 'controle: montagem lenta (o primeiro set-city da pagina 5 s depois do open) nao e saida (' + tipos(w.pg, i0) + ')');
    }
    {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w); w.pg.envia({ type: 'leave-hunt' }); w.pg.envia({ type: 'set-city', slug: 'cerulean' }); await a.anda(120);
      w.pg.msg({ type: 'restart-freeze', restartedAt: relogio.now, frozenAt: relogio.now - 1000, boosts: [{ key: 'xp', remainingMs: 3600e3 }] }); w.pg.est.modal = true;
      await a.anda(60);
      ok(w.pg.est.rsf === 0, 'servidor reiniciou com a conta estacionada ha 2 min: o destrava nao clica em Atualizar (o boost segue pausado)');
      const a2 = app(), w2 = await a2.painel(0, PLAY);
      await farmando(a2, w2);
      w2.pg.msg({ type: 'restart-freeze', restartedAt: relogio.now, frozenAt: relogio.now - 1000, boosts: [{ key: 'xp', remainingMs: 3600e3 }] }); w2.pg.est.modal = true;
      await a2.anda(12);
      ok(w2.pg.est.rsf === 1, 'controle: restart com a conta farmando, o destrava clica como antes');
    }
  });

  await secao('P4: field-lost com a tela na cidade (MEDIA: so o destrava recuperava, 10 min depois)', async () => {
    const a = app(), w = await a.painel(0, PLAY);
    await farmando(a, w);
    await recarrega(a, w); relogio.now += 12000; w.pg.timers(); // o VOLTA pos a conta na hunt; a tela segue em Cerulean
    w.pg.msg({ type: 'field-init', slug: 'rota_x' }); await a.anda(60, farm(w));
    let i0 = w.pg.sent.length;
    w.pg.msg({ type: 'field-lost' });
    ok(tipos(w.pg, i0) === '', 'field-lost: espera 1 s, como o jogo');
    relogio.now += 1000; w.pg.timers();
    ok(tipos(w.pg, i0) === 'enter-hunt:rota_x', 'e remanda o enter-hunt da hunt do VOLTA (' + tipos(w.pg, i0) + ')');
    i0 = w.pg.sent.length;
    w.pg.envia({ type: 'enter-hunt', slug: 'rota_y' }); w.pg.msg({ type: 'field-init', slug: 'rota_y' }); w.pg.msg({ type: 'field-lost' }); relogio.now += 1000; w.pg.timers();
    ok(tipos(w.pg, i0) === 'enter-hunt:rota_y', 'a tela foi pra outra hunt (o jogo cuida do field-lost dela): o coletor nao manda a hunt velha (' + tipos(w.pg, i0) + ')');
    const a3 = app(), w3 = await a3.painel(0, PLAY);
    await farmando(a3, w3); const i3 = w3.pg.sent.length; w3.pg.msg({ type: 'field-lost' }); relogio.now += 1000; w3.pg.timers();
    ok(tipos(w3.pg, i3) === '', 'sem VOLTA (tela na hunt): quem remanda e o proprio jogo, o coletor nao duplica');
  });

  await secao('P5: relogin automatico arma o VOLTA (BAIXA)', async () => {
    {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w);
      w.pg.fecha(4001); w.pg.est.meOk = false; // sessao morta: o refresh foi negado e o /me recusa
      let t = 0; while (!w.nav.length && t < 600) { await a.anda(6); t += 6; }
      await espera();
      ok(w.nav[0] === LOGIN_URL && noLogin(w.getURL()) && w.pg.campos[1].value === 'x', 'o deadT manda pro login em ' + t + ' s e o autoLogin preenche');
      // o jogo loga: routeAfterAuth busca o /me com o token novo e faz router.push('/play') no mesmo documento (sem dom-ready)
      w.pg.est.meOk = true; w.pg.run("fetch('/api/characters/me',{headers:{Authorization:'Bearer novo'}})"); await espera();
      w.pg.url = PLAY; w.emit('did-navigate-in-page', { url: PLAY, isMainFrame: true }); await espera();
      w.pg.abreSocket(); const i0 = w.pg.sent.length; w.pg.envia({ type: 'set-city', slug: 'cerulean' }); w.pg.msg({ type: 'inventory', items: [] });
      relogio.now += 12000; w.pg.timers();
      ok(tipos(w.pg, i0) === 'set-city:cerulean,enter-hunt:rota_x', 'logou e foi pro /play por rota interna: o VOLTA leva de volta pra hunt (' + tipos(w.pg, i0) + ')');
      ok(a.log.some((x) => /volta pra hunt rota_x/.test(x)), 'e registra no 🐞 Erros');
    }
    {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w);
      a.accounts[0].email = 'outra@x'; a.trocou[0] = true; // Treinadores: outra conta neste painel (o Salvar marca trocou)
      await a.anda(6, farm(w)); // o vigia ainda fotografa a conta antiga, viva
      w.loadURL(LOGIN_URL); await espera(); // ▶ Logar equipe
      ok(a.sessSnap[0] === undefined, 'o autoLogin com a credencial nova larga a foto da conta antiga');
      w.pg.est.meOk = true; w.pg.est.cid = 'c2'; w.pg.url = PLAY; w.emit('did-navigate-in-page', { url: PLAY, isMainFrame: true }); await espera();
      w.pg.abreSocket(); const i0 = w.pg.sent.length; w.pg.envia({ type: 'set-city', slug: 'cerulean' });
      voltaDispara(w);
      ok(tipos(w.pg, i0) === 'set-city:cerulean', 'a conta nova fica na cidade: o VOLTA nao leva ela pra hunt da conta antiga (' + tipos(w.pg, i0) + ')');
    }
  });

  await secao('P6: Logar equipe deixa a soneca em paz (BAIXA)', async () => {
    const loginAll = (ws, trocou) => new Function('webviews', 'accounts', 'lastLogin', 'off', 'togglePower', 'LOGIN_URL', 'sessSnap', 'trocou', 'Date', LOGIN_ALL + '\nreturn loginAll;')(
      ws, [0, 1, 2, 3].map(() => ({ email: 'a', senha: 'b' })), [0, 0, 0, 0], [false, false, false, false], () => {}, LOGIN_URL, [{ sk: true, t: relogio.now }, { sk: false, t: relogio.now }, { sk: false, t: relogio.now }], trocou, DateF)();
    const mk = () => [PLAY, JOGO + '/', JOGO + '/?maintenance=1', PLAY].map((u) => ({ nav: [], getURL: () => u, loadURL(x) { this.nav.push(x); } }));
    let ws = mk(); loginAll(ws, [false, false, false, false]);
    ok(ws.map((w) => w.nav.length).join('') === '0011', 'farmando fica, Modo Soneca ("/") fica, manutencao e sessao caida vao pro login (' + ws.map((w) => w.nav.length).join('') + ')');
    ws = mk(); loginAll(ws, [false, true, false, false]);
    ok(ws[1].nav.length === 1, 'credencial trocada em Treinadores: reloga mesmo na landing');
  });

  await secao('P7: Zerar no meio de uma parada nao desliga o destrava (BAIXA)', async () => {
    {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w); await a.anda(5 * 60); // a hunt parou no servidor (sem field, sem kill), socket vivo
      w.pg.run(RESET_SESS); // Zerar
      const S = w.pg.run('window.__poke.sess');
      ok(S.kills === 0 && S.lastKillT > 0, 'o Zerar recomeca os numeros e guarda a hora do ultimo kill');
      const i0 = w.pg.sent.length; await a.anda(6 * 60);
      ok(/enter-hunt:rota_x/.test(tipos(w.pg, i0)) && a.log.some((x) => /parada \(10 min sem kill/.test(x)), 'o destrava age quando completa 10 min do ultimo kill (' + (tipos(w.pg, i0) || 'nada') + ')');
    }
    {
      const a = app(), w = await a.painel(0, PLAY);
      w.pg.abreSocket(); w.pg.msg({ type: 'field-init', slug: 'rota_x' }); w.pg.msg({ type: 'inventory', items: [] });
      const i0 = w.pg.sent.length; await a.anda(30 * 60);
      ok(tipos(w.pg, i0) === '', 'controle: entrou na hunt e nunca matou nesta sessao, continua sem agir');
    }
    {
      const a = app(), w = await a.painel(0, PLAY);
      await farmando(a, w);
      w.pg.est.cid = 'c2'; await a.anda(36); // o /me do poll traz outra conta no painel: o vigia zera a sessao
      ok(w.pg.run('window.__poke.sess.kills') === 0 && !w.pg.run('window.__poke.sess.lastKillT'), 'troca de conta no painel: a sessao nova nao herda o ultimo kill da anterior');
      const i0 = await recarrega(a, w); voltaDispara(w);
      ok(tipos(w.pg, i0) === 'set-city:cerulean', 'e um reload nao manda a conta nova pra hunt da anterior (' + tipos(w.pg, i0) + ')');
    }
  });

  await secao('P8: recuo do did-fail-load com o painel ja removido (BAIXA)', async () => {
    const a = app(), w = await a.painel(0, PLAY);
    w.emit('did-fail-load', { errorCode: -106, isMainFrame: true }); // sem internet: recarrega em 6 s
    w.solto = true; // Paineis 4 -> 3: o painel sai do DOM durante o recuo
    let erro = null; try { await a.anda(6); } catch (e) { erro = e.message; }
    ok(!erro && w.reloads === 0, 'o timer do recuo nao estoura no webview solto (' + (erro || 'sem erro') + ')');
    const a2 = app(), w2 = await a2.painel(0, PLAY);
    w2.emit('did-fail-load', { errorCode: -106, isMainFrame: true }); await a2.anda(6);
    ok(w2.reloads === 1, 'controle: painel no lugar, recarrega em 6 s como antes');
  });

  await secao('IV4/SH2: userscript nunca fica no documento onde a senha e digitada (MEDIA, seguranca)', async () => {
    {
      const a = app({ espiao: true }), w = await a.painel(0, PLAY);
      const velho = w.pg;
      ok(w.__pgSemScripts === false && velho.run('Array.isArray(window.__roubado)'), 'na /play o userscript ligado entra (como deve)');
      velho.url = LOGIN_URL; w.emit('did-navigate-in-page', { url: LOGIN_URL, isMainFrame: true }); await espera(); // Sair: router.replace('/login'), sem documento novo
      await a.anda(6);
      ok(velho.run('window.__roubado.length') === 0 && velho.campos[1].value === '', 'o documento com o userscript nunca recebe a senha (' + velho.run('JSON.stringify(window.__roubado)') + ')');
      ok(w.nav[0] === LOGIN_URL && w.pg !== velho && w.pg.campos[1].value === 'x' && w.pg.run('typeof window.__roubado') === 'undefined', 'o /login abre num documento novo, sem userscript, e o autoLogin digita la');
      w.pg.url = PLAY; w.emit('did-navigate-in-page', { url: PLAY, isMainFrame: true }); await espera();
      ok(w.__pgSemScripts === false && w.pg.run('Array.isArray(window.__roubado)'), 'logou e saiu do /login por rota interna: o userscript volta a entrar');
    }
    {
      const a = app({ espiao: true }), w = await a.painel(0, LOGIN_URL + '?ref=X');
      relogio.now += 20000;
      w.pg.url = LOGIN_URL; w.emit('did-navigate-in-page', { url: LOGIN_URL, isMainFrame: true }); await espera(); // o jogo tira o ?ref da URL
      ok(w.nav.length === 0 && w.pg.campos[1].value === 'x', 'controle: painel que nasceu no /login (sem scripts) nao recarrega na rota interna');
    }
  });

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('ERRO', e.stack); process.exit(1); });
