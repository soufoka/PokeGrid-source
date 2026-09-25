// Boost do Discord "na call" (25/09/2026): o chip de boosts do jogo so pede {type:'boosts-refresh'} ao montar, no
// focus da janela e no pw:boosts-changed, e mostra so boost com frozen || until > agora. O do Discord vem com live:true
// e until curto: com 4 paineis so um tem foco e o chip sumia nos outros ~30 s depois do ultimo clique.
// Roda o coletor REAL do index.html num vm com WebSocket e relogio falsos e confere que ele pede boosts-refresh
// pelo proprio socket: a cada 25 s com boost live, bem mais espacado sem, e nada com o socket fechado.
// Roda com: node test/boost-discord.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");

function mundo() {
  let now = 1_700_000_000_000;
  const timers = [];
  const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  const refresh = []; // instantes (ms desde o inicio) em que saiu boosts-refresh
  const t0 = now;
  function FakeWS() { this.readyState = 1; this.ls = []; }
  FakeWS.prototype.addEventListener = function (t, f) { if (t === 'message') this.ls.push(f); };
  FakeWS.prototype.send = function (d) { if (JSON.parse(d).type === 'boosts-refresh') refresh.push(now - t0); };
  const resp = () => ({ ok: true, clone() { return resp(); }, json: async () => ({}) });
  const win = { WebSocket: FakeWS, fetch: () => Promise.resolve(resp()), atob: (b) => Buffer.from(b, 'base64').toString('binary') };
  win.window = win;
  const agenda = (rep) => (fn, ms) => { timers.push({ fn, ms, at: now + ms, rep }); return timers.length; };
  const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: agenda(true), setTimeout: agenda(false), clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map }));
  vm.runInContext(COLETOR, ctx);
  const ws = vm.runInContext('new WebSocket("wss://x")', ctx);
  return {
    ws, refresh,
    msg: (m) => ws.ls.forEach((f) => f({ data: JSON.stringify(m) })),
    // anda o relogio de 1 em 1 s disparando os timers vencidos
    anda: (ms) => { for (let fim = now + ms; now < fim;) { now += 1000; for (const t of timers) if (t.at != null && t.at <= now) { t.at = t.rep ? t.at + t.ms : null; t.fn(); } } },
  };
}
const maiorVao = (a, ini, fim) => { let v = 0, p = ini; for (const x of a.filter((x) => x > ini && x <= fim)) { v = Math.max(v, x - p); p = x; } return Math.max(v, fim - p); };
const discord = { key: 'discord', live: true, until: 0 };

console.log('\n--- boost do Discord na call: o chip nao some nos paineis sem foco ---');
{
  const m = mundo();
  m.msg({ type: 'boosts', boosts: [discord] });
  m.anda(10 * 60e3);
  ok(m.refresh.length >= 20, 'com boost live, 10 min sem foco: ' + m.refresh.length + ' boosts-refresh (o jogo sozinho nao mandaria nenhum)');
  ok(maiorVao(m.refresh, 0, 10 * 60e3) <= 30e3, 'nunca fica mais de 30 s sem pedir (maior vao ' + maiorVao(m.refresh, 0, 10 * 60e3) / 1e3 + ' s)');

  m.msg({ type: 'boosts', boosts: [{ key: 'xp', until: 9e15 }] }); // saiu da call: sobra um boost comum
  const n0 = m.refresh.length;
  m.anda(10 * 60e3);
  const n = m.refresh.length - n0;
  ok(n >= 3 && n <= 6, 'sem boost live, 10 min: ' + n + ' pedidos (espacado, pra pegar quem entrar na call)');

  m.msg({ type: 'boosts', boosts: [{ key: 'xp', until: 9e15 }, discord] }); // voltou pra call
  const n1 = m.refresh.length;
  m.anda(3 * 60e3);
  ok(m.refresh.length - n1 >= 6, 'voltou pra call: volta pros 25 s (' + (m.refresh.length - n1) + ' em 3 min)');

  m.ws.readyState = 3;
  const n2 = m.refresh.length;
  m.anda(5 * 60e3);
  ok(m.refresh.length === n2, 'socket fechado: nao manda nada');
}
{
  const m = mundo();
  m.anda(5 * 60e3);
  ok(m.refresh.length >= 1 && m.refresh.length <= 3, 'antes do primeiro boosts: so o pedido espacado (' + m.refresh.length + ' em 5 min)');
  const n0 = m.refresh.length;
  m.msg({ type: 'boosts' });
  m.anda(3 * 60e3);
  ok(m.refresh.length > n0, 'boosts sem lista nao trava o pedido espacado');
}

console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
process.exit(fail);
