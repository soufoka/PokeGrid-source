// Atualizacao do jogo de 17/09/2026: os golpes de 645 das 646 criaturas foram reescritos (ate 18 por
// criatura) e 217 golpes de TM entraram com poder 600 e learnLevel 1. O app os tratava como golpe
// natural: o "melhor golpe" de 187 criaturas virou um TM que o jogador nem tem, e o Ditto (que pelo
// proprio jogo nao aprende TM) era recomendado com golpe impossivel. Aqui o HUNTS_JS, o sugCalc, a
// tierlist e as regras do Ditto REAIS rodam contra um recorte dos dados reais do jogo.
// Roda com: node test/tierlist-ditto.test.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const raiz = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
const M = require(path.join(raiz, 'src', 'domain', 'iv-math.js'));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const re = /<script>([\s\S]*?)<\/script>/g; let mm, b = '';
while ((mm = re.exec(s))) { if (mm[1].length > b.length) b = mm[1]; }
const entre = (a, fim, incl) => { const i = b.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 40)); const j = b.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 40)); return b.slice(i, incl ? j + fim.length : j); };

(async () => {
  // ---- HUNTS_JS real, com o fetch servindo a fixture ----
  const i0 = s.indexOf('const HUNTS_JS'); const ini = s.indexOf('`', i0) + 1;
  const huntsSrc = eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`');
  const fetchFalso = (u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : { creatures: J.creatures }) });
  const R = await new Function('fetch', 'return ' + huntsSrc)(fetchFalso);
  ok(R && R.h.length > 400 && Object.keys(R.mv).length > 500, 'HUNTS_JS roda com os dados de hoje: ' + R.h.length + ' hunts, ' + Object.keys(R.mv).length + ' especies');

  console.log('\n--- golpes: o jogo manda ate 18, e marca os de TM ---');
  const maxG = Math.max(...Object.values(R.mv).map((x) => x.a.length));
  const maxJogo = Math.max(...J.creatures.map((c) => c.attacks.length));
  ok(maxG === maxJogo && maxJogo > 12, 'nenhum golpe fica de fora (o teto antigo era 12): o jogo manda ate ' + maxJogo + ' e o app le ' + maxG);
  const cz = R.mv.charizard;
  const tmsCz = cz.a.filter((g) => g[6]);
  ok(tmsCz.length === 2 && tmsCz.every((g) => g[1] === 600), 'Charizard: ' + cz.a.length + ' golpes, ' + tmsCz.length + ' de TM (' + tmsCz.map((g) => g[0] + ' p' + g[1] + ' ' + g[6]).join(', ') + ')');
  const comTm = Object.values(R.mv).filter((x) => x.a.some((g) => g[6])).length;
  ok(comTm > 150, comTm + ' especies tem golpe de TM nos dados');

  console.log('\n--- nivel minimo pra TER cada especie (caca ou evolucao) ---');
  ok(R.mv.charmander.ml === 20 && R.mv.charmeleon.ml === 40 && R.mv.charizard.ml === 80, 'linha do Charmander: 20 / 40 / 80');
  ok(R.mv.ninetales.ml === 80 && R.mv.ninetales.hl === 100, 'Ninetales: a caca e lv100, mas evoluindo da pra ter no 80');
  ok(R.mv['mega blastoise'].ml >= 600 && R.mv['nightmare beedrill'].ml >= 2000, 'Mega so no 600, Nightmare so no 2000');
  ok(R.mv.charizard.id === 6 && R.mv.blastoise.id === 9, 'especie leva o pokeId (Blastoise fica com o nacional, nao com a forma 10001)');
  ok(R.mv.treecko.id === 252 && R.mv.treecko.ml === 520, 'Treecko: a unica caca e a de Orre (marcador lv520), entao ml 520 e nao o huntLevel 20 do registro nacional; e o id fica o nacional 252 (' + R.mv.treecko.ml + ', ' + R.mv.treecko.id + ')');
  ok(R.mv.grovyle.ml === Math.max(520, 40) && R.mv.sceptile.ml >= R.mv.grovyle.ml, 'e a linha evolui do 520: Grovyle ' + R.mv.grovyle.ml + ', Sceptile ' + R.mv.sceptile.ml);
  const cs = J.creatures.find((c) => c.name === 'Treecko');
  ok(cs && cs.huntLevel === 20 && !J.hunts.some((h) => /treecko/i.test(h.name) && h.level < 500), 'premissa nos dados de hoje: o registro 252 diz huntLevel 20, mas nao existe caca de Treecko abaixo do 500');

  // ---- renderer real: tabela de tipos, sugCalc, Ditto e tierlist ----
  const seen = {}; const lista = R.h.filter((x) => !seen[x.name + x.level] && (seen[x.name + x.level] = 1));
  const blocoSug = b.slice(b.indexOf('  const CHART = '), b.indexOf('\n  };', b.indexOf('const sugCalc = (A, x) => {')) + 5).replace("let huntPkSel = String(lsGet('cdHuntPk') || '');", '');
  const blocoDitto = entre('  const dittoCache = new Map();', '  let huntsCache = null', false);
  const blocoTier = entre('  function tierCalc(nivel, comTm, obj) {', '  const tlNameId = ', false);
  const api = new Function('window', 'R', 'lista',
    'let basesByName = R.bs, movesByName = R.mv, creaturesById = R.byId, huntsCache = lista, huntsCacheT = 1, tlCache = null, huntStats = {};\n'
    + blocoSug + '\n' + blocoDitto + '\n' + blocoTier + '\nreturn { sugCalc, tierCalc, dittoRegras, dittoAlvo, dittoSweep, dittoHunts, dittoVarre, ritmoDe, golpesDe, tempoKill, calibraTempo, danoRecalc, danoAmostra, calChave, alvosDe, setCat: (mv, bs) => { movesByName = mv; basesByName = bs; }, setHS: (h) => { huntStats = h; }, fator: () => danoFator, tempo: () => tempoCal };')({ PokeGridIvMath: M }, R, lista);

  console.log('\n--- sugCalc: TM so entra pra quem aprendeu o disco ---');
  const czA = { sp: 'charizard', level: 100, q: 1.5, ivt: 120, tlv: 0, mult: 1 };
  // hunt dura pro Charizard Lv100 (nao mata de 1 golpe), onde fogo pega bem: e ai que o TM faz diferenca
  const alvo = lista.filter((x) => { const g = api.sugCalc(czA, x); return g && g.ritmo < 0.5 && g.eff >= 2 && /FIRE|Flame|Ember|Heat|Inferno|Blitz/i.test(g.nome); }).sort((p, q) => q.level - p.level)[0];
  ok(!!alvo, 'achou uma hunt dura pro teste: ' + (alvo ? alvo.name + ' Lv' + alvo.level : 'nenhuma'));
  const semTm = api.sugCalc(czA, alvo);
  ok(semTm && !semTm.tm, 'Charizard sem TM aprendido usa golpe natural: ' + semTm.nome + ' (antes escolhia o TM de 600 como se fosse de nivel 1)');
  const comFire = api.sugCalc(Object.assign({}, czA, { tms: ['FIRE'] }), alvo);
  ok(comFire && comFire.tm === 'FIRE' && comFire.nome === semTm.nome && comFire.khTm > 0 && !comFire.aoe, 'com o TM de fogo aprendido (dado do jogo), o golpe normal continua o mesmo (' + comFire.nome + ') e o TM entra como salva extra em area: +' + Math.round(comFire.khTm) + ' kills/h');
  const soVoo = api.sugCalc(Object.assign({}, czA, { tms: ['FLYING'] }), alvo);
  ok(soVoo && soVoo.tm === 'FLYING' && soVoo.khTm < comFire.khTm, 'ter o TM de voo nao libera o de fogo: usa o de voo (' + soVoo.tm + '), que rende menos nessa hunt');
  ok(comFire.mg === semTm.mg && comFire.xph > semTm.xph, 'a folga do golpe normal nao muda; o XP/h sobe com o TM (' + Math.round(semTm.xph) + ' -> ' + Math.round(comFire.xph) + ')');
  const comAoe = api.sugCalc(Object.assign({}, czA, { tms: ['FIRE', 'AOE'] }), alvo);
  ok(comAoe.aoe && comAoe.tm === 'FIRE+AOE' && Math.abs(comAoe.kh - (comAoe.alvos * 3600 / api.tempoKill(comAoe.golpes) + comAoe.khTm)) < 1e-6 && comAoe.alvos === 2, 'AoE TM: o golpe normal acerta todos os alvos do quadro (kills/h x alvos, 2 sem medicao); convive com o elemental');
  const rampAoe = api.sugCalc({ sp: 'rampardos', level: 300, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['AOE'] }, alvo), cranAoe = api.sugCalc({ sp: 'cranidos', level: 300, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['AOE'] }, alvo);
  ok(rampAoe.aoe && !cranAoe.aoe, 'so estagio final aprende o AoE (Rampardos sim, Cranidos nao)');
  const px = lista.find((x) => x.sp === 'pidgey') || lista[0];
  const rat = api.sugCalc({ sp: 'raticate', level: 150, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['NORMAL'] }, px), stx = api.sugCalc({ sp: 'steelix', level: 150, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['STEEL'] }, px), cle = api.sugCalc({ sp: 'clefable', level: 150, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['FAIRY'] }, px);
  ok(rat && rat.tm === 'NORMAL' && rat.khTm > 0 && stx && stx.tm === 'STEEL' && stx.khTm > 0 && cle && cle.tm === 'FAIRY' && cle.khTm > 0, 'disco elemental vem da regra do jogo (tipo proprio + estagio final), nao do catalogo de golpes: Normal, Aco e Fada existem (o catalogo so cita 15 tipos)');
  const cranRock = api.sugCalc({ sp: 'cranidos', level: 300, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['ROCK'] }, alvo), rampRock = api.sugCalc({ sp: 'rampardos', level: 300, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['ROCK'] }, alvo);
  ok(cranRock && cranRock.khTm === 0 && cranRock.tm === '' && rampRock.khTm > 0, 'nao-final nao ganha disco elemental mesmo com a lista dizendo (Cranidos), o final ganha (Rampardos)');
  const scyRock = api.sugCalc({ sp: 'scyther', level: 300, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['BUG'] }, alvo);
  ok(scyRock && scyRock.khTm > 0, 'excecao do jogo: Scyther aprende disco sem ser estagio final');
  // patch de 25/09/2026: Misdreavus (200) passou a evoluir (Mismagius 429, Lv100) e o jogo a pos no TM_STAGE_EXEMPT
  const crMis = J.creatures.map((c) => (c.pokeId === 200 ? Object.assign({}, c, { evolvesToId: 429, evolveLevel: 100 }) : c));
  const Rmis = await new Function('fetch', 'return ' + huntsSrc)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : { creatures: crMis }) }));
  ok(Rmis.mv.misdreavus.fin === 1 && Rmis.mv.pidgeotto.fin === 0, 'Misdreavus evoluindo continua aprendendo TM (excecao do jogo desde 25/09); Pidgeotto, que evolui, nao');
  api.setCat(Rmis.mv, Rmis.bs);
  const mis = api.sugCalc({ sp: 'misdreavus', level: 100, q: 1, ivt: 96, tlv: 0, mult: 1, tms: ['GHOST', 'AOE'] }, lista.find((x) => x.name === 'Scizor')); // Scizor: fantasma neutro (na Pidgey, Normal, nao pega)
  api.setCat(R.mv, R.bs);
  ok(mis && mis.khTm > 0 && mis.aoe, 'e o Untold Nightmare e o AoE que ela tem no jogo entram na conta (' + (mis && mis.tm) + ', +' + Math.round((mis && mis.khTm) || 0) + ' kills/h)');
  const rows600 = api.tierCalc(600, true); const vs = rows600.find((r) => r.sp === 'venusaur');
  ok(vs && vs.gerTm && /GRASS|POISON/.test(vs.gerTm) && vs.gerTm.indexOf('+AOE') > 0, 'aba Geral guarda o disco da soma vencedora (Venusaur: ' + vs.gerTm + '), e a linha mostra esse na aba Geral');
  ok(b.includes("(valor != null ? r.gerTm : r.sg.tm)"), 'tlLinha usa gerTm na aba Geral');
  api.setHS({ c: { scizor: { kph: 450, hpk: 2.1, tma: 3.5, tsh: 200, tpa: 4, n: 10 } } });
  const k1 = api.calChave(); api.setHS({ c: { scizor: { kph: 450, hpk: 2.1, tma: 9, tsh: 200, tpa: 4, n: 10 } } }); const k2 = api.calChave();
  ok(k1 !== k2, 'medicao nova na mesma hunt (alvos por salva 3,5 -> 9) muda a chave de cache da tierlist e do Ditto');
  api.setHS({ c: { scizor: { kph: 450, hpk: 2.1, tma: 3.5, tsh: 200, tpa: 4, n: 10 } } });
  const gS = api.sugCalc(Object.assign({}, czA, { tms: true }), lista.find((x) => x.name === 'Scizor'));
  ok(gS.aoe && gS.alvos === 4 && Math.abs(gS.khTm - 200 * 3.5 * api.ritmoDe(gS.tmMg)) < 1e-6, 'a hunt medida usa alvos por golpe normal (4) no AoE, e alvos por salva (3,5) x salvas/h medidas (200) no elemental');
  api.setHS({ c: { h1: { kph: 500, hpk: 2, n: 10, tma: 3 }, h2: { kph: 400, hpk: 3, n: 10, tpa: 2 }, h3: { kph: 450, hpk: 2.5, n: 10 } } });
  ok(api.calibraTempo().n === 1, 'o ajuste dos tempos ignora hunts medidas com salva (TM ou AoE): so golpe natural');
  api.setHS({});
  const tudo = api.sugCalc(Object.assign({}, czA, { tms: true }), alvo);
  ok(tudo.tm === 'FIRE+AOE' && tudo.khTm === comFire.khTm, 'tms: true (tierlist com TM) = melhor elemental que a especie aprende + AoE');
  const facil = lista.find((x) => x.sp === 'bulbasaur') || lista.find((x) => x.t1 === 'GRASS' && x.level <= 40);
  const gFacil = api.sugCalc(Object.assign({}, czA, { level: 300 }), facil);
  ok(gFacil.ritmo === 1 && gFacil.nome !== 'Ember' && gFacil.nome !== 'Scratch', 'varios golpes matam de 1: fica o de maior folga, nao o primeiro da lista (' + gFacil.nome + '; antes saia Ember)');

  console.log('\n--- tierlist: so o que da pra ter no nivel escolhido, sem TM por padrao ---');
  const tiers = (rows) => { const max = rows.length ? rows[0].comp : 0; const S = rows.filter((r) => r.comp / max >= 0.9).length; return { n: rows.length, S, pct: Math.round(S / rows.length * 100) }; };
  [50, 100, 600, 3000].forEach((nv) => {
    const rows = api.tierCalc(nv, false);
    const fora = rows.filter((r) => R.mv[r.sp].ml > nv);
    const t = tiers(rows);
    ok(rows.length > 20 && fora.length === 0, 'nivel ' + nv + ': ' + rows.length + ' especies, todas obtiveis (' + (fora.slice(0, 3).map((r) => r.sp).join(', ') || 'nenhuma fora') + '); topo: ' + rows.slice(0, 3).map((r) => r.sp).join(', '));
    ok(rows.every((r) => !r.sg.tm), 'nivel ' + nv + ': nenhum golpe de TM sem o usuario pedir');
    ok(t.pct < 40, 'nivel ' + nv + ': o ranking separa (' + t.S + ' de ' + t.n + ' no topo, ' + t.pct + '%)');
  });
  const n100 = api.tierCalc(100, false);
  ok(!n100.some((r) => /^(mega|nightmare) /.test(r.sp)), 'no nivel 100 nao aparece Mega nem Nightmare como atacante');
  const n3000 = api.tierCalc(3000, false);
  ok(n3000.length > n100.length, 'subindo o nivel, mais especies entram (' + n100.length + ' -> ' + n3000.length + ')');
  const comTmRows = api.tierCalc(600, true);
  ok(comTmRows.some((r) => r.sg.tm), 'ligando "com TM", os golpes de TM entram e vem marcados: ' + comTmRows.filter((r) => r.sg.tm).slice(0, 3).map((r) => r.sp + ' (' + r.sg.nome + ')').join(', '));
  ok(api.tierCalc(600, false) !== comTmRows, 'e o cache nao mistura as duas visoes');
  const raichu = n3000.find((r) => r.base === 'raichu');
  ok(!n3000.some((r) => r.base === 'alolan raichu' || r.sp === r.base && /^nightmare alolan/.test(r.sp)), 'forma com dois prefixos (Nightmare Alolan Raichu) cai na base em vez de virar linha propria' + (raichu ? ' [raichu: ' + raichu.sp + ']' : ''));

  console.log('\n--- Ditto: quem pode ser copiado, igual ao jogo de hoje ---');
  const comum = api.dittoRegras({ sp: 'ditto', level: 100, q: 0, ivt: 0 });
  const shiny = api.dittoRegras({ sp: 'shiny ditto', level: 100, q: 0, ivt: 0 });
  [['ditto', 'ele mesmo'], ['mewtwo', 'lendario'], ['aerodactyl', 'Aerodactyl'], ['mega blastoise', 'Mega (id 14009)'], ['nightmare beedrill', 'Nightmare (id 50001, tambem >= 14000)'], ['slaking', 'boss de Orre (289)'], ['brave blastoise', 'Outland 10501']].forEach(([sp, por]) =>
    ok(R.mv[sp] && comum.pode(sp) === false, 'Ditto comum NAO copia ' + sp + ': ' + por));
  ['dragonite', 'blastoise', 'charizard', 'sceptile'].forEach((sp) => ok(comum.pode(sp) === true, 'Ditto comum copia ' + sp + (sp === 'sceptile' ? ' (Orre que nao e boss e permitido pelo jogo)' : '')));
  ok(shiny.pode('dragonair') && shiny.pode('charizard') && shiny.pode('pupitar'), 'Shiny Ditto copia Dragonair, Charizard e Pupitar (tem forma shiny)');
  ok(!shiny.pode('dragonite') && !shiny.pode('tyranitar') && !shiny.pode('sceptile'), 'Shiny Ditto NAO copia Dragonite, Tyranitar nem Sceptile (sem forma shiny no jogo)');
  const nShiny = Object.keys(R.mv).filter((sp) => shiny.pode(sp)).length, nComum = Object.keys(R.mv).filter((sp) => comum.pode(sp)).length;
  ok(nShiny > 100 && nShiny < nComum, 'Shiny Ditto tem ' + nShiny + ' formas nos dados (a lista velha do app tinha 64), o comum tem ' + nComum);
  ok(shiny.fix.q === 2 && shiny.fix.ivt === 119 && shiny.fix.mult === 0.8 && comum.fix.mult === 0.75, 'debuff do jogo: shiny -20% de ataque, comum -25%; sem dado do jogo, usa os valores do Ditto da loja');
  const meu = api.dittoRegras({ sp: 'shiny ditto', level: 100, q: 2.4, ivt: 150 });
  ok(meu.fix.q === 2.4 && meu.fix.ivt === 150, 'com qualidade e IV informados pelo jogo, usa os do PROPRIO Ditto');

  console.log('\n--- Ditto: a recomendacao ---');
  const dShiny = { sp: 'shiny ditto', level: 300, q: 2.0, ivt: 119, tlv: 600 };
  const sweep = api.dittoSweep(dShiny, lista);
  ok(sweep.length >= 10, 'Shiny Ditto: melhor transformacao por tipo (' + sweep.length + ' tipos); ex.: ' + sweep.slice(0, 3).map((r) => r.ty + ' -> ' + r.sp + ' em ' + r.x.name).join(' | '));
  ok(sweep.every((r) => shiny.pode(r.sp)), 'toda especie recomendada e uma que o Shiny Ditto PODE virar');
  ok(sweep.every((r) => !r.sg.tm), 'nenhuma recomendacao depende de golpe de TM (Ditto nao aprende): ' + sweep.slice(0, 3).map((r) => r.sg.nome).join(', '));
  ok(sweep.every((r) => (+r.x.level || 0) <= 600), 'e so em hunt que a conta alcanca');
  // hunt-alvo que o Shiny Ditto Lv300 mata (a do teste de TM, Lv3000, e inviavel pra ele e fica vazia pelo piso de ritmo)
  const alvoD = api.dittoAlvo(dShiny, sweep[0].x);
  ok(alvoD.length > 0 && alvoD.every((r) => shiny.pode(r.sp) && !r.sg.tm && r.sg.ritmo >= 0.15), 'hunt-alvo ' + sweep[0].x.name + ': mesmas regras e o piso do Simples (' + alvoD.slice(0, 3).map((r) => r.sp + '/' + r.sg.nome).join(', ') + ')');
  ok(api.dittoAlvo(dShiny, alvo).length === 0, 'hunt-alvo inviavel pro Shiny Ditto Lv300 (' + alvo.name + ' Lv' + alvo.level + '): nenhuma forma recomendada');
  ok(alvoD.every((r, k) => k === 0 || alvoD[k - 1].sc > r.sc || alvoD[k - 1].sg.eff > r.sg.eff || (alvoD[k - 1].sg.mg || 0) >= (r.sg.mg || 0)), 'empate no teto ordena pela folga (o mais forte primeiro, nao a ordem da lista)');
  const grama = sweep.find((r) => r.ty === 'GRASS'), fogo = sweep.find((r) => r.ty === 'FIRE');
  ok(grama && grama.sp !== 'bulbasaur' && fogo && fogo.sp !== 'charmander', 'por tipo: recomenda a forma forte, nao o estagio inicial que empatava (GRASS -> ' + (grama && grama.sp) + ', FIRE -> ' + (fogo && fogo.sp) + ')');
  const dComum = api.dittoSweep({ sp: 'ditto', level: 300, q: 1.4, ivt: 89, tlv: 600 }, lista);
  ok(dComum.every((r) => comum.pode(r.sp) && !r.sg.tm), 'Ditto comum: idem, e nunca Mega, Nightmare ou boss');

  console.log('\n--- Ditto: painel proprio, ranking POR HUNT (botao no menu abaixo da tierlist) ---');
  const hs = api.dittoHunts(dShiny, lista);
  ok(hs.length > 50 && hs.every((r, k) => k === 0 || hs[k - 1].sc >= r.sc), 'por hunt: ranking das hunts pro Shiny Ditto, da melhor pra pior (' + hs.length + ' hunts); topo: ' + hs.slice(0, 3).map((r) => r.x.name + ' Lv' + r.x.level + ' virando ' + r.sp).join(' | '));
  ok(hs.every((r) => shiny.pode(r.sp) && !r.sg.tm && (+r.x.level || 0) <= 600), 'cada hunt vem com a melhor forma que o Shiny Ditto PODE virar, sem TM, e so hunts que a conta alcanca');
  ok(hs[0].sc === Math.max(...sweep.map((r) => r.sc)), 'a melhor hunt do ranking e a mesma do melhor tipo (e uma varredura so)');
  ok(api.dittoHunts(dShiny, lista) === hs && api.dittoVarre(dShiny, lista).hunts === hs && api.dittoSweep(dShiny, lista) === api.dittoVarre(dShiny, lista).rows, 'mesmos parametros: vem do cache (por tipo e por hunt na mesma varredura)');
  ok(new Set(hs.map((r) => r.x.name + '@' + r.x.level)).size === hs.length, 'cada hunt aparece uma vez');
  const todas = api.dittoHunts({ sp: 'shiny ditto', level: 3000, q: 2.0, ivt: 119, tlv: 0 }, lista); // Lv3000: com o piso de ritmo, o Lv300 nao tem hunt viavel acima do 600
  ok(todas.length > hs.length && todas.some((r) => (+r.x.level || 0) > 600), 'nivel da conta 0 = todas as hunts, inclusive as acima do 600');
  const baixo = api.dittoHunts({ sp: 'shiny ditto', level: 40, q: 2.0, ivt: 119, tlv: 60 }, lista);
  ok(baixo.length > 0 && baixo.every((r) => (+r.x.level || 0) <= 60) && baixo[0].sc <= hs[0].sc, 'Ditto Lv40 numa conta Lv60: so hunts ate 60, e rende menos que o Lv300');
  const hComum = api.dittoHunts({ sp: 'ditto', level: 300, q: 1.4, ivt: 89, tlv: 600 }, lista);
  ok(hComum.every((r) => comum.pode(r.sp) && !r.sg.tm), 'Ditto comum: idem');
  ok(api.dittoHunts(dShiny, lista) === hs && api.dittoHunts({ sp: 'ditto', level: 300, q: 1.4, ivt: 89, tlv: 600 }, lista) === hComum, 'cache guarda mais de uma varredura: o quadro do Simples e o painel nao se expulsam a cada tick');
  const tipoOk = sweep.every((r) => !lista.some((x) => { const g = api.sugCalc({ sp: r.sp, level: 300, q: 2.0, ivt: 119, tlv: 600, mult: 0.8 }, x); return g && (+x.level || 0) <= 600 && (g.xph || g.ritmo) === r.sc && (g.eff > r.sg.eff || (g.eff === r.sg.eff && (g.mg || 0) > (r.sg.mg || 0))); }));
  ok(tipoOk, 'por tipo: no empate de rendimento, a hunt escolhida pra forma e a de maior efetividade e folga (antes ficava a 1a da lista)');
  ok(b.includes("if (!k || nota(arr[k - 1]) !== nota(r2)) pos = k + 1;"), 'hunts empatadas na nota exibida dividem a posicao');
  ok(b.includes("if (d) { stCache[i] = { t: Date.now(), d }; dtPush(); }") && b.includes("JSON.stringify(dtMeus()) !== dtMeusKey"), 'leitura nova de um painel refaz "Meu Ditto" se o time mudou (antes o select nascia vazio e ficava)');
  ok(b.includes("const lvConta = (lastData && +lastData.level) || (m && m.tlv) || Math.max(0, ...Object.values(stCache)") && b.includes("if (dtCfg.reach < 0 && lvConta > 0) dtCfg.reach = lvConta;"), 'nivel da conta inicial vem do push dos paineis, e so grava quando ha dado (antes: 0 = todas as hunts se o Stats nunca foi aberto)');
  ok(b.includes("const v = el.value === '' ? dtCfg[k] : +el.value;") && b.includes("salva(); renderDitto(); }; };") && !b.includes("salva(); rer(); }; };"), 'mudar um numero nao reconstroi os controles (mantinha foco e Tab), e campo vazio mantem o valor');
  ok(b.includes("if (!dtOv.classList.contains('show')) return; // fechou nos 140ms") && b.includes("onclick = dtFecha;"), 'fechar o modal cancela a varredura pendente');
  ok(b.includes("d: () => document.getElementById('dittoBtn').click(),"), 'tecla D abre o painel, como G abre a tierlist');
  ok(s.includes('<button id="dittoBtn"') && s.indexOf('<button id="dittoBtn"') > s.indexOf('<button id="tierBtn"') && s.indexOf('<button id="dittoBtn"') < s.indexOf('<button id="scriptsBtn"'), 'botao Ditto no menu, logo abaixo da tierlist');
  ['dtBtn', 'dtTitle', 'dtHint', 'dtLevel', 'dtFixos', 'dtReach', 'dtByHunt', 'dtByType', 'dtMine', 'dtNoMine', 'dtHidden'].forEach((k) => ok(s.split(k + ":'").length - 1 === 3, k + ' nos 3 idiomas'));
  ok(b.includes("num('dtLevel', 'level', 1, tlMax()); num('dtReach', 'reach', 0, tlMax());") && b.includes("const dtAtacante = () => ({ sp: dtCfg.shiny ? 'shiny ditto' : 'ditto', level: Math.max(1, Math.min(tlMax(), dtCfg.level || 100)), q: 0, ivt: 0,"), 'nivel do Ditto e da conta editaveis com limites; qualidade e IV NAO (o jogo diz que sao fixos: comum 1.4/89, shiny 2.0/119)');
  ok(b.includes("Object.assign(dtCfg, { shiny: m.shiny, level: m.level, reach: m.tlv })"), '"Meu Ditto" preenche shiny, nivel e nivel da conta com o Ditto real do time');
  ok(b.includes("dtRetryT = setTimeout(() => { if (dtOv.classList.contains('show')) renderDitto(); }, 700);"), 'sem dados do jogo ainda: espera e tenta de novo sozinho, como a tierlist');
  ok(!/dt[A-Z][a-zA-Z]*:'[^']*—/.test(s), 'textos do painel sem travessao');

  console.log('\n--- marcadores fora do ar nao levam junto sprites, stats e golpes ---');
  ok(b.includes('if (r.byId && Object.keys(r.byId).length) { creaturesById = r.byId; formDex = r.dex || {}; basesByName = r.bs || {}; movesByName = r.mv || {}; }'), 'o catalogo de criaturas e guardado mesmo sem hunts');
  const semMarc = await new Function('fetch', 'return ' + huntsSrc)((u) => (u.indexOf('map-markers') >= 0 ? Promise.reject(new Error('502')) : fetchFalso(u)));
  ok(semMarc && semMarc.h.length === 0 && Object.keys(semMarc.mv).length > 500 && Object.keys(semMarc.dex).length > 100, 'com a rota de hunts em 502, criaturas, golpes e sprites ainda chegam (' + Object.keys(semMarc.mv).length + ' especies)');

  console.log('\n--- modelo de dano: regras do jogo (STAB, matchup amplificado) e chance de matar de 1 golpe ---');
  const rd = api.ritmoDe;
  ok(rd(0) === 0 && rd(0.05) > 0.03 && rd(0.05) < 0.1 && rd(0.5) > 0.35 && rd(0.5) < 0.5, 'longe de matar de 1, o ritmo acompanha o dano (0.05 -> ' + rd(0.05).toFixed(3) + ', 0.5 -> ' + rd(0.5).toFixed(2) + ')');
  ok(rd(0.01) > 0.0105 && rd(0.01) < 0.012 && rd(0.001) > 0.00105 && rd(0.001) < 0.0012, 'com 100 golpes por kill o ritmo e ~1.13 x folga, nao 3x (a cauda da tabela era chutada em 1/30): ' + rd(0.01).toFixed(4));
  const lo = Math.exp(-4.6); ok(rd(lo * 0.9999) <= rd(lo) && rd(lo) <= rd(lo * 1.0001), 'sem degrau na borda inferior da tabela');
  ok(rd(1) > 0.65 && rd(1) < 0.8, 'matar de 1 NO LIMITE nao vale 1: com a incerteza do modelo e ~' + rd(1).toFixed(2) + ' (antes: 1, empate com quem sobra 3x)');
  ok(rd(2) > 0.93 && rd(3) > 0.98 && rd(10) > 0.995 && rd(100) <= 1, 'com folga larga chega perto de 1, nunca passa (2 -> ' + rd(2).toFixed(3) + ', 3 -> ' + rd(3).toFixed(3) + ')');
  ok([0.1, 0.3, 0.7, 1, 1.4, 1.46, 2, 4].every((m, k, arr) => k === 0 || rd(m) > rd(arr[k - 1])), 'estritamente crescente: folga 1.46 rende mais que 1.40 (o empate em 100 acabou)');
  const ramp = api.sugCalc({ sp: 'rampardos', level: 150, q: 1, ivt: 96, tlv: 0, mult: 1 }, lista.find((x) => x.name === 'Brave Charizard'));
  ok(ramp && ramp.eff === 5.5 && ramp.nome === 'Head Smash', 'Rampardos em Brave Charizard: pedra x4 vira x5.5 na hunt, como o guia do jogo diz (' + ramp.nome + ' x' + ramp.eff + ')');
  const resist = lista.find((x) => x.t1 === 'WATER' && !x.t2 && (+x.level || 0) <= 100);
  const rampW = resist && api.sugCalc({ sp: 'charizard', level: 100, q: 1, ivt: 96, tlv: 0, mult: 1 }, resist);
  ok(!rampW || rampW.eff !== 0.5, 'resistencia divide por 1.5 (x0.5 vira x0.33), nunca fica no x0.5 cru' + (rampW ? ' (' + resist.name + ': ' + rampW.nome + ' x' + rampW.eff + ')' : ''));
  ok(b.includes("const stab = g[2] && (am.t || []).indexOf(g[2]) >= 0 ? 1.5 : 1;") && b.includes("const dano = 0.1 * danoFator * p * eff * stab * (ofn / dfn);") && R.mv.charizard.t[0] === 'FIRE', 'STAB x1.5 so no golpe com o tipo do proprio pokemon (tipos do catalogo em maiusculas), K=0.1 mantem a escala');
  ok(b.includes("return e > 1 ? 1 + (e - 1) * 1.5 : e < 1 ? e / 1.5 : e; // mesma amplificacao"), 'a efetividade da linha do Simples (vs lider) usa a mesma escala amplificada do golpe');
  ok(b.includes("const ritmo = ritmoDe(best.rt), golpes = golpesDe(best.rt);") && b.includes("const kh = alvosAoe * 3600 / tempoKill(golpes) + khTm;") && !b.includes('fFolga'), 'o ritmo e a chance de matar de 1; o fator de folga a parte saiu (nao pesa duas vezes)');
  const cem600 = (() => { const rows = api.tierCalc(600, false); const max = rows[0].comp; return rows.filter((r) => Math.round(r.comp / max * 100) >= 100).length; })();
  ok(cem600 === 1, 'tierlist nv600: uma especie em 100, nao um bloco (' + cem600 + ')');
  const swN = api.dittoSweep(dShiny, lista); const mxN = swN[0].sc;
  ok(swN.filter((r) => Math.round(r.sc / mxN * 100) >= 100).length <= 3, 'Shiny Ditto por tipo: no maximo 3 tipos em 100 (eram 13 com o teto fixo)');
  const melhor = (sp) => { let bb = null; lista.forEach((x) => { if ((+x.level || 0) > 600) return; const g = api.sugCalc({ sp, level: 300, q: 2.0, ivt: 119, tlv: 600, mult: 0.8 }, x); if (g && (!bb || g.xph > bb.xph)) bb = g; }); return bb; };
  const gv = melhor('gardevoir'), hc = melhor('hitmonchan');
  ok(gv && hc && gv.xph !== hc.xph && gv.ritmo < 1 && hc.ritmo < 1, 'Gardevoir e Hitmonchan (Shiny Ditto Lv300) nao empatam mais em 100: ' + Math.round(gv.xph) + ' contra ' + Math.round(hc.xph) + ' XP por golpe');

  console.log('\n--- painel do Ditto vazio pra sempre (Chidexxi, 18/09): catalogo atrasado nao envenena o cache ---');
  const d121 = { sp: 'shiny ditto', level: 121, q: 0, ivt: 0, tlv: 121 };
  api.setCat({}, {});
  const antes = api.dittoVarre(d121, lista);
  api.setCat(R.mv, R.bs);
  const depois = api.dittoVarre(d121, lista);
  ok(antes.hunts.length === 0 && antes.rows.length === 0, 'sem catalogo (creatures.json ainda nao chegou) a varredura vem vazia');
  ok(depois.hunts.length > 200 && depois.rows.length === 18, 'o MESMO pedido depois do catalogo chegar vem cheio: ' + depois.hunts.length + ' hunts, ' + depois.rows.length + ' tipos (antes o vazio ficava no cache e o painel mostrava so o rodape "226 hunts acima do nivel da conta")');
  ok(api.dittoVarre(d121, lista) === depois, 'e o resultado cheio, esse sim, fica no cache');
  ok(lista.filter((x) => (+x.level || 0) > 121).length === 226 && depois.hunts.length === 224, 'o caso real: conta Lv121 com Shiny Ditto Lv121 tem 224 hunts alcancaveis e 226 de fora');
  console.log('\n--- XP/h de verdade: golpes por kill x tempo do golpe + sobrecarga por kill (medido nas contas do autor) ---');
  const gd = api.golpesDe;
  ok(gd(3) < 1.05 && gd(1) > 1.4 && gd(1) < 1.9 && gd(0.5) > 2.1 && gd(0.5) < 2.8 && gd(0.1) > 9 && gd(0.1) < 12, 'golpes esperados por kill: folga 3 -> ' + gd(3).toFixed(2) + ', folga 1 -> ' + gd(1).toFixed(2) + ', folga 0.5 -> ' + gd(0.5).toFixed(2) + ', folga 0.1 -> ' + gd(0.1).toFixed(1));
  ok([0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 4].every((m, k, arr) => k === 0 || gd(m) < gd(arr[k - 1])), 'estritamente decrescente na folga');
  const tp = api.tempo();
  ok(tp.a === 2.1 && tp.b === 3.1 && Math.round(api.tempoKill(1) * 10) / 10 === 5.2 && Math.round(api.tempoKill(2.1) * 10) / 10 === 7.5, 'sem medicao: 2,1 s por golpe + 3,1 s por kill (one-shot = 5,2 s = ~690 kills/h; 2,1 golpes = 7,5 s = ~480 kills/h)');
  // 25 hunts medidas em 21/09/2026 (4 contas): golpes/kill e kills/h reais
  const med = [[1.8, 615], [1.5, 574], [2.3, 455], [2.6, 431], [2.3, 554], [2.1, 456], [2.3, 564], [1.5, 567], [2.1, 470], [2.6, 410], [2, 564], [2.2, 450], [2.2, 600], [1.5, 554], [2.3, 453], [2.6, 404], [2.1, 558], [2.1, 446], [1.8, 605], [2.5, 551], [1.7, 541], [2.3, 456], [2.3, 441], [2.1, 555], [2, 465]];
  const dentro = med.filter(([h, k]) => Math.abs(3600 / api.tempoKill(h) / k - 1) <= 0.25).length;
  ok(dentro >= 22, 'o modelo padrao acerta kills/h com erro de ate 25% em ' + dentro + ' das 25 hunts medidas (so "golpes x cadencia", sem sobrecarga, errava 32% em media)');
  const hs0 = {}; med.forEach(([h, k], i) => { hs0['c' + (i % 4)] = hs0['c' + (i % 4)] || {}; hs0['c' + (i % 4)]['h' + i] = { kph: k, hpk: h, n: 10 }; });
  api.setHS(hs0); const tc = api.calibraTempo();
  ok(tc.n === 25 && tc.a > 1.5 && tc.a < 2.7 && tc.b > 2.3 && tc.b < 4.2, 'com as medicoes do usuario, refaz os tempos por Theil-Sen: ' + tc.a + ' s por golpe + ' + tc.b + ' s por kill (' + tc.n + ' pontos)');
  api.setHS({ c: { h1: { kph: 500, hpk: 2, n: 10 }, h2: { kph: 400, hpk: 3, n: 2 } } }); const tc2 = api.calibraTempo();
  ok(tc2.n === 1 && tc2.a === 2.1, 'poucos pontos (ou hunts com menos de 5 amostras): fica no padrao');
  api.setHS({ c: { scizor: { kph: 450, hpk: 2.1, tma: 3.5, n: 10 } }, d: { scizor: { kph: 460, hpk: 2, tma: 2.5, n: 10 } } });
  ok(api.alvosDe(lista.find((x) => x.name === 'Scizor')) === 3 && api.alvosDe(lista.find((x) => x.name === 'Onix')) === 2, 'alvos por salva vem da media medida na hunt (3,5 e 2,5 -> 3); sem medida, 2');
  api.setHS({});
  const g1 = api.sugCalc({ sp: 'typhlosion', level: 100, q: 1, ivt: 96, tlv: 0, mult: 1 }, lista.find((x) => x.name === 'Scizor'));
  ok(g1 && g1.golpes > 1 && g1.kh > 100 && g1.kh < 700 && Math.abs(g1.xph - g1.kh * 6008) < 1, 'sugCalc devolve golpes esperados, kills/h e XP/h = kills/h x XP da hunt (Typhlosion Lv100 em Scizor: ' + g1.golpes.toFixed(2) + ' golpes, ' + Math.round(g1.kh) + ' kills/h, ' + Math.round(g1.xph) + ' XP/h)');
  ok(api.fator() === 1 && api.danoRecalc() === 1, 'sem amostra de dano, fator 1');
  api.danoAmostra('a|x', 0.5, 100, 100); api.danoAmostra('b|x', 0.4, 100, 100);
  ok(api.fator() === 1, 'duas amostras ainda nao mudam nada');
  api.danoAmostra('c|y', 0.3, 100, 100); api.danoAmostra('a|x', 0.45, 100, 100);
  ok(api.fator() === 0.4, 'tres amostras: mediana (0.3, 0.4, 0.45 -> 0.4); a mesma conta+hunt substitui a amostra antiga, nao acumula');
  const g2 = api.sugCalc({ sp: 'typhlosion', level: 100, q: 1, ivt: 96, tlv: 0, mult: 1 }, lista.find((x) => x.name === 'Scizor'));
  ok(Math.abs(g2.mg / g1.mg - 0.4) < 0.01 && g2.golpes > g1.golpes && g2.xph < g1.xph, 'o fator entra no dano: folga cai pra 40%, mais golpes por kill, menos XP/h');
  ok(api.calChave() !== '2.1/3.1/1' && b.includes("+ ':' + calChave()") && b.includes("+ ':' + calChave() + ':'"), 'a calibracao entra nas chaves de cache da tierlist e do Ditto');
  ok(b.includes("danoAmostra(d.cid + '|' + hk, (hitHp / 100) / (sg.mg / danoFator), att.level, x.level);") && b.includes("const hitHp = hitHpDe((a.mvs || []).filter(e => e && dele.has(String(e.m).toLowerCase()))); if (!hitHp) return;") && b.includes("mvs: Array.isArray(a.mvs) ? a.mvs : [], hpk: +a.hpk || 0,"), 'cada conta com 5 min na hunt e lider conhecido vira uma amostra de dano real / folga do modelo, pelo golpe NORMAL (os de TM ficam fora)');
  ok(!b.includes('const calibraK') && b.includes("x.est = { kh: x.sug.kh, xph: x.sug.xph }"), 'a estimativa de kills/h da lista vem do modelo de tempo');
  ok(s.split("tlCal:'").length - 1 === 3 && s.split("tlCal0:'").length - 1 === 3 && s.split("tlCalT:'").length - 1 === 3, 'a dica da tierlist e do Ditto mostra a calibracao (3 idiomas)');
  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('FAIL excecao no teste: ' + ((e && e.stack) || e)); process.exit(1); });
