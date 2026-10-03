// Caca de bugs 5 (03/10/2026): calculadora de IV do JustPokedex (presets/justpokedex.js) contra o build do jogo de 02/10.
// Roda o preset REAL (o corpo inteiro da IIFE, so sem montar a tela) com um DOM falso, alimentado com o texto das telas
// do jogo: rotulos do i18n do bundle de 02/10, stats e poder calculados pela formula do proprio jogo (computeStats e
// computePower do bundle) e o innerText medido no Chrome 154 com o CSS do jogo. creatures.json e PokeAPI vao recortados aqui.
// No fim, o que veio da revisao: sprite das formas com id 14xxx e o cache v2 sem base da PokeAPI de sessao sem creatures.json.
// Roda com: node test/bh5-iv.test.js   (outro preset, pra comparar: node test/bh5-iv.test.js caminho/do/justpokedex.js)
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const ARQ = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAIZ, 'presets', 'justpokedex.js');
const PRESET = fs.readFileSync(ARQ, 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const espera = async (n = 40) => { for (let k = 0; k < n; k++) await vez(); };
const perto = (ivs, alvo, tol = 1) => Object.values(ivs).every((v, k) => Math.abs(v - (Array.isArray(alvo) ? alvo[k] : alvo)) < tol);
const milhar = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // o jogo formata o poder com toLocaleString('pt-BR')

// ===== dados do jogo =====
// rotulos do i18n do bundle de 02/10. inv = tooltip da mochila (window.inventory.*), tv = tooltip generico
// (window.pokeTooltip.*: chat, troca, familia, deposito). Ordem: nivel, qualidade, IV, HP, Atk, Def, SpA, SpD,
// velocidade, poder, chip do ativo, chip da equipe, chip de guardado, chip shiny
const ROT = {
  pt: {
    inv: ['Nv', 'Qualidade', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel', 'Poder', '⚔ Ativo', 'Equipe', 'Guardado', 'Shiny'],
    tv: ['Nv', 'Qualidade', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel', 'Poder', '⚔ Ativo', 'Equipe', 'Guardado', 'Shiny'],
    dicas: ['➕ Duplo-clique para adicionar à equipe', '➖ Duplo-clique para desequipar', ' · clique no HUD para deixá-lo ativo', '🔗 Shift+clique para linkar no chat'],
    // Detalhes do Anuncio: titulo, tipo, Nivel, IV, Raridade, Poder, Tipos, Atributos, 6 stats, preco, comprar, pokebola, quantidade
    mkt: ['Detalhes do Anúncio', 'Pokémon', 'Nível', 'IV', 'Raridade', 'Poder', 'Tipos', 'Atributos', 'HP', 'Atq', 'Def', 'Atq. Esp.', 'Def. Esp.', 'Veloc.', 'Preço Unitário', 'Comprar Agora', 'Pokébola', 'Quantidade'],
    tipos: { BUG: 'Inseto', DARK: 'Sombrio', DRAGON: 'Dragão', ELECTRIC: 'Elétrico', FAIRY: 'Fada', FIGHTING: 'Lutador', FIRE: 'Fogo', FLYING: 'Voador', GHOST: 'Fantasma', GRASS: 'Planta', GROUND: 'Terra', ICE: 'Gelo', NORMAL: 'Normal', POISON: 'Veneno', PSYCHIC: 'Psíquico', ROCK: 'Pedra', STEEL: 'Aço', WATER: 'Água' }
  },
  en: {
    inv: ['Lv', 'Quality', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spd', 'Power', '⚔ Active', 'Team', 'Stored', 'Shiny'],
    tv: ['Lv', 'Quality', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe', 'Power', '⚔ Active', 'Team', 'Stored', 'Shiny'],
    dicas: ['➕ Double-click to add to the team', '➖ Double-click to unequip', ' · click on the HUD to make it active', '🔗 Shift+click to link in chat'],
    mkt: ['Listing Details', 'Pokémon', 'Level', 'IV', 'Rarity', 'Power', 'Types', 'Stats', 'HP', 'Atk', 'Def', 'Sp. Atk', 'Sp. Def', 'Speed', 'Unit Price', 'Buy Now', 'Poké Ball', 'Quantity'],
    tipos: { BUG: 'Bug', DARK: 'Dark', DRAGON: 'Dragon', ELECTRIC: 'Electric', FAIRY: 'Fairy', FIGHTING: 'Fighting', FIRE: 'Fire', FLYING: 'Flying', GHOST: 'Ghost', GRASS: 'Grass', GROUND: 'Ground', ICE: 'Ice', NORMAL: 'Normal', POISON: 'Poison', PSYCHIC: 'Psychic', ROCK: 'Rock', STEEL: 'Steel', WATER: 'Water' }
  },
  es: {
    inv: ['Nv', 'Calidad', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel', 'Poder', '⚔ Activo', 'Equipo', 'Guardado', 'Shiny'],
    tv: ['Nv', 'Calidad', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel', 'Poder', '⚔ Activo', 'Equipo', 'Guardado', 'Shiny'],
    dicas: ['➕ Doble clic para añadir al equipo', '➖ Doble clic para quitar del equipo', ' · haz clic en el HUD para dejarlo activo', '🔗 Shift+clic para enlazar en el chat'],
    mkt: ['Detalles del anuncio', 'Pokémon', 'Nivel', 'IV', 'Rareza', 'Poder', 'Tipos', 'Estadísticas', 'HP', 'Ata', 'Def', 'At. Esp.', 'Def. Esp.', 'Vel.', 'Precio unitario', 'Comprar ahora', 'Poké Ball', 'Cantidad'],
    tipos: { BUG: 'Bicho', DARK: 'Siniestro', DRAGON: 'Dragón', ELECTRIC: 'Eléctrico', FAIRY: 'Hada', FIGHTING: 'Lucha', FIRE: 'Fuego', FLYING: 'Volador', GHOST: 'Fantasma', GRASS: 'Planta', GROUND: 'Tierra', ICE: 'Hielo', NORMAL: 'Normal', POISON: 'Veneno', PSYCHIC: 'Psíquico', ROCK: 'Roca', STEEL: 'Acero', WATER: 'Agua' }
  }
};

// pokemons com stats e poder da formula do jogo: [nome, nivel, qualidade, rotulo da qualidade, IV total,
// [hp, atk, def, spa, spd, vel], poder, tipos, IV de verdade por stat (growth)]
const PK = {
  scizor80: ['Scizor', 80, 1.55, 'Épica', 122, [146, 216, 159, 85, 154, 101], 1335, ['BUG', 'STEEL'], [25, 30, 20, 10, 28, 9]],
  scizor50: ['Scizor', 50, 1.3, 'Rara', 75, [58, 94, 76, 50, 67, 61], 528, ['BUG', 'STEEL'], [10, 11, 12, 13, 14, 15]],
  scizorShiny: ['Scizor', 50, 1.4, 'Rara', 120, [76, 111, 92, 62, 79, 72], 689, ['BUG', 'STEEL'], [20, 20, 20, 20, 20, 20]],
  charizard: ['Charizard', 50, 1.2, 'Incomum', 60, [58, 60, 57, 75, 61, 71], 458, ['FIRE', 'FLYING'], [10, 10, 10, 10, 10, 10]],
  gyarados60: ['Gyarados', 60, 1.3, 'Rara', 60, [89, 107, 73, 59, 89, 78], 644, ['WATER', 'FLYING'], [10, 10, 10, 10, 10, 10]],
  pikachu60: ['Pikachu', 60, 1.3, 'Rara', 180, [73, 85, 74, 81, 81, 115], 662, ['ELECTRIC'], [30, 30, 30, 30, 30, 30]],
  pikachu40: ['Pikachu', 40, 1.2, 'Incomum', 120, [36, 44, 37, 42, 42, 62], 316, ['ELECTRIC'], [20, 20, 20, 20, 20, 20]],
  scizor40: ['Scizor', 40, 1.2, 'Incomum', 120, [52, 79, 65, 44, 56, 50], 415, ['BUG', 'STEEL'], [20, 20, 20, 20, 20, 20]],
  gyaradosMkt: ['Gyarados', 120, 1.72, 'Lendária', 131, [263, 331, 228, 144, 296, 263], 2623, ['WATER', 'FLYING'], [18, 27, 22, 9, 30, 25]],
  // as 16 especies em que o creatures.json do jogo (Gen 6) difere da PokeAPI (Gen 7+): Nv 100, x1.40, IV 20 em tudo
  Arbok: ['Arbok', 100, 1.4, 'Rara', 120, [138, 164, 143, 137, 156, 165], 1264, ['POISON']],
  Dugtrio: ['Dugtrio', 100, 1.4, 'Rara', 120, [103, 157, 118, 118, 144, 220], 1204, ['GROUND']],
  Farfetchd: ['Farfetchd', 100, 1.4, 'Rara', 120, [127, 137, 124, 128, 134, 138], 1103, ['NORMAL', 'FLYING']],
  Dodrio: ['Dodrio', 100, 1.4, 'Rara', 120, [138, 196, 144, 131, 131, 193], 1306, ['NORMAL', 'FLYING']],
  Electrode: ['Electrode', 100, 1.4, 'Rara', 120, [138, 118, 144, 157, 157, 248], 1347, ['ELECTRIC']],
  Exeggutor: ['Exeggutor', 100, 1.4, 'Rara', 120, [186, 177, 164, 216, 137, 131], 1415, ['GRASS', 'PSYCHIC']],
  Noctowl: ['Noctowl', 100, 1.4, 'Rara', 120, [193, 118, 118, 152, 178, 151], 1274, ['NORMAL', 'FLYING']],
  Ariados: ['Ariados', 100, 1.4, 'Rara', 120, [151, 170, 144, 131, 131, 110], 1172, ['BUG', 'POISON']],
  Qwilfish: ['Qwilfish', 100, 1.4, 'Rara', 120, [145, 177, 151, 124, 124, 172], 1250, ['WATER', 'POISON']],
  Magcargo: ['Magcargo', 100, 1.4, 'Rara', 120, [124, 118, 209, 157, 157, 96], 1205, ['FIRE', 'ROCK']],
  Corsola: ['Corsola', 100, 1.4, 'Rara', 120, [131, 124, 164, 137, 164, 103], 1152, ['WATER', 'ROCK']],
  Mantine: ['Mantine', 100, 1.4, 'Rara', 120, [145, 105, 144, 157, 236, 151], 1313, ['WATER', 'FLYING']],
  Swellow: ['Swellow', 100, 1.4, 'Rara', 120, [138, 164, 131, 118, 118, 227], 1254, ['NORMAL', 'FLYING']],
  Pelipper: ['Pelipper', 100, 1.4, 'Rara', 120, [138, 118, 183, 164, 144, 145], 1249, ['WATER', 'FLYING']],
  Lunatone: ['Lunatone', 100, 1.4, 'Rara', 120, [151, 124, 137, 177, 164, 151], 1266, ['ROCK', 'PSYCHIC']],
  Solrock: ['Solrock', 100, 1.4, 'Rara', 120, [151, 177, 164, 124, 137, 151], 1266, ['ROCK', 'PSYCHIC']],
  // as 7 formas com id 14xxx: Nv 100, x1.40, IV 20 em tudo
  'Mega Blastoise': ['Mega Blastoise', 100, 1.4, 'Rara', 120, [164, 187, 209, 229, 203, 162], 1616, ['WATER']],
  'Mega Alakazam': ['Mega Alakazam', 100, 1.4, 'Rara', 120, [131, 118, 137, 281, 177, 262], 1548, ['PSYCHIC']],
  'Mega Gardevoir': ['Mega Gardevoir', 100, 1.4, 'Rara', 120, [149, 164, 137, 268, 229, 193], 1596, ['PSYCHIC', 'FAIRY']],
  'Mega Sableye': ['Mega Sableye', 100, 1.4, 'Rara', 120, [124, 164, 216, 164, 203, 83], 1336, ['DARK', 'GHOST']],
  'Mega Altaria': ['Mega Altaria', 100, 1.4, 'Rara', 120, [158, 196, 196, 196, 190, 165], 1541, ['DRAGON', 'FAIRY']],
  'Castform Fire': ['Castform Fire', 100, 1.4, 'Rara', 120, [151, 144, 144, 144, 144, 151], 1229, ['FIRE']],
  'Mega Lucario': ['Mega Lucario', 100, 1.4, 'Rara', 120, [151, 242, 168, 236, 144, 209], 1610, ['FIGHTING', 'STEEL']]
};
const G16 = ['Arbok', 'Dugtrio', 'Farfetchd', 'Dodrio', 'Electrode', 'Exeggutor', 'Noctowl', 'Ariados', 'Qwilfish', 'Magcargo', 'Corsola', 'Mantine', 'Swellow', 'Pelipper', 'Lunatone', 'Solrock'];

// /game/creatures.json de 02/10 (recorte; Swellow, Pelipper, Gardevoir, Sableye, Altaria e Lucario sao a entrada de Orre,
// a ultima com o nome, que e a que o preset guarda): [name, pokeId, type1, type2, baseHp, baseAtk, baseDef, baseSpAtk,
// baseSpDef, baseSpeed, captureBase (quando tem)]
const CRIATURAS = [
  // as 7 entradas com id 14xxx (megas e Castform Fire, sem captureBase) e as especies base das megas
  ['Mega Blastoise', 14009, 'WATER', null, 79, 103, 120, 135, 115, 78],
  ['Mega Alakazam', 14065, 'PSYCHIC', null, 55, 50, 65, 175, 95, 150],
  ['Mega Gardevoir', 14282, 'PSYCHIC', 'FAIRY', 68, 85, 65, 165, 135, 100],
  ['Mega Sableye', 14302, 'DARK', 'GHOST', 50, 85, 125, 85, 115, 20],
  ['Mega Altaria', 14334, 'DRAGON', 'FAIRY', 75, 110, 110, 110, 105, 80],
  ['Castform Fire', 14351, 'FIRE', null, 70, 70, 70, 70, 70, 70],
  ['Mega Lucario', 14448, 'FIGHTING', 'STEEL', 70, 145, 88, 140, 70, 112],
  ['Blastoise', 10001, 'WATER', null, 79, 83, 100, 85, 105, 78, 9],
  ['Alakazam', 65, 'PSYCHIC', null, 55, 50, 45, 135, 95, 120],
  ['Gardevoir', 13282, 'PSYCHIC', 'FAIRY', 68, 65, 65, 125, 115, 80, 282],
  ['Sableye', 13302, 'DARK', 'GHOST', 50, 75, 75, 65, 65, 50, 302],
  ['Altaria', 13334, 'DRAGON', 'FLYING', 75, 70, 90, 70, 105, 80, 334],
  ['Lucario', 13448, 'FIGHTING', 'STEEL', 70, 110, 70, 115, 70, 90, 448],
  ['Pikachu', 25, 'ELECTRIC', null, 35, 55, 40, 50, 50, 90],
  ['Gyarados', 130, 'WATER', 'FLYING', 95, 125, 79, 60, 100, 81],
  ['Scizor', 212, 'BUG', 'STEEL', 70, 130, 100, 55, 80, 65],
  ['Charizard', 6, 'FIRE', 'FLYING', 78, 84, 78, 109, 85, 100],
  ['Arbok', 24, 'POISON', null, 60, 85, 69, 65, 79, 80],
  ['Dugtrio', 51, 'GROUND', null, 35, 80, 50, 50, 70, 120],
  ['Farfetchd', 83, 'NORMAL', 'FLYING', 52, 65, 55, 58, 62, 60],
  ['Dodrio', 85, 'NORMAL', 'FLYING', 60, 110, 70, 60, 60, 100],
  ['Electrode', 101, 'ELECTRIC', null, 60, 50, 70, 80, 80, 140],
  ['Exeggutor', 103, 'GRASS', 'PSYCHIC', 95, 95, 85, 125, 65, 55],
  ['Noctowl', 164, 'NORMAL', 'FLYING', 100, 50, 50, 76, 96, 70],
  ['Ariados', 168, 'BUG', 'POISON', 70, 90, 70, 60, 60, 40],
  ['Qwilfish', 211, 'WATER', 'POISON', 65, 95, 75, 55, 55, 85],
  ['Magcargo', 219, 'FIRE', 'ROCK', 50, 50, 120, 80, 80, 30],
  ['Corsola', 222, 'WATER', 'ROCK', 55, 55, 85, 65, 85, 35],
  ['Mantine', 226, 'WATER', 'FLYING', 65, 40, 70, 80, 140, 70],
  ['Swellow', 13277, 'NORMAL', 'FLYING', 60, 85, 60, 50, 50, 125],
  ['Pelipper', 13279, 'WATER', 'FLYING', 60, 50, 100, 85, 70, 65],
  ['Lunatone', 337, 'ROCK', 'PSYCHIC', 70, 55, 65, 95, 85, 70],
  ['Solrock', 338, 'ROCK', 'PSYCHIC', 70, 95, 85, 55, 65, 70]
].map(([name, pokeId, type1, type2, baseHp, baseAtk, baseDef, baseSpAtk, baseSpDef, baseSpeed, captureBase]) => Object.assign({ pokeId, name, type1, type2, baseHp, baseAtk, baseDef, baseSpAtk, baseSpDef, baseSpeed }, captureBase ? { captureBase } : {}));
// PokeAPI (resposta de 03/10, so id, stats e tipos): [id, hp, atk, def, spa, spd, vel, tipos]. dragapult nao existe no jogo.
const POKEAPI = Object.fromEntries(Object.entries({
  dugtrio: [51, 35, 100, 50, 50, 70, 120, ['ground']], arbok: [24, 60, 95, 69, 65, 79, 80, ['poison']],
  farfetchd: [83, 52, 90, 55, 58, 62, 60, ['normal', 'flying']], dodrio: [85, 60, 110, 70, 60, 60, 110, ['normal', 'flying']],
  electrode: [101, 60, 50, 70, 80, 80, 150, ['electric']], exeggutor: [103, 95, 95, 85, 125, 75, 55, ['grass', 'psychic']],
  noctowl: [164, 100, 50, 50, 86, 96, 70, ['normal', 'flying']], ariados: [168, 70, 90, 70, 60, 70, 40, ['bug', 'poison']],
  qwilfish: [211, 65, 95, 85, 55, 55, 85, ['water', 'poison']], magcargo: [219, 60, 50, 120, 90, 80, 30, ['fire', 'rock']],
  corsola: [222, 65, 55, 95, 65, 95, 35, ['water', 'rock']], mantine: [226, 85, 40, 70, 80, 140, 70, ['water', 'flying']],
  swellow: [277, 60, 85, 60, 75, 50, 125, ['normal', 'flying']], pelipper: [279, 60, 50, 100, 95, 70, 65, ['water', 'flying']],
  lunatone: [337, 90, 55, 65, 95, 85, 70, ['rock', 'psychic']], solrock: [338, 90, 95, 85, 55, 65, 70, ['rock', 'psychic']],
  scizor: [212, 70, 130, 100, 55, 80, 65, ['bug', 'steel']], pikachu: [25, 35, 55, 40, 50, 50, 90, ['electric']],
  charizard: [6, 78, 84, 78, 109, 85, 100, ['fire', 'flying']], gyarados: [130, 95, 125, 79, 60, 100, 81, ['water', 'flying']],
  castform: [351, 70, 70, 70, 70, 70, 70, ['normal']], // a PokeAPI nao tem "castform-fire": o preset antigo caia aqui pelo primeiro nome
  dragapult: [887, 88, 120, 75, 100, 75, 142, ['dragon', 'ghost']]
}).map(([nome, [id, ...r]]) => [nome, { id, name: nome, stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((s, k) => ({ base_stat: r[k], stat: { name: s } })), types: r[6].map((t) => ({ type: { name: t } })) }]));

// innerText medido no Chrome 154 headless com o CSS do jogo: tooltip da mochila de um Charizard shiny da equipe
// com TM e berry de Agua (o <b> do chip da berry sai numa linha propria) e o painel do Mercado (truncado nos 2 primeiros stats)
const CHROME = {
  tip: 'Charizard ✨\nFOGO\nVOADOR\nEquipe\nShiny\n💿 TM Disk - Fire\nX-Attack T3\nWater\n12 min\nNv 40\nQualidade Lendária ×1.70\nIV 150/192\nHP 812\nAtk 540\nDef 410\nSpA 190\nSpD 330\nVel 260\n💪 Poder 2.310\n➖ Duplo-clique para desequipar · clique no HUD para deixá-lo ativo\n🔗 Shift+clique para linkar no chat',
  mkt: '◆\nDETALHES DO ANÚNCIO\nGyarados\nPokémon\n⚡ Nível\n120\nIV\n131/192\nRaridade\nLendária ×1.72\nPoder\n⚡2.623\nTipos\nÁGUA\nVOADOR\nATRIBUTOS\nHP\n512\nAtq\n600',
  mktSpans: ['Pokémon', '⚡ Nível', 'IV', 'Raridade', 'Poder', 'Tipos', 'ÁGUA\nVOADOR', 'ÁGUA', 'VOADOR'], // o que o seletor antigo pegava
  cells: ['HP\n512', 'Atq\n600']
};

// tooltip do jogo (.inv-tip) na ordem do JSX do bundle: nome (+ " ✨"), tipos (o .pp-type e uppercase no CSS), chip de
// status, chip shiny, nivel, qualidade, IV, os 6 stats, poder e, na mochila, as dicas. Chips e stats sao itens de
// flex/grid, entao cada um sai numa linha no innerText.
function tooltip(lang, janela, id, o = {}) {
  const [nome, nv, q, ql, ivTot, st, poder, tipos] = PK[id];
  const [lv, qual, iv, hp, atk, def, spa, spd, vel, pw, ativo, equipe, guardado, shiny] = ROT[lang][janela];
  const [addTeam, unequip, sufixoAtivo, chat] = ROT[lang].dicas;
  const L = [nome + (o.shiny ? ' ✨' : '')].concat(tipos.map((t) => ROT[lang].tipos[t].toUpperCase()));
  L.push(o.lider ? ativo : o.equipe ? equipe : guardado);
  if (o.shiny) L.push(shiny);
  L.push(lv + ' ' + nv, qual + ' ' + ql + ' ×' + q.toFixed(2), iv + ' ' + ivTot + '/192');
  [hp, atk, def, spa, spd, vel].forEach((r, k) => L.push(r + ' ' + st[k]));
  L.push('💪 ' + pw + ' ' + milhar(poder));
  if (janela === 'inv') L.push(!o.equipe && !o.lider ? addTeam : unequip + (o.lider ? '' : sufixoAtivo), chat);
  return L.join('\n');
}

// ===== DOM falso e o preset real =====
class El {
  constructor(o = {}) { Object.assign(this, { style: { setProperty() {}, removeProperty() {} }, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, dataset: {}, childElementCount: 0, innerHTML: '', _ev: {} }, o); }
  addEventListener(t, f) { (this._ev[t] = this._ev[t] || []).push(f); }
  removeEventListener() {}
  querySelector(q) { return (this.q && this.q[q]) || null; }
  querySelectorAll(q) { return (this.qa && this.qa[q]) || []; }
  appendChild(c) { return c; } remove() { this.removido = true; } contains(x) { return x === this; } closest() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, right: 300, bottom: 400, width: 300, height: 400 }; }
  insertAdjacentElement() {} setAttribute() {}
}
// painel "Detalhes do Anuncio" (aside.mkt2-details, componente lu do bundle): o .mkt2-details-name so tem o nome; nivel,
// IV, raridade, poder e tipos ficam em .mkt2-stat (flex: rotulo e valor em linhas separadas); stats em .mkt2-statcell
function anuncio(lang, id) {
  const [nome, nv, q, ql, ivTot, st, poder, tipos] = PK[id];
  const [titulo, kindPk, nivel, iv, raridade, pw, rotTipos, atributos] = ROT[lang].mkt, rotStats = ROT[lang].mkt.slice(8, 14);
  const tx = tipos.map((t) => ROT[lang].tipos[t].toUpperCase()), el = (t) => new El({ innerText: t });
  const linhas = [['⚡ ' + nivel, String(nv)], [iv, ivTot + '/192'], [raridade, ql + ' ×' + q.toFixed(2)], [pw, '⚡' + milhar(poder)]];
  const texto = ['◆', titulo.toUpperCase(), nome, kindPk].concat(...linhas, [rotTipos], tx, [atributos.toUpperCase()], ...rotStats.map((r, k) => [r, String(st[k])]), [ROT[lang].mkt[14], '12.000', ROT[lang].mkt[15]]).join('\n');
  return new El({
    innerText: texto,
    q: { '.mkt2-details-name': el(nome), '.mkt2-stats': el(rotStats.map((r, k) => r + '\n' + st[k]).join('\n')) },
    qa: { '.mkt2-stat-types > span': tx.map(el), '.mkt2-stats .mkt2-statcell': rotStats.map((r, k) => el(r + '\n' + st[k])),
      '.mkt2-card-badges span, .mkt2-statlist span': [el(kindPk)].concat(linhas.map(([r]) => el(r)), [el(rotTipos), el(tx.join('\n'))], tx.map(el)) }
  });
}
// corpo da IIFE do preset ate a montagem da tela (criarPainel e o resto ficam de fora), devolvendo as funcoes internas
function preset(opts = {}) {
  const ini = PRESET.indexOf('(function () {') + '(function () {'.length, fim = PRESET.indexOf('\n    criarPainel();\n');
  if (ini < 15 || fim < 0) throw new Error('estrutura do preset mudou');
  const corpo = PRESET.slice(ini, fim) + `
    return { parsePokemon, processarTooltip, processarDadosMercado, observarDepositoFamilia, buscarAtributosBase, apiCache,
      get ultimoPokemon() { return ultimoPokemon; } };`;
  const logs = [], docEv = {}, pedidos = [], byId = opts.byId || {};
  const ls = new Map(Object.entries(opts.ls || {}));
  const document = {
    getElementById: (id) => byId[id] || null, querySelector: (q) => (opts.qs ? opts.qs(q) : null), querySelectorAll: () => [],
    addEventListener: (t, f) => { (docEv[t] = docEv[t] || []).push(f); }, createElement: () => new El(), head: new El(), body: new El(), documentElement: new El()
  };
  class WS { addEventListener() {} }
  const window = { WebSocket: WS, innerWidth: 1600, innerHeight: 900, addEventListener() {} };
  const localStorage = { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) };
  const fetch = async (u) => {
    pedidos.push(String(u));
    await vez(); // a resposta chega numa volta seguinte do event loop, como a rede de verdade
    if (u === '/game/creatures.json') {
      if (opts.creatures) await opts.creatures; // carga lenta
      return opts.semCreatures ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, json: async () => ({ creatures: CRIATURAS }) };
    }
    const m = /pokeapi\.co\/api\/v2\/pokemon\/([^/?]+)$/.exec(String(u)), nome = m && decodeURIComponent(m[1]);
    if (nome && POKEAPI[nome]) { if (opts.segura && opts.segura[nome]) await opts.segura[nome]; return { ok: true, json: async () => JSON.parse(JSON.stringify(POKEAPI[nome])) }; }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  class MO { observe() {} disconnect() {} }
  const consoleF = { log: (...a) => logs.push(a.map(String).join(' ')), warn() {}, error() {} };
  const api = new Function('window', 'document', 'localStorage', 'fetch', 'MutationObserver', 'HTMLElement', 'navigator', 'console', corpo)(
    window, document, localStorage, fetch, MO, El, { clipboard: { writeText: async () => {} } }, consoleF);
  return Object.assign(api, { docEv, pedidos, ls, msgs: () => logs.filter((l) => l.startsWith('__PGIV__')).map((l) => JSON.parse(l.slice(8))) });
}
const tela = () => ({ content: new El(), 'pokemon-reader-panel': new El(), 'btn-historico': new El(), fix: new El() });
const listaEff = (html, rotulo) => { const m = new RegExp(rotulo + '<\\/span>\\s*<div class="eff-badges"[^>]*>([\\s\\S]*?)<\\/div>').exec(html); return m ? [...m[1].matchAll(/>\s*([^<>]+?)\s*<\/span>/g)].map((x) => x[1]) : null; };

(async () => {
  console.log('preset: ' + path.relative(process.cwd(), ARQ));

  await secao('Mercado, Detalhes do Anuncio (ALTA: nivel 1, poder 2, rotulos viravam tipo, IV 32/32; item virava "Pokemon nao encontrado")', async () => {
    const [nome, nv, q, , ivTot, st, poder, , growth] = PK.gyaradosMkt;
    for (const lang of ['pt', 'en', 'es']) {
      const aside = anuncio(lang, 'gyaradosMkt');
      const P = preset({ qs: (s) => (s === 'aside.mkt2-details' ? aside : null) });
      P.processarDadosMercado();
      const u = P.ultimoPokemon || {};
      const tiposTela = PK.gyaradosMkt[7].map((t) => ROT[lang].tipos[t].toUpperCase());
      ok(u.nome === nome && u.nivel === nv && u.poder === poder && u.multiplicadorQualidade === q && u.ivAtual === ivTot, '[' + lang + '] nivel ' + u.nivel + ' (anuncio Nv ' + nv + '), poder ' + u.poder + ' (tela "⚡' + milhar(poder) + '"), x' + u.multiplicadorQualidade + ', IV ' + u.ivAtual);
      ok(JSON.stringify(u.tipos) === JSON.stringify(tiposTela), '[' + lang + '] tipos so dos badges do bloco Tipos: ' + JSON.stringify(u.tipos));
      ok([u.hp, u.atk, u.def, u.spa, u.spd, u.vel].join() === st.join(), '[' + lang + '] stats das 6 celas: ' + [u.hp, u.atk, u.def, u.spa, u.spd, u.vel].join('/'));
      await espera();
      const r = P.msgs().pop();
      ok(r && r.nivel === nv && perto(r.ivs, growth), '[' + lang + '] card do app: IV por stat ' + (r && Object.values(r.ivs).join('/')) + ' (verdade ' + growth.join('/') + ')');
    }
    // o mesmo com o innerText medido no Chrome
    const el = (t) => new El({ innerText: t });
    const real = new El({ innerText: CHROME.mkt, q: { '.mkt2-details-name': el('Gyarados'), '.mkt2-stats': el(CHROME.cells.join('\n')) },
      qa: { '.mkt2-stat-types > span': CHROME.mktSpans.slice(-2).map(el), '.mkt2-stats .mkt2-statcell': CHROME.cells.map(el), '.mkt2-card-badges span, .mkt2-statlist span': CHROME.mktSpans.map(el) } });
    const P = preset({ qs: (s) => (s === 'aside.mkt2-details' ? real : null) });
    P.processarDadosMercado();
    const u = P.ultimoPokemon || {};
    ok(u.nivel === 120 && u.poder === 2623 && u.multiplicadorQualidade === 1.72 && u.ivAtual === 131 && u.hp === 512 && JSON.stringify(u.tipos) === '["ÁGUA","VOADOR"]', 'innerText real do Chrome: nivel ' + u.nivel + ', poder ' + u.poder + ', tipos ' + JSON.stringify(u.tipos));
    // item no mercado: nao tem o bloco de atributos, nao vai pro card
    const [titulo, , , , , , , , , , , , , , , , ball, qtd] = ROT.pt.mkt;
    const item = new El({ innerText: ['◆', titulo.toUpperCase(), 'Ultra Ball', ball, qtd, '50×'].join('\n'), q: { '.mkt2-details-name': el('Ultra Ball') }, qa: { '.mkt2-card-badges span, .mkt2-statlist span': [el(ball), el(qtd)] } });
    const Pi = preset({ qs: (s) => (s === 'aside.mkt2-details' ? item : null) });
    Pi.processarDadosMercado();
    await espera();
    ok(Pi.ultimoPokemon === null && Pi.msgs().length === 0, 'clicar num item (Ultra Ball) nao mexe no card (antes: "Pokémon não encontrado: Ultra Ball")' + (Pi.msgs().length ? ' -> ' + JSON.stringify(Pi.msgs()) : ''));
  });

  await secao('atributos-base do jogo (creatures.json) e nao da PokeAPI (MEDIA: 16 especies com IV errado)', async () => {
    const P = preset();
    const erradas = [];
    for (const n of G16) {
      P.processarTooltip({ innerText: tooltip('pt', 'inv', n) });
      await espera();
      const r = P.msgs().pop();
      if (!r || r.nome !== n || !perto(r.ivs, 20)) erradas.push(n + ' IV ' + (r && r.ivs ? Object.values(r.ivs).join('/') : 'sem card'));
    }
    ok(erradas.length === 0, 'as 16 especies saem com IV 20 em todos os stats, como no jogo' + (erradas.length ? ': ' + erradas.join('; ') : ''));
    const api = P.pedidos.filter((u) => /pokeapi\.co/.test(u));
    ok(api.length === 0, 'especie que esta no creatures.json nem vai na PokeAPI (' + api.length + ' pedidos)');
    // tooltip lido logo que o painel abre, com o creatures.json ainda chegando: espera a carga
    let solta; const lento = new Promise((r) => { solta = r; });
    const P2 = preset({ creatures: lento });
    P2.processarTooltip({ innerText: tooltip('pt', 'inv', 'Corsola') });
    await espera(10);
    solta();
    await espera();
    const r2 = P2.msgs().pop();
    ok(r2 && perto(r2.ivs, 20) && !P2.pedidos.some((u) => /pokeapi/.test(u)), 'hover antes do creatures.json chegar: espera a carga e usa a base do jogo (IV ' + (r2 && Object.values(r2.ivs).join('/')) + ')');
    // quem ja tinha o cache velho (base da PokeAPI guardada pra sempre no localStorage)
    const velho = { dugtrio: { id: 51, hp: 35, atk: 100, def: 50, spa: 50, spd: 70, vel: 120, tipos: ['Terra'] } };
    const P3 = preset({ ls: { 'pokemon-api-cache': JSON.stringify(velho) } });
    P3.processarTooltip({ innerText: tooltip('pt', 'inv', 'Dugtrio') });
    await espera();
    const r3 = P3.msgs().pop();
    ok(r3 && r3.bases.atk === 80 && perto(r3.ivs, 20), 'cache antigo com a base errada (atk 100) nao vale mais: base ' + (r3 && r3.bases.atk) + ', IV ' + (r3 && Object.values(r3.ivs).join('/')));
    // o que nao esta no jogo (analise manual por nome) continua indo na PokeAPI, e sem creatures.json tambem
    const b = await preset().buscarAtributosBase('Dragapult');
    ok(b && b.id === 887 && b.vel === 142, 'nome fora do jogo: base da PokeAPI (Dragapult vel ' + (b && b.vel) + ')');
    const P4 = preset({ semCreatures: true });
    const b4 = await P4.buscarAtributosBase('Dugtrio');
    ok(b4 && b4.atk === 100 && P4.pedidos.some((u) => /pokeapi\.co\/api\/v2\/pokemon\/dugtrio$/.test(u)), 'creatures.json fora do ar: cai na PokeAPI como antes (atk ' + (b4 && b4.atk) + ')');
  });

  await secao('jogo em ingles: velocidade "Spd" da mochila (MEDIA: velocidade 0)', async () => {
    const st = PK.scizor80[5];
    const P = preset();
    for (const [lang, jan] of [['en', 'inv'], ['en', 'tv'], ['pt', 'inv'], ['pt', 'tv'], ['es', 'inv'], ['es', 'tv']]) {
      const p = P.parsePokemon(tooltip(lang, jan, 'scizor80', { lider: true }));
      ok(p.vel === st[5] && p.spd === st[4] && p.spa === st[3], lang + '/' + (jan === 'inv' ? 'mochila' : 'tooltip') + ': velocidade ' + p.vel + ', def. especial ' + p.spd + ' (' + ROT[lang][jan][8] + ' ' + st[5] + ', SpD ' + st[4] + ')');
    }
    const P2 = preset();
    P2.processarTooltip({ innerText: tooltip('en', 'inv', 'scizor80', { lider: true }) });
    await espera();
    const r = P2.msgs().pop();
    ok(r && Math.abs(r.ivs.vel - 9) < 1 && perto(r.ivs, PK.scizor80[8]), 'card do app em ingles: IV ' + (r && Object.values(r.ivs).join('/')) + ' (verdade ' + PK.scizor80[8].join('/') + ')');
  });

  await secao('fechar o historico: um ouvinte de clique so (MEDIA: um novo a cada hover)', async () => {
    const t = tela();
    const P = preset({ byId: t });
    for (let k = 0; k < 50; k++) { P.processarTooltip({ innerText: tooltip('pt', 'inv', k % 2 ? 'pikachu60' : 'scizor50') }); await vez(); }
    await espera();
    const ouv = P.docEv.click || [];
    ok(ouv.length === 1, '50 hovers: ' + ouv.length + ' ouvinte(s) de clique no document');
    // continua fechando o popup: clique fora fecha; no popup ou no botao (o atual, buscado na hora) nao
    const clica = (alvo) => { const pop = new El(); t['historico-popup'] = pop; ouv.forEach((f) => f({ target: alvo })); return !!pop.removido; };
    t['btn-historico'] = new El();
    ok(clica(new El()) === true, 'clique fora: fecha o historico');
    const pop = new El(); t['historico-popup'] = pop; ouv.forEach((f) => f({ target: pop }));
    ok(!pop.removido, 'clique dentro do popup: continua aberto');
    ok(clica(t['btn-historico']) === false, 'clique no botao do card de agora (nao o do primeiro hover): nao fecha, quem cuida e o proprio botao');
  });

  await secao('corrida: o card fica no pokemon do mouse (MEDIA: o anterior chegava depois)', async () => {
    let solta; const gyarados = new Promise((r) => { solta = r; });
    const P = preset({ semCreatures: true, segura: { gyarados } }); // sem creatures.json: Gyarados demora na PokeAPI
    P.processarTooltip({ innerText: tooltip('pt', 'inv', 'gyarados60') });
    await espera(5);
    P.processarTooltip({ innerText: tooltip('pt', 'inv', 'pikachu60') });
    await espera();
    solta();
    await espera();
    const nomes = P.msgs().map((m) => m.nome);
    ok(nomes.join() === 'Pikachu' && P.ultimoPokemon.nome === 'Pikachu', 'mouse parou no Pikachu: o card recebe ' + nomes.join(' -> ') + ' (o Gyarados atrasado nao sobrescreve)');
  });

  await secao('deposito da familia (BAIXA: o formato novo nao era lido)', async () => {
    const casos = [
      ['◀PikachuNv.50 · IV 120 · Q 1.40', 'Pikachu', 50, 120, 1.4], // coluna Deposito da familia (botao antes)
      ['PikachuNv.50 · IV 120 · Q 1.40▶', 'Pikachu', 50, 120, 1.4], // coluna Sua caixa (botao depois)
      ['◀✨ GyaradosNv.75 · IV 99 · Q 1.05', '✨ Gyarados', 75, 99, 1.05], // shiny
      ['Pikachu · Nv 50 · IV 120 · Q 1.40', 'Pikachu', 50, 120, 1.4] // formato antigo
    ];
    for (const [tx, nome, nv, iv, q] of casos) {
      const P = preset();
      P.observarDepositoFamilia();
      const linha = new El({ textContent: tx, childElementCount: 3 });
      P.docEv.mouseover[0]({ target: { closest: () => linha } });
      const u = P.ultimoPokemon;
      ok(u && u.nome === nome && u.nivel === nv && u.ivAtual === iv && u.multiplicadorQualidade === q, '"' + tx + '" -> ' + (u ? [u.nome, u.nivel, u.ivAtual, u.multiplicadorQualidade].join(', ') : 'nada'));
      if (nome.startsWith('✨')) { await espera(); const r = P.msgs().pop(); ok(r && r.shiny === true && r.nome === 'Gyarados', 'shiny da familia: card com shiny=' + (r && r.shiny) + ' e nome "' + (r && r.nome) + '"'); }
    }
  });

  await secao('"Ativo" so pelo chip (BAIXA: a dica "deixa-lo ativo" marcava a equipe toda)', async () => {
    const P = preset();
    for (const lang of ['pt', 'en', 'es']) {
      const membro = P.parsePokemon(tooltip(lang, 'inv', 'scizor50', { equipe: true }));
      const lider = P.parsePokemon(tooltip(lang, 'inv', 'scizor50', { equipe: true, lider: true }));
      const liderTv = P.parsePokemon(tooltip(lang, 'tv', 'scizor50', { equipe: true, lider: true }));
      const guardado = P.parsePokemon(tooltip(lang, 'inv', 'scizor50'));
      ok(membro.ativo === false && lider.ativo === true && liderTv.ativo === true && guardado.ativo === false, '[' + lang + '] equipe ' + membro.ativo + ', lider ' + lider.ativo + ', lider no tooltip ' + liderTv.ativo + ', guardado ' + guardado.ativo);
    }
    ok(P.parsePokemon(CHROME.tip).ativo === false, 'innerText real (Charizard da equipe com a dica "deixá-lo ativo"): nao e o ativo');
  });

  await secao('berry nao vira 3o tipo (BAIXA)', async () => {
    const P = preset();
    ok(P.parsePokemon(CHROME.tip).tipos.join() === 'FOGO,VOADOR', 'Charizard com berry de Agua: tipos ' + JSON.stringify(P.parsePokemon(CHROME.tip).tipos));
    ok(P.parsePokemon(tooltip('es', 'inv', 'scizor50', { equipe: true })).tipos.join() === 'BICHO,ACERO' && P.parsePokemon(tooltip('pt', 'tv', 'pikachu40')).tipos.join() === 'ELÉTRICO', 'dois tipos e um tipo so continuam lidos');
  });

  await secao('voltar pro mesmo pokemon depois de outro painel (BAIXA: o card ficava no do outro painel)', async () => {
    const p1 = preset(), p2 = preset();
    const A = tooltip('pt', 'inv', 'pikachu40'), B = tooltip('pt', 'inv', 'scizor40');
    const t1 = new El({ innerText: A });
    p1.processarTooltip(t1); await espera();
    p1.processarTooltip(t1); await espera(); // o observer relê o mesmo tooltip a cada mutacao da pagina
    ok(p1.msgs().length === 1, 'tooltip aberto relido: 1 envio so (' + p1.msgs().length + ')');
    p2.processarTooltip(new El({ innerText: B })); await espera();
    ok(p2.msgs().pop().nome === 'Scizor', 'painel 2, Scizor: o card troca pro Scizor');
    p1.processarTooltip(new El({ innerText: A })); await espera(); // o jogo cria um tooltip novo a cada hover
    ok(p1.msgs().length === 2 && p1.msgs().pop().nome === 'Pikachu', 'volta pro Pikachu no painel 1: reenvia pro card (' + p1.msgs().length + ' envios)');
    const antes = p1.msgs().length;
    p1.processarTooltip({ innerText: A }); await espera(); // hover da familia (objeto novo a cada mouseover, mesmo texto)
    ok(p1.msgs().length === antes, 'mouseover repetido na mesma linha da familia: nao reenvia');
  });

  await secao('shiny com sprite shiny (BAIXA)', async () => {
    const t = tela();
    const P = preset({ byId: t });
    P.processarTooltip({ innerText: tooltip('pt', 'inv', 'scizorShiny', { shiny: true }) });
    await espera();
    const r = P.msgs().pop();
    ok(r && r.shiny === true && r.sprite && /\/shiny\/212\.png$/.test(r.sprite.still) && r.nome === 'Scizor', 'card do app: shiny=' + (r && r.shiny) + ', sprite ' + (r && r.sprite && r.sprite.still.split('/').slice(-2).join('/')) + ', nome "' + (r && r.nome) + '" (o card ja poe o ✨)');
    ok(/sprites\/pokemon\/versions\/generation-v\/black-white\/animated\/shiny\/212\.gif/.test(t.content.innerHTML), 'painel do preset: sprite shiny tambem');
    const P2 = preset();
    P2.processarTooltip({ innerText: tooltip('pt', 'inv', 'scizorShiny') });
    await espera();
    const r2 = P2.msgs().pop();
    ok(r2 && r2.shiny === false && /\/pokemon\/212\.png$/.test(r2.sprite.still), 'sem ✨: sprite normal');
  });

  await secao('efetividade sem o "Da 4x" (BAIXA: um golpe tem um tipo so)', async () => {
    const t = tela();
    const P = preset({ byId: t });
    P.processarTooltip({ innerText: tooltip('pt', 'inv', 'charizard') });
    const h = t.content.innerHTML;
    ok(!/Dá 4x/.test(h), 'Charizard (Fogo/Voador): sem a linha "Dá 4x"');
    ok((listaEff(h, 'Dá 2x') || []).join() === 'Planta,Gelo,Lutador,Inseto,Aço', '"Dá 2x": ' + JSON.stringify(listaEff(h, 'Dá 2x')));
    ok((listaEff(h, 'Toma 4x') || []).join() === 'Pedra', '"Toma 4x" continua (na defesa os dois tipos somam): ' + JSON.stringify(listaEff(h, 'Toma 4x')));
  });

  await secao('sprite de megas e formas: id 14xxx cai no da especie base (Castform Fire tinha ficado sem sprite)', async () => {
    // a base de cada 14xxx sai dos dados, nao de conta: "Mega X" -> X no creatures.json (captureBase ou pokeId);
    // Castform Fire nao tem a forma base no jogo -> castform da PokeAPI
    const base = (c) => {
      const nome = /^Mega /.test(c.name) ? c.name.slice(5) : c.name.split(' ')[0]; // "Mega Blastoise" -> Blastoise, "Castform Fire" -> Castform
      const x = CRIATURAS.find((k) => k.name === nome);
      return x ? +x.captureBase || x.pokeId : POKEAPI[nome.toLowerCase()].id;
    };
    const formas = CRIATURAS.filter((c) => c.pokeId >= 14000 && c.pokeId < 15000);
    ok(formas.length === 7 && formas.every((c) => base(c) === c.pokeId - 14000), 'no creatures.json de 02/10 os 7 ids 14xxx sao 14000 + a dex da especie base: ' + formas.map((c) => c.name + ' ' + c.pokeId + ' -> ' + base(c)).join(', '));
    const t = tela();
    const P = preset({ byId: t });
    const ruins = [];
    for (const c of formas) {
      P.processarTooltip({ innerText: tooltip('pt', 'inv', c.name) });
      await espera();
      const r = P.msgs().pop(), dex = base(c);
      const certo = r && r.nome === c.name && r.sprite && r.sprite.still.endsWith('/pokemon/' + dex + '.png') && r.sprite.anim.endsWith('/animated/' + dex + '.gif') && t.content.innerHTML.includes('/animated/' + dex + '.gif') && perto(r.ivs, 20);
      if (!certo) ruins.push(c.name + ' -> ' + (r && r.sprite ? r.sprite.still.split('/').pop() : 'sem sprite') + ', IV ' + (r && Object.values(r.ivs).join('/')));
    }
    ok(ruins.length === 0, 'card do app e painel do preset com o sprite da especie base (e IV pela base do jogo)' + (ruins.length ? ': ' + ruins.join('; ') : ''));
    P.processarTooltip({ innerText: tooltip('pt', 'inv', 'Swellow') });
    await espera();
    const sw = P.msgs().pop();
    ok(sw && sw.sprite && /\/pokemon\/277\.png$/.test(sw.sprite.still), 'Orre continua igual: Swellow (13277) com o sprite 277');
    // historico (botao 🕒 do card): montava a URL com o id cru
    const t2 = tela(), tab = new El({ appendChild(c) { this.popup = c; return c; } });
    t2['tab-leitor'] = tab;
    const P2 = preset({ byId: t2 });
    for (const id of ['Swellow', 'Castform Fire', 'pikachu40']) { P2.processarTooltip({ innerText: tooltip('pt', 'inv', id) }); await espera(); }
    const cliques = t2['btn-historico']._ev.click || [];
    cliques[cliques.length - 1]({ stopPropagation() {} }); // o botao do card atual (Pikachu) abre o historico
    const h = (tab.popup && tab.popup.innerHTML) || '';
    const urls = [...h.matchAll(/src="([^"]+)"/g)].map((m) => m[1].split('/').pop());
    ok(urls.join() === '351.png,277.png', 'historico com Castform Fire (14351) e Swellow de Orre (13277): sprites ' + JSON.stringify(urls));
  });

  await secao('cache v2: base da PokeAPI sem o creatures.json nao fica gravada (uma falha de rede fixava base errada)', async () => {
    const P1 = preset({ semCreatures: true, byId: tela() }); // creatures.json nao carregou nesta sessao (com o painel: ele redesenha quando a base chega)
    P1.processarTooltip({ innerText: tooltip('pt', 'inv', 'Dugtrio') });
    await espera(); await espera();
    const r1 = P1.msgs().pop();
    ok(r1 && r1.bases.atk === 100 && r1.sprite && /\/51\.png$/.test(r1.sprite.still), 'nesta sessao o card funciona com a base da PokeAPI (atk ' + (r1 && r1.bases.atk) + ') e com sprite');
    const v2 = JSON.parse(P1.ls.get('pokemon-api-cache-v2') || '{}');
    ok(!v2.dugtrio, 'e ela nao vai pro pokemon-api-cache-v2 (' + JSON.stringify(Object.keys(v2)) + ')');
    const pedidos = P1.pedidos.filter((u) => /pokemon\/dugtrio$/.test(u)).length;
    ok(pedidos <= 3, 'sem gravar, a sessao nao fica buscando de novo (a base fica na memoria): ' + pedidos + ' pedidos a PokeAPI');
    // recarregou a pagina (mesmo localStorage) e o creatures.json voltou: base do jogo
    const P2 = preset({ ls: Object.fromEntries(P1.ls) });
    P2.processarTooltip({ innerText: tooltip('pt', 'inv', 'Dugtrio') });
    await espera();
    const r2 = P2.msgs().pop();
    ok(r2 && r2.bases.atk === 80 && perto(r2.ivs, 20), 'proxima sessao, com o creatures.json: base do jogo (atk ' + (r2 && r2.bases.atk) + ', IV ' + (r2 && Object.values(r2.ivs).join('/')) + ')');
    await P2.buscarAtributosBase('Dragapult');
    const v2b = JSON.parse(P2.ls.get('pokemon-api-cache-v2') || '{}');
    ok(v2b.dugtrio && v2b.dugtrio.atk === 80 && v2b.dragapult && v2b.dragapult.vel === 142, 'com o creatures.json carregado grava: a base do jogo e a da PokeAPI de quem nao esta no jogo (' + JSON.stringify(Object.keys(v2b)) + ')');
  });

  console.log(fail ? '\nFALHOU' : '\nTUDO OK');
  process.exit(fail);
})();
