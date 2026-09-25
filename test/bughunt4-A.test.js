// Caca de bugs 4, lote A (25/09/2026): coletor, Hunt Analyzer, historico diario, shinies, bolas e barra de EXP.
// Roda o coletor, o READ_STATE, o READ_ALERTS, o accumHist e o mergeLogs REAIS do index.html num vm com WebSocket e
// fetch falsos. A curva de XP vem recortada do bundle do jogo de 24/09 (fixtures/xp-curva-2026-09-24.js.txt).
// Roda com: node test/bughunt4-A.test.js
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
const RESET_SESS = aspas('const RESET_SESS = '), DEP_JS = aspas('const DEP_JS = ');

// pagina do jogo falsa: o coletor entra, o WebSocket e o fetch sao nossos. seed = a foto que o dom-ready injeta depois de um reload
function mundo(api = {}, seed) {
  const sent = [];
  let now = 1_700_000_000_000;
  const DateF = class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  function FakeWS() { this.readyState = 1; this.ls = []; }
  FakeWS.prototype.addEventListener = function (t, f) { if (t === 'message') this.ls.push(f); };
  FakeWS.prototype.send = function (d) { sent.push(JSON.parse(d)); };
  FakeWS.OPEN = 1;
  const resp = (b) => ({ ok: true, clone() { return resp(b); }, json: async () => (typeof b === 'function' ? b() : b) });
  const fetchF = (u) => Promise.resolve(resp(api[String((u && u.url) || u).split('?')[0]]));
  const win = { WebSocket: FakeWS, fetch: fetchF, atob: (b) => Buffer.from(b, 'base64').toString('binary') };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { Date: DateF, setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, clearTimeout() {}, JSON, Math, Object, Array, String, Number, Reflect, Promise, Error, isFinite, Set, Map }));
  if (seed) vm.runInContext('window.__pokeSeed=' + JSON.stringify(Object.assign({}, seed, { t: now })), ctx);
  vm.runInContext(COLETOR, ctx);
  const ws = vm.runInContext('new WebSocket("wss://x")', ctx);
  return {
    api, sent,
    msg: (m) => ws.ls.forEach((f) => f({ data: JSON.stringify(m) })),
    run: (code) => vm.runInContext(code, ctx),
    P: () => vm.runInContext('window.__poke', ctx),
    tick: (ms) => { now += ms; },
    busca: async (u) => { vm.runInContext('fetch(' + JSON.stringify(u) + ')', ctx); for (let k = 0; k < 5; k++) await new Promise((r) => setImmediate(r)); },
  };
}

// historico diario REAL (histDay, dayKey, totalDia, accumHist), com localStorage falso
const HIST = () => new Function('lsObj', 'lsSet', 'lsGet', corta('  let histDay = {};', '  function viraODia(k)') + '\nfunction viraODia(){}\nreturn { accumHist, hoje: () => totalDia(dayKey(0)) };')(() => ({}), () => {}, () => null);

(async () => {
  console.log('\n--- Hunt Analyzer x historico diario (ALTA: "Limpar sessao" do jogo apagava o gold do dia) ---');
  {
    const h = HIST(), m = mundo();
    m.msg({ type: 'pokes', list: [] });
    m.msg({ type: 'field-init', slug: 'kabutops' });
    let k = 0;
    const passo = (bal, sec, extra) => { for (let j = 0; j < 5; j++) { m.tick(6000); m.msg({ type: 'field-kill', xpGained: 100, loot: [] }); k++; } m.msg(Object.assign({ type: 'analyzer', seconds: sec, kills: k, balance: bal, drops: [] }, extra || {})); h.accumHist(0, m.run(READ_ALERTS)); };
    passo(0, 30);
    for (let t = 1; t <= 60; t++) passo(t * 20000, 30 + t * 30); // 30 min: o analyzer chega a 1,2M
    const antes = h.hoje().g;
    ok(antes === 1200000, 'farmando 30 min com o analyzer: Hoje soma 1.200.000 (' + antes + ')');
    k = 0; passo(5000, 10); // Limpar sessao (analyzer-clear) no Hunt Analyzer do jogo: o servidor zera, os kills do coletor seguem
    ok(h.hoje().g === antes + 5000, 'depois do Limpar sessao o gold de Hoje continua e soma so o novo (' + h.hoje().g + ', antes ' + antes + ')');
    passo(9000, 40);
    ok(h.hoje().g === antes + 9000, 'e segue contando a partir dali (' + h.hoje().g + ')');
    // Zerar do proprio app: o RESET_SESS guarda o analyzer como base e manda analyzer-clear; o servidor zera logo depois
    const g1 = h.hoje().g;
    m.run(RESET_SESS);
    h.accumHist(0, m.run(READ_ALERTS)); // o analyzer velho ainda esta no ws
    m.msg({ type: 'analyzer', seconds: 0, kills: 0, balance: 0, drops: [] }); // zerado, ainda sem segundos
    h.accumHist(0, m.run(READ_ALERTS));
    m.msg({ type: 'analyzer', seconds: 12, kills: 2, balance: 700, drops: [] });
    h.accumHist(0, m.run(READ_ALERTS));
    m.msg({ type: 'analyzer', seconds: 18, kills: 3, balance: 1000, drops: [] });
    h.accumHist(0, m.run(READ_ALERTS));
    ok(h.hoje().g >= g1 + 300 && h.hoje().g <= g1 + 1000, 'Zerar do app tambem nao desconta o dia (' + h.hoje().g + ', antes ' + g1 + ')');
  }

  console.log('\n--- abrir o app com a conta ha dias na mesma hunt: o saldo inteiro do analyzer nao entra em Hoje ---');
  {
    const h = HIST(), m = mundo();
    h.accumHist(0, m.run(READ_ALERTS)); // /login: sem analyzer, saldo local 0
    m.msg({ type: 'pokes', list: [] });
    for (let j = 0; j < 4; j++) m.msg({ type: 'field-kill', xpGained: 200, loot: [] });
    h.accumHist(0, m.run(READ_ALERTS)); // farmando, analyzer ainda nao chegou
    m.msg({ type: 'analyzer', seconds: 3 * 86400, kills: 90000, balance: 4500000, xpGained: 9e7, drops: [] }); // o poll respondeu
    m.msg({ type: 'field-kill', xpGained: 200, loot: [] });
    h.accumHist(0, m.run(READ_ALERTS));
    ok(h.hoje().g === 0, 'a amostra que troca a fonte do saldo (local -> analyzer) vira base: Hoje fica em 0, nao 4,5M (' + h.hoje().g + ')');
    m.msg({ type: 'analyzer', seconds: 3 * 86400 + 6, kills: 90003, balance: 4503000, xpGained: 9e7, drops: [] });
    h.accumHist(0, m.run(READ_ALERTS));
    ok(h.hoje().g === 3000, 'dali em diante entra so o que o analyzer andou (' + h.hoje().g + ')');
    ok(h.hoje().kl === 5 && h.hoje().x === 1000, 'kills e XP seguem pelo coletor (' + h.hoje().kl + ' kills, ' + h.hoje().x + ' XP)');
  }

  console.log('\n--- reload do painel: a sessao re-semeada nao soma o loot inteiro de novo em Hoje (MEDIA) ---');
  {
    const items = { items: [{ id: 1, name: 'Dome Fossil', npcPrice: 1000 }] };
    const h = HIST(), A = mundo({ '/game/items.json': items });
    await A.busca('/game/items.json');
    A.msg({ type: 'pokes', list: [] });
    A.msg({ type: 'field-init', slug: 'kabutops' });
    let sec = 0, bal = 0, k = 0;
    const kill = (M) => { M.msg({ type: 'field-kill', xpGained: 100, loot: [{ itemId: 1, name: 'Dome Fossil', qty: 1 }] }); k++; bal += 1000; };
    const an = (M) => M.msg({ type: 'analyzer', seconds: sec, kills: k, balance: bal, drops: [] });
    for (let t = 0; t < 100; t++) { A.tick(6000); sec += 6; kill(A); if (t % 5 === 0) an(A); h.accumHist(0, A.run(READ_ALERTS)); } // 10 min com o Hunt Analyzer
    const antes = h.hoje().g;
    ok(antes >= bal - 6000 && antes <= bal, 'farmando com o analyzer: Hoje acompanha o gold (' + antes + ' de ' + bal + ')');
    // reload (botao, vigia de 60 s, idioma, WebGL): o dom-ready re-semeia o coletor novo com a foto do vigia (sessSnap)
    const r0 = A.run(READ_ALERTS);
    const B = mundo({ '/game/items.json': items }, { s: r0.sess, slug: r0.slug, cl: r0.catchLog, sl: r0.shinyLog, ab: r0.anBase });
    ok(B.run('window.__poke.sess.kills') === k, 'o coletor novo volta com os ' + k + ' kills da sessao (os drops dela junto)');
    const r1 = B.run(READ_ALERTS); // 1o tique: o jogo ainda nao buscou o items.json (useEffect da tela /play) nem mandou o analyzer
    ok(r1.srv === 2 && r1.saldo === 0, 'antes do catalogo o saldo local e fonte propria (srv ' + r1.srv + ', saldo ' + r1.saldo + ')');
    h.accumHist(0, r1);
    await B.busca('/game/items.json'); // agora o loot re-semeado vale 100 mil
    B.msg({ type: 'pokes', list: [] });
    B.msg({ type: 'field-init', slug: 'kabutops' });
    B.tick(6000); sec += 6; kill(B); h.accumHist(0, B.run(READ_ALERTS));
    ok(h.hoje().g - antes <= 1000, 'o catalogo chegou: o loot da sessao inteira nao entra de novo (Hoje +' + (h.hoje().g - antes) + ', antes do conserto +' + (k * 1000) + ')');
    B.tick(3000); sec += 3; an(B); h.accumHist(0, B.run(READ_ALERTS)); // o poll traz o analyzer (o servidor nao zerou)
    for (let t = 0; t < 5; t++) { B.tick(6000); sec += 6; kill(B); an(B); h.accumHist(0, B.run(READ_ALERTS)); }
    ok(h.hoje().g <= bal && h.hoje().g >= bal - 12000, 'depois do reload Hoje segue o gold real, menos a janela do reload (' + h.hoje().g + ' de ' + bal + ')');
  }

  console.log('\n--- troca de hunt: o analyzer da hunt anterior nao vira a medida da nova ---');
  {
    const h = HIST(), m = mundo();
    m.msg({ type: 'pokes', list: [] });
    m.msg({ type: 'field-init', slug: 'kabutops' });
    for (let j = 0; j < 3; j++) m.msg({ type: 'field-kill', xpGained: 100, loot: [] });
    m.msg({ type: 'analyzer', seconds: 1800, kills: 200, balance: 900000, xpGained: 600000, drops: [] });
    h.accumHist(0, m.run(READ_ALERTS));
    m.msg({ type: 'field-kill', xpGained: 100, loot: [] });
    m.msg({ type: 'analyzer', seconds: 1806, kills: 201, balance: 910000, xpGained: 600100, drops: [] });
    h.accumHist(0, m.run(READ_ALERTS));
    const nEnv = m.sent.length;
    m.msg({ type: 'field-init', slug: 'geodude' });
    ok(m.sent.slice(nEnv).some((x) => x.type === 'analyzer-get'), 'o coletor pede o analyzer novo na hora da troca');
    const d = m.run(READ_STATE);
    ok(d.hunt === 'Geodude' && d.a && d.a.srv !== 1 && d.a.seconds < 60 && d.a.kills === 0, 'logo apos a troca a hunt nova nao herda o analyzer da Kabutops (srv=' + (d.a && d.a.srv) + ', ' + (d.a && d.a.seconds) + ' s, ' + (d.a && d.a.kills) + ' kills)');
    m.msg({ type: 'analyzer', seconds: 5, kills: 1, balance: 100, xpGained: 50, drops: [] }); // o servidor zerou ao trocar de hunt
    const d2 = m.run(READ_STATE);
    ok(d2.a.srv === 1 && d2.a.seconds === 5 && d2.a.balance === 100, 'o analyzer que chega depois da troca e o da Geodude e passa a valer');
    m.msg({ type: 'field-kill', xpGained: 100, loot: [] });
    h.accumHist(0, m.run(READ_ALERTS));
    ok(h.hoje().g === 10100, 'Hoje: 10.000 da Kabutops + 100 da Geodude (' + h.hoje().g + ')');
  }

  console.log('\n--- Rare Pokemon Picture: o analyzer manda as fotos fora do balance ---');
  {
    const h = HIST(), m = mundo({ '/game/items.json': { items: [{ id: 59195, name: 'Rare Pokémon Picture', npcPrice: 20000 }] } });
    await m.busca('/game/items.json');
    m.msg({ type: 'pokes', list: [] });
    m.msg({ type: 'field-init', slug: 'kabutops' });
    m.msg({ type: 'analyzer', seconds: 3600, kills: 100, balance: 50000, lootGold: 70000, supplyGold: 20000, photos: 3, photoNpcGold: 20000, photoMarketAvg: 35000, drops: [{ itemId: 1, name: 'Dome Fossil', qty: 10, gold: 70000 }] });
    const a = m.run(READ_STATE).a;
    ok(a.balance === 110000 && a.gph === 110000, 'saldo e gold/h somam as 3 fotos a preco de NPC, como o Hunt Analyzer do jogo (saldo ' + a.balance + ', gold/h ' + a.gph + ')');
    ok(a.lootGold === 130000, 'o loot tambem inclui as fotos, entao loot - supply = saldo (' + a.lootGold + ')');
    const ft = a.drops.find((x) => /Picture/.test(x.name));
    ok(ft && ft.qty === 3 && ft.gold === 60000 && a.drops.every((x, k) => !k || a.drops[k - 1].gold >= x.gold), 'a foto aparece nos drops, na ordem do gold (' + JSON.stringify(ft) + ')');
    h.accumHist(0, m.run(READ_ALERTS));
    m.msg({ type: 'analyzer', seconds: 3606, kills: 101, balance: 50500, photos: 4, photoNpcGold: 20000, drops: [] });
    h.accumHist(0, m.run(READ_ALERTS));
    ok(h.hoje().g === 20500, 'Hoje ganha a foto nova junto com o balance (' + h.hoje().g + ')');
    m.run(RESET_SESS); // Zerar do app: o analyzer atual vira base
    const b0 = m.run(READ_STATE).a;
    ok(b0.balance === 0 && !b0.drops.some((x) => /Picture/.test(x.name)), 'depois do Zerar do app as fotos antigas saem da conta (saldo ' + b0.balance + ')');
    m.msg({ type: 'analyzer', seconds: 3700, kills: 110, balance: 51500, photos: 5, photoNpcGold: 20000, drops: [] });
    ok(m.run(READ_STATE).a.balance === 21000, 'e so a foto nova entra no saldo da sessao zerada (' + m.run(READ_STATE).a.balance + ')');
  }

  console.log('\n--- shiny capturado conta uma vez e o webhook nao chama de perdido ---');
  {
    const m = mundo();
    m.msg({ type: 'pokes', list: [{ id: 1, team: true, hp: 100, level: 50 }] });
    m.msg({ type: 'field-init', slug: 'rattata' });
    m.msg({ type: 'field-kill', xpGained: 10, loot: [], shiny: true, speciesId: 19, speciesName: 'Rattata' });
    m.tick(3000);
    m.msg({ type: 'poke-delta', poke: { id: 50, name: 'Rattata', speciesId: 19, shiny: true, team: false, hp: 30, sellValue: 100 } });
    let r = m.run(READ_ALERTS);
    ok(r.shinyN === 1 && r.shinyCapN === 1, '1 shiny derrotado e capturado = 1 visto, 1 capturado (' + r.shinyN + '/' + r.shinyCapN + ')');
    m.tick(60000);
    m.msg({ type: 'field-kill', xpGained: 10, loot: [], shiny: true, speciesId: 19, speciesName: 'Rattata' });
    m.tick(2000);
    m.msg({ type: 'pokes', list: [{ id: 1, team: true, hp: 100 }, { id: 50, shiny: true, speciesId: 19 }, { id: 51, name: 'Rattata', speciesId: 19, shiny: true, team: false, sellValue: 100 }] });
    r = m.run(READ_ALERTS);
    const a = m.run(READ_STATE).a;
    ok(r.shinyN === 2 && r.shinyCapN === 2 && a.shinyFound === 2 && a.shinyCap === 2, 'captura que chega pela lista completa (pokes) tambem nao conta o shiny de novo (' + r.shinyN + '/' + r.shinyCapN + ')');
    // mergeLogs REAL: o que vai pro webhook
    const I18N = new Function('lsGet', corta('  const I18N = {', '\n  const t = (k)') + '\nreturn I18N;')(() => null);
    const txt = [];
    const ML = new Function('t', 'webhookSend', 'festaShiny', 'alerta', 'lsSet', 'let lifeShiny = [], lifeCatch = []; const tabNames = [], ACOR = [], whCfg = { shiny: 1 }, alertsOn = true; const stName = () => "Conta";\n'
      + corta('  const kSh = ', '\n  // ----- Farm parado') + '\nreturn mergeLogs;')((k) => I18N.pt[k], (x) => txt.push(x), () => {}, () => {}, () => {});
    ML(0, { shinyLog: [] }); // 1o merge e backfill silencioso
    ML(0, r);
    ok(txt.length === 4 && txt.filter((x) => /CAPTURADO/.test(x)).length === 2, 'webhook: 2 avisos de aparicao e 2 de CAPTURADO (' + txt.length + ')');
    ok(!txt.some((x) => /perdido|lost|✕/.test(x)), 'nenhum aviso chama de "perdido" o shiny que ainda vai levar bola: ' + JSON.stringify(txt[0]));
    ok(['pt', 'en', 'es'].every((L) => I18N[L].whSeen && !/—/.test(I18N[L].whSeen)), 'o texto novo existe nos 3 idiomas');
  }

  console.log('\n--- shiny que entra na caixa sem field-kill (cria, Mercado, troca) nao esconde o shiny perdido (baixa) ---');
  {
    const cena = (fn) => { const m = mundo(); m.msg({ type: 'pokes', list: [{ id: 1, team: true, hp: 100 }] }); m.msg({ type: 'field-init', slug: 'rattata' }); fn(m); const r = m.run(READ_ALERTS); return [r.shinyN, r.shinyCapN]; };
    const kill = (m) => m.msg({ type: 'field-kill', xpGained: 1, loot: [], shiny: true, speciesId: 19, speciesName: 'Rattata' });
    const entra = (m, id) => m.msg({ type: 'poke-delta', poke: { id, name: 'Shiny Eevee', speciesId: 133, shiny: true, team: false, sellValue: 500 } });
    let v = cena((m) => { kill(m); m.tick(3000); m.msg({ type: 'poke-delta', poke: { id: 5, name: 'Rattata', speciesId: 19, shiny: true, team: false } }); });
    ok(v.join('/') === '1/1', 'derrotou e capturou: 1 visto, 1 capturado, 0 perdido (' + v.join('/') + ')');
    v = cena((m) => { kill(m); m.tick(120000); entra(m, 77); });
    ok(v.join('/') === '2/1', 'o shiny derrotado fugiu e depois nasceu um na cria: 2 vistos, 1 capturado, 1 perdido (' + v.join('/') + '; antes 1/1, sem perdido)');
    v = cena((m) => { entra(m, 78); });
    ok(v.join('/') === '1/1', 'so o da cria: 1 visto, 1 capturado (' + v.join('/') + ')');
    v = cena((m) => { kill(m); m.tick(60000); kill(m); m.tick(2000); m.msg({ type: 'pokes', list: [{ id: 1, team: true, hp: 100 }, { id: 60, name: 'Rattata', speciesId: 19, shiny: true, team: false }] }); });
    ok(v.join('/') === '2/1', 'dois derrotados e um capturado pela lista completa: 1 perdido (' + v.join('/') + ')');
  }

  console.log('\n--- bolas usadas: total (nunca zera) x attempts (zera ao capturar) e o caught do jogo ---');
  {
    const lista = (att, tot) => ({ caught: [19, 16], pokemons: [
      { dexId: 16, speciesId: 16, name: 'Pidgey', shiny: false, attempts: 0, total: 40 },
      { dexId: 19, speciesId: 19, name: 'Rattata', shiny: false, attempts: 3, total: 10 },
      { dexId: 19, speciesId: 19, name: 'Shiny Rattata', shiny: true, attempts: att, total: tot },
      { dexId: 21, speciesId: 21, name: 'Spearow', shiny: false, attempts: 4, total: 4 },
      { dexId: 21, speciesId: 21, name: 'Shiny Spearow', shiny: true, attempts: 7, total: 7 }] });
    const m = mundo();
    m.api['/api/game/used-balls'] = lista(55, 55);
    await m.busca('/api/game/used-balls');
    const UL = m.P().usedList;
    const cg = (nm) => (UL.find((u) => u.name === nm) || {}).caught;
    ok(cg('Rattata') === true && cg('Pidgey') === true && cg('Spearow') === false, 'forma normal: capturado vem da lista caught do topo da resposta (por dexId)');
    ok(cg('Shiny Rattata') === false && cg('Shiny Spearow') === false, 'shiny nao herda o caught da forma normal (Rattata normal capturado, shiny nao)');
    ok(m.P().shinyEnc === 62, 'shinyEnc soma o total das linhas shiny (55 + 7 = ' + m.P().shinyEnc + ')');
    m.api['/api/game/used-balls'] = lista(0, 56); // capturou o Rattata shiny na 56a bola
    await m.busca('/api/game/used-balls');
    ok(m.P().usedList.find((u) => u.name === 'Shiny Rattata').caught === true, 'shiny capturado: total > attempts marca caught');
    ok(m.P().shinyEnc === 63, 'e o shinyEnc nao cai na captura (' + m.P().shinyEnc + ')');
    // 🎯 Alvo shiny do 📊 Painel REAL (B.target): depois da captura mostra o total de bolas, nao o attempts zerado
    const alvo = new Function('cfg', 'sec', 'row', 't', 'nf', 'esc', 'ballIco', 'return (' + corta('    target: (d) => {', '\n    },').slice('    target: '.length) + '\n    });')(
      { shinyTarget: { id: 19, name: 'Rattata' } }, (c, x) => '[' + x + ']', (k, v) => '<' + k + '=' + v + '>', (k) => k, (v) => String(v), (v) => String(v), '*');
    const tg = alvo({ usedList: m.P().usedList });
    ok(/<stTargetStatus=✓ stCaught>/.test(tg) && /<stTargetShinyTries=56>/.test(tg), 'o 🎯 Alvo shiny do Painel mostra ✓ capturado com as 56 bolas (' + tg + ')');
    // fx (primeira captura da especie) usa esse caught
    m.msg({ type: 'pokes', list: [] });
    m.msg({ type: 'poke-delta', poke: { id: 7, name: 'Rattata', speciesId: 19, shiny: false, team: false } });
    m.msg({ type: 'poke-delta', poke: { id: 8, name: 'Spearow', speciesId: 21, shiny: false, team: false } });
    const cl = m.P().catchLog;
    ok(cl.length === 2 && cl[0].fx === false && cl[1].fx === true, 'so a especie ainda nao capturada ganha o 🆕 (Rattata ' + cl[0].fx + ', Spearow ' + cl[1].fx + ')');

    // Simples REAL: card "Shinies tentados"
    const bloco = corta('      (d.usedList || []).forEach(x => {', '      rows.push({ i, dot,');
    const simples = new Function('d', 'i', 'dot', 'utBase', 'shinyTried', bloco);
    const utBase = [];
    const le = (att, tot) => { const st = {}; simples({ usedList: m.run('(' + JSON.stringify(lista(att, tot).pokemons) + ')').map((p) => ({ sid: p.speciesId, name: p.name, shiny: p.shiny, attempts: p.attempts, total: p.total })) }, 0, '#fff', utBase, st); return st[19]; };
    le(50, 50);
    let e = le(55, 55);
    ok(e && e.total === 55 && e.sess === 5, 'antes de capturar: total 55, sessao 5 (' + JSON.stringify(e && [e.total, e.sess]) + ')');
    e = le(0, 56);
    ok(e && e.total === 56 && e.sess === 6, 'na captura (attempts zera) o Rattata continua no card: total 56, sessao 6 (' + JSON.stringify(e && [e.total, e.sess]) + ')');
    e = le(30, 86);
    ok(e && e.total === 86 && e.sess === 36, 'mais 30 bolas no proximo: total 86, sessao 36 (' + JSON.stringify(e && [e.total, e.sess]) + ')');
  }

  console.log('\n--- stSane nao corta o usedList em 120 linhas ---');
  {
    const stSane = new Function(corta('  function stSane(d) {', '\n  const ecoBtn') + '\nreturn stSane;')();
    const ul = []; for (let n = 1; n <= 250; n++) { ul.push({ sid: n, name: 'P' + n, shiny: false, attempts: 1, total: 1 }); ul.push({ sid: n, name: 'Shiny P' + n + 'x'.repeat(200), shiny: true, attempts: 2, total: 2 }); }
    const d = stSane({ ok: true, usedList: ul, catchLog: new Array(300).fill({ n: 'a' }) });
    ok(d.usedList.length === 500 && d.usedList[499].sid === 250, 'as 500 linhas chegam ao Simples (' + d.usedList.length + ')');
    ok(d.usedList[1].name.length === 80 && d.catchLog.length === 120, 'o corte das strings (80) e das outras listas (120) continua');
  }

  console.log('\n--- barra de EXP do time: curva do jogo acima do Lv150 ---');
  {
    const G = new Function(fs.readFileSync(path.join(__dirname, 'fixtures', 'xp-curva-2026-09-24.js.txt'), 'utf8') + '\nreturn { u, S };')();
    const niveis = [2, 50, 100, 149, 150, 151, 155, 160, 200, 249, 250, 251, 300, 1000], frac = [0.3, 0.01, 0.97];
    const list = [];
    niveis.forEach((L, n) => frac.forEach((f, q) => { const xp = Math.floor(G.u(L) + f * (G.u(L + 1) - G.u(L))); list.push({ id: n * 10 + q, team: true, slot: list.length, name: 'Lv' + L, level: L, xp, hp: 1, maxHp: 1 }); }));
    const m = mundo();
    m.msg({ type: 'pokes', list });
    const team = m.run(READ_STATE).team;
    const erros = [];
    team.forEach((p, n) => { const g = G.S(list[n].xp), esp = Math.round(g.cur / g.max * 100); if (g.level !== list[n].level || p.xpp !== esp) erros.push(p.name + ': app ' + p.xpp + ' / jogo ' + esp); });
    ok(team.length === list.length && !erros.length, 'xpp igual ao levelProgress do jogo em ' + list.length + ' casos do Lv2 ao Lv1000' + (erros.length ? ' | ' + erros.slice(0, 4).join('; ') : ''));
  }

  console.log('\n--- troca de conta pelo Sair do jogo: a caixa da conta nova nao vira captura ---');
  {
    const m = mundo({ '/api/characters/me': { character: { id: 'c1', name: 'A' } } });
    await m.busca('/api/characters/me');
    m.msg({ type: 'pokes', list: [{ id: 1, team: true, hp: 10 }, { id: 2 }] });
    m.api['/api/characters/me'] = { character: { id: 'c2', name: 'B' } };
    await m.busca('/api/characters/me');
    m.run(RESET_SESS);
    const caixa = []; for (let n = 0; n < 40; n++) caixa.push({ id: 100 + n, name: 'X', speciesId: 10, shiny: n < 4, sellValue: 900, team: n === 0, hp: 5 });
    m.msg({ type: 'pokes', list: caixa });
    const r = m.run(READ_ALERTS);
    ok(r.shinyCapN === 0 && !r.catchLog.length && !r.sess.sellG && !r.shinyLog.length, 'caixa da conta nova vira base silenciosa (' + r.catchLog.length + ' capturas, ' + r.shinyCapN + ' shinies)');
    m.msg({ type: 'poke-delta', poke: { id: 500, name: 'Y', speciesId: 11, team: false, sellValue: 50 } });
    ok(m.run(READ_ALERTS).catchLog.length === 1, 'e a captura seguinte conta normal');
  }

  console.log('\n--- troca de conta no painel: Hoje nao recebe o saldo do analyzer da conta nova (baixa) ---');
  {
    // o ramo REAL do vigia que ve o cid novo (index.html: 'trocou de conta no painel')
    const mt = /delete sessSnap\[i\]; w\.executeJavaScript\((RESET_SESS(?: \+ '[^']*')?)\)\.catch/.exec(s);
    const TROCA = eval(mt[1]);
    const h = HIST(), snap = {};
    const tique = (M) => { const r = M.run(READ_ALERTS); if (r.live && r.sess && r.sess.start) { if (r.cid && snap.cid && snap.cid !== r.cid) { snap.cid = ''; M.run(TROCA); return; } snap.cid = r.cid || snap.cid; } h.accumHist(0, r); };
    const m = mundo({ '/api/characters/me': { character: { id: 'c1', name: 'A' } } });
    await m.busca('/api/characters/me');
    m.msg({ type: 'pokes', list: [] });
    m.msg({ type: 'field-init', slug: 'kabutops' });
    let sec = 7000, bal = 3000000;
    for (let t = 0; t < 20; t++) { m.tick(6000); sec += 6; bal += 1000; m.msg({ type: 'field-kill', xpGained: 10, loot: [] }); m.msg({ type: 'analyzer', seconds: sec, kills: 100 + t, balance: bal, drops: [] }); tique(m); }
    const g0 = h.hoje().g;
    // Sair do jogo e entra na conta B pela SPA: o field-init da hunt da B pede o analyzer e ele chega antes do tique
    m.api['/api/characters/me'] = { character: { id: 'c2', name: 'B' } };
    await m.busca('/api/characters/me');
    m.msg({ type: 'field-init', slug: 'geodude' });
    m.msg({ type: 'analyzer', seconds: 3600, kills: 900, balance: 1500000, drops: [] }); // o analyzer de 1 h da conta B
    m.tick(6000); tique(m); // o tique ve o cid novo: zera a sessao e manda analyzer-clear
    ok(m.sent.some((x) => x.type === 'analyzer-clear') && m.run('window.__poke.ws.analyzer') === null, 'na troca o app zera a sessao e descarta o analyzer guardado (da conta B antes do clear)');
    m.tick(6000); tique(m);
    m.msg({ type: 'analyzer', seconds: 20, kills: 2, balance: 2000, drops: [] }); // o servidor respondeu ao clear
    m.tick(6000); tique(m);
    m.msg({ type: 'analyzer', seconds: 26, kills: 3, balance: 3000, drops: [] });
    m.tick(6000); tique(m);
    const entrou = h.hoje().g - g0;
    ok(entrou >= 0 && entrou <= 3000, 'Hoje ganha so o que a conta B farmou depois da troca (+' + entrou + '; antes entrava o 1,5M do analyzer dela)');
  }

  console.log('\n--- saiu pra cidade: a hunt some do Painel ---');
  {
    const m = mundo();
    m.msg({ type: 'field-init', slug: 'nightmare_scizor' });
    ok(m.run(READ_STATE).hunt === 'Nightmare Scizor', 'na hunt: Nightmare Scizor');
    m.msg({ type: 'field-none', slug: 'nightmare_scizor' });
    ok(m.run(READ_STATE).hunt === '', 'field-none: sem hunt (o amostrador de hunts para)');
    m.msg({ type: 'field-init', slug: 'nightmare_scizor' });
    m.msg({ type: 'field-teleport-city' });
    ok(m.run(READ_STATE).hunt === '', 'time desmaiou e foi pra cidade (field-teleport-city): sem hunt');
  }

  console.log('\n--- DEP_JS le o depot pessoal pelo id ---');
  {
    const r = await new Function('fetch', 'window', 'return ' + DEP_JS)(async () => ({ ok: true, json: async () => ({ inventory: [{ id: 9, quantity: 1 }], depot: [{ id: 5, name: 'Potion', quantity: 3 }, { id: 5, quantity: 2 }, { itemId: 7, quantity: 4 }, { id: 8, quantity: 0 }] }) }), {});
    ok(r && r[5] === 5 && r[7] === 4 && !(8 in r) && !(9 in r), 'depot com id soma (e itemId continua valendo): ' + JSON.stringify(r));
  }

  console.log('\n--- S.hp guarda so o time (ia inteiro no READ_ALERTS a cada 6 s) ---');
  {
    const m = mundo();
    m.msg({ type: 'pokes', list: [{ id: 1, team: true, hp: 50 }, { id: 2, team: false, hp: 10 }, { id: 3, team: true, hp: 40 }] });
    for (let n = 0; n < 300; n++) m.msg({ type: 'poke-delta', poke: { id: 1000 + n, team: false, hp: 20 } });
    m.msg({ type: 'poke-delta', poke: { id: 1, team: true, hp: 0 } });
    const S = m.P().sess;
    ok(Object.keys(S.hp).length === 2 && S.faintN === 1, 'hp so do time (' + Object.keys(S.hp).length + ' chaves) e o desmaio continua contando (' + S.faintN + ')');
    m.msg({ type: 'poke-delta', poke: { id: 3, team: false, hp: 40 } });
    ok(!(3 in m.P().sess.hp), 'saiu do time: sai do hp');
  }

  console.log('\n--- Resumo Σ: bola infinita aparece como ∞ ---');
  {
    const aggCard = new Function('nc', 'ncs', 'nf', 'esc', 't', corta('  function aggCard(', '\n  const a4c') + '\nreturn aggCard;')((v) => String(v), (v) => String(v), (v) => String(v), (v) => String(v), (k) => ({ stBalls: 'bolas' })[k] || k); // 'bolas' passa pelo t() desde o lote C
    const html = aggCard('#fff', 'A', { ok: true, a: null, balls: 999999, potions: 1, revives: 1 });
    ok(/∞ bolas/.test(html) && !/999999 bolas/.test(html), 'cartao da conta: ∞ bolas');
    ok(/250 bolas/.test(aggCard('#fff', 'A', { ok: true, a: null, balls: 250 })), 'conta sem infinita mostra o numero');
    const ra = corta('  async function renderAggregate() {', '\n  async function refreshStats()');
    ok(/\(d\.balls \|\| 0\) >= 999999\) ballsInf = true; else balls \+= d\.balls/.test(ra) && /ballsInf \? '∞' : nc\(balls\)/.test(ra), 'total de Pokebolas do Σ nao soma o 999999 (>= e else no laco) e mostra ∞');
  }

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('ERRO', e.stack); process.exit(1); });
