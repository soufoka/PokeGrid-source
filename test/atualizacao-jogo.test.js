// Atualizacao do jogo de 16/09/2026: regiao Nightmare (pokeId 50001-50110, hunts de nivel 2000 a
// 3000), categorias novas de item (berry, held, addon) e 2FA no login. Este teste roda o codigo
// REAL do index.html (HUNTS_JS desescapado, mapa de sprites, rotulos) contra um recorte dos dados
// reais do jogo em test/fixtures. Roda com: node test/atualizacao-jogo.test.js
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
// recorte unico dos dados reais do jogo (comprimido: leva golpes, stats e evolucoes)
const J = JSON.parse(require('zlib').gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };

// ---- HUNTS_JS real, desescapado (e um template literal com regex escapada) ----
const i0 = s.indexOf('const HUNTS_JS');
const ini = s.indexOf('`', i0) + 1;
const src = eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`');
try { new Function(src); ok(true, 'HUNTS_JS parseia'); } catch (e) { ok(false, 'HUNTS_JS: ' + e.message); }

const cr = { creatures: J.creatures };
const trechoNomes = src.slice(src.indexOf('const limpa='), src.indexOf('const byId='));
const { acha, cs, limpa, chave } = new Function('cr', 'gkDe', trechoNomes + '\nreturn { acha, cs, limpa, chave };')(cr, () => 0); // gkDe (gold por kill) vem definido antes do trecho
const trechoDex = src.slice(src.indexOf('const nat={}'), src.indexOf('const ms='));
const { dex } = new Function('cr', 'limpa', 'chave', trechoDex + '\nreturn { dex };')(cr, limpa, chave);

const nightmare = J.creatures.filter((c) => c.area === 'nightmare');
console.log('\n--- Nightmare: sprite pra todos (mapa forma -> dex nacional) ---');
ok(nightmare.length === 110, '110 criaturas nightmare no recorte (' + nightmare.length + ')');
const semDex = nightmare.filter((c) => !dex[c.pokeId]);
ok(semDex.length === 0, 'todas as ' + nightmare.length + ' ganham dex nacional: ' + (semDex.slice(0, 5).map((c) => c.name).join(', ') || 'nenhuma faltando'));
const beedrill = J.creatures.find((c) => c.name === 'Nightmare Beedrill');
const beedrillBase = J.creatures.find((c) => c.name === 'Beedrill');
ok(beedrill && beedrillBase && dex[beedrill.pokeId] === beedrillBase.pokeId, 'Nightmare Beedrill usa a sprite do Beedrill (' + (beedrill && dex[beedrill.pokeId]) + ')');
const alolan = J.creatures.find((c) => c.name === 'Nightmare Alolan Raichu');
ok(alolan && dex[alolan.pokeId] === 26, 'forma regional cai na base nacional (Alolan Raichu -> 26)');
const outland = J.creatures.filter((c) => c.pokeId >= 10000 && c.pokeId < 11000);
ok(outland.every((c) => dex[c.pokeId]), 'Outland (10000) continua mapeado: ' + outland.length);

console.log('\n--- hunts com dois pokemon no nome casam com o da regiao certa ---');
[['Nightmare Bagon e Shelgon', 'nightmare bagon'], ['Nightmare Dratini e Dragonair', 'nightmare dratini']].forEach(([hunt, esperado]) => {
  const r = acha(hunt);
  ok(!!r && r.nm0 === esperado, JSON.stringify(hunt) + ' -> ' + (r ? r.nm0 + ' (lv' + r.lvl + ', ' + r.xp + ' xp)' : 'NAO ACHOU'));
});
ok(acha('Nightmare Galarian Farfetchd').nm0 === "nightmare galarian farfetch'd", 'apostrofo no nome do jogo nao atrapalha');
const huntsSemCriatura = J.hunts.filter((h) => h.level > 0 && !acha(h.name));
ok(huntsSemCriatura.length === 0, 'toda hunt com nivel casa com uma criatura: ' + (huntsSemCriatura.slice(0, 5).map((h) => h.name).join(', ') || 'nenhuma perdida'));
const nmHunts = J.hunts.filter((h) => h.area === 'nightmare');
const errRegiao = nmHunts.filter((h) => { const r = acha(h.name); return !r || r.ar !== 'nightmare'; });
ok(errRegiao.length === 0, 'as ' + nmHunts.length + ' hunts nightmare apontam pra criatura nightmare (nao pra nacional): ' + (errRegiao.slice(0, 4).map((h) => h.name).join(', ') || 'todas certas'));

// a forma Outland 10001 tambem se chama "Blastoise" e sobrescrevia o Blastoise nacional: a hunt de
// Kanto "Blastoise Lv80" saia com selo OUT e concorria como melhor hunt de Outland
const arDoMarcador = { kanto: '', outland: 'outland', orre: 'orre', nightmare: 'nightmare' };
const arErrada = J.hunts.filter((h) => h.level > 0).filter((h) => { const r = acha(h.name); return r && r.ar !== arDoMarcador[h.area]; });
ok(arErrada.length === 0, 'nenhuma hunt herda a regiao de uma forma homonima: ' + (arErrada.slice(0, 5).map((h) => h.name + ' (' + h.area + ' virou ' + (acha(h.name).ar || 'kanto') + ')').join(', ') || 'todas na regiao certa'));
const blast = acha('Blastoise');
ok(blast && blast.ar === '' && blast.lvl === 80, 'Blastoise de Kanto continua sendo o nacional (lv' + (blast && blast.lvl) + ', regiao "' + (blast && blast.ar) + '")');

console.log('\n--- tierlist aceita o nivel das hunts novas ---');
const lvMax = Math.max(...J.hunts.map((h) => h.level));
ok(lvMax >= 3000, 'hunt mais alta do jogo: lv' + lvMax);
ok(s.includes('<input id="tlLevel" type="number" min="1" max="3000"'), 'input de nivel vai ate 3000');
ok(!/Math\.min\(600,/.test(s), 'nenhum clamp de 600 sobrou');
ok(s.includes('const tlMax = () => Math.max(3000,'), 'teto acompanha a hunt mais alta carregada');
const tlMax = new Function('huntsCache', s.slice(s.indexOf('const tlMax ='), s.indexOf('\n', s.indexOf('const tlMax ='))) + '\nreturn tlMax();');
ok(tlMax(null) === 3000 && tlMax(J.hunts) === lvMax && tlMax([{ level: 9000 }]) === 9000, 'tlMax: 3000 sem cache, e sobe se o jogo subir');

console.log('\n--- rotulo de regiao ---');
ok(s.includes("x2.ar === 'nightmare' ? '<b style=\"color:#ff6b6b;font-size:9px\">NIGHTMARE</b> '"), 'tierlist rotula NIGHTMARE');
ok(s.includes("(x2.ar === 'nightmare' ? ' <b style=\"color:#ff6b6b;font-size:9px\">NIGHTMARE</b>' : '')"), 'lista de hunts do Simples rotula NIGHTMARE');

console.log('\n--- mochila: toda categoria do jogo tem rotulo ---');
const LABELS = new Function(s.slice(s.indexOf('const LABELS = {'), s.indexOf(';', s.indexOf('const LABELS = {')) + 1) + '\nreturn LABELS;')();
const ORDER = new Function(s.slice(s.indexOf("const ORDER = ['potion'"), s.indexOf(';', s.indexOf("const ORDER = ['potion'")) + 1) + '\nreturn ORDER;')();
const BAGCATS = new Function(s.slice(s.indexOf('const BAGCATS = ['), s.indexOf(';', s.indexOf('const BAGCATS = [')) + 1) + '\nreturn BAGCATS;')();
const BAGCOR = new Function(s.slice(s.indexOf('const BAGCOR = {'), s.indexOf(';', s.indexOf('const BAGCOR = {')) + 1) + '\nreturn BAGCOR;')();
const cats = [...new Set(J.items.map((x) => x.category))];
const semRotulo = cats.filter((c) => !LABELS[c]);
ok(semRotulo.length === 0, 'categorias do jogo (' + cats.join(', ') + ') todas com rotulo: ' + (semRotulo.join(', ') || 'nenhuma faltando'));
['berry', 'held', 'addon'].forEach((c) => {
  ok(LABELS[c] && LABELS[c] !== 'Outros', c + ' tem rotulo proprio: ' + LABELS[c]);
  ok(ORDER.includes(c), c + ' entra na ordem');
  ok(BAGCATS.includes(LABELS[c]), LABELS[c] + ' aparece na config de categorias');
  ok(!!BAGCOR[LABELS[c]], LABELS[c] + ' tem cor');
});
ok(ORDER.indexOf('berry') < ORDER.indexOf('outros'), 'categorias novas vem antes de Outros');

console.log('\n--- pokebolas infinitas, vinculadas e com validade (lancamento de 17/09, noite) ---');
{
  // READ_ALERTS e READ_STATE reais, com a mensagem "balls" no formato novo do jogo: catalog (infinite, bound), counts, expires
  const lit = (nome) => { const i = s.indexOf('const ' + nome); const a = s.indexOf('`', i) + 1; return eval('`' + s.slice(a, s.indexOf('`', a)) + '`'); };
  const RA = lit('READ_ALERTS'), RS = lit('READ_STATE');
  const daqui = (dias) => new Date(Date.now() + dias * 864e5).toISOString();
  // sessao com 3 arremessos e nada mais: o saldo mostra quanto o app cobrou por bola
  const jogo = (balls, sess) => ({ __poke: { ws: { balls, inventory: { items: [] }, pokes: { list: [] } }, api: { '/api/characters/me': { character: { id: 1, name: 'A', level: 10 } } }, sess: Object.assign({ start: 1, drops: {}, balls: 3 }, sess) } });
  const catalog = [{ id: 1, name: 'Poke Ball', priceGold: 100, catchRate: 1 }, { id: 7, name: 'Golden Idle Ball', priceGold: 5000, catchRate: 3, infinite: true }, { id: 9, name: 'Idle Ball', priceGold: 300, bound: true }];
  const roda = (balls, sess) => ({ al: new Function('window', 'return ' + RA)(jogo(balls, sess)), st: new Function('window', 'return ' + RS)(jogo(balls, sess)) });

  const soInf = roda({ catalog, counts: { 7: 1 }, expires: { 7: daqui(30) } });
  ok(soInf.al && soInf.al.balls >= 999999, 'so uma bola infinita valida: contagem vira ilimitada (' + soInf.al.balls + '), nada de alerta de "poucas pokebolas" com 1 no estoque');
  ok(soInf.al.saldo === 0, 'o resumo nao cobra bola por conta propria: 3 arremessos sem custo somado = saldo 0 (' + soInf.al.saldo + ')');
  // o custo por arremesso e do coletor (catch-result traz ballId, conferido no bundle do jogo): trecho real, com catalogo falso
  const c0 = s.indexOf("m.type==='catch-result'){") + "m.type==='catch-result'){".length; const trecho = s.slice(c0, s.indexOf('}else if(', c0));
  const arremessa = (ids, cat) => { const P = { ws: { balls: { catalog: cat } } }, S = { balls: 0, captures: 0 }; ids.forEach((ballId) => new Function('m', 'P', 'S', trecho)({ ballId, success: false }, P, S)); return S; };
  ok(!(arremessa([7, 7, 7], catalog).supGold > 0), '3 arremessos da bola infinita custam zero (antes cobrava os 5000 dela por lancamento)');
  ok(arremessa([1, 1, 1], catalog).supGold === 300, 'bola comum de 100: 3 arremessos = 300 de gold');
  const mist = arremessa([1, 9, 7], catalog);
  ok(mist.supGold === 400 && mist.balls === 3, 'misto: cada arremesso cobra a bola que saiu naquela hora (antes era o preco da auto-catch ATUAL vezes o total: trocar de bola no meio reescrevia o custo de tudo que ja saiu)');
  ok(arremessa([1], []).balls === 1, 'catalogo ainda nao chegou: conta o arremesso e nao estoura');
  const bagInf = (soInf.st.bag.find((g) => g.label === 'Pokébolas') || {}).items || [];
  ok(bagInf.length === 1 && /∞/.test(bagInf[0].name) && bagInf[0].inf === true, 'na mochila aparece com o simbolo de infinito: ' + (bagInf[0] && bagInf[0].name));

  const vencida = roda({ catalog, counts: { 7: 1, 1: 5 }, expires: { 7: daqui(-1) } });
  ok(vencida.al.balls === 5, 'bola infinita VENCIDA nao vale: sobram as 5 comuns (' + vencida.al.balls + ')');
  ok(!(vencida.st.bag.find((g) => g.label === 'Pokébolas') || { items: [] }).items.some((x) => x.inf), 'e ela some da mochila');

  const normal = roda({ catalog, counts: { 1: 40, 9: 60 }, expires: {} });
  ok(normal.al.balls === 100, 'bolas comuns e vinculadas somam normal (' + normal.al.balls + ')');
  const comum = roda({ catalog, counts: { 1: 40 }, expires: {} }, { supGold: 300 });
  ok(comum.al.saldo === -300, 'o que o coletor somou entra no saldo: 300 de bola = saldo -300 (' + comum.al.saldo + ')');
  ok(!s.includes('ballPrice'), 'ballPrice sumiu do app (READ_ALERTS e READ_STATE nao recalculam mais o custo)');
  ok(s.includes("sBalls = g.items.some(x => x.inf) ? Math.max(g.total, 999999) : g.total"), 'Simples/Painel: bola infinita valida vira ilimitada (antes 1 no estoque disparava "poucas pokebolas" ali, mesmo com o READ_ALERTS ja tratando)');
  ok(s.includes("ballMap[x.id.slice(1)] = x.inf ? '∞' : x.qty") && s.includes("(qty === '∞' ? qty : nf(qty))"), 'itens fixados leem a mochila tratada: vencida some, infinita mostra ∞');
  const zero = roda({ catalog, counts: { 1: 0 }, expires: {} });
  ok(zero.al.hasBalls === true && zero.al.balls === 0, 'sem bola de verdade continua 0 (o alerta de "sem pokebola" segue funcionando)');
}

console.log('\n--- coletor le cada golpe do jogo: acertos, salvas em area, alvos e dano em % da vida ---');
{
  const c0 = s.indexOf("m.type==='field'){") + "m.type==='field'){".length; const trecho = s.slice(c0, s.indexOf('}else if(', c0));
  const S = {}; const roda = (m) => new Function('m', 'S', trecho)(m, S);
  roda({ type: 'field', hits: [{ slot: 0, amount: 120, move: 'Psychic' }, { slot: -1, amount: 40 }, { slot: 1, amount: 0 }, { slot: 2, amount: 80, move: 'Psychic' }], mobs: [{ slot: 0, hp: 10, maxHp: 200 }, { slot: 1, hp: 150, maxHp: 150 }] });
  ok(S.mv.Psychic.n === 2 && S.mv.Psychic.s === 1 && S.mv.Psychic.a === 2, 'golpe do seu pokemon (slot >= 0, dano > 0) conta por nome; o mesmo golpe em 2 alvos no tick e uma salva de 2 alvos (splash do AoE TM)');
  ok(S.mv.Psychic.pn === 1 && Math.abs(S.mv.Psychic.p - 0.6) < 1e-9, 'dano em % da vida do alvo ATINGIDO (120 em 200 = 60%); alvo sem vida conhecida fica fora da media');
  roda({ type: 'field', hits: [{ slot: 0, amount: 50, move: 'Ignition Point' }, { slot: 1, amount: 45, move: 'Ignition Point' }, { slot: 3, amount: 40, move: 'Ignition Point' }, { slot: 0, amount: 100, move: 'Psychic' }], mobs: [{ slot: 0, maxHp: 200 }, { slot: 1, maxHp: 150 }, { slot: 3, maxHp: 100 }] });
  ok(S.mv['Ignition Point'].s === 1 && S.mv['Ignition Point'].a === 3 && S.mv.Psychic.n === 3, 'a salva do TM elemental fica separada do golpe normal, com os alvos que acertou (3)');
  roda({ type: 'field', hits: [{ slot: 0, amount: 150, move: 'Psychic', crit: true }, { slot: 0, amount: 10, move: 'Psychic', blocked: true }], mobs: [{ slot: 0, maxHp: 200 }] });
  ok(S.mv.Psychic.n === 5 && S.mv.Psychic.pn === 2 && Math.abs(S.mv.Psychic.p - 1.1) < 1e-9, 'critico e bloqueio contam como acerto mas ficam fora da media de dano');
  for (let k = 0; k < 14; k++) roda({ type: 'field', hits: [{ slot: 0, amount: 10, move: 'Golpe' + k }], mobs: [{ slot: 0, maxHp: 200 }] });
  ok(Object.keys(S.mv).length === 12 && S.mvX && S.mvX.n >= 4 && !S.mv.Psychic && S.mv.Golpe13, 'teto de 12 golpes: despeja o que nao acerta ha mais tempo num residual (nada some da contagem), e o golpe novo entra');
  const lit = (nome) => { const i = s.indexOf('const ' + nome); const a = s.indexOf('`', i) + 1; return eval('`' + s.slice(a, s.indexOf('`', a)) + '`'); };
  const RS = lit('READ_STATE');
  const st = new Function('window', 'return ' + RS)({ __poke: { ws: { balls: { catalog: [], counts: {} }, inventory: { items: [] }, pokes: { list: [] } }, api: { '/api/characters/me': { character: { id: 1, name: 'A', level: 10 } } }, sess: { start: 1, drops: {}, kills: 10, hits: 13, mv: { Psychic: { n: 10, s: 0, a: 0, p: 5, pn: 10 }, 'Ignition Point': { n: 6, s: 2, a: 6, p: 4.8, pn: 6 } } } } });
  ok(st && st.a && st.a.hpk === 1.2 && st.a.tma === 3 && st.a.mvs.length === 2 && st.a.mvs[0].m === 'Psychic' && st.a.mvs[0].hp === 50 && st.a.mvs[1].hp === 80, 'o painel recebe ataques por kill (salva = 1 ataque: 10 + 2 = 12 em 10 kills), alvos por salva (3) e o dano de cada golpe (normal 50%, TM 80%)');
  ok(s.includes("kph: pha(sb('kills')), hpk, tma, mvs,") && s.includes("kph: ph(S.kills), hpk, tma, mvs,"), 'os dois caminhos do READ_STATE (Hunt Analyzer do servidor e conta local) devolvem isso');
  ok(s.includes("'hpk', 'tma'].forEach(k => a[k] = num(a0[k]));") && s.includes("a.mvs = (Array.isArray(a0.mvs) ? a0.mvs : []).slice(0, 8)"), 'e o push saneado deixa passar (antes o push descartava hpk: so o amostrador de fundo via)');
  ok(s.includes("hpk: ema('hpk'), tma: ema('tma'), tsh: ema('tsh'), tpa: ema('tpa')") && s.includes("t('cdHitsKill')"), 'a media por hunt guarda alvos por salva, que o modelo usa como densidade da hunt');
}

console.log('\n--- Limpar jogo esconde os avisos de combate (build de 23/09/2026: card de abate .kc-card na pilha .kc-stack) ---');
{
  const m = s.match(/s\.textContent = '([^']*cap-panel[^']*)'/);
  const sel = m ? m[1].slice(0, m[1].indexOf('{')).split(',') : [];
  ok(sel.includes('.kc-stack'), 'o card novo de abate (TREINADOR, POKÉMON, LOOT) some: a pilha .kc-stack so tem esses cards');
  ok(sel.includes('.sn-card:has(.sn-xpline)') && sel.includes('.sn-card:has(.sn-loot)'), 'o aviso antigo de combate continua escondido');
  ok(!sel.includes('.sn-stack') && !sel.includes('.sn-card'), 'level up, troca e os outros avisos do mundo continuam aparecendo');
}

console.log('\n--- 2FA: o preenchimento automatico nao toca no codigo ---');
ok(s.includes('if (ok && (!tk || tk.value) && !bb.disabled) { clearInterval(w); window.__loginWatch = false; bb.click(); }'), 'so clica com e-mail E senha preenchidos, e para depois do clique (na tela do codigo nao ha esses campos: nao clica)');
ok(s.includes("inputs.find(i => i.autocomplete === 'username')") && s.includes("inputs.find(i => i.autocomplete === 'current-password')"), 'acha os campos pelo autocomplete, que o login novo ainda usa');
ok(s.includes('/auth-imgbtn/.test(x.className)'), 'botao de entrar pela classe auth-imgbtn, que segue no login novo');

console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
process.exit(fail);
