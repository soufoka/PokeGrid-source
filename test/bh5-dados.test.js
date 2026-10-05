// Caca de bugs 5 (03/10/2026), dados: log vitalicio (capturas no mesmo ms, poda do dedupe), shinies perdidos com o
// Hunt Analyzer, hunt anterior que contava o tempo parado na cidade e Melhor catch que sobrevivia ao Zerar.
// Roda o coletor, o READ_STATE, o READ_ALERTS, o mergeLogs e o resetSessao REAIS do index.html num vm com WebSocket e
// fetch falsos (o molde do bughunt4-A). Roda com: node test/bh5-dados.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const corta = (a, fim) => { const i = s.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 50)); const j = s.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 50)); return s.slice(i, j); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const aspas = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('"', i0); return JSON.parse(s.slice(ini, s.indexOf('";\n', ini) + 1)); };
const COLETOR = tpl("wv.executeJavaScript(`(()=>{if(window.__poke)return;");
const READ_STATE = tpl('const READ_STATE = '), READ_ALERTS = tpl('const READ_ALERTS = ');
const RESET_SESS = aspas('const RESET_SESS = ');
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };

// pagina do jogo falsa: o coletor entra, o WebSocket e o fetch sao nossos
function mundo(api = {}) {
  let now = 1_700_000_000_000;
  const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  function FakeWS() { this.readyState = 1; this.ls = []; }
  FakeWS.prototype.addEventListener = function (t, f) { if (t === 'message') this.ls.push(f); };
  FakeWS.prototype.send = function () {};
  const resp = (b) => ({ ok: true, clone() { return resp(b); }, json: async () => b });
  const win = { WebSocket: FakeWS, fetch: (u) => Promise.resolve(resp(api[String((u && u.url) || u).split('?')[0]])), atob: (b) => Buffer.from(b, 'base64').toString('binary') };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map }));
  vm.runInContext(COLETOR, ctx);
  const ws = vm.runInContext('new WebSocket("wss://x")', ctx);
  return {
    msg: (m) => ws.ls.forEach((f) => f({ data: JSON.stringify(m) })),
    run: (code) => vm.runInContext(code, ctx),
    P: () => vm.runInContext('window.__poke', ctx),
    tick: (ms) => { now += ms; },
    now: () => now,
  };
}
// mergeLogs REAL (logs vitalicios, dedupe, webhook e festa do shiny)
const I18N = new Function('lsGet', corta('  const I18N = {', '\n  const t = (k)') + '\nreturn I18N;')(() => null);
function ML() {
  const txt = [], festa = [];
  const f = new Function('t', 'webhookSend', 'festaShiny', 'alerta', 'lsSet', 'let lifeShiny = [], lifeCatch = []; const tabNames = [], ACOR = [], whCfg = { shiny: 1 }, alertsOn = true; const stName = (i) => "Conta " + (i + 1);\n'
    + corta('  const kSh = ', '\n  // ----- Farm parado') + '\nreturn { mergeLogs, life: () => ({ lifeShiny, lifeCatch }), seenLog };')((k) => I18N.pt[k], (x) => txt.push(x), (o) => festa.push(o), () => {}, () => {});
  return Object.assign(f, { txt, festa });
}

(async () => {
  await secao('D1: capturas no mesmo milissegundo viram uma so no log vitalicio (MEDIA)', async () => {
    {
      const m = mundo(), L = ML();
      m.msg({ type: 'pokes', list: [{ id: 1, team: true, hp: 10 }] });
      L.mergeLogs(0, m.run(READ_ALERTS)); // backfill
      m.tick(30000);
      // o socket voltou: a lista completa (pokes-chunk, v=2) traz 3 capturas feitas com ele caido, processadas no mesmo ms
      m.msg({ type: 'pokes-chunk', gen: 3, seq: 0, total: 1, list: [{ id: 1, team: true, hp: 10 }, { id: 51, name: 'Rattata', speciesId: 19, sellValue: 50, ivTotal: 100, quality: '1.1' }, { id: 52, name: 'Rattata', speciesId: 19, sellValue: 50, ivTotal: 150, quality: '1.6' }, { id: 53, name: 'Rattata', speciesId: 19, sellValue: 50, ivTotal: 90, quality: '1.0' }] });
      const r = m.run(READ_ALERTS);
      L.mergeLogs(0, r);
      const lc = L.life().lifeCatch;
      ok(lc.length === 3 && lc.some((x) => x.iv === 150), 'lista completa com 3 Rattata no mesmo ms: as 3 entram no log vitalicio, inclusive a de IV 150 x1.6 (' + lc.length + ')');
      ok(new Set(r.catchLog.map((x) => x.t)).size === 3 && r.catchLog.every((x) => Math.abs(x.t - m.now()) < 10), 'cada captura ganha um carimbo proprio, colado na hora de verdade (' + r.catchLog.map((x) => x.t - m.now()).join(',') + ' ms)');
    }
    {
      const m = mundo(), L = ML();
      m.msg({ type: 'pokes', list: [] });
      L.mergeLogs(0, m.run(READ_ALERTS));
      m.tick(5000);
      [61, 62].forEach((id) => m.msg({ type: 'poke-delta', poke: { id, name: 'Geodude', speciesId: 74, sellValue: 10, ivTotal: id, quality: '1.0' } }));
      L.mergeLogs(0, m.run(READ_ALERTS));
      ok(L.life().lifeCatch.length === 2, 'rajada de poke-delta (AoE + auto-catch) no mesmo ms: 2 Geodude, 2 entradas (' + L.life().lifeCatch.length + ')');
    }
    {
      const m = mundo(), L = ML();
      m.msg({ type: 'pokes', list: [] });
      L.mergeLogs(0, m.run(READ_ALERTS));
      m.tick(5000);
      m.msg({ type: 'field-kill', xpGained: 10, loot: [], shiny: true, speciesId: 19, speciesName: 'Rattata' });
      m.msg({ type: 'poke-delta', poke: { id: 70, name: 'Rattata', speciesId: 19, shiny: true, sellValue: 100, ivTotal: 120, quality: '1.2' } });
      L.mergeLogs(0, m.run(READ_ALERTS));
      ok(L.life().lifeShiny.length === 2 && L.festa.length === 1 && L.txt.some((x) => /CAPTURADO/.test(x)), 'shiny derrotado e capturado no mesmo ms: o aviso de CAPTURADO e a festa saem (festa ' + L.festa.length + ', webhooks ' + L.txt.length + ')');
      ok(L.festa[0] && L.festa[0].iv === 120, 'e a festa acha o IV da captura certa (' + (L.festa[0] && L.festa[0].iv) + ')');
    }
  });

  await secao('D2: com o Hunt Analyzer, shinies vistos e capturados da mesma janela (MEDIA: perdidos falsos)', async () => {
    const shiny = (m, id) => { m.msg({ type: 'field-kill', xpGained: 10, loot: [], shiny: true, speciesId: 19, speciesName: 'Rattata' }); m.tick(4000); m.msg({ type: 'poke-delta', poke: { id, name: 'Rattata', speciesId: 19, shiny: true, sellValue: 100 } }); m.tick(4000); };
    {
      const m = mundo();
      m.msg({ type: 'pokes', list: [] });
      m.msg({ type: 'field-init', slug: 'rattata' });
      shiny(m, 50); shiny(m, 51);
      m.msg({ type: 'analyzer', seconds: 1800, kills: 900, balance: 50000, captures: 2, shinyCaptures: 2, drops: [] });
      m.msg({ type: 'analyzer', seconds: 0, kills: 0, balance: 0, captures: 0, shinyCaptures: 0, drops: [] }); // 🗑 Limpar sessao no Hunt Analyzer do jogo
      shiny(m, 52);
      m.msg({ type: 'analyzer', seconds: 300, kills: 150, balance: 9000, captures: 1, shinyCaptures: 1, drops: [] });
      const a = m.run(READ_STATE).a;
      ok(a.srv === 1 && a.shinyFound === 3 && a.shinyCap === 3, '"Limpar sessao" do jogo no meio: 3 vistos, 3 capturados, nenhum perdido (' + a.shinyFound + '/' + a.shinyCap + ')');
    }
    {
      const m = mundo();
      m.msg({ type: 'pokes', list: [] });
      m.msg({ type: 'field-init', slug: 'rattata' });
      m.msg({ type: 'analyzer', seconds: 5 * 3600, kills: 9000, balance: 900000, captures: 40, shinyCaptures: 7, drops: [] });
      shiny(m, 60);
      m.msg({ type: 'analyzer', seconds: 5 * 3600 + 8, kills: 9001, balance: 900100, captures: 41, shinyCaptures: 8, drops: [] });
      const a = m.run(READ_STATE).a;
      ok(a.shinyFound === 1 && a.shinyCap === 1, 'app aberto com a conta ha 5 h na hunt: 1 visto e 1 capturado desde que o app abriu, nunca 8 capturados pra 1 visto (' + a.shinyFound + '/' + a.shinyCap + ')');
      ok(a.kills === 9001 && a.captures === 41, 'os outros numeros seguem vindo do analyzer');
    }
  });

  await secao('D3: hunt encerrada acaba no ultimo kill (BAIXA: tempo parado na cidade entrava no log, no CSV e no Comparar)', async () => {
    const m = mundo();
    m.msg({ type: 'pokes', list: [] });
    m.msg({ type: 'field-init', slug: 'kabutops' });
    const t0 = m.now();
    for (let k = 0; k < 600; k++) { m.tick(6000); m.msg({ type: 'field-kill', xpGained: 1000, loot: [] }); } // 1 h: 600 kills
    const fim = m.now();
    m.msg({ type: 'field', mobs: [], hits: [], fainted: true, reviveInMs: 5000 }); // time inteiro derrotado
    m.msg({ type: 'field-teleport-city' });
    m.tick(2 * 3600e3); // 2 h parada em Cerulean
    m.msg({ type: 'field-init', slug: 'geodude' }); // so agora a Kabutops fecha
    const h = m.run(READ_ALERTS).prevHunt;
    ok(h && h.start === t0 && h.end === fim && h.kills === 600, 'o resumo que vai pro log de hunts e pro CSV termina no ultimo kill: 1 h, nao 3 h (' + (h && (h.end - h.start) / 60000) + ' min)');
    const pv = m.run(READ_STATE).prev;
    ok(pv && pv.kph === 600 && pv.xph === 600000, '"Comparar com a anterior": 600 kills/h e 600 mil XP/h (' + (pv && pv.kph) + ')');
    const m2 = mundo();
    m2.msg({ type: 'field-init', slug: 'kabutops' });
    m2.tick(600e3);
    m2.msg({ type: 'field-init', slug: 'geodude' });
    ok(m2.P().prev.end === m2.now(), 'hunt sem kill nenhum: fecha na hora da troca, como antes');
    const m3 = mundo();
    m3.msg({ type: 'field-init', slug: 'kabutops' });
    m3.tick(6000); m3.msg({ type: 'field-kill', xpGained: 1, loot: [] });
    m3.tick(60000); m3.run(RESET_SESS); // Zerar guarda o ultimo kill, que fica antes do inicio da sessao zerada
    m3.tick(60000); m3.msg({ type: 'field-init', slug: 'geodude' });
    ok(m3.P().prev.end === m3.now() && m3.P().prev.end >= m3.P().prev.start, 'Zerar e trocar de hunt sem kill: o fim nao fica antes do inicio');
  });

  await secao('D4: Zerar com o Simples fechado tambem zera o Melhor catch (BAIXA)', async () => {
    const src = corta('  async function resetSessao() {', '\n  statsEl.querySelector');
    const wv = { executeJavaScript: () => Promise.resolve() };
    const bestVisto = [{ cid: 'c1', b: { n: 'Scyther', iv: 180, q: 1.9 } }];
    const env = { pgConfirma: async () => true /* redesign D: o dialogo do app no lugar do window.confirm */, t: (k) => k, webviews: [wv], off: [false], RESET_SESS: 'RESET', stCache: {}, dhist: [], utBase: [], sessSnap: [], bestVisto, cardsOn: false, refreshStats: () => {}, refreshCards: () => {} };
    const rs = new Function(...Object.keys(env), src.replace('dhist = []', 'dhist.length = 0') + '\nreturn resetSessao;')(...Object.values(env));
    await rs();
    ok(bestVisto.length === 0, 'Zerar pelo 📊 Painel (Simples fechado): o Scyther da sessao antiga nao volta como Melhor catch (' + bestVisto.length + ')');
  });

  await secao('D5: dedupe do log vitalicio limitado, sem duplicar nada (BAIXA)', async () => {
    const L = ML();
    const t0 = 1_700_000_000_000;
    const CL = [[], [], [], []];
    // painel 4 parado (conta estacionada): o coletor manda as 50 capturas antigas e um shiny capturado a cada tique
    for (let k = 0; k < 50; k++) CL[3].push({ n: 'Velho' + k, iv: 1, q: 1, sh: false, fx: false, t: t0 + k });
    const sl3 = [{ n: 'Shiny Ditto', sid: 132, cap: 1, t: t0 + 99 }];
    let novas = 0, n = 0;
    for (let tick = 0; tick < 2500; tick++) { // os paineis 1 a 3 capturam a cada tique (7.500 capturas)
      const tt = t0 + 1e6 + tick * 6000;
      for (let p = 0; p < 3; p++) { CL[p].push({ n: 'Rattata', iv: 100, q: 1, sh: false, fx: false, t: tt + p }); if (CL[p].length > 50) CL[p].shift(); novas++; }
      for (let p = 0; p < 4; p++) L.mergeLogs(p, { shinyLog: p === 3 ? sl3 : [], catchLog: CL[p] });
      n = Math.max(n, Object.keys(L.seenLog).length);
    }
    const lc = L.life().lifeCatch;
    ok(n <= 5001, 'chaves do dedupe limitadas: maximo de ' + n + ' com ' + (novas + 51) + ' entradas vistas (antes crescia 1 por captura pra sempre)');
    ok(new Set(lc.map((x) => x.p + '_' + x.t + '_' + x.n)).size === lc.length, 'log vitalicio sem duplicata depois das podas (' + lc.length + ' entradas)');
    ok(!lc.some((x) => x.p === 3), 'o painel parado reenvia as 50 capturas antigas a cada tique e elas nao voltam ao log (ja tinham saido pelo teto de 300)');
    ok(L.festa.length === 0 && L.txt.length === 0, 'nem o shiny capturado dele vira festa ou webhook de novo (' + L.festa.length + ' festas, ' + L.txt.length + ' webhooks)');
    ok(CL[3].every((x) => L.seenLog['c3_' + x.t + '_' + x.n] === 1) && !(('c0_' + (t0 + 1e6) + '_Rattata') in L.seenLog), 'a poda e por painel: as chaves do parado ficam todas, as mais antigas das contas que farmam saem');
  });

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('ERRO', e.stack); process.exit(1); });
