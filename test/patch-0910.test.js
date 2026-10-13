// Patch do jogo de 09/10/2026 (v1.9: guild, Auto Boss, espera na troca de pokemon), lido no bundle de 11/10:
// (1) o jogo manda resume em todo enter-hunt (false na entrada, true ao reentrar na hunt que ja mandou field-init);
// (2) o chat ganhou o canal guild (no history e numa mensagem guild-history propria);
// (3) a troca de pokemon na hunt tem espera (poke-swap-cooldown {leftMs,totalMs}): o HUD do jogo trava os botoes
//     e o clique da aba Time do app nao fazia nada, sem dizer por que.
// Roda o coletor, o READ_STATE, o stSane, a linha do time e o trocaLider REAIS do index.html.
// Roda com: node test/patch-0910.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const corta = (a, fim) => { const i = s.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 50)); const j = s.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 50)); return s.slice(i, j + fim.length); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };

let COLETOR, READ_STATE, stSane, team, trocaLider, I18N;
try {
  COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");
  READ_STATE = tpl('const READ_STATE = ');
  stSane = new Function(corta('  function stSane(d) {', '\n  }\n') + '\nreturn stSane;')();
  const ti = s.indexOf('    team: (d) => {'), tf = "      return s + '</div>';\n    }";
  if (ti < 0) throw new Error('sem a secao team');
  const teamSrc = s.slice(ti + '    team: '.length, s.indexOf(tf, ti) + tf.length);
  I18N = {}; for (const m of s.matchAll(/stTeamCd:'([^']*)'/g)) I18N[Object.keys(I18N).length ? (I18N.en ? 'es' : 'en') : 'pt'] = m[1];
  const T = { stTeam: 'Time', stTeamLead: 'Lider', stTeamPick: 'Clique', stTeamCd: I18N.pt };
  team = new Function('t', 'esc', 'sec', 'nf', 'dexId', 'return ' + teamSrc)((k) => T[k] || k, (x) => String(x), () => '', (n) => String(n), (n) => n);
  trocaLider = (deps) => new Function('webviews', 'statsIdx', 'off', 'refreshStats', corta('  async function trocaLider(row) {', '\n  }\n') + '\nreturn trocaLider;')(deps.webviews, 0, [], () => {});
  ok(true, 'coletor, READ_STATE, stSane, linha do time e trocaLider extraidos do index.html');
} catch (e) { ok(false, 'extrair do index.html: ' + e.message); console.log('\nFALHOU'); process.exit(1); }

// pagina do jogo falsa com o coletor real e relogio controlado
function mundo() {
  let now = 1_700_000_000_000;
  const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  function FakeWS() { this.readyState = 1; this.ls = []; }
  FakeWS.prototype.addEventListener = function (t, f) { if (t === 'message') this.ls.push(f); };
  FakeWS.prototype.send = function () {};
  const resp = (b) => ({ ok: true, clone() { return resp(b); }, json: async () => b });
  const win = { WebSocket: FakeWS, fetch: () => Promise.resolve(resp({})), atob: (b) => Buffer.from(b, 'base64').toString('binary'), document: { querySelector: () => null } };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map }));
  vm.runInContext(COLETOR, ctx);
  const ws = vm.runInContext('new WebSocket("wss://x")', ctx);
  return { msg: (x) => ws.ls.forEach((f) => f({ data: JSON.stringify(x) })), run: (c) => vm.runInContext(c, ctx), tick: (ms) => { now += ms; } };
}
// o link de pokemon que o jogo poe no chat: [poke!<base64url do JSON>]
const share = (n, iv) => '[poke!' + Buffer.from(JSON.stringify({ k: 'poke', n, iv, lv: 300, q: 1.8, sh: false, pw: 9000 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + ']';

console.log('\n--- (1) todo enter-hunt do app manda resume, como o jogo ---');
{
  // o slug de cada envio: v (coletor), sl (VOLTA) ou o template do ENTRA_JS; comentario com {type:'enter-hunt', nao conta
  const envios = [...s.matchAll(/\{type:'enter-hunt',slug:(?:v|sl|\$\{JSON\.stringify\(String\(slug\)\)\})(?:,[a-z]+:[a-z]+)*\}/g)].map((m) => m[0]);
  ok(!/\{type:'enter-hunt',slug:(?:v|sl|\$\{JSON\.stringify\(String\(slug\)\)\})\}/.test(s), 'nenhum enter-hunt sem resume sobrou no index.html');
  ok(envios.length === 4, 'os 4 envios de enter-hunt do app: VOLTA, destrava, field-lost e a reconexao (' + envios.length + ')');
  ok(envios.every((e) => /,resume:(true|false)\}$/.test(e)), 'todos com resume: ' + envios.join(' | '));
  ok(envios.filter((e) => /resume:false/.test(e)).length === 1 && /slug:sl,resume:false/.test(envios.join()), 'so o VOLTA (entrada nova depois do reload) manda resume false');
}

console.log('\n--- (2) pokemon compartilhado no chat da guild entra nos Compartilhados ---');
{
  const m = mundo();
  m.msg({ type: 'history', world: [{ fromName: 'Ash', body: 'olha ' + share('Dragonite', 158) }], trade: [], help: [], media: [], guild: [{ fromName: 'Misty', body: share('Gyarados', 170) }], guildTag: 'PG' });
  let cs = m.run('window.__poke.chatShares') || [];
  ok(cs.some((c) => c.n === 'Dragonite' && c.fr === 'Ash'), 'o do mundo continua entrando');
  ok(cs.some((c) => c.n === 'Gyarados' && c.fr === 'Misty' && c.iv === 170), 'o history traz o canal guild e o share dele entra (' + cs.map((c) => c.n).join(', ') + ')');
  m.msg({ type: 'guild-history', guild: [{ fromName: 'Brock', body: share('Onix', 120) }], guildTag: 'PG' });
  cs = m.run('window.__poke.chatShares') || [];
  ok(cs.some((c) => c.n === 'Onix' && c.fr === 'Brock'), 'a mensagem guild-history (o jogo pede quando entra numa guild) tambem entra');
  m.msg({ type: 'guild-history', guild: [{ fromName: 'Brock', body: share('Onix', 120) }] });
  ok((m.run('window.__poke.chatShares') || []).filter((c) => c.n === 'Onix').length === 1, 'o mesmo share repetido nao duplica');
}

console.log('\n--- (3) espera da troca de pokemon na aba Time ---');
{
  const m = mundo();
  m.msg({ type: 'field-init', slug: 'rota_x' });
  ok(m.run(READ_STATE).swapCd === 0, 'sem a mensagem do jogo: nada de espera');
  m.msg({ type: 'poke-swap-cooldown', leftMs: 12000, totalMs: 15000 });
  ok(m.run(READ_STATE).swapCd === 12, 'poke-swap-cooldown de 12 s: READ_STATE manda 12 (' + m.run(READ_STATE).swapCd + ')');
  m.tick(4500);
  ok(m.run(READ_STATE).swapCd === 8, '4,5 s depois: 8, arredondado pra cima como o jogo (' + m.run(READ_STATE).swapCd + ')');
  m.tick(9000);
  ok(m.run(READ_STATE).swapCd === 0, 'acabou: 0, nunca negativo');
  m.msg({ type: 'poke-swap-cooldown', leftMs: 20000, totalMs: 20000 });
  m.msg({ type: 'field-none' });
  ok(m.run(READ_STATE).swapCd === 0, 'fora da hunt o jogo nao mostra a espera, e o app tambem nao');
}
{
  const d = (v) => stSane({ ok: true, swapCd: v }).swapCd;
  ok(d(12) === 12 && d('x') === 0 && d(-5) === 0 && d(1e9) === 3600 && d(7.4) === 7, 'stSane: numero inteiro de 0 a 3600 (a leitura chega por console-message e pode ser forjada)');
}
{
  const time = [{ name: 'Gyarados', level: 300, ld: true, sid: 130 }, { name: 'Onix', level: 120, ld: false, sid: 95 }];
  const comEspera = team({ team: time, swapCd: 9 }), sem = team({ team: time, swapCd: 0 });
  const linhas = (h) => [...h.matchAll(/<div class="tm-row([^"]*)"[^>]*title="([^"]*)"/g)].map((m) => ({ cls: m[1].trim(), title: m[2] }));
  const L = linhas(comEspera), L0 = linhas(sem);
  ok(L[0].cls === 'lead' && L[1].cls === 'espera', 'com espera: o lider fica como esta e os outros ganham .espera (' + L.map((x) => x.cls).join(' / ') + ')');
  ok(L[1].title === I18N.pt.replace('{s}', 9) && /<span class="tm-espera">9s<\/span>/.test(comEspera), 'o titulo e o selo mostram os segundos que faltam, com o texto do jogo (' + L[1].title + ')');
  ok(L0[1].cls === '' && !/tm-espera/.test(sem), 'sem espera: linha normal, clicavel');
  ok(I18N.pt === 'Troca disponível em {s}s' && I18N.en === 'Swap available in {s}s' && I18N.es === 'Cambio disponible en {s}s', 'os 3 idiomas com o mesmo texto do jogo');
  const css = s.slice(s.indexOf('<style>'), s.indexOf('</style>'));
  ok(/#stats \.tm-row\.espera \{ cursor: default; \}/.test(css) && /#stats \.tm-row\.espera img, #stats \.tm-row\.espera \.tm-info \{ opacity: \.55; \}/.test(css), 'CSS: linha em espera apagada e sem cursor de clique');
}
{
  let tocou = 0;
  const webviews = new Proxy([], { get: (a, k) => { tocou++; return a[k]; } });
  const tl = trocaLider({ webviews });
  const row = (cls, ld) => ({ dataset: { ld, nm: 'onix', lv: '120' }, classList: { contains: (c) => c === cls }, style: {} });
  tl(row('espera', '0'));
  ok(tocou === 0, 'clique numa linha em espera: o app nao manda clique pro jogo (ele ignoraria)');
  tl(row('', '1'));
  ok(tocou === 0, 'clique no lider: continua sem fazer nada');
  tl(row('', '0'));
  ok(tocou > 0, 'linha livre: segue pro clique no HUD do jogo');
}

console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
process.exit(fail);
