// Destrava (vem junto do "↩ Voltar pra hunt"): conta viva, socket aberto e farm parado.
// Contexto (bundle do jogo de 25/09): (1) depois de um restart o servidor manda restart-freeze e o jogo abre
// "Servidor reiniciado / Seu personagem ficou parado", que fica aberta ate alguem clicar em Atualizar (o botao
// manda {type:'restart-resume'} e recarrega em 8 s); (2) o keepalive do jogo aceita qualquer mensagem como sinal
// de vida e o jogo nao tem vigia de 'field', entao uma hunt que para de mandar 'field' com o socket vivo nunca
// e reenviada (o enter-hunt so sai quando o socket reconecta). O app so avisava (msgStalled, uma vez, com o sino).
// Aqui o coletor, o READ_ALERTS, o destrava e os scripts de acao REAIS rodam num jogo falso com relogio controlado.
// Roda com: node test/destrava.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const corta = (a, fim) => { const i = s.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 50)); const j = s.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 50)); return s.slice(i, j + fim.length); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const linha = (marca) => { const i = s.indexOf(marca); if (i < 0) throw new Error('sem ' + marca); return s.slice(i, s.indexOf('\n', i)); };

let COLETOR, READ_ALERTS, DESTRAVA, ENTRA_JS, RSF_JS;
try {
  COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");
  READ_ALERTS = tpl('const READ_ALERTS = ');
  DESTRAVA = corta('  const rec = [], rfVisto = [];', '\n  }\n');
  ENTRA_JS = new Function(linha('const ENTRA_JS = ') + '\nreturn ENTRA_JS;')();
  RSF_JS = new Function(linha('const RSF_JS = ') + '\nreturn RSF_JS;')();
  ok(true, 'destrava, ENTRA_JS e RSF_JS existem no index.html');
} catch (e) { ok(false, 'extrair do index.html: ' + e.message); console.log('\nFALHOU'); process.exit(1); }

const PLAY = 'https://poke.idleworld.online/play';
// pagina do jogo falsa: coletor real, WebSocket e fetch nossos, e a janela "Servidor reiniciado" do jogo como um botao falso
function mundo() {
  const sent = [];
  let now = 1_700_000_000_000;
  const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  function FakeWS() { this.readyState = 1; this.ls = []; this.op = []; }
  FakeWS.prototype.addEventListener = function (t, f) { if (t === 'message') this.ls.push(f); else if (t === 'open') this.op.push(f); };
  FakeWS.prototype.send = function (d) { sent.push(JSON.parse(d)); };
  FakeWS.OPEN = 1;
  const modal = { aberto: false, desab: false, cliques: 0 };
  // o botao do jogo (@870555): onClick manda restart-resume e agenda o reload; enquanto isso fica disabled
  const btn = { click() { if (modal.desab) return; modal.cliques++; modal.desab = true; ws.send(JSON.stringify({ type: 'restart-resume' })); } };
  const document = { querySelector: (q) => (q === '.rsf-overlay .rsf-cta:not([disabled])' && modal.aberto && !modal.desab ? btn : null) };
  const resp = (b) => ({ ok: true, clone() { return resp(b); }, json: async () => b });
  const win = { WebSocket: FakeWS, fetch: (u) => Promise.resolve(resp(String(u).includes('characters/me') ? { character: { id: 'c1' } } : {})), atob: (b) => Buffer.from(b, 'base64').toString('binary'), document };
  win.window = win;
  const ivs = []; // setInterval de quem roda na pagina (o VOLTA): o teste chama na mao
  const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: (f) => ivs.push(f), setTimeout: () => 0, clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map }));
  vm.runInContext(COLETOR, ctx);
  let ws = vm.runInContext('new WebSocket("wss://x")', ctx);
  let seq = 0;
  const m = {
    sent, modal, ivs, get ws() { return ws; },
    // o socket caiu e o jogo abriu outro (o GameSocketProvider cria um WebSocket novo): devolve o indice do primeiro envio da conexao nova
    reconecta: () => { ws.readyState = 3; ws = vm.runInContext('new WebSocket("wss://x")', ctx); ws.op.forEach((f) => f({})); return sent.length; },
    msg: (x) => ws.ls.forEach((f) => f({ data: JSON.stringify(x) })),
    run: (code) => vm.runInContext(code, ctx),
    now: () => now,
    tick: (ms) => { now += ms; },
  };
  m.field = () => m.msg({ type: 'field', seq: ++seq, serverNow: now });
  m.kill = () => m.msg({ type: 'field-kill', xpGained: 10, loot: [] });
  m.pagina = (x) => m.run('window.__poke.sock.send(' + JSON.stringify(JSON.stringify(x)) + ')'); // o proprio jogo mandando pelo socket
  m.msg({ type: 'inventory', items: [] }); // conta viva
  return m;
}

// o lado do app: o vigia de 6 s chama READ_ALERTS e destrava e executa a acao (como no index.html)
function app(m, o = {}) {
  const H = new Function('voltaHuntOn', DESTRAVA + '\nreturn { destrava, rec };')(o.on !== false);
  const acoes = [];
  const tick = () => {
    const r = m.run(READ_ALERTS);
    if (!r || !r.live) return;
    const d = H.destrava(0, r, o.url || PLAY, m.now());
    if (!d) return;
    acoes.push(d);
    if (d.ac === 'enter') m.run(ENTRA_JS(r.inH));
    else if (d.ac === 'rsf') m.run(RSF_JS);
  };
  const anda = (seg, cada) => { for (let t = 0; t < seg; t += 6) { m.tick(6000); if (cada) cada(); tick(); } };
  return { anda, acoes, rec: H.rec, tipos: () => acoes.map((a) => a.ac).join(',') };
}
const farmando = (m, a, seg = 120) => { m.msg({ type: 'field-init', slug: 'rota_x' }); a.anda(seg, () => { m.field(); m.kill(); }); };
const enterHunts = (m) => m.sent.filter((x) => x.type === 'enter-hunt');

console.log('\n--- hunt parou de mandar field com o socket vivo ---');
{
  const m = mundo(), a = app(m);
  farmando(m, a);
  ok(a.acoes.length === 0, 'farmando: nada acontece');
  a.anda(588);
  ok(a.acoes.length === 0, 'parada ha 9 min e 48 s: ainda nao age (o jogo pode estar so demorando)');
  a.anda(18);
  ok(a.tipos() === 'enter', 'passou de 10 min sem kill e sem field: tentativa 1 (' + a.tipos() + ')');
  const eh = enterHunts(m);
  ok(eh.length === 1 && eh[0].slug === 'rota_x' && Object.keys(eh[0]).join() === 'type,slug', 'manda o mesmo {type:enter-hunt, slug} que o jogo manda ao reconectar: ' + JSON.stringify(eh[0]));
  ok(/^hunt rota_x parada \(10 min sem kill, \d+s sem field, socket aberto\), tentativa 1\/3: mandando enter-hunt/.test(a.acoes[0].msg), 'linha do 🐞 Erros: ' + a.acoes[0].msg);
  a.anda(54);
  ok(a.tipos() === 'enter', 'da 60 s pro enter-hunt pegar');
  a.anda(12);
  ok(a.tipos() === 'enter,reload', 'nada andou em 60 s: recarrega (' + a.tipos() + ')');
  ok(m.now() - a.rec[0].t < 120e3, 'e marca a hora: o dom-ready arma o VOLTA mesmo sem kill nos ultimos 10 min');
  a.anda(9 * 60);
  ok(a.tipos() === 'enter,reload', 'depois de agir, espera 10 min antes da proxima tentativa');
  a.anda(4 * 3600);
  const n = (t) => a.acoes.filter((x) => x.ac === t).length;
  ok(n('enter') === 3 && n('reload') === 3 && n('limite') === 1, 'no maximo 3 tentativas em 6 h, e avisa uma vez no log que parou de tentar (' + a.tipos() + ')');
  ok(a.acoes.find((x) => x.ac === 'limite').msg === '3 tentativas de destravar em 6 h, agora so avisa', 'linha do limite');
  a.anda(2.5 * 3600);
  ok(n('enter') > 3, 'passadas 6 h da primeira, volta a tentar (' + n('enter') + ' tentativas)');
}

console.log('\n--- o enter-hunt resolve: nao recarrega e registra ---');
{
  const m = mundo(), a = app(m);
  farmando(m, a);
  a.anda(606);
  ok(a.tipos() === 'enter', 'tentou');
  m.msg({ type: 'field-init', slug: 'rota_x' }); // o servidor aceitou
  a.anda(30, () => { m.field(); m.kill(); });
  ok(a.tipos() === 'enter,voltou', 'voltou a matar: nao recarrega e registra (' + a.tipos() + ')');
  ok(/^voltou a farmar \d+s depois de destravar$/.test(a.acoes[1].msg), 'linha: ' + a.acoes[1].msg);
}

console.log('\n--- guardas: nao age ---');
{
  const caso = (nome, prep, o = {}, depois) => {
    const m = mundo(), a = app(m, o);
    farmando(m, a);
    if (prep) prep(m);
    a.anda(30 * 60, depois ? () => depois(m) : null);
    ok(a.acoes.length === 0 && enterHunts(m).length === 0, nome + ' (' + (a.tipos() || 'nada') + ')');
  };
  caso('↩ Voltar pra hunt desligado', null, { on: false });
  caso('fora do /play (login, captcha, manutencao, landing da soneca)', null, { url: 'https://poke.idleworld.online/?maintenance=1' });
  caso('socket fechado (reconexao do jogo, 4001, 4005, 4006, 4007)', (m) => { m.ws.readyState = 3; });
  caso('conta foi pra cidade pela tela (o jogo manda leave-hunt, o servidor pode nao mandar field-none)', (m) => m.pagina({ type: 'leave-hunt' }));
  caso('set-city (recarregou e nasceu na cidade, ou viajou entre cidades)', (m) => m.pagina({ type: 'set-city', slug: 'cerulean' }));
  caso('servidor recusou a hunt (field-none)', (m) => m.msg({ type: 'field-none', slug: 'rota_x' }));
  caso('time desmaiado e teleportado pra cidade', (m) => m.msg({ type: 'field-teleport-city' }));
  caso('field segue chegando sem kill (boss demorado, time fraco): a hunt nao travou', null, {}, (m) => m.field());
  {
    const m = mundo(), a = app(m);
    m.msg({ type: 'field-init', slug: 'rota_x' });
    a.anda(30 * 60);
    ok(a.acoes.length === 0, 'entrou na hunt e nunca matou nesta sessao (pesca, spot novo): nao age');
  }
  {
    const m = mundo(), a = app(m);
    m.msg({ type: 'field-init', slug: "x'});alert(1);({a:'" });
    a.anda(60, () => { m.field(); m.kill(); });
    a.anda(30 * 60);
    ok(enterHunts(m).length === 0, 'slug estranho no field-init: nao manda nada');
  }
}

console.log('\n--- servidor reiniciou: janela "Servidor reiniciado" do jogo ---');
{
  const m = mundo(), a = app(m);
  farmando(m, a);
  const ultimoKill = m.now();
  a.anda(60);
  m.msg({ type: 'restart-freeze', restartedAt: m.now(), frozenAt: ultimoKill + 5000, boosts: [{ key: 'xp', pct: 50, remainingMs: 3600e3 }] });
  m.modal.aberto = true; // o jogo abre a janela (so abre com boost pausado)
  a.anda(6);
  ok(a.tipos() === 'rsf', 'age no primeiro tique, sem esperar 10 min: a janela fica aberta ate alguem clicar (' + a.tipos() + ')');
  ok(m.modal.cliques === 1 && m.sent.filter((x) => x.type === 'restart-resume').length === 1, 'clica no botao do proprio jogo (que manda restart-resume e recarrega)');
  ok(/^servidor reiniciou e travou a sessao \(parada desde \d\d:\d\d\), tentativa 1\/3: clicando em Atualizar do jogo$/.test(a.acoes[0].msg), 'linha: ' + a.acoes[0].msg);
  ok(m.now() - a.rec[0].t < 120e3, 'marca a hora: o reload que o jogo faz arma o VOLTA');
  a.anda(9 * 60);
  ok(m.modal.cliques === 1 && a.acoes.length === 1 && enterHunts(m).length === 0, 'botao em "Retomando..." (disabled) enquanto o jogo recarrega: nao clica de novo nem manda enter-hunt por cima');
}
{
  const m = mundo(), a = app(m);
  farmando(m, a);
  m.pagina({ type: 'leave-hunt' });
  a.anda(30 * 60);
  m.msg({ type: 'restart-freeze', restartedAt: m.now(), frozenAt: m.now() - 1000, boosts: [{ key: 'xp', remainingMs: 3600e3 }] });
  m.modal.aberto = true;
  a.anda(30 * 60);
  ok(m.modal.cliques === 0, 'conta estava parada na cidade antes do restart (ultimo kill 30 min antes): nao clica, o boost segue pausado');
}
{
  const m = mundo(), a = app(m, { on: false });
  farmando(m, a);
  m.msg({ type: 'restart-freeze', restartedAt: m.now(), frozenAt: m.now(), boosts: [{ key: 'xp', remainingMs: 3600e3 }] });
  m.modal.aberto = true;
  a.anda(10 * 60);
  ok(m.modal.cliques === 0, 'com o ↩ Voltar pra hunt desligado nao clica (sem ele o reload larga a conta na cidade gastando o boost)');
}
{
  const m = mundo(), a = app(m);
  farmando(m, a);
  m.msg({ type: 'restart-freeze', restartedAt: m.now(), frozenAt: m.now(), boosts: [] }); // sem boost o jogo nao abre nada
  a.anda(60);
  const r = m.run(READ_ALERTS);
  ok(m.modal.cliques === 0 && a.acoes.length === 0 && r.rf > 0 && r.rsf === false, 'restart-freeze sem boost: o jogo nao mostra nada e o app nao inventa acao (so registra; se a hunt parar, cai no caso do field)');
}

console.log('\n--- coletor e READ_ALERTS ---');
{
  const m = mundo();
  m.msg({ type: 'field-init', slug: 'rota_x' });
  m.tick(5000); m.field();
  let r = m.run(READ_ALERTS);
  ok(r.inH === 'rota_x' && r.fa === 0, 'READ_ALERTS diz a hunt da pagina e ha quanto tempo chegou o ultimo field');
  m.tick(70000);
  ok(m.run(READ_ALERTS).fa === 70000, 'idade do field anda com o relogio');
  m.pagina({ type: 'enter-hunt', slug: 'rota_x' });
  ok(m.run(READ_ALERTS).inH === 'rota_x', 'enter-hunt nao apaga a hunt');
  m.pagina({ type: 'leave-hunt' });
  ok(m.run(READ_ALERTS).inH === '' && m.sent.some((x) => x.type === 'leave-hunt'), 'leave-hunt mandado pela pagina apaga a hunt e segue pro servidor');
  const semDoc = new Function('window', 'return ' + READ_ALERTS)({ __poke: { ws: { inventory: { items: [] } }, api: {}, sess: {} } });
  ok(semDoc && semDoc.rsf === false && semDoc.inH === '', 'READ_ALERTS roda sem document (como nas outras suites)');
}

console.log('\n--- VOLTA com a tela na cidade: o socket reconecta ---');
// Depois de um reload (do app ou do destrava) a tela do jogo nasce em Cerulean e o VOLTA poe a conta na hunt so pelo
// socket. O componente de cidade do jogo (cx) remanda {type:'set-city'} toda vez que o socket reabre (online false->true):
// antes, cada queda do WS tirava a conta da hunt de novo e o destrava via "cidade" e nao fazia nada.
{
  const VOLTA_JS = new Function(linha('const VOLTA_JS = ') + '\nreturn VOLTA_JS;')();
  const tipos = (m, i) => m.sent.slice(i).filter((x) => /^(enter-hunt|leave-hunt|set-city)$/.test(x.type)).map((x) => x.type + ':' + x.slug).join();
  const posVolta = () => {
    const m = mundo();
    m.pagina({ type: 'set-city', slug: 'cerulean' }); // montagem logo depois do reload
    const n0 = m.ivs.length;
    m.run(VOLTA_JS('rota_x'));
    m.tick(12000); m.ivs[n0](); // 1o tiro do VOLTA
    m.tick(300); m.msg({ type: 'field-init', slug: 'rota_x' }); // o servidor confirmou
    m.tick(6000); m.field(); m.kill();
    m.tick(60000);
    return m;
  };
  {
    const m = posVolta();
    ok(tipos(m, 0) === 'set-city:cerulean,enter-hunt:rota_x', 'reload: o set-city da montagem sai normal (ainda sem marca) e o VOLTA manda enter-hunt (' + tipos(m, 0) + ')');
    const i0 = m.reconecta(); m.tick(50); m.pagina({ type: 'set-city', slug: 'cerulean' });
    const s0 = m.sent.slice(i0);
    ok(s0.length === 1 && Object.keys(s0[0]).join() === 'type,slug' && tipos(m, i0) === 'enter-hunt:rota_x', 'socket reabriu e a tela remandou set-city: sai o enter-hunt que o jogo manda ao reconectar dentro da hunt (' + tipos(m, i0) + ')');
    ok(m.run(READ_ALERTS).inH === 'rota_x', 'e a hunt segue valendo pro destrava');
    m.msg({ type: 'field-init', slug: 'rota_x' }); m.tick(600e3);
    const i1 = m.reconecta(); m.tick(2900); m.pagina({ type: 'set-city', slug: 'cerulean' });
    ok(tipos(m, i1) === 'enter-hunt:rota_x', 'segunda queda, set-city 2,9 s depois do open: tambem vira enter-hunt (' + tipos(m, i1) + ')');
  }
  {
    const m = posVolta();
    const i0 = m.reconecta(); m.tick(3500); m.pagina({ type: 'set-city', slug: 'pewter' });
    ok(tipos(m, i0) === 'set-city:pewter' && m.run(READ_ALERTS).inH === '', 'viagem de verdade (set-city 3,5 s depois do open): sai set-city e a conta vai pra cidade (' + tipos(m, i0) + ')');
    const i1 = m.reconecta(); m.tick(50); m.pagina({ type: 'set-city', slug: 'pewter' });
    ok(tipos(m, i1) === 'set-city:pewter', 'e a marca morreu: a reconexao seguinte manda o set-city da tela (' + tipos(m, i1) + ')');
  }
  {
    const m = posVolta();
    const i0 = m.reconecta(); m.tick(50); m.pagina({ type: 'set-city', slug: 'pewter' }); // viajou com o socket caido: o set-city sai logo depois do open
    ok(tipos(m, i0) === 'set-city:pewter' && m.run(READ_ALERTS).inH === '', 'viagem feita com o socket caido (set-city de OUTRA cidade logo depois do open): passa e a conta vai pra cidade (' + tipos(m, i0) + ')');
  }
  {
    const m = posVolta();
    const i0 = m.reconecta(); m.tick(50); m.pagina({ type: 'leave-hunt' });
    ok(tipos(m, i0) === 'leave-hunt:undefined', 'leave-hunt da pagina logo depois do open sai como leave-hunt, nunca vira enter-hunt (' + tipos(m, i0) + ')');
  }
  const tarde = (m) => m.msg({ type: 'field-init', slug: 'rota_x' }); // field-init atrasado da mesma hunt nao ressuscita a marca
  [['field-none', (m) => { m.msg({ type: 'field-none', slug: 'rota_x' }); tarde(m); }],
    ['field-teleport-city (desmaio)', (m) => { m.msg({ type: 'field-teleport-city' }); tarde(m); }],
    ['leave-hunt da pagina', (m) => { m.pagina({ type: 'leave-hunt' }); tarde(m); }],
    ['enter-hunt da pagina pra outra hunt', (m) => { m.pagina({ type: 'enter-hunt', slug: 'rota_y' }); m.msg({ type: 'field-init', slug: 'rota_y' }); }],
  ].forEach(([nome, f]) => {
    const m = posVolta(); f(m); m.tick(1000);
    const i0 = m.reconecta(); m.tick(50); m.pagina({ type: 'set-city', slug: 'cerulean' });
    ok(tipos(m, i0) === 'set-city:cerulean', nome + ': a marca nao vale mais, a reconexao manda set-city (' + tipos(m, i0) + ')');
  });
  {
    const m = mundo(); farmando(m, app(m));
    m.pagina({ type: 'leave-hunt' }); m.pagina({ type: 'set-city', slug: 'cerulean' });
    const i0 = m.reconecta(); m.tick(50); m.pagina({ type: 'set-city', slug: 'cerulean' });
    ok(tipos(m, i0) === 'set-city:cerulean', 'sem VOLTA: set-city logo depois do open passa como sempre');
  }
  {
    const m = mundo(); m.pagina({ type: 'set-city', slug: 'cerulean' });
    const n0 = m.ivs.length; m.run(VOLTA_JS('rota_x')); m.tick(12000); m.ivs[n0]();
    const i0 = m.reconecta(); m.tick(50); m.pagina({ type: 'set-city', slug: 'cerulean' });
    ok(tipos(m, i0) === 'set-city:cerulean', 'VOLTA mandou mas o field-init ainda nao chegou: nao inventa hunt (o proximo tiro do VOLTA cuida)');
  }
  {
    const m = posVolta();
    m.run(ENTRA_JS('rota_x')); m.msg({ type: 'field-init', slug: 'rota_x' }); // o destrava mandou enter-hunt na conta posta pelo VOLTA
    const i0 = m.reconecta(); m.tick(50); m.pagina({ type: 'set-city', slug: 'cerulean' });
    ok(tipos(m, i0) === 'enter-hunt:rota_x', 'o enter-hunt do destrava nao mata a marca');
  }
}

console.log('\n--- VOLTA reconhece as cidades do jogo (goldenrod, shopping, ginasios) ---');
{
  const VOLTA_JS = new Function(linha('const VOLTA_JS = ') + '\nreturn VOLTA_JS;')();
  ['goldenrod', 'shopping', 'gym_pewter', 'cerulean'].forEach((sl) => { const m = mundo(); ok(m.run(VOLTA_JS(sl)) === 'cidade', sl + ': e cidade, o VOLTA nao manda enter-hunt'); });
  const m = mundo(); ok(m.run(VOLTA_JS('rota_x')) === 'armado', 'hunt de verdade continua armando');
}

console.log('\n--- ligacao no vigia e no dom-ready ---');
{
  const vig = corta('  setInterval(() => {\n    webviews.forEach((w, i) => {', '  }, 6000);');
  ok(vig.includes("const dv = destrava(i, r, w.getURL() || '', Date.now());") && vig.indexOf('destrava(i, r') > vig.indexOf('if (!r.live)'), 'o vigia chama o destrava so com a conta viva (o !live segue com o deadT)');
  ok(vig.includes("window.pokeAPI.logError('painel', 'painel ' + (i + 1) + ': ' + dv.msg)"), 'toda acao vira linha no 🐞 Erros');
  ok(vig.includes('w.executeJavaScript(ENTRA_JS(r.inH))') && vig.includes('w.executeJavaScript(RSF_JS)') && /dv\.ac === 'reload'\) \{ try \{ w\.reload\(\); \}/.test(vig), 'executa enter-hunt, o clique e o reload');
  ok(vig.includes('servidor reiniciou, o jogo diz sessao parada desde'), 'restart-freeze fica no log mesmo sem acao');
  ok(s.includes("Date.now() - ((rec[i] && rec[i].t) || 0) < 120e3") && s.indexOf('wv.executeJavaScript(VOLTA_JS(snv.slug))') > s.indexOf('Date.now() - ((rec[i] && rec[i].t) || 0) < 120e3'), 'dom-ready: depois de um reload do destrava o VOLTA arma sem exigir kill nos ultimos 10 min');
  ['voltaTitle'].forEach((k) => ok((s.match(new RegExp(k + ":'[^']*(6 h)[^']*'", 'g')) || []).length === 3, k + ' explica o destrava nos 3 idiomas'));
  ok(!/voltaTitle:'[^']*—/.test(s), 'sem travessao');
}

console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
process.exit(fail);
