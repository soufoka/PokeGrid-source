// Hunts por tipo (Tierlist): o Tipo do Dia do jogo da bonus de XP e de drop ao derrotar pokemon de um tipo, e muda todo
// dia. O modo novo lista as hunts com selvagem do tipo escolhido (1o ou 2o tipo) ate o nivel, cada uma com o melhor
// atacante (avaliado no nivel da hunt, como a tierlist) e o melhor do time das contas ligadas.
// Roda o HUNTS_JS, o sugCalc e o bloco da tierlist REAIS com a fixture de 17/09 e o loot de 19/09.
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

  console.log('\n--- na tela: chip, tipos e textos ---');
  ok(/'<button data-el="#" title="' \+ esc\(t\('tlHeTip'\)\) \+ '"' \+ \(modoHe \? ' class="on"' : ' style="color:var\(--ok\)"'\) \+ '>' \+ rotuloHtml\('lupa', t\('tlHe'\)\)/.test(b), 'chip Hunts por tipo na Tierlist, com a lupa');
  ok(b.includes('const rows = (modoPk || modoHe || semPreco) ? [] : tierCalc(') && b.includes('else if (modoHe) h = tlHeCorpo(ids);'), 'no modo novo a tierlist inteira nao e calculada a toa e o corpo e o das hunts');
  ok(b.includes("if (modoHe) tlHeChips(ctl);") && b.includes("ctl.dataset.modo !== 'pk'"), 'a faixa de controles mostra os 18 tipos e volta a ser a do modo Pokemon ao trocar de modo');
  ok(b.includes(".concat(modoHe ? [] : nomes.map(ty =>"), 'no modo novo os chips de elemento do atacante somem (duas fileiras com os mesmos 18 tipos confundiam)');
  const css = s.slice(s.indexOf('<style>'), s.indexOf('</style>'));
  ok(css.includes('#tlPkCtl button[data-he].on'), 'CSS: o tipo escolhido fica invertido como os outros chips');
  const KEYS = ['tlHe', 'tlHeTip', 'tlHeTipo', 'tlHePick', 'tlHeHint', 'tlHeUse', 'tlHeMeu', 'tlHeNone'];
  KEYS.forEach((k) => { const v = [...s.matchAll(new RegExp('[{ ,]' + k + ":'([^']*)'", 'g'))].map((m) => m[1]); ok(v.length === 3 && v.every((t) => t && !t.includes('—')), k + ': pt, en e es, sem travessao'); });
  ok(b.includes("(verbo || t('dtVira'))"), 'a linha diz "use" no lugar do "vira" do Ditto');

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('FAIL quebrou: ' + ((e && e.stack) || e)); process.exit(1); });
