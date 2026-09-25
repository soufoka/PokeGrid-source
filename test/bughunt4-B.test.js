// Caca de bugs 4, lote B (25/09/2026): ciclo dos paineis, atalhos, processo principal e lancadores.
// Roda o codigo REAL do index.html (vigia de 6 s, console-message, SELLGUARD, escolha de paineis, idioma, Logar equipe,
// atalhos de letra), o main.js com um Electron de mentira, e o Abrir PokeGrid.bat / iniciar.bat com npm falso.
// Roda com: node test/bughunt4-B.test.js
const fs = require('fs');
const os = require('os');
const vm = require('vm');
const path = require('path');
const { spawnSync } = require('child_process');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let b = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > b.length) b = m[1]; }
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const entre = (a, fim, incluiFim) => { const i = b.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 60)); const j = b.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 40)); return b.slice(i, incluiFim ? j + fim.length : j); };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.message) || e)); } };
const LOGIN = 'https://poke.idleworld.online/login', JOGO = 'https://poke.idleworld.online';
// o main.js registra handlers que so logam: estes vem antes, pra um erro do teste nao terminar calado
process.on('uncaughtException', (e) => { console.log('FAIL excecao no teste: ' + ((e && e.stack) || e)); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log('FAIL promessa rejeitada no teste: ' + ((e && e.stack) || e)); process.exit(1); });
const vez = () => new Promise((r) => setImmediate(r));
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };

// vigia de 6 s REAL (pendA, dlgT, deadT) com relogio e webview falsos
function vigia(wv, cred, extra) {
  let tick = null, now = 1_700_000_000_000;
  const DateF = { now: () => now };
  const env = {
    webviews: [wv], off: [false], accounts: [cred || { email: 'a@b.c', senha: 'x' }], deadT: [0], LOGIN_URL: LOGIN,
    READ_ALERTS: '', RESET_SESS: '', lowOn: [], lastShiny: [], lastFaint: [], lastK: [], stallOn: [], alertsOn: true, sndShinyOn: false,
    registraHunt() {}, mergeLogs() {}, accumHist() {}, addShinyLife() {}, beepShiny() {}, alerta() {}, checkStall() {}, checkLow() {},
    window: { pokeAPI: { logError() {} } }, setInterval: (fn, ms) => { tick = { fn, ms }; }, Date: DateF
  };
  Object.assign(env, extra || {});
  const nomes = Object.keys(env);
  const bloco = entre('  const pendA = [0, 0, 0, 0];', '}, 6000);', true);
  const est = new Function(...nomes, bloco + "\nreturn { dlgT: typeof dlgT === 'undefined' ? [] : dlgT, pendA, sessSnap };")(...nomes.map((k) => env[k]));
  // o console-message REAL do painel (e o que liga e desliga a marca de dialogo)
  const cm = entre("wv.addEventListener('console-message', ", '\n      });').slice("wv.addEventListener('console-message', ".length) + '\n      }';
  const onConsole = new Function('i', 'dlgT', 'stSane', 'stCache', 'dtPush', 'ivRecebe', 'Date', 'return ' + cm)(0, est.dlgT, () => null, {}, () => {}, () => {}, DateF);
  return {
    est, DateF, onConsole: (m) => onConsole({ message: m }),
    passa: async (n) => { for (let k = 0; k < n; k++) { now += tick.ms; tick.fn(); await vez(); } }
  };
}
function painel(url, resposta) {
  const w = { url, nav: [], reloads: 0, getURL() { return this.url; }, loadURL(u) { this.nav.push(u); return Promise.resolve(); }, reload() { this.reloads++; } };
  w.executeJavaScript = () => (resposta === 'trava' ? new Promise(() => {}) : Promise.resolve(resposta || { live: false, shinyN: 0, faintN: 0, kills: 0 }));
  return w;
}

(async () => {
  await secao('vigia de sessao caida so anda onde a sessao viva e esperada (MEDIA: Modo Soneca e criar personagem)', async () => {
    const zzz = painel(JOGO + '/'), v1 = vigia(zzz);
    await v1.passa(30);
    ok(zzz.nav.length === 0, 'Modo Soneca (Zzz leva pra "/"): 3 min parado sem relogar, a soneca nao e cancelada (' + JSON.stringify(zzz.nav) + ')');
    const cc = painel(JOGO + '/create-character'), v2 = vigia(cc);
    await v2.passa(40);
    ok(cc.nav.length === 0, 'conta sem personagem: nao reloga a cada 60 s por cima do formulario (' + cc.nav.length + ' relogins)');
    const ve = painel(JOGO + '/verify-email'), v3 = vigia(ve);
    await v3.passa(20);
    ok(ve.nav.length === 0, 'verificar e-mail: tambem fica quieto');
    const lg = painel(LOGIN + '?ref=X'), v4 = vigia(lg);
    await v4.passa(20);
    ok(lg.nav.length === 0, 'tela de login (captcha a mao): continua quieto');
    const pl = painel(JOGO + '/play'), v5 = vigia(pl);
    await v5.passa(9);
    ok(pl.nav.length === 0, '/play sem sessao (WS 4001): espera os 60 s');
    await v5.passa(1);
    ok(pl.nav.length === 1 && pl.nav[0] === LOGIN, '/play sem sessao: aos 60 s volta pro login, como antes');
    const mt = painel(JOGO + '/?maintenance=1'), v6 = vigia(mt);
    await v6.passa(99);
    ok(mt.nav.length === 0, 'manutencao: nada antes dos 10 min');
    await v6.passa(1);
    ok(mt.nav.length === 1, 'manutencao: tenta o login aos 10 min, como antes');
    const sc = painel(JOGO + '/play'), v7 = vigia(sc, { email: '', senha: '' });
    await v7.passa(20);
    ok(sc.nav.length === 0, 'sem senha salva: nunca manda pro login');
  });

  await secao('confirm/prompt aberto no painel nao conta como travado (baixa: venda cancelada e conta na cidade)', async () => {
    const w = painel(JOGO + '/play', 'trava'), v = vigia(w);
    v.onConsole('__PGDLG__1');
    ok(v.est.dlgT[0] > 0, 'o console-message liga a marca de dialogo do painel');
    await v.passa(15);
    ok(w.reloads === 0, '90 s com o confirm da Guarda de venda aberto: painel NAO recarrega (' + w.reloads + ')');
    v.onConsole('__PGDLG__0');
    ok(v.est.dlgT[0] === 0, 'respondeu: a marca desliga');
    await v.passa(10);
    ok(w.reloads === 1, 'travado de verdade depois do dialogo: recarrega aos 60 s, como antes');
    const w2 = painel(JOGO + '/play', 'trava'), v2 = vigia(w2);
    v2.onConsole('__PGDLG__1');
    await v2.passa(100);
    ok(w2.reloads === 0, 'marca ligada ate 10 min: segura');
    await v2.passa(12);
    ok(w2.reloads === 1, 'marca perdida (pagina morreu com o dialogo aberto): o vigia volta depois de 10 min + 60 s');
    ok(/wv\.addEventListener\('dom-ready', \(\) => \{\n[^\n]*\n\s+dlgT\[i\] = 0;/.test(b), 'pagina nova (dom-ready) zera a marca');

    // o SELLGUARD REAL embrulha os dialogos da pagina (o dele e os do jogo) e avisa antes e depois
    const i0 = s.indexOf('const SELLGUARD = `'), ini = s.indexOf('`', i0) + 1;
    const SELLGUARD = eval('`' + s.slice(ini, s.indexOf('`;', ini)) + '`');
    const log = [];
    const win = { console: { log: (x) => log.push(String(x)) }, fetch: () => Promise.resolve({}),
      confirm: () => { log.push('DIALOGO'); return true; }, prompt: () => { log.push('DIALOGO'); return 'nome'; }, alert: () => { log.push('DIALOGO'); } };
    win.window = win;
    const ctx = vm.createContext(win);
    vm.runInContext(SELLGUARD, ctx);
    const r1 = vm.runInContext('window.confirm("Sair da familia?")', ctx);
    ok(r1 === true && log.join(',') === '__PGDLG__1,DIALOGO,__PGDLG__0', 'confirm do jogo: avisa antes, devolve a resposta, avisa depois (' + log.join(',') + ')');
    log.length = 0;
    ok(vm.runInContext('window.prompt("Nome?")', ctx) === 'nome' && log.join(',') === '__PGDLG__1,DIALOGO,__PGDLG__0', 'prompt tambem (no Electron ele volta null na hora, mas o embrulho vale pros tres)');
    log.length = 0;
    vm.runInContext('window.fetch("/api/game/pokemon/sell", { method: "POST", body: JSON.stringify({ pokeIds: [7] }) })', Object.assign(ctx, { __poke: { ws: { pokes: { list: [{ id: 7, shiny: true, name: 'Gyarados', quality: 1 }] } } } }));
    ok(log.join(',') === '__PGDLG__1,DIALOGO,__PGDLG__0', 'a confirmacao da propria Guarda de venda (vender shiny) passa pelo aviso');
    log.length = 0;
    vm.runInContext(SELLGUARD, ctx); // dom-ready de novo na mesma pagina nao embrulha duas vezes
    vm.runInContext('window.alert("x")', ctx);
    ok(log.join(',') === '__PGDLG__1,DIALOGO,__PGDLG__0', 'injetar de novo nao duplica o aviso');
  });

  await secao('Paineis: escolhe o numero direto, sem passar pelos do meio (MEDIA: contas iam pra cidade no caminho)', async () => {
    const eventos = [], kids = [], webviews = [], timers = [];
    const grid = { children: kids, classList: { remove() {}, add() {} } };
    const criarPainel = (i) => { const p = { remove() { kids.splice(kids.indexOf(p), 1); eventos.push('fecha ' + (i + 1)); } }; kids.push(p); webviews.push({}); eventos.push('abre ' + (i + 1)); };
    const on = new Set();
    const btns = [1, 2, 3, 4].map((n) => ({ dataset: { n: String(n) }, classList: { toggle: (c, f) => { if (c === 'on') { if (f) on.add(n); else on.delete(n); } } } }));
    const lbl = { textContent: '' };
    const row = { title: '', querySelectorAll: (q) => (q === 'button' ? btns : []), querySelector: (q) => (q === 'span' ? lbl : null) };
    const I = { count: '🔢 Paineis', countTitle: 'Quantas contas' };
    const env = { document: { getElementById: (id) => (id === 'countRow' ? row : null) }, grid, webviews, off: [false, false, false, false], lastLogin: [0, 0, 0, 0], alertedBalls: [], criarPainel,
      t: (k) => I[k] || k, lsSet() {}, ajustaProporcao() {}, setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout() {} };
    const nomes = Object.keys(env);
    const api = new Function(...nomes, 'let count = 4;' + entre("  const countRow = document.getElementById('countRow');", '\n  function toggleExpand') + '\nreturn { build, n: () => count };')(...nomes.map((k) => env[k]));
    const clica = (n) => { eventos.length = 0; btns[n - 1].onclick(); return eventos.join(','); };
    api.build();
    ok(btns.every((b) => typeof b.onclick === 'function') && lbl.textContent === '🔢 Paineis' && row.title === 'Quantas contas' && [...on].join() === '4', 'o menu tem 1, 2, 3 e 4, com o rotulo, a dica traduzida e o 4 marcado');
    let ev = clica(3);
    ok(api.n() === 3 && ev === 'fecha 4' && [...on].join() === '3', 'com 4 abertos, escolher 3 fecha so o painel 4 (' + ev + ')');
    ev = clica(2);
    ok(api.n() === 2 && ev === 'fecha 3', 'escolher 2: fecha so o 3 (' + ev + ')');
    ev = clica(3);
    ok(api.n() === 3 && ev === 'abre 3', 'com 2 abertos, escolher 3 so abre o 3, sem passar pelo 1 (' + ev + ')');
    ev = clica(3);
    ok(ev === '' && api.n() === 3, 'escolher o numero que ja esta nao mexe em nada');
    ev = clica(1);
    ok(ev === 'fecha 3,fecha 2' && api.n() === 1, 'de 3 pra 1: fecha o 3 e o 2 (' + ev + ')');
    ev = clica(4);
    ok(ev === 'abre 2,abre 3,abre 4' && api.n() === 4, 'de 1 pra 4: abre so os que faltam, o 1 segue (' + ev + ')');
    ok(timers.length === 0, 'aplica na hora: sem espera de 1,5 s entre clique e resultado');
    const I18 = ['pt', 'en', 'es'].map((L) => new RegExp('\\n\\s+' + L + ': \\{[\\s\\S]*?countTitle:\'([^\']+)\'').exec(b));
    ok(I18.every((m) => m && m[1] && !/—/.test(m[1])), 'a dica do Paineis existe em pt, en e es, sem travessao');
  });

  await secao('idioma: o jogo vai pro mesmo idioma do app, espanhol incluido (MEDIA)', async () => {
    const grav = [];
    const mk = (n) => ({ n, reloads: 0, executeJavaScript(c) { grav.push(c); return Promise.resolve(); }, reload() { this.reloads++; } });
    const ws = [mk(1), mk(2), mk(3), mk(4)];
    const botoes = ['pt', 'en', 'es'].map((l) => ({ dataset: { lang: l } }));
    const api = new Function('webviews', 'off', 'lastLogin', 'langBtns', 'applyLang', "let lang = 'en';" + entre('  function applyGameLang() {', "applyLang(); applyGameLang(); });", true) + '\nreturn { lang: () => lang };')(ws, [false, false, false, false], [0, 0, 0, 0], botoes, () => {});
    botoes[2].onclick(); await vez();
    ok(api.lang() === 'es' && grav.length === 4 && grav.every((c) => c.includes('"es"')), 'English -> Espanol: o jogo passa a es, nao fica em en (' + grav[0] + ')');
    ok(ws.every((w) => w.reloads === 1), 'e recarrega uma vez pra aplicar (agora e mudanca de verdade)');
    grav.length = 0; botoes[2].onclick(); await vez();
    ok(grav.length === 0 && ws.every((w) => w.reloads === 1), 'clicar no idioma que ja esta: nada recarrega');
    ok(b.split("localStorage.setItem('poke_lang', ${JSON.stringify(lang)})").length - 1 === 2 && !b.includes("lang === 'pt' ? 'pt' : 'en'"), 'o dom-ready tambem grava o idioma do app sem trocar es por en (a escolha de Espanol nao e desfeita a cada carga)');
  });

  await secao('jogo em espanhol: a calculadora de IV do JustPokedex le a Calidad (MEDIA: calculava tudo com x1,00)', async () => {
    const jp = fs.readFileSync(path.join(RAIZ, 'presets', 'justpokedex.js'), 'utf8').replace(/\r\n/g, '\n');
    const pedaco = (a, fim) => { const i = jp.indexOf(a), j = jp.indexOf(fim, i + a.length); if (i < 0 || j < 0) throw new Error('nao achei no preset: ' + a); return jp.slice(i, j); };
    const parsePokemon = new Function(pedaco('    const TYPE_SYSTEM = {', '\n    function typeBadgeHtml(') + pedaco('    function numero(texto) {', '\n    function limitar(') + pedaco('    function parsePokemon(texto) {', '\n    function escapeHtml(') + '\nreturn parsePokemon;')();
    // tooltip do jogo em es (rotulos do pokeTooltip do bundle de 24/09: Nv, Calidad, IV, Vel, Poder; chip Activo)
    const es = parsePokemon(['Scizor', 'Bicho', 'Acero', 'Activo', 'Nv 40', 'Calidad Legendaria ×1.70', 'IV 150/192', 'HP 812', 'Atk 540', 'Def 410', 'SpA 190', 'SpD 330', 'Vel 260', 'Poder 2310'].join('\n'));
    ok(es && es.multiplicadorQualidade === 1.7 && es.qualidade === 'Legendaria ×1.70', 'qualidade lida do "Calidad": x' + (es && es.multiplicadorQualidade) + ' (antes null, e a conta usava x1,00)');
    ok(es.nivel === 40 && es.ivAtual === 150 && es.ivMaximo === 192 && es.vel === 260 && es.poder === 2310, 'nivel, IV, velocidade e poder tambem');
    ok(es.ativo === true && es.tipos.join() === 'Bicho,Acero', 'o chip Activo marca ativo e nao vira tipo, e os tipos em es sao lidos (' + es.tipos.join() + ')');
    const pt = parsePokemon(['Scizor', 'Bug', 'Ativo', 'Nv 40', 'Qualidade Lendária ×1.70', 'IV 150/192', 'Poder 2310'].join('\n'));
    ok(pt.multiplicadorQualidade === 1.7 && pt.ativo === true, 'em portugues continua igual');
    ok(/\(\?:Raridade\|Rarity\|Rareza\)/.test(jp), 'o Mercado em es (rotulo "Rareza") tambem e lido');
  });

  await secao('Logar equipe nao tira do jogo quem ja esta farmando (baixa)', async () => {
    const LOGIN_URL = LOGIN;
    let now = 1_700_000_000_000;
    const DateF = { now: () => now };
    const ws = [0, 1, 2, 3].map(() => ({ nav: [], loadURL(u) { this.nav.push(u); } }));
    const accounts = [0, 1, 2, 3].map((i) => ({ name: 'T' + i, email: 'c' + i + '@x', senha: 's' + i }));
    const sessSnap = [{ t: now - 3000, sk: true }, { t: now - 5000, sk: true }, { t: now - 1000, sk: true }]; // 0 a 2 vivos; o 3 caiu (captcha)
    const inputs = [];
    const hold = {};
    const doc = { getElementById: () => hold, querySelectorAll: () => inputs };
    const trocou = [false, false, false, false];
    const logins = [];
    const api = new Function('webviews', 'accounts', 'lastLogin', 'off', 'togglePower', 'LOGIN_URL', 'sessSnap', 'trocou', 'document', 'grid', 'defName', 'save', 'window', 't', 'overlay', 'loginPanel', 'Date',
      entre('  function loginAll() {', '\n  async function save()') + '\n' + entre("  document.getElementById('accSave').onclick = async () => {", '\n  };', true)
      + '\nconst mkAuto = (i, wv) => { ' + entre('const autoLogin = (e) => {', '\n      };', true) + ' return autoLogin; };\nreturn { loginAll, mkAuto };')(
      ws, accounts, [0, 0, 0, 0], [false, false, false, false], () => {}, LOGIN_URL, sessSnap, trocou, doc, { querySelectorAll: () => [] }, (i) => 'T' + i, async () => true, { alert() {} }, (k) => k, { classList: { remove() {} } }, (wv, c) => logins.push(c.email), DateF);
    api.loginAll();
    ok(ws.map((w) => w.nav.length).join('') === '0001', 'so o painel que caiu vai pro login; os 3 que farmam ficam (' + ws.map((w) => w.nav.length).join('') + ')');
    // Treinadores: trocou o e-mail do painel 2 (vivo) e so o nome do painel 1
    const campo = (i, f, v) => ({ dataset: { i: String(i), f }, value: v });
    inputs.push(campo(0, 'name', 'Outro nome'), campo(0, 'email', 'c0@x'), campo(0, 'senha', 's0'), campo(1, 'name', 'T1'), campo(1, 'email', 'nova@x'), campo(1, 'senha', 's1'));
    await hold.onclick();
    ws.forEach((w) => { w.nav.length = 0; });
    api.loginAll();
    ok(ws.map((w) => w.nav.length).join('') === '0101', 'e-mail trocado em Treinadores: o Logar equipe reloga esse painel mesmo vivo; trocar so o nome nao (' + ws.map((w) => w.nav.length).join('') + ')');
    api.mkAuto(1, ws[1])({ url: LOGIN_URL });
    ok(logins.join() === 'nova@x' && trocou[1] === false, 'o auto-login usou a credencial nova e baixou a marca');
    ws.forEach((w) => { w.nav.length = 0; });
    api.loginAll();
    ok(ws[1].nav.length === 0, 'depois de logado com a nova, o proximo Logar equipe deixa ele em paz');
    now += 60e3; ws.forEach((w) => { w.nav.length = 0; });
    api.loginAll();
    ok(ws.map((w) => w.nav.length).join('') === '1111', 'foto velha (vigia sem resposta ha 15 s+): conta nao e tida como viva, reloga');
  });

  await secao('Logar equipe reloga a sessao que caiu dentro do /play (Conta em uso, WS 4001) (baixa)', async () => {
    // pagina do jogo com o coletor e o READ_ALERTS REAIS; o /me segue com o personagem depois que o socket fecha
    const COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;"), READ_ALERTS = tpl('const READ_ALERTS = ');
    let now = 1_700_000_000_000;
    const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
    function FakeWS() { this.readyState = 1; this.ls = []; }
    FakeWS.prototype.addEventListener = function (t2, f) { if (t2 === 'message') this.ls.push(f); };
    FakeWS.prototype.send = function () {};
    const resp = (x) => ({ ok: true, clone() { return resp(x); }, json: async () => x });
    const win = { WebSocket: FakeWS, fetch: () => Promise.resolve(resp({ character: { id: 'c1', name: 'A' } })), atob: (x) => Buffer.from(x, 'base64').toString('binary') };
    win.window = win;
    const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map }));
    vm.runInContext(COLETOR, ctx);
    const sock = vm.runInContext('new WebSocket("wss://x")', ctx);
    vm.runInContext('fetch("/api/characters/me")', ctx); for (let k = 0; k < 5; k++) await vez();
    sock.ls.forEach((f) => f({ data: JSON.stringify({ type: 'pokes', list: [] }) }));
    const w = painel(JOGO + '/play');
    w.executeJavaScript = (c) => Promise.resolve(c === READ_ALERTS ? JSON.parse(JSON.stringify(vm.runInContext(c, ctx))) : undefined);
    const v = vigia(w, null, { READ_ALERTS });
    const la = new Function('webviews', 'accounts', 'lastLogin', 'off', 'togglePower', 'LOGIN_URL', 'sessSnap', 'trocou', 'Date', entre('  function loginAll() {', '\n  async function save()') + '\nreturn loginAll;')(
      [w], [{ email: 'a@b.c', senha: 'x' }], [0], [false], () => {}, LOGIN, v.est.sessSnap, [false], v.DateF);
    await v.passa(1);
    la();
    ok(v.est.sessSnap[0] && v.est.sessSnap[0].sk === true && w.nav.length === 0, 'farmando com o socket aberto: a foto marca sk e o Logar equipe deixa a conta em paz');
    sock.readyState = 3; // o jogo fechou o WS com 4005 (Conta em uso) e fica no /play sem reconectar
    await v.passa(1);
    ok(v.est.sessSnap[0].sk === false && v.DateF.now() - v.est.sessSnap[0].t < 15000, 'socket fechado com o /me ainda trazendo o personagem: a foto continua nova, mas sem socket (sk ' + v.est.sessSnap[0].sk + ')');
    la();
    ok(w.nav.length === 1 && w.nav[0] === LOGIN, 'o Logar equipe manda esse painel pro login (' + JSON.stringify(w.nav) + '; antes ficava parado ate o vigia de 60 s)');
  });

  await secao('atalhos de letra ficam quietos com uma janela do app aberta (MEDIA: digitar "carlos" recarregava os 4 paineis)', async () => {
    let aberta = true, handler = null;
    const chamou = [];
    const doc = { activeElement: { tagName: 'BUTTON', isContentEditable: false },
      querySelector: (sel) => (aberta && /#overlay\.show/.test(sel) && /#scOverlay\.show/.test(sel) && /#tlOverlay\.show/.test(sel) && /#dtOverlay\.show/.test(sel) ? {} : null),
      addEventListener: (tp, fn) => { if (tp === 'keydown') handler = fn; } };
    const TECLAS = new Proxy({}, { get: (_t, k) => (typeof k === 'string' && /^[hlcearmtgdo]$/.test(k) ? () => chamou.push(k) : undefined) });
    new Function('document', 'TECLAS_ATALHO', entre("  document.addEventListener('keydown', (e) => {\n    if (e.ctrlKey", '\n  });', true))(doc, TECLAS);
    const tecla = (k) => handler({ key: k, preventDefault() {} });
    'carlos'.split('').forEach(tecla);
    ok(chamou.length === 0, 'modal de Treinadores/Scripts/Tierlist/Ditto aberto: nenhuma letra dispara (' + chamou.join('') + ')');
    aberta = false; tecla('r');
    ok(chamou.join('') === 'r', 'sem janela aberta o atalho continua funcionando');
  });

  await secao('main.js: clipboard do jogo, segunda instancia e webhook do Discord PTB/Canary', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-main-'));
    const Modulo = require('module');
    const res0 = Modulo._resolveFilename;
    const reg = { perm: [], janelas: 0, ipc: {}, req: [] };
    let lock = true;
    const qq = new Proxy(function () {}, { get: (_t, k) => (k === 'then' || typeof k === 'symbol' ? undefined : qq), apply: () => qq, construct: () => qq });
    const app = new Proxy({
      commandLine: { appendSwitch() {} }, on() {}, quit() {}, getVersion: () => '0.0.0', getPath: () => tmp, userAgentFallback: 'Mozilla/5.0 Chrome/150 Electron/43.1.1',
      requestSingleInstanceLock: () => lock, whenReady: () => ({ then(cb) { cb(); } })
    }, { get: (t, k) => (k in t ? t[k] : qq) });
    const eletron = new Proxy({
      app, ipcMain: { handle: (c, fn) => { reg.ipc[c] = fn; }, on() {}, removeHandler() {} },
      BrowserWindow: Object.assign(function () { reg.janelas++; return qq; }, { getAllWindows: () => [], fromWebContents: () => qq }),
      session: { fromPartition: () => ({ setPermissionRequestHandler: (fn) => reg.perm.push(fn) }), defaultSession: qq },
      Menu: { buildFromTemplate: (t2) => ({ items: t2 }), setApplicationMenu() {} }
    }, { get: (t, k) => (k in t ? t[k] : qq) });
    const httpsF = { get: () => ({ on() { return this; } }), request: (u, _o, cb) => { reg.req.push(u.hostname); return { on() { return this; }, setTimeout() {}, destroy() {}, end() { cb({ statusCode: 204, resume() {} }); } }; } };
    Modulo._resolveFilename = function (p, ...r) { if (p === 'electron') return 'electron-b'; if (p === 'https') return 'https-b'; return res0.call(this, p, ...r); };
    require.cache['electron-b'] = { id: 'electron-b', filename: 'electron-b', loaded: true, exports: eletron };
    require.cache['https-b'] = { id: 'https-b', filename: 'https-b', loaded: true, exports: httpsF };
    const st0 = global.setTimeout;
    const carrega = () => { delete require.cache[require.resolve(path.join(RAIZ, 'main.js'))]; global.setTimeout = () => 0; try { require(path.join(RAIZ, 'main.js')); } finally { global.setTimeout = st0; } };
    try {
      carrega();
      ok(reg.janelas === 1 && reg.perm.length === 4, 'primeira instancia: janela criada e as 4 contas com o filtro de permissao');
      const pede = (p) => { let r; reg.perm[0](null, p, (x) => { r = x; }); return r; };
      ok(pede('clipboard-sanitized-write') === true, 'botao Copiar do jogo (Recovery Key, 2FA, Pix, indicacao): escrita no clipboard liberada (MEDIA)');
      ok(['clipboard-read', 'media', 'notifications', 'geolocation', 'openExternal', 'midi'].every((p) => pede(p) === false), 'o resto segue negado, inclusive LER o clipboard');
      const wh = reg.ipc['webhook:send'];
      const envia = async (u) => { reg.req.length = 0; const r = await wh(null, u, 'oi'); return r === true && reg.req.length === 1; };
      ok(await envia('https://ptb.discord.com/api/webhooks/1/x') && await envia('https://canary.discord.com/api/webhooks/1/x'), 'webhook copiado do Discord PTB e do Canary: envia');
      ok(await envia('https://discord.com/api/webhooks/1/x') && await envia('https://discordapp.com/api/webhooks/1/x'), 'discord.com e discordapp.com: continuam');
      let barrou = true;
      for (const u of ['https://evil.com/api/webhooks/1/x', 'https://discord.com.evil.com/api/webhooks/1/x', 'https://xptb.discord.com/api/webhooks/1/x', 'https://ptb.evil.com/api/webhooks/1/x', 'http://ptb.discord.com/api/webhooks/1/x', 'https://ptb.discord.com/api/outra/1']) {
        reg.req.length = 0; const r = await wh(null, u, 'oi'); if (r !== false || reg.req.length) { barrou = false; console.log('     passou: ' + u); }
      }
      ok(barrou, 'outros dominios, http e caminho fora de /api/webhooks/ continuam barrados');
      lock = false; reg.janelas = 0; reg.perm.length = 0;
      carrega();
      ok(reg.janelas === 0 && reg.perm.length === 0, 'segunda instancia: sai sem criar janela nem abrir as particoes das contas (baixa)');
      let rel = ''; try { rel = fs.readFileSync(path.join(tmp, 'relatorio-de-erros.log'), 'utf8'); } catch {}
      ok(rel.includes('ja havia um PokeGrid aberto') && rel.split('janela criada').length - 1 === 1, 'relatorio: a segunda instancia diz que ja tinha um aberto e nao grava "janela criada"');
    } finally {
      Modulo._resolveFilename = res0;
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    }
  });

  await secao('lancadores do Windows refazem a instalacao quando falta o Electron ou uma dependencia (MEDIA)', async () => {
    const acha = (n) => [path.join(RAIZ, n), path.join(RAIZ, '..', 'PokeGrid-source', n)].find((p) => fs.existsSync(p));
    const abrir = acha('Abrir PokeGrid.bat'), iniciar = acha('iniciar.bat');
    if (process.platform !== 'win32' || !abrir) { ok(true, 'pulado: ' + (process.platform !== 'win32' ? 'nao e Windows' : 'sem Abrir PokeGrid.bat por perto')); return; }
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pgbat-'));
    const bin = path.join(base, 'bin');
    fs.mkdirSync(bin);
    // npm falso: registra a chamada; o install repoe a dependencia que a instalacao interrompida perdeu
    fs.writeFileSync(path.join(bin, 'npm-falso.js'), "const fs=require('fs'),p=require('path');const a=process.argv.slice(2);fs.appendFileSync(p.join(__dirname,'log.txt'),'npm '+a[0]+'\\n');if(a[0]==='install'){const d=p.join(process.cwd(),'node_modules','@electron','get');fs.mkdirSync(d,{recursive:true});fs.writeFileSync(p.join(d,'package.json'),'{\"name\":\"@electron/get\",\"main\":\"index.js\"}');fs.writeFileSync(p.join(d,'index.js'),'');}");
    fs.writeFileSync(path.join(bin, 'npm.cmd'), '@"' + process.execPath + '" "%~dp0npm-falso.js" %*\r\n');
    fs.writeFileSync(path.join(bin, 'node-velho.js'), "Object.defineProperty(process,'versions',{value:Object.assign({},process.versions,{node:'20.10.0'})});");
    // electron falso: o require precisa do @electron/get e, com ele, "baixa" o programa (grava o exe e o path.txt)
    const electronFalso = "require('@electron/get');const fs=require('fs'),p=require('path');fs.mkdirSync(p.join(__dirname,'dist'),{recursive:true});fs.writeFileSync(p.join(__dirname,'dist','electron.exe'),'');fs.writeFileSync(p.join(__dirname,'path.txt'),'electron.exe');";
    let n = 0;
    const roda = (bat, monta, extraEnv) => {
      const dir = path.join(base, 'Pasta (' + (++n) + ') do PokeGrid');
      const nm = path.join(dir, 'node_modules');
      fs.mkdirSync(path.join(nm, 'electron'), { recursive: true });
      fs.writeFileSync(path.join(nm, 'electron', 'package.json'), '{"name":"electron","main":"index.js"}');
      fs.writeFileSync(path.join(nm, 'electron', 'index.js'), electronFalso);
      monta(nm);
      const txt = fs.readFileSync(bat, 'latin1').replace(/start "" "node_modules\\electron\\dist\\electron\.exe" \./, 'echo ABRIRIA O PROGRAMA');
      const alvo = path.join(dir, path.basename(bat));
      fs.writeFileSync(alvo, txt, 'latin1');
      try { fs.unlinkSync(path.join(bin, 'log.txt')); } catch {}
      const r = spawnSync('cmd.exe', ['/d', '/c', 'call', alvo], { cwd: dir, input: '\r\n\r\n\r\n', encoding: 'latin1', timeout: 120000,
        env: Object.assign({}, process.env, { PATH: bin + ';' + process.env.PATH, NODE_OPTIONS: '' }, extraEnv || {}) });
      let log = ''; try { log = fs.readFileSync(path.join(bin, 'log.txt'), 'utf8'); } catch {}
      return { out: String(r.stdout || '') + String(r.stderr || ''), npm: log.trim().split('\n').filter(Boolean), exe: fs.existsSync(path.join(nm, 'electron', 'dist', 'electron.exe')) };
    };
    const comGet = (nm) => { const d = path.join(nm, '@electron', 'get'); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'package.json'), '{"name":"@electron/get","main":"index.js"}'); fs.writeFileSync(path.join(d, 'index.js'), ''); };
    const comExe = (nm) => { fs.mkdirSync(path.join(nm, 'electron', 'dist'), { recursive: true }); fs.writeFileSync(path.join(nm, 'electron', 'dist', 'electron.exe'), ''); fs.writeFileSync(path.join(nm, 'electron', 'path.txt'), 'electron.exe'); };
    try {
      const r1 = roda(abrir, (nm) => { comGet(nm); fs.writeFileSync(path.join(nm, 'electron', 'path.txt'), 'electron.exe'); });
      ok(r1.exe && r1.out.includes('ABRIRIA O PROGRAMA') && !r1.out.includes('nao terminou'), 'antivirus levou o electron.exe depois de instalado (path.txt ficou): baixa de novo e abre' + (r1.exe ? '' : ' -> ' + r1.out.trim().split('\n').slice(-3).join(' | ')));
      const r2 = roda(abrir, () => {});
      ok(r2.npm.includes('npm install') && r2.exe && r2.out.includes('ABRIRIA O PROGRAMA'), 'instalacao interrompida sem o @electron/get: roda o npm install de novo e completa (antes: Cannot find module em toda abertura)' + (r2.exe ? '' : ' -> ' + r2.out.trim().split('\n').slice(-3).join(' | ')));
      const r3 = roda(abrir, (nm) => { comGet(nm); comExe(nm); });
      ok(r3.npm.length === 0 && r3.out.includes('ABRIRIA O PROGRAMA'), 'tudo instalado: nem chama o npm, so abre');
      const r4 = roda(abrir, () => {}, { NODE_OPTIONS: '--require "' + path.join(bin, 'node-velho.js').replace(/\\/g, '/') + '"' });
      ok(r4.out.includes('Node.js deste PC e antigo') && r4.npm.length === 0 && !r4.out.includes('Confira a internet'), 'Node 20 antigo: diz pra atualizar o Node em vez de mandar conferir a internet (baixa)');
      if (iniciar) {
        const r5 = roda(iniciar, (nm) => { comGet(nm); fs.writeFileSync(path.join(nm, 'electron', 'path.txt'), 'electron.exe'); });
        ok(r5.npm.join(',') === 'npm install,npm start', 'iniciar.bat: sem o electron.exe roda o npm install antes do npm start (' + r5.npm.join(',') + ')');
        const r6 = roda(iniciar, (nm) => { comGet(nm); comExe(nm); });
        ok(r6.npm.join(',') === 'npm start', 'iniciar.bat: tudo instalado, so o npm start');
      }
    } finally { try { fs.rmSync(base, { recursive: true, force: true }); } catch {} }
  });

  console.log(fail ? '\nFALHOU' : '\nTUDO OK');
  process.exit(fail);
})();
