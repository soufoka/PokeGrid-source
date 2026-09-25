// 1.5.27: tierlist por Pokemon e por gold/h. O jogo nao manda gold por kill: o gold vem do loot vendido a preco de
// NPC (o Hunt Analyzer do proprio jogo soma assim). O HUNTS_JS calcula x.gk = soma(chance/1e5 x quantidade media x
// npcPrice) do loot da especie da hunt, e a nota por gold/h e kills/h do modelo x gk. Aqui rodam o HUNTS_JS, o sugCalc,
// o Ditto e a tierlist REAIS com a fixture de 17/09 mais o loot e os precos recortados de 19/09.
// Roda com: node test/tierlist-gold.test.js
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
  const roda = (semItens) => new Function('fetch', 'return ' + huntsSrc)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : u.indexOf('items') >= 0 ? (semItens ? null : itens) : { creatures: cria }) }));
  const R = await roda(false);

  console.log('\n--- gold esperado por kill (x.gk) de cada hunt ---');
  // conta independente, com a mesma regra: nome exato primeiro, minusculo depois ('cat ear' $40 e 'Cat Ear' $123 existem)
  const preco = {}, precoL = {};
  itens.items.forEach((i) => { preco[i.name] = i.npcPrice; const k = i.name.toLowerCase(); if (precoL[k] == null) precoL[k] = i.npcPrice; });
  const gkRef = (sp) => Math.round((L.loot[sp] || []).reduce((a, [n, ch, mn, mx]) => (ch > 0 ? a + ch / 1e5 * ((mn || 1) + (mx || mn || 1)) / 2 * (preco[n] != null ? preco[n] : (precoL[n.toLowerCase()] || 0)) : a), 0));
  const comGk = R.h.filter((x) => x.gk > 0);
  ok(comGk.length > 400, comGk.length + ' de ' + R.h.length + ' hunts ganham gold por kill (so as cidades ficam sem)');
  ['kabutops', 'scizor', 'quagsire', 'geodude'].forEach((sp) => { const x = R.h.find((h) => h.sp === sp); ok(x && x.gk === gkRef(sp), sp + ': ' + (x && x.gk) + ' gold por kill, igual a conta independente (' + gkRef(sp) + ')'); });
  const kb = R.h.find((h) => h.sp === 'kabutops');
  ok(kb && kb.gk > 100 && kb.gk < 170, 'Kabutops fica perto de 133 (Dome Fossil 14,6% x $500 + Crystal Stone 0,06% x $50.000): ' + (kb && kb.gk));
  const comCat = Object.keys(L.loot).find((sp) => L.loot[sp].some((l) => l[0] === 'cat ear' && l[1] > 0) && R.h.some((h) => h.sp === sp));
  ok(!!comCat && R.h.find((h) => h.sp === comCat).gk === gkRef(comCat), '"cat ear" usa o preco do nome exato ($40), nao o de "Cat Ear" ($123): ' + comCat);
  const nms = R.h.find((h) => h.sp === 'nightmare sneasel');
  ok(nms && nms.gk === gkRef('nightmare sneasel'), '"Cat Ear" com maiuscula usa $123 (nightmare sneasel: ' + (nms && nms.gk) + '): so o minusculo daria 1108');
  const R0 = await roda(true);
  ok(R0 && R0.h.length === R.h.length && R0.h.every((x) => x.gk === 0), 'sem o items.json: as hunts carregam iguais, so o gold fica 0 (a tela avisa)');

  // ---- renderer real: sugCalc, Ditto e tierlist ----
  const seen = {}; const lista = R.h.filter((x) => !seen[x.name + '@' + x.level] && (seen[x.name + '@' + x.level] = 1));
  const blocoSug = b.slice(b.indexOf('  const CHART = '), b.indexOf('\n  };', b.indexOf('const sugCalc = (A, x) => {')) + 5).replace("let huntPkSel = String(lsGet('cdHuntPk') || '');", '');
  const blocoDitto = entre('  const dittoCache = new Map();', '  let huntsCache = null');
  const blocoTier = entre('  function tierCalc(nivel, comTm, obj) {', '  const tlNameId = ');
  const api = new Function('window', 'R', 'lista',
    'let basesByName = R.bs, movesByName = R.mv, creaturesById = R.byId, huntsCache = lista, huntsCacheT = 1, tlCache = null, huntStats = {};\n'
    + blocoSug + '\n' + blocoDitto + '\n' + blocoTier + '\nreturn { sugCalc, tierCalc, tierPoke, dittoVarre, nCache: () => tlCache.size };')({ PokeGridIvMath: M }, R, lista);

  console.log('\n--- tierlist por Pokemon: um atacante contra todas as hunts ate o nivel da conta ---');
  const A = { sp: 'scizor', level: 300, q: 1.3, ivt: 110, tlv: 300, mult: 1 };
  const ouro = api.tierPoke(A, lista, 'gold'), xp = api.tierPoke(A, lista, 'xp');
  ok(ouro.length > 10 && ouro.every((r, k) => Math.abs(r.sc - r.sg.kh * r.x.gk) < 1e-6 && (!k || ouro[k - 1].sc >= r.sc)), 'por gold/h: nota = kills/h x gold por kill, em ordem (' + ouro.length + ' hunts; 1a ' + ouro[0].x.name + ' Lv' + ouro[0].x.level + ')');
  ok(xp.length > 10 && xp.every((r, k) => r.sc === (r.sg.xph || r.sg.ritmo) && (!k || xp[k - 1].sc >= r.sc)), 'por XP/h: nota = XP/h do modelo, em ordem (1a ' + xp[0].x.name + ' Lv' + xp[0].x.level + ')');
  ok(ouro.concat(xp).every((r) => !(r.sg.hl > 300) && r.sg.ritmo >= 0.15 && r.proprio === 1), 'nada acima do nivel da conta nem hunt inviavel (piso do Simples), e a linha nao mostra "vira forma"');
  const baixo = api.tierPoke(Object.assign({}, A, { tlv: 50 }), lista, 'gold');
  ok(baixo.every((r) => !(r.sg.hl > 50)) && baixo.length < ouro.length, 'com a conta no 50, so hunts ate o 50 (' + baixo.length + ')');

  console.log('\n--- Ditto: a melhor forma por hunt e a mesma, e o cache do Ditto nao muda ---');
  const D = { sp: 'shiny ditto', level: 300, q: 0, ivt: 0, tlv: 300 };
  const snap = (V) => V.hunts.map((r) => r.x.name + '@' + r.x.level + '|' + r.sp + '|' + r.sc).join(';');
  const antes = snap(api.dittoVarre(D, lista));
  const dg = api.tierPoke(D, lista, 'gold');
  ok(snap(api.dittoVarre(D, lista)) === antes, 'ordenar o Ditto por gold nao mexe no resultado guardado (o modo XP continua igual)');
  const forma = {}; api.dittoVarre(D, lista).hunts.forEach((r) => { forma[r.x.name + '@' + r.x.level] = r.sp; });
  ok(dg.length > 5 && dg.every((r, k) => forma[r.x.name + '@' + r.x.level] === r.sp && Math.abs(r.sc - r.sg.kh * r.x.gk) < 1e-6 && (!k || dg[k - 1].sc >= r.sc)), 'Ditto por gold: mesma forma de cada hunt, nota = kills/h x gold por kill, em ordem');

  console.log('\n--- tierlist por elemento com o objetivo ---');
  const tx = api.tierCalc(300, false, 'xp'), tg = api.tierCalc(300, false, 'gold');
  ok(tx !== tg && api.tierCalc(300, false, 'gold') === tg && api.tierCalc(300, false, 'xp') === tx, 'o cache guarda os dois objetivos e devolve o mesmo resultado');
  ok(tg.length > 50 && tg[0].x.gk > 0 && Math.abs(tg[0].sc - tg[0].sg.kh * tg[0].x.gk) < 1e-6 && tg.every((r, k) => !k || tg[k - 1].comp >= r.comp), 'por gold: cada especie com a hunt que mais rende gold, em ordem (1a ' + tg[0].sp + ' em ' + tg[0].x.name + ')');
  [100, 200, 400, 500].forEach((nv) => api.tierCalc(nv, false, 'xp'));
  ok(api.nCache() <= 4, 'o cache nao cresce sem limite (' + api.nCache() + ' chaves)');

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('FAIL excecao: ' + e.stack); process.exit(1); });
