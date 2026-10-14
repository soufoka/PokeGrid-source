// Onde cacar (era o chip Hunts por tipo da Tierlist): o Tipo do Dia do jogo da bonus de XP e de drop ao derrotar pokemon de
// um tipo, e muda todo dia. Escolhe o elemento e o nivel: lista as hunts com selvagem do tipo (1o ou 2o tipo) ate o nivel,
// a melhor em destaque, cada uma com o melhor atacante (avaliado no nivel escolhido) e o melhor do time das contas ligadas.
// Roda o HUNTS_JS, o sugCalc e o bloco da tierlist REAIS com a fixture de 17/09 e o loot de 19/09, e a janela com o <script>
// inteiro numa janela falsa.
// Roda com: node test/hunts-por-tipo.test.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const raiz = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
const L = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'loot-2026-09-19.json.gz'))).toString('utf8'));
const M = require(path.join(raiz, 'src', 'domain', 'iv-math.js'));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const re = /<script>([\s\S]*?)<\/script>/g; let mm, b = '';
while ((mm = re.exec(s))) { if (mm[1].length > b.length) b = mm[1]; }
const entre = (a, fim) => { const i = b.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 40)); const j = b.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 40)); return b.slice(i, j); };

// janela do app com DOM falso (o molde do bh5-telas): exec responde os paineis, tos guarda os setTimeout (o teste roda na
// hora certa) e o querySelectorAll('button[data-oc]') devolve os chips desenhados, pro teste clicar num elemento
function monta(code, opts) {
  let document;
  const store = new Map(Object.entries(opts.ls || {})), byId = new Map();
  class CL { constructor() { this.s = new Set(); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag, id) { this.tagName = String(tag || 'div').toUpperCase(); this.id = id || ''; this.style = { setProperty() {} }; this.classList = new CL(); this.dataset = {}; this.children = []; this._h = ''; this._t = ''; this.value = ''; this.checked = false; this.title = ''; this.options = [{}, {}]; this.childElementCount = 0; this.offsetHeight = 40; this.scrollTop = 0; this.ev = {}; this._btns = []; }
    get innerHTML() { return this._h; } set innerHTML(h) { this._h = String(h); this.children = []; this._btns = [...this._h.matchAll(/data-oc="([A-Z]+)"/g)].map((m) => ({ dataset: { oc: m[1] } })); }
    get textContent() { return this._t; } set textContent(v) { this._t = String(v); this.children = []; }
    get firstChild() { return this._h ? {} : null; }
    get outerHTML() { return ''; } set outerHTML(v) {}
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } removeEventListener() {}
    querySelector(q) { this._q = this._q || {}; return this._q[q] || (this._q[q] = new El('div')); }
    querySelectorAll(q) { return q === 'button[data-oc]' ? this._btns : []; }
    appendChild(c) { this.children.push(c); this.childElementCount = this.children.length; return c; }
    remove() {} setAttribute() {} getAttribute() { return null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; }
    focus() { document.activeElement = this; } blur() { if (document.activeElement === this) document.activeElement = null; } select() {}
    click() { if (this.onclick) this.onclick({ target: this, stopPropagation() {} }); }
    contains(x) { return x === this; } closest() { return null; }
  }
  class WV extends El {
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; }
    executeJavaScript(c) { return opts.exec ? opts.exec(String(c), this) : Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() {} reloadIgnoringCache() {} loadURL() { return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid');
  document = {
    getElementById: (id) => { if (id === 'grid') return grid; if (!byId.has(id)) byId.set(id, new El(id === 'tlLevel' || id === 'tlTm' || /^sc(Url|Name)$/.test(id) ? 'input' : 'div', id)); return byId.get(id); },
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: () => [],
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, appVersion: '1.5.38' },
    PokeGridIvMath: M
  };
  const exporta = '\n;return { stCache, stSane, webviews, tipoDoDia };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, { reload() {} }, noop, noop, (f) => { opts.tos.push(f); return 1; }, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  return Object.assign(api, { byId, store, escolheTipo: (ty) => { const c = byId.get('ocCtl')._btns.find((x) => x.dataset.oc === ty); c.onclick(); } });
}

(async () => {
  const cria = J.creatures.map((c) => Object.assign({}, c, { loot: (L.loot[c.name.toLowerCase()] || []).map(([name, chance, minCount, maxCount]) => ({ name, chance, minCount, maxCount })) }));
  const itens = { items: L.items.map(([name, npcPrice]) => ({ name, npcPrice })) };
  const i0 = s.indexOf('const HUNTS_JS'); const ini = s.indexOf('`', i0) + 1;
  const huntsSrc = eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`');
  const R = await new Function('fetch', 'return ' + huntsSrc)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : u.indexOf('items') >= 0 ? itens : { creatures: cria }) }));
  const seen = {}; const lista = R.h.filter((x) => !seen[x.name + '@' + x.level] && (seen[x.name + '@' + x.level] = 1));
  let api;
  try {
    const blocoSug = b.slice(b.indexOf('  const CHART = '), b.indexOf('\n  };', b.indexOf('const sugCalc = (A, x) => {')) + 5).replace("let huntPkSel = String(lsGet('cdHuntPk') || '');", '');
    const blocoDitto = entre('  const dittoCache = new Map();', '  let huntsCache = null');
    const blocoTier = entre('  function tierCalc(nivel, comTm, obj) {', '  const tlNameId = ');
    api = new Function('window', 'R', 'lista',
      'let basesByName = R.bs, movesByName = R.mv, creaturesById = R.byId, huntsCache = lista, huntsCacheT = 1, tlCache = null, huntStats = {};\n'
      + blocoSug + '\n' + blocoDitto + '\n' + blocoTier + '\nreturn { sugCalc, huntsDoTipo, melhorMeu, mv: movesByName, bs: basesByName };')({ PokeGridIvMath: M }, R, lista);
    ok(true, 'huntsDoTipo e melhorMeu rodam com o sugCalc real');
  } catch (e) { ok(false, 'extrair do index.html: ' + e.message); console.log('\nFALHOU'); process.exit(1); }
  const val = (sg, x, obj) => obj === 'gold' ? sg.kh * (+x.gk || 0) : (sg.xph || sg.ritmo);

  console.log('\n--- o tipo e o do SELVAGEM, e so hunt que o nivel alcanca ---');
  const agua = api.huntsDoTipo('WATER', 300, false, 'xp');
  ok(agua.length >= 10, agua.length + ' hunts de agua ate o 300 (1a: ' + (agua[0] && agua[0].x.name + ' Lv' + agua[0].x.level + ', use ' + agua[0].sp) + ')');
  ok(agua.every((r) => (r.x.t1 === 'WATER' || r.x.t2 === 'WATER') && !((+r.x.level || 0) > 300)), 'toda linha tem selvagem de agua (1o ou 2o tipo) e nivel ate 300');
  ok(agua.some((r) => r.x.t2 === 'WATER' && r.x.t1 !== 'WATER'), 'agua como 2o tipo tambem entra (' + (agua.find((r) => r.x.t2 === 'WATER' && r.x.t1 !== 'WATER') || { x: {} }).x.name + ')');
  const chaves = agua.map((r) => r.x.name + '@' + r.x.level);
  ok(new Set(chaves).size === chaves.length, 'cada hunt aparece uma vez');
  ok(agua.every((r, k) => r.sc === val(r.sg, r.x, 'xp') && (!k || agua[k - 1].sc >= r.sc)), 'nota = XP/h do melhor atacante, da maior pra menor');
  const todasAgua = lista.filter((x) => (x.t1 === 'WATER' || x.t2 === 'WATER') && !((+x.level || 0) > 300) && x.sp);
  ok(agua.length <= todasAgua.length && agua.length >= todasAgua.length * 0.8, 'quase toda hunt de agua alcancavel ganha linha (' + agua.length + ' de ' + todasAgua.length + '; fica de fora so a que ninguem farma acima do piso)');

  console.log('\n--- o atacante indicado e mesmo o melhor (conta independente) ---');
  const elegiveis = Object.keys(api.mv).filter((sp) => api.bs[sp] && !((+api.mv[sp].ml || 0) > 300));
  // o indicado e avaliado no nivel escolhido (a pergunta e "qual pokemon usar no nivel Y"), nao no nivel da hunt
  agua.slice(0, 3).concat(agua.slice(-2)).forEach((r) => {
    let melhor = 0;
    elegiveis.forEach((sp) => { const sg = api.sugCalc({ sp, level: 300, q: 1, ivt: 96, tlv: 0, mult: 1, tms: null }, r.x); if (sg && sg.ritmo >= 0.15) melhor = Math.max(melhor, val(sg, r.x, 'xp')); });
    ok(Math.abs(melhor - r.sc) < 1e-6, r.x.name + ' Lv' + r.x.level + ': use ' + r.sp + ' no nivel 300, nenhuma especie alcancavel rende mais (' + Math.round(r.sc) + ' xp/h)');
  });
  const r0 = agua[0], noTime = api.melhorMeu(r0.x, [{ sp: r0.sp, rot: r0.sp, level: 300, q: 1, ivt: 96, tlv: 300, cid: 'a', conta: 'a', tms: null }], 'xp');
  ok(noTime && Math.abs(noTime.sc - r0.sc) < 1e-6, 'o mesmo pokemon no time, no mesmo nivel e com qualidade e IV medios, rende igual ao indicado (antes o time saia rendendo mais)');
  ok(agua.every((r) => !((+api.mv[r.sp].ml || 0) > 300)), 'o atacante indicado e especie que da pra ter no nivel');

  console.log('\n--- gold/h, TM, nivel e cache ---');
  const ouro = api.huntsDoTipo('WATER', 300, false, 'gold');
  ok(ouro.length > 5 && ouro.every((r, k) => Math.abs(r.sc - r.sg.kh * r.x.gk) < 1e-6 && (!k || ouro[k - 1].sc >= r.sc)), 'por gold/h: nota = kills/h x gold por kill, em ordem (1a ' + ouro[0].x.name + ')');
  const baixo = api.huntsDoTipo('WATER', 50, false, 'xp');
  ok(baixo.length > 0 && baixo.length < agua.length && baixo.every((r) => !((+r.x.level || 0) > 50) && !((+api.mv[r.sp].ml || 0) > 50)), 'no nivel 50: so hunt e atacante ate o 50 (' + baixo.length + ' hunts)');
  const tm = api.huntsDoTipo('WATER', 300, true, 'xp');
  ok(tm.length >= agua.length && tm[0].sc >= agua[0].sc, 'com TM o melhor rende pelo menos o mesmo (' + Math.round(tm[0].sc) + ' contra ' + Math.round(agua[0].sc) + ')');
  ok(api.huntsDoTipo('WATER', 300, true, 'xp') === tm, 'mesma escolha devolve o resultado guardado');
  const fogo = api.huntsDoTipo('FIRE', 300, false, 'xp');
  ok(fogo !== agua && fogo.length > 0 && fogo.every((r) => r.x.t1 === 'FIRE' || r.x.t2 === 'FIRE'), 'outro tipo, outra lista (' + fogo.length + ' hunts de fogo)');
  ok(api.huntsDoTipo('XYZ', 300, false, 'xp').length === 0, 'tipo que nao existe: lista vazia, sem quebrar');

  console.log('\n--- o melhor do seu time em cada hunt ---');
  const x = agua[0].x;
  const meu = (sp, level, tlv, conta) => ({ sp, rot: sp, level, q: 1.2, ivt: 120, tlv, cid: conta, conta, tms: null });
  const time = [meu('ditto', 300, 300, 'A'), meu(agua[0].sp, 300, 300, 'B'), meu('pidgey', 20, 300, 'C'), meu(agua[0].sp, 300, 5, 'D')];
  const mb = api.melhorMeu(x, time, 'xp');
  ok(mb && mb.m.conta === 'B', 'escolhe o pokemon que mais rende ali (' + (mb && mb.m.conta + ' ' + mb.m.sp) + ')');
  ok(!api.melhorMeu(x, [time[0]], 'xp'), 'Ditto fica de fora: a forma dele quem escolhe e o painel do Ditto');
  ok(+x.level > 5 ? !api.melhorMeu(x, [time[3]], 'xp') : true, 'conta que ainda nao alcanca a hunt nao entra');
  const mg = api.melhorMeu(x, time, 'gold');
  ok(mg && Math.abs(mg.sc - mg.sg.kh * x.gk) < 1e-6, 'por gold/h, a nota do time tambem e kills/h x gold por kill');

  // 14/10/2026: virou a janela Onde cacar, no topo. O chip ficava escondido na Tierlist, onde os chips de elemento sao do
  // ATACANTE: quem escolhia "electric" ali via os melhores pokemon eletricos, nao onde cacar eletrico.
  console.log('\n--- janela Onde cacar: elemento e nivel -> a hunt e o pokemon ---');
  const tos = [];
  const roda = async () => { for (let k = 0; k < 4; k++) { const v = tos.splice(0); v.forEach((f) => { try { f(); } catch {} }); for (let j = 0; j < 6; j++) await new Promise((r) => setImmediate(r)); } };
  const execs = [];
  const H = monta(b, { ls: { count: '2', tlLevel: '300' }, tos, exec: (c, wv) => { if (c !== huntsSrc) return Promise.resolve(null); execs.push(wv); return Promise.resolve(JSON.parse(JSON.stringify(R))); } });
  for (let j = 0; j < 6; j++) await new Promise((r) => setImmediate(r)); // os paineis nascem no init assincrono (depois do loadCreds)
  const conta = (extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 300, gold: 0, diamonds: 0, a: {}, team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra);
  const agora = Date.now();
  H.stCache[0] = { t: agora, d: H.stSane(conta({ team: [{ name: 'Rhydon', level: 300, q: 1.2, ivt: 120, ld: true }], ev: [{ k: 'evt-x', n: 'Fim de semana de XP', u: agora + 9e6 }, { k: 'td', n: 'Tipo do Dia: Elétrico', u: agora + 4.8e7 }] })) };
  H.webviews[0].__pgSt = 'err'; // o painel 1 na pagina de erro: o catalogo tem que vir do 2
  H.byId.get('ocBtn').onclick(); await roda();
  ok(execs.length && execs.every((w) => w === H.webviews[1]), 'o catalogo de hunts vem do painel que esta no jogo, nao do 1o com erro (antes as calculadoras ficavam esperando pra sempre)');
  const ctl = H.byId.get('ocCtl').innerHTML, corpo = H.byId.get('ocBody').innerHTML;
  ok(/Tipo do Dia no jogo: <b[^>]*>Elétrico<\/b> · termina em 13h 2\dm/.test(ctl), 'mostra o Tipo do Dia que o jogo manda como evento, com o fim');
  ok(/data-oc="ELECTRIC" class="on">Elétrico <span class="oc-hj">· hoje<\/span>/.test(ctl) && />Fogo</.test(ctl) && />Água</.test(ctl) && !/>electric</i.test(ctl.replace(/data-oc="[A-Z]+"/g, '')), 'abre no tipo de hoje, ja marcado, com os nomes em portugues como no jogo');
  const top = (/<div class="oc-top">([\s\S]*?)<\/div><\/div>/.exec(corpo) || [])[1] || '';
  const r1 = api.huntsDoTipo('ELECTRIC', 300, false, 'xp')[0];
  const etq = r1 && ({ orre: 'ORRE', outland: 'OUT', nightmare: 'NIGHTMARE' })[r1.x.ar];
  ok(!!r1 && top.includes('Cace em ' + (etq ? '<b style="color:' : '<b>')) && (!etq || top.includes('>' + etq + '</b> <b>' + r1.x.name + '</b>')) && top.includes('<b>' + r1.x.name + '</b>') && top.includes(' com <b>' + r1.sp.charAt(0).toUpperCase() + r1.sp.slice(1) + '</b>'), 'a resposta em destaque: "Cace em ' + (etq ? etq + ' ' : '') + (r1 && r1.x.name) + ' com ' + (r1 && r1.sp) + '" (a regiao antes do nome, como na lista)');
  ok(/No seu time: <b>Rhydon<\/b> Lv300 \(Ash\)/.test(top) && /no nível 300, com qualidade e IV médios/.test(top), 'e o melhor do seu time ali, e em que nivel o indicado foi avaliado');
  ok(corpo.includes('<div class="oc-h">Outras hunts de Elétrico</div>') && (corpo.match(/class="tl-row"/g) || []).length >= 3, 'depois, as outras hunts do tipo');
  H.escolheTipo('FIRE'); await roda();
  ok(H.store.get('ocTipo') === 'FIRE' && /Outras hunts de Fogo|Cace em/.test(H.byId.get('ocBody').innerHTML), 'escolher outro elemento: a resposta muda e a escolha fica salva');
  H.byId.get('ocBtn').onclick(); await roda();
  ok(H.store.get('ocTipo') === 'FIRE', 'reabrir no mesmo dia mantem a escolha (o tipo de hoje nao passa por cima)');
  H.store.set('ocTipoDia', new Date(agora - 864e5).toDateString()); H.byId.get('ocBtn').onclick(); await roda();
  ok(H.store.get('ocTipo') === 'ELECTRIC', 'no dia seguinte, abre de novo no tipo do dia');

  console.log('\n--- Tipo do Dia: de onde o app tira ---');
  const td = (ev, tdk) => { H.stCache[0] = { t: Date.now(), d: H.stSane(conta({ ev, tdk })) }; return H.tipoDoDia(); };
  ok((td([{ k: 'x', n: 'Type of the Day: Electric', u: Date.now() + 1e6 }]) || {}).ty === 'ELECTRIC' && (td([{ k: 'x', n: 'Tipo del Día: Eléctrico', u: Date.now() + 1e6 }]) || {}).ty === 'ELECTRIC', 'o nome do evento em ingles e em espanhol tambem');
  ok((td([{ k: 'x', n: 'Algo', ty: 'ghost', u: Date.now() + 1e6 }]) || {}).ty === 'GHOST', 'se o servidor mandar o tipo num campo, vale o campo');
  ok(td([{ k: 'x', n: 'Tipo do Dia: Elétrico', u: Date.now() - 1000 }]) === null, 'evento que ja acabou nao conta');
  ok(td([{ k: 'x', n: 'Evento Normal de XP', u: Date.now() + 1e6 }]) === null, 'evento que nao e o Tipo do Dia nao vira tipo (mesmo com "Normal" no nome)');
  ok((td([], { t: 'WATER', at: Date.now() }) || {}).ty === 'WATER' && td([], { t: 'WATER', at: Date.now() - 2 * 864e5 }) === null, 'sem evento: o tipo que deu bonus num abate de hoje (de outro dia nao)');

  console.log('\n--- a Tierlist volta a ser so de atacante ---');
  ok(!/data-el="#"/.test(b) && !/modoHe|tlHeChips|tlHeCorpo/.test(b), 'sem o chip e o modo Hunts por tipo dentro dela');
  ok(b.includes("let tlEl = String(lsGet('tlEl') || ''); if (tlEl === '#') tlEl = '';"), 'quem tinha deixado a Tierlist no modo antigo volta pro Resumo');
  const KEYS = ['ocBtn', 'ocBtnTitle', 'ocTitle', 'ocElem', 'ocNivel', 'ocHoje', 'ocAte', 'ocHojeChip', 'ocPick', 'ocCace', 'ocCom', 'ocNoNivel', 'ocOutras', 'tlHeHint', 'tlHeUse', 'tlHeMeu', 'tlHeNone'];
  KEYS.forEach((k) => { const v = [...s.matchAll(new RegExp('[{ ,]' + k + ":'([^']*)'", 'g'))].map((m) => m[1]); ok(v.length === 3 && v.every((t) => t && !t.includes('—')), k + ': pt, en e es, sem travessao'); });
  ok(!/[{ ,]tlHe(Tip|Tipo|Pick)?:'/.test(s), 'os textos do chip antigo sairam');
  ok(b.includes("(verbo || t('dtVira'))"), 'a linha diz "use" no lugar do "vira" do Ditto');

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('FAIL quebrou: ' + ((e && e.stack) || e)); process.exit(1); });
