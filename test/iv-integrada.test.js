// Calculadora de IV integrada (1.5.31): o leitor de pokemon do proprio app e o card de IV, sem script de terceiros.
// O leitor REAL (IV_LEITOR, o texto que a janela injeta em todo painel no dom-ready) roda num DOM falso que monta o tooltip
// .inv-tip (o generico e o da mochila) e o painel de detalhes do Mercado na estrutura do bundle do jogo de 02/10/2026, com
// os rotulos REAIS de pt/en/es do i18n desse build (recortados aqui). O JSON que ele manda passa pelo console-message REAL
// do painel e chega no app REAL (o <script> inteiro da janela, com DOM falso), que calcula e desenha o card com o catalogo
// da fixture de 17/09 passando pelo HUNTS_JS real. Stats e poder dos pokemons de teste saem da formula do proprio jogo
// (computeStats/computePower do bundle). Nada aqui depende de rede nem de arquivo fora do repo.
// Recursos do card (abas, analise com efetividade pela regra da hunt, golpe em uso do lider vindo do stCache, comparar e
// fixar, historico, busca no catalogo, travar e copiar): secoes do fim, clicando no ouvinte REAL do card (data-a/data-v).
// Roda com: node test/iv-integrada.test.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const vezes = async (n = 6) => { for (let k = 0; k < n; k++) await vez(); };
const entre = (a, fim) => { const i = code.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 60)); const j = code.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 40)); return code.slice(i, j); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const HUNTS_JS = tpl('const HUNTS_JS = ');
// o console-message REAL do painel (criarPainel): e por ele que o JSON do leitor entra na janela
const CM = entre("wv.addEventListener('console-message', ", '\n      });').slice("wv.addEventListener('console-message', ".length) + '\n      }';

// ===== rotulos do i18n do jogo (bundle de 02/10/2026) =====
// tv = tooltip generico (window.pokeTooltip.*: chat, troca, deposito, Mark, venda no Mercado); inv = tooltip da mochila
// (window.inventory.*). Ordem: nivel, qualidade, IV, HP, Atk, Def, SpA, SpD, velocidade, poder, ativo, equipe, guardado,
// shiny. No tv o chip do ativo e "⚔ " + chipActive; na mochila o "⚔" ja vem no texto.
const ROT = {
  pt: {
    tv: ['Nv', 'Qualidade', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel', 'Poder', 'Ativo', 'Equipe', 'Guardado', 'Shiny'],
    inv: ['Nv', 'Qualidade', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel', 'Poder', '⚔ Ativo', 'Equipe', 'Guardado', 'Shiny'],
    dicas: ['➕ Duplo-clique para adicionar à equipe', '➖ Duplo-clique para desequipar', ' · clique no HUD para deixá-lo ativo', '🔗 Shift+clique para linkar no chat'],
    cat: 'Pokémon', tm: 'TM Disk',
    // Detalhes do Anuncio: titulo, Nivel, IV, Raridade, Poder, Tipos, cabecalho dos atributos, os 6 stats, tipo Pokemon,
    // tipo Pokebola, Quantidade, Preco unitario, Comprar
    mkt: ['Detalhes do Anúncio', 'Nível', 'IV', 'Raridade', 'Poder', 'Tipos', 'Atributos', 'HP', 'Atq', 'Def', 'Atq. Esp.', 'Def. Esp.', 'Veloc.', 'Pokémon', 'Pokébola', 'Quantidade', 'Preço Unitário', 'Comprar Agora'],
    tipos: { BUG: 'Inseto', DARK: 'Sombrio', DRAGON: 'Dragão', ELECTRIC: 'Elétrico', FAIRY: 'Fada', FIGHTING: 'Lutador', FIRE: 'Fogo', FLYING: 'Voador', GHOST: 'Fantasma', GRASS: 'Planta', GROUND: 'Terra', ICE: 'Gelo', NORMAL: 'Normal', POISON: 'Veneno', PSYCHIC: 'Psíquico', ROCK: 'Pedra', STEEL: 'Aço', WATER: 'Água' }
  },
  en: {
    tv: ['Lv', 'Quality', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe', 'Power', 'Active', 'Team', 'Stored', 'Shiny'],
    inv: ['Lv', 'Quality', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spd', 'Power', '⚔ Active', 'Team', 'Stored', 'Shiny'],
    dicas: ['➕ Double-click to add to the team', '➖ Double-click to unequip', ' · click on the HUD to make it active', '🔗 Shift+click to link in chat'],
    cat: 'Pokémon', tm: 'TM Disk',
    mkt: ['Listing Details', 'Level', 'IV', 'Rarity', 'Power', 'Types', 'Stats', 'HP', 'Atk', 'Def', 'Sp. Atk', 'Sp. Def', 'Speed', 'Pokémon', 'Poké Ball', 'Quantity', 'Unit Price', 'Buy Now'],
    tipos: { BUG: 'Bug', DARK: 'Dark', DRAGON: 'Dragon', ELECTRIC: 'Electric', FAIRY: 'Fairy', FIGHTING: 'Fighting', FIRE: 'Fire', FLYING: 'Flying', GHOST: 'Ghost', GRASS: 'Grass', GROUND: 'Ground', ICE: 'Ice', NORMAL: 'Normal', POISON: 'Poison', PSYCHIC: 'Psychic', ROCK: 'Rock', STEEL: 'Steel', WATER: 'Water' }
  },
  es: {
    tv: ['Nv', 'Calidad', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel', 'Poder', 'Activo', 'Equipo', 'Guardado', 'Shiny'],
    inv: ['Nv', 'Calidad', 'IV', 'HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel', 'Poder', '⚔ Activo', 'Equipo', 'Guardado', 'Shiny'],
    dicas: ['➕ Doble clic para añadir al equipo', '➖ Doble clic para quitar del equipo', ' · haz clic en el HUD para dejarlo activo', '🔗 Shift+clic para enlazar en el chat'],
    cat: 'Pokémon', tm: 'TM Disk',
    mkt: ['Detalles del anuncio', 'Nivel', 'IV', 'Rareza', 'Poder', 'Tipos', 'Estadísticas', 'HP', 'Ata', 'Def', 'At. Esp.', 'Def. Esp.', 'Vel.', 'Pokémon', 'Poké Ball', 'Cantidad', 'Precio unitario', 'Comprar ahora'],
    tipos: { BUG: 'Bicho', DARK: 'Siniestro', DRAGON: 'Dragón', ELECTRIC: 'Eléctrico', FAIRY: 'Hada', FIGHTING: 'Lucha', FIRE: 'Fuego', FLYING: 'Volador', GHOST: 'Fantasma', GRASS: 'Planta', GROUND: 'Tierra', ICE: 'Hielo', NORMAL: 'Normal', POISON: 'Veneno', PSYCHIC: 'Psíquico', ROCK: 'Roca', STEEL: 'Acero', WATER: 'Agua' }
  }
};
const LANGS = ['pt', 'en', 'es'];
// qualityInfo do bundle: o rotulo da qualidade sai em portugues nos 3 idiomas
const QUALI = (q) => q >= 4 ? ['Divina', '#dbefff'] : q >= 3 ? ['Anciã', '#b8860b'] : q >= 2 ? ['Mítica', '#6a0dad'] : q >= 1.7 ? ['Lendária', '#ff8c3c'] : q >= 1.5 ? ['Épica', '#f0c040'] : q >= 1.3 ? ['Rara', '#b06cff'] : q >= 1.1 ? ['Incomum', '#7fd4ff'] : q >= 1 ? ['Comum', '#63d873'] : ['Fraca', '#9aa6b3'];

// ===== pokemons de teste pela formula do jogo (computeStats e computePower do bundle) =====
const KJ = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'speed'], EXPJ = { hp: 0.95, atk: 0.8, def: 0.8, spAtk: 0.8, spDef: 0.8, speed: 0.95 };
const criatura = (nome) => { const c = J.creatures.find((x) => x.name === nome); if (!c) throw new Error('fixture sem ' + nome); return c; };
const statsJogo = (nome, level, q, g) => { const c = criatura(nome), b = [c.baseHp, c.baseAtk, c.baseDef, c.baseSpAtk, c.baseSpDef, c.baseSpeed]; return Object.fromEntries(KJ.map((k, j) => [k, Math.round(level / 100 * (b[j] + 2 * g[j]) * Math.pow(q, EXPJ[k]))])); };
const poderJogo = (st, q) => Math.round(KJ.reduce((t, k) => t + st[k], 0) * q);
function pk(nome, level, quality, growth, extra) {
  const c = criatura(nome), stats = statsJogo(nome, level, quality, growth);
  return Object.assign({ name: nome, level, quality, ivTotal: growth.reduce((a, b) => a + b, 0), stats, power: poderJogo(stats, quality), type1: c.type1, type2: c.type2 || '', growth }, extra || {});
}
const SCIZOR = pk('Scizor', 80, 1.55, [25, 30, 20, 10, 28, 9]);
const SCIZOR_SH = pk('Scizor', 50, 1.4, [20, 20, 20, 20, 20, 20], { shiny: true });
const PIKA5 = pk('Pikachu', 5, 1.0, [10, 20, 5, 31, 12, 25]); // nivel baixo: varios IV dao o mesmo stat
const PIKA40 = pk('Pikachu', 40, 1.2, [20, 20, 20, 20, 20, 20]);
const GYARA = pk('Gyarados', 120, 1.72, [18, 27, 22, 9, 30, 25]);
const MEGA = pk('Mega Blastoise', 100, 1.4, [20, 20, 20, 20, 20, 20]);
const ORRE = pk('Mudkip', 90, 1.3, [15, 25, 10, 30, 5, 20]); // no jogo tambem como 13258, em Orre
const LUCARIO = pk('Mega Lucario', 1500, 1.9, [32, 31, 30, 29, 28, 27]); // nivel e poder na casa do milhar
// Ditto: stats da forma copiada com reducao, IV e qualidade fixos (comum 89 e 1.4, shiny 119 e 2.0)
const DITTO_CHAR = { name: 'Charizard', level: 60, quality: 1.4, ivTotal: 89, stats: { hp: 101, atk: 64, def: 60, spAtk: 85, spDef: 66, speed: 82 }, power: 641, type1: 'FIRE', type2: 'FLYING' };
const DITTO_SH = { name: 'Ditto', level: 70, quality: 2.0, ivTotal: 119, stats: { hp: 107, atk: 92, def: 92, spAtk: 92, spDef: 92, speed: 102 }, power: 1154, type1: 'NORMAL', type2: '', shiny: true };

// ===== DOM falso da pagina do jogo: nos, textContent, seletores (tag, .classe, descendente e virgula) e MutationObserver =====
const MOS = [];
let entrega = false;
const contem = (a, b) => { for (let p = b; p; p = p.parentNode) if (p === a) return true; return false; };
function avisa(alvo, rec) { // como o navegador: registro na fila do observer, entregue numa microtarefa
  for (const mo of MOS) for (const r of mo.alvos) {
    if (!(alvo === r.t || (r.o.subtree && contem(r.t, alvo)))) continue;
    if ((rec.type === 'childList' && !r.o.childList) || (rec.type === 'characterData' && !r.o.characterData) || (rec.type === 'attributes' && !r.o.attributes)) continue;
    mo.fila.push(Object.assign({ target: alvo, addedNodes: [], removedNodes: [] }, rec));
    if (!entrega) { entrega = true; queueMicrotask(() => { entrega = false; for (const m of MOS.slice()) { if (!m.fila.length) continue; const f = m.fila; m.fila = []; m.vezes++; m.cb(f, m); } }); }
    break;
  }
}
class FakeMO {
  constructor(cb) { this.cb = cb; this.alvos = []; this.fila = []; this.vezes = 0; this.opcoes = []; MOS.push(this); }
  observe(t, o) { this.alvos.push({ t, o: Object.assign({}, o) }); this.opcoes.push({ t, o: Object.assign({}, o) }); }
  disconnect() { this.alvos = []; this.fila = []; }
}
class Texto {
  constructor(v) { this.nodeType = 3; this.parentNode = null; this.v = String(v); }
  get textContent() { return this.v; }
  set textContent(v) { this.v = String(v); avisa(this, { type: 'characterData' }); }
}
const simples = (el, p) => { // so o que o leitor usa: tag e/ou .classes
  const m = /^([a-z0-9]*)((?:\.[\w-]+)*)$/i.exec(p);
  if (!m) throw new Error('seletor que o DOM falso nao conhece: ' + p);
  return (!m[1] || el.tagName === m[1].toUpperCase()) && m[2].split('.').filter(Boolean).every((c) => el.cls.has(c));
};
const casa = (el, partes) => { if (!simples(el, partes[partes.length - 1])) return false; let i = partes.length - 2; for (let p = el.parentNode; p && i >= 0; p = p.parentNode) if (p.nodeType === 1 && simples(p, partes[i])) i--; return i < 0; };
class Elem {
  constructor(tag, cls, at) { this.nodeType = 1; this.tagName = tag.toUpperCase(); this.parentNode = null; this.childNodes = []; this.cls = new Set(String(cls || '').split(/\s+/).filter(Boolean)); this.at = Object.assign({}, at); this.classList = { contains: (c) => this.cls.has(c) }; }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
  appendChild(n) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.push(n); avisa(this, { type: 'childList', addedNodes: [n] }); return n; }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) { this.childNodes.splice(i, 1); n.parentNode = null; avisa(this, { type: 'childList', removedNodes: [n] }); } return n; }
  setAttribute(k, v) { this.at[k] = String(v); avisa(this, { type: 'attributes', attributeName: k }); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.at, k) ? this.at[k] : null; }
  matches(sel) { return sel.split(',').some((g) => casa(this, g.trim().split(/\s+/))); }
  closest(sel) { for (let p = this; p && p.nodeType === 1; p = p.parentNode) if (p.matches(sel)) return p; return null; }
  querySelectorAll(sel) { const out = []; const anda = (e) => { for (const c of e.children) { if (c.matches(sel)) out.push(c); anda(c); } }; anda(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
// h(tag, classes, [atributos], ...filhos): texto solto vira no de texto separado, como o React faz com strings vizinhas
function h(tag, cls, ...kids) {
  const at = kids[0] && kids[0].constructor === Object ? kids.shift() : {};
  const e = new Elem(tag, cls, at);
  for (const k of kids.flat(Infinity)) { if (k == null || k === false || k === '') continue; e.appendChild(k instanceof Elem || k instanceof Texto ? k : new Texto(k)); }
  return e;
}
// uma pagina do jogo: o leitor roda com o document, o MutationObserver, o console e o setTimeout dela
function pagina() {
  const raiz = h('html', ''), body = h('body', '');
  raiz.appendChild(body);
  const ouvidos = {}, timers = [], logs = [];
  const document = { body, documentElement: raiz, querySelector: (q) => raiz.querySelector(q), querySelectorAll: (q) => raiz.querySelectorAll(q), addEventListener: (t, f, cap) => { (ouvidos[t] = ouvidos[t] || []).push({ f, cap }); } };
  const window = {};
  return {
    body, document, window, ouvidos, logs,
    roda: (js) => new Function('window', 'document', 'MutationObserver', 'console', 'setTimeout', js)(window, document, FakeMO, { log: (...a) => logs.push(a.map(String).join(' ')) }, (f, ms) => { timers.push({ f, ms }); return timers.length; }),
    msgs: () => logs.filter((l) => l.startsWith('__PGIV__')),
    ultimo: () => { const m = logs.filter((l) => l.startsWith('__PGIV__')).pop(); return m ? JSON.parse(m.slice(8)) : null; },
    clica: (alvo) => (ouvidos.click || []).forEach((o) => o.f({ target: alvo })),
    timers: () => { timers.splice(0).forEach((x) => x.f()); }
  };
}

// ===== telas do jogo, na estrutura do JSX do bundle de 02/10 =====
const badge = (lang, ty) => h('span', 'pp-type pp-type--sm', { title: ty, style: '--pp-type-c:#fff' }, ROT[lang].tipos[ty]);
const linhaPoke = (rot, P) => { // div.inv-tip-poke: linha de cima (nivel, qualidade?, IV?), os 6 stats e o poder (pt-BR)
  const [lv, ql, iv, hp, atk, def, spa, spd, vel, pw] = rot, qi = P.quality != null ? QUALI(P.quality) : null;
  return h('div', 'inv-tip-poke',
    h('div', 'inv-tip-poke-top',
      h('span', '', lv, ' ', h('b', '', P.level)),
      qi ? h('span', '', ql, ' ', h('b', '', { style: 'color:' + qi[1] }, qi[0]), ' ', h('small', '', '×', P.quality.toFixed(2))) : null,
      P.ivTotal != null ? h('span', '', iv, ' ', h('b', '', P.ivTotal), h('small', '', '/', 192)) : null),
    h('div', 'inv-tip-poke-grid', [hp, atk, def, spa, spd, vel].map((r, j) => h('span', '', r, ' ', h('b', '', P.stats[KJ[j]])))),
    P.power != null ? h('div', 'inv-tip-poke-power', '💪 ', pw, ' ', h('b', '', P.power.toLocaleString('pt-BR'))) : null);
};
const tiposTip = (lang, P) => { const tps = [P.type1, P.type2].filter(Boolean); return h('div', 'inv-tip-types', tps.length ? tps.map((t) => badge(lang, t)) : h('span', 'inv-tip-cat', ROT[lang].cat)); };
const extras = (lang, o) => [
  o.tm ? h('span', 'inv-tip-chip tm', { title: o.tm }, '💿 ', ROT[lang].tm, ' - ', h('b', 'tm-type', { style: 'color:#f08030' }, o.tm[0] + o.tm.slice(1).toLowerCase())) : null,
  o.berry ? h('span', 'inv-tip-chip berry', { title: 'berry' }, h('b', 'tm-type', ROT[lang].tipos[o.berry]), ' ', '12 min') : null];
// tooltip generico (tV): nome + sufixo do Ditto + " ✨", tipos, chips (o do chat nao tem status), pokemon
function tipTv(lang, P, o = {}) {
  const r = ROT[lang].tv;
  return h('div', 'inv-tip', { style: 'left:10px;top:10px;width:244px' },
    h('div', 'inv-tip-name', P.name, o.sufixo || '', P.shiny && !o.semEstrela ? ' ✨' : ''),
    tiposTip(lang, P),
    h('div', 'inv-tip-chips', o.chat ? null : o.lider ? h('span', 'inv-tip-chip leader', '⚔ ', r[10]) : o.equipe ? h('span', 'inv-tip-chip team', r[11]) : h('span', 'inv-tip-chip box', r[12]),
      P.shiny ? h('span', 'inv-tip-chip shiny', r[13]) : null, extras(lang, o)),
    P.stats ? linhaPoke(r, P) : null);
}
// tooltip da mochila (inventario): mesma estrutura, rotulos de window.inventory.* e as dicas no fim
function tipInv(lang, P, o = {}) {
  const r = ROT[lang].inv, [addTeam, unequip, sufixoAtivo, chat] = ROT[lang].dicas;
  return h('div', 'inv-tip', { style: 'left:10px;top:10px;width:244px' },
    h('div', 'inv-tip-name', P.name, o.sufixo || '', P.shiny && !o.semEstrela ? ' ✨' : ''),
    tiposTip(lang, P),
    h('div', 'inv-tip-chips', o.lider ? h('span', 'inv-tip-chip leader', r[10]) : o.equipe ? h('span', 'inv-tip-chip team', r[11]) : h('span', 'inv-tip-chip box', r[12]),
      P.shiny ? h('span', 'inv-tip-chip shiny', r[13]) : null, extras(lang, o)),
    linhaPoke(r, P),
    !o.equipe && !o.lider ? h('div', 'inv-tip-hint', addTeam) : h('div', 'inv-tip-hint', unequip, o.lider ? '' : sufixoAtivo),
    h('div', 'inv-tip-hint', chat));
}
const tipItem = (lang) => h('div', 'inv-tip', { style: 'width:210px' }, h('div', 'inv-tip-name', 'Ultra Ball', h('span', 'inv-tip-qty', ' ×', '50')), h('div', 'inv-tip-cat', 'Pokébola'), h('div', 'inv-tip-price', '💲 ', '1.200'), h('div', 'inv-tip-hint', ROT[lang].dicas[3]));
// painel de detalhes do Mercado (componente lu): o mesmo do Remote Mark Terminal
function anuncio(lang, P) {
  const [titulo, nivel, iv, rar, pw, tps, cab, ...rr] = ROT[lang].mkt, st = rr.slice(0, 6), [kindPk, kindBall, qtd, preco, comprar] = rr.slice(6);
  const qi = P.quality != null ? QUALI(P.quality) : null;
  return h('aside', 'mkt2-details',
    h('div', 'mkt2-sechead', h('span', 'mkt2-sechead-gem', '◆'), titulo),
    h('div', 'mkt2-details-body',
      h('div', 'mkt2-hero', h('div', 'mkt2-hero-glow'), h('img', '', { src: '/x.png', alt: '' }), P.shiny ? h('span', 'mkt2-hero-shiny', '✨') : null),
      h('div', 'mkt2-details-name', P.name, P.nomeNv ? h('span', 'mkt2-details-lv', ' Lv.' + P.level) : null), // o jogo hoje cola o nivel no titulo
      h('div', 'mkt2-card-badges mkt2-details-badges', h('span', 'mkt2-badge', P.item ? kindBall : kindPk)),
      h('div', 'mkt2-statlist',
        !P.item ? h('div', 'mkt2-stat', h('span', '', '⚡ ', nivel), h('b', '', P.level)) : null,
        P.ivTotal != null ? h('div', 'mkt2-stat', h('span', '', iv), h('b', '', P.ivTotal, '/192')) : null,
        qi ? h('div', 'mkt2-stat', h('span', '', rar), h('b', '', { style: 'color:' + qi[1] }, qi[0], ' ', h('small', '', { style: 'opacity:.75' }, '×', P.quality.toFixed(2)))) : null,
        P.power != null ? h('div', 'mkt2-stat', h('span', '', pw), h('b', '', '⚡', P.power.toLocaleString('pt-BR'))) : null,
        P.type1 ? h('div', 'mkt2-stat', h('span', '', tps), h('span', 'mkt2-stat-types', [P.type1, P.type2].filter(Boolean).map((t) => badge(lang, t)))) : null,
        P.item ? h('div', 'mkt2-stat', h('span', '', qtd), h('b', '', '50', '×')) : null),
      !P.item ? h('div', 'mkt2-statblock-wrap', h('div', 'mkt2-statblock-head', cab), h('div', 'mkt2-stats', KJ.map((k, j) => h('div', 'mkt2-statcell', h('span', 'mkt2-statcell-k', st[j]), h('b', 'mkt2-statcell-v', P.stats[k]))))) : null,
      h('div', 'mkt2-details-pricebox', h('span', 'mkt2-details-pricelabel', preco), h('span', 'mkt2-price mkt2-price--xl', '12.000')),
      h('div', 'mkt2-details-actions', h('button', 'mkt2-btn mkt2-btn--primary mkt2-btn--lg', comprar))));
}
const cardMkt = (P) => h('article', 'mkt2-card clickable', h('div', 'mkt2-card-top', h('div', 'mkt2-card-art', h('img', '')), h('div', 'mkt2-card-info', h('div', 'mkt2-card-name', P.name))));
// o JSON que o leitor deve mandar pra um pokemon de teste
const esperado = (P, o = {}) => ({ nome: P.name, shiny: !!P.shiny, ditto: !!o.ditto, tipos: [P.type1, P.type2].filter(Boolean), ativo: !!o.lider, time: !!(o.lider || o.equipe),
  nivel: P.level, qualidade: P.quality != null ? P.quality : null, ivTotal: P.ivTotal != null ? P.ivTotal : null,
  stats: { hp: P.stats.hp, atk: P.stats.atk, def: P.stats.def, spa: P.stats.spAtk, spd: P.stats.spDef, vel: P.stats.speed }, poder: P.power != null ? P.power : null, fonte: o.fonte || 'tooltip' });
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ===== a janela do app: o <script> REAL com DOM falso (o harness do bughunt4-C e do bh5-telas) =====
const realNow = Date.now; let desloc = 0; Date.now = () => realNow() + desloc; // a trava de 60 s do carregaHunts
function monta(opts = {}) {
  const byId = new Map(), execs = [];
  let document;
  class CL { constructor() { this.s = new Set(); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag, id) { this.tagName = String(tag || 'div').toUpperCase(); this.id = id || ''; this.style = { setProperty() {} }; this.classList = new CL(); this.dataset = {}; this.children = []; this._h = ''; this._t = ''; this.value = ''; this.checked = false; this.title = ''; this.options = [{}, {}]; this.childElementCount = 0; this.offsetHeight = 40; this.scrollTop = 0; this.ev = {}; }
    get innerHTML() { return this._h; } set innerHTML(v) { this._h = String(v); this.children = []; }
    get textContent() { return this._t; } set textContent(v) { this._t = String(v); this.children = []; }
    get firstChild() { return this._h ? {} : null; }
    get outerHTML() { return ''; } set outerHTML(v) {}
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } removeEventListener() {}
    querySelector(q) { this._q = this._q || {}; return this._q[q] || (this._q[q] = new El('div')); }
    querySelectorAll() { return []; }
    appendChild(c) { this.children.push(c); this.childElementCount = this.children.length; return c; }
    remove() {} setAttribute() {} getAttribute() { return null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; }
    focus() { document.activeElement = this; } blur() { if (document.activeElement === this) document.activeElement = null; } select() {}
    click() { if (this.onclick) this.onclick({ target: this, stopPropagation() {} }); }
    contains(x) { return x === this; } closest() { return null; }
  }
  class WV extends El {
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; }
    executeJavaScript(c) { execs.push(String(c)); return opts.exec ? opts.exec(String(c)) : Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() {} reloadIgnoringCache() {} loadURL() { return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid');
  document = {
    getElementById: (id) => { if (id === 'grid') return grid; if (!byId.has(id)) byId.set(id, new El(id === 'tlLevel' || id === 'tlTm' || /^sc(Url|Name)$/.test(id) ? 'input' : 'div', id)); return byId.get(id); },
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: () => [],
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const quebra = () => { throw new Error('disco quebrado'); }; // opts.lsQuebra: o localStorage lanca em tudo
  const localStorage = opts.lsQuebra ? { getItem: quebra, setItem: quebra, removeItem: quebra } : { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, appVersion: '1.5.31' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  const exporta = '\n;return { ivRecebe, ivRender, ivRecalcula, ivSane, IV_LEITOR, carregaHunts, t, nf, I18N, setAberto: (v) => { ivAberto = v; }, get ivDados() { return ivDados; }, get basesByName() { return basesByName; }, get scriptsOn() { return scriptsOn; }, allScripts, stSane, stCache, get ivHist() { return ivHist; }, get ivFix() { return ivFix; }, get ivTrava() { return ivTrava; }, get ivAba() { return ivAba; }, ico: typeof ico !== "undefined" ? ico : () => "?" };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, opts.nav || { clipboard: { writeText: async () => {} } }, { reload() {} }, noop, noop, noop, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  const ivEl = byId.get('ivCard');
  return Object.assign(api, {
    byId, store, execs, ivEl,
    html: () => ivEl.innerHTML,
    // o console-message REAL de um painel, ligado no ivRecebe e no stCache (push __PGST__ pelo stSane real) desta janela
    canal: (i = 0) => { const f = new Function('i', 'dlgT', 'stSane', 'stCache', 'dtPush', 'ivRecebe', 'Date', 'return ' + CM)(i, [0, 0, 0, 0], api.stSane, api.stCache, () => {}, api.ivRecebe, Date); return (m) => f({ message: m }); },
    // digitar num campo do card (o onchange chama o ivRecalcula)
    digita: (id, v) => { ivEl.querySelector('#' + id).value = String(v); api.ivRecalcula(); }
  });
}
// catalogo: a fixture de 17/09 pelo HUNTS_JS real (o mesmo que roda no painel)
let RCAT = null;
const catalogo = async () => RCAT || (RCAT = await new Function('fetch', 'return ' + HUNTS_JS)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : u.indexOf('items') >= 0 ? { items: [] } : { creatures: J.creatures }) })));
const comCatalogo = async (opts = {}) => {
  const R = await catalogo();
  const H = monta(Object.assign({ exec: (c) => Promise.resolve(c.includes('map-markers') ? R : null) }, opts));
  await vez(); desloc += 61e3; H.carregaHunts(); await vezes();
  if (!Object.keys(H.basesByName).length) throw new Error('catalogo nao carregou');
  H.setAberto(true);
  return H;
};
// o caminho inteiro: tooltip na pagina -> leitor real -> console do painel -> console-message real -> ivRecebe -> card
async function leva(H, tela, i = 0) {
  const pg = pagina();
  pg.roda(H.IV_LEITOR);
  pg.body.appendChild(tela);
  await vezes(3);
  const on = H.canal(i);
  pg.msgs().forEach(on);
  return pg;
}
// o que o card mostra
const cardIvs = (html) => [...html.matchAll(/<span class="iv-st-iv">([^<]*)<span/g)].map((m) => m[1]);
const cardKpi = (html, rotulo) => { const m = new RegExp('<div class="k">' + rotulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</div><div class="v"[^>]*>(.*?)</div></div>').exec(html); return m ? m[1].replace(/<[^>]+>/g, '') : null; };
// aviso do card: o âmbar, a pokébola do catálogo chegando (card de IV novo, 04/10) ou o painel do Ditto, que leva o aviso dele
const cardAviso = (html) => { const m = /<div class="iv-av">([^<]*)<\/div>|<div class="iv-carr" role="status"><span class="iv-pb"[^>]*><\/span><span>([^<]*)<\/span>|<div class="iv-pot iv-pot-dt">[\s\S]*?<div class="iv-pot-d">([^<]*)<\/div>/.exec(html); return m ? m[1] || m[2] || m[3] : ''; };
const cardSprite = (html) => { const m = /<img class="iv-spr"[^>]*src="([^"]+)"/.exec(html); return m ? m[1] : ''; };
const cardPot = (html) => { const m = /<div class="iv-pot" style="--c:#[0-9a-f]+"><div class="iv-ring"[^>]*><span><b>(\d+)%<\/b><small>[^<]*<\/small><\/span><\/div><div class="iv-pot-tx"><div class="iv-pot-t">([^<]*)<\/div>/.exec(html); return m ? [+m[1], m[2]] : null; };
const cardGolpes = (html) => [...html.matchAll(/<div class="iv-mv( off)?"[^>]*>(?:<span class="iv-tp"[^>]*>[^<]*<\/span>)?<span class="mv-n">([^<]*)<\/span><span class="mv-lv"[^>]*>([^<]*)<\/span>/g)].map((m) => ({ off: !!m[1], n: m[2], lv: m[3] }));
const cardInput = (html, id) => { const m = new RegExp('id="' + id + '"[^>]*value="([^"]*)"').exec(html); return m ? m[1] : null; };
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
// botoes do card: o app tem UM ouvinte de clique no card, e o botao diz o que fazer (data-a, data-v). O helper confere que o
// botao esta desenhado (no card ou na lista de sugestoes) e entrega o clique como o navegador: alvo.closest('[data-a]')
const clica = (H, a, v) => {
  if (!H.html()) H.ivRender();
  const marca = 'data-a="' + a + '"' + (v != null ? ' data-v="' + v + '"' : '');
  if (!(H.html() + H.ivEl.querySelector('#ivSug').innerHTML).includes(marca)) throw new Error('botao fora do card: ' + marca);
  const botao = { dataset: { a, v: v != null ? String(v) : undefined }, textContent: '' };
  H.ivEl.ev.click.forEach((f) => f({ target: { closest: (sel) => (sel === '[data-a]' ? botao : null) } }));
  return botao;
};
const aba = (H, v) => clica(H, 'aba', v);
const abaOn = (html) => { const m = /<button class="iv-aba on" data-a="aba" data-v="(\w+)">/.exec(html); return m ? m[1] : ''; };
const SPW = '(?:<span class="iv-spw[^"]*"[^>]*>[\\s\\S]*?<\\/span>)'; // a caixa da sprite (img ou a pokébola em svg), no histórico, na busca e no comparar
const golpesDe = (H) => { aba(H, 'golpes'); const g = cardGolpes(H.html()); aba(H, 'leitor'); return g; }; // a lista de golpes mora na aba Golpes
const ACOR = JSON.parse(/const ACOR = (\[[^\]]+\])/.exec(code)[1].replace(/'/g, '"')); // cor de cada conta

(async () => {
  await secao('leitor: le pela estrutura, igual em pt, en e es (tooltip generico, mochila e Mercado)', async () => {
    const H = monta(); await vez();
    for (const [P, o, nome] of [[SCIZOR, { lider: true, tm: 'BUG', berry: 'WATER' }, 'Scizor ativo com TM e berry'], [GYARA, { equipe: true }, 'Gyarados da equipe'], [PIKA40, {}, 'Pikachu guardado']]) {
      for (const [fab, jan] of [[tipTv, 'tooltip generico'], [tipInv, 'mochila']]) {
        const vistos = [];
        for (const lang of LANGS) { const pg = pagina(); pg.roda(H.IV_LEITOR); pg.body.appendChild(fab(lang, P, o)); await vezes(3); vistos.push(pg.ultimo()); }
        ok(vistos.every((v) => igual(v, esperado(P, o))), nome + ', ' + jan + ': o mesmo JSON nos 3 idiomas, com tipo canonico, nivel, qualidade, IV, 6 stats e poder ' + JSON.stringify(vistos[0]));
      }
    }
    const vistos = [];
    for (const lang of LANGS) {
      const pg = pagina(); pg.roda(H.IV_LEITOR);
      const card = cardMkt(GYARA);
      pg.body.appendChild(h('div', 'win-window', h('div', 'mkt2-main', h('div', 'mkt2-grid', card), anuncio(lang, GYARA))));
      await vezes(2);
      ok(pg.msgs().length === 0, '[' + lang + '] Mercado aberto sem clique: nada (' + pg.msgs().length + ')');
      pg.clica(card.querySelector('.mkt2-card-name')); pg.timers(); await vezes(2);
      vistos.push(pg.ultimo());
    }
    ok(vistos.every((v) => igual(v, esperado(GYARA, { fonte: 'mercado' }))), 'Mercado (Detalhes do Anuncio): o mesmo JSON nos 3 idiomas, nivel do "⚡", IV "131/192", qualidade do <small>, poder "⚡2.623" ' + JSON.stringify(vistos[0]));
    const chat = pagina(); chat.roda(H.IV_LEITOR); chat.body.appendChild(tipTv('pt', PIKA40, { chat: true })); await vezes(3);
    ok(igual(chat.ultimo(), esperado(PIKA40)), 'link de pokemon do chat (sem chip de status): ativo e time falsos');
  });

  await secao('leitor: leve e sem repetir (so a lista de filhos do body; o tooltip aberto no conteudo; atributo nunca)', async () => {
    const H = monta(); await vez();
    const pg = pagina(); const antes = MOS.length;
    pg.roda(H.IV_LEITOR); pg.roda(H.IV_LEITOR); // dom-ready duas vezes na mesma pagina
    const meus = MOS.slice(antes);
    ok(meus.length === 1 && meus[0].opcoes.length === 1 && meus[0].opcoes[0].t === pg.body && igual(meus[0].opcoes[0].o, { childList: true }), 'trava de uma vez por pagina: um observer so, no body, so childList ' + JSON.stringify(meus.map((m) => m.opcoes.map((x) => x.o))));
    const tip = tipInv('pt', SCIZOR, { lider: true });
    pg.body.appendChild(tip); await vezes(3);
    const doTip = MOS.slice(antes + 1);
    ok(pg.msgs().length === 1 && doTip.length === 1 && doTip[0].opcoes[0].t === tip && !doTip[0].opcoes[0].o.attributes && doTip[0].opcoes[0].o.characterData && doTip[0].opcoes[0].o.subtree, 'hover: 1 envio; o tooltip aberto e observado no conteudo, sem atributos ' + JSON.stringify(doTip.map((m) => m.opcoes[0].o)));
    const vezes0 = doTip[0].vezes;
    for (let k = 0; k < 50; k++) tip.setAttribute('style', 'left:' + (10 + k) + 'px;top:20px;width:244px'); // o mouse andando
    await vezes(3);
    ok(doTip[0].vezes === vezes0 && pg.msgs().length === 1, '50 mousemoves (style do tooltip): nenhum callback, nenhum envio');
    const nv = tip.querySelector('.inv-tip-poke-top b');
    nv.childNodes[0].textContent = String(SCIZOR.level); // o jogo redesenhou com o mesmo valor
    await vezes(3);
    ok(pg.msgs().length === 1, 'tooltip redesenhado com o mesmo pokemon: nao repete');
    // pokemon vizinho: o jogo reaproveita o mesmo .inv-tip e troca o conteudo
    while (tip.childNodes.length) tip.removeChild(tip.childNodes[0]);
    tipInv('pt', GYARA, { equipe: true }).childNodes.slice().forEach((c) => tip.appendChild(c));
    await vezes(3);
    ok(pg.msgs().length === 2 && pg.ultimo().nome === 'Gyarados', 'pokemon vizinho no mesmo tooltip: manda o novo (' + pg.ultimo().nome + ')');
    pg.body.removeChild(tip); await vezes(2);
    pg.body.appendChild(tipInv('pt', GYARA, { equipe: true })); await vezes(3);
    ok(pg.msgs().length === 3 && pg.ultimo().nome === 'Gyarados', 'mouse saiu e voltou no mesmo pokemon (hover novo): manda de novo, pro card voltar depois de outro painel');
    pg.body.appendChild(tipItem('pt')); await vezes(3);
    pg.body.appendChild(tipTv('pt', Object.assign({}, PIKA40, { stats: null }))); await vezes(3);
    pg.body.appendChild(h('div', 'win-overlay', h('div', 'inv-tip-name', 'Pikachu'))); await vezes(3);
    ok(pg.msgs().length === 3, 'tooltip de item, pokemon sem stats e outra janela no body: nada');
    // Mercado: clique fora de um anuncio nao le; anuncio de item nao manda
    const card = cardMkt(GYARA), main = h('div', 'mkt2-main', h('div', 'mkt2-grid', card), anuncio('en', GYARA));
    pg.body.appendChild(h('div', 'win-window', main)); await vezes(2);
    pg.clica(main); pg.timers(); await vezes(2);
    ok(pg.msgs().length === 3, 'clique no Mercado fora de anuncio: nada');
    const ball = { name: 'Ultra Ball', item: true };
    main.removeChild(main.querySelector('aside.mkt2-details')); main.appendChild(anuncio('en', ball));
    pg.clica(card); pg.timers(); await vezes(2);
    ok(pg.msgs().length === 3, 'anuncio de item (Ultra Ball): nada');
    main.removeChild(main.querySelector('aside.mkt2-details')); main.appendChild(anuncio('en', SCIZOR));
    pg.clica(card.querySelector('.mkt2-card-art')); pg.timers(); await vezes(2);
    ok(pg.msgs().length === 4 && igual(pg.ultimo(), esperado(SCIZOR, { fonte: 'mercado' })), 'outro anuncio de pokemon: manda o novo (fonte mercado)');
    ok(pg.msgs().every((m) => m.length < 400), 'JSON cru e pequeno: o maior tem ' + Math.max(...pg.msgs().map((m) => m.length)) + ' caracteres');
  });

  await secao('card: pokemon comum com IV exato (tooltip -> console do painel -> app)', async () => {
    for (const lang of LANGS) {
      const H = await comCatalogo({ ls: { lang } });
      await leva(H, tipTv(lang, SCIZOR, { lider: true, tm: 'BUG' }), 2);
      const html = H.html();
      ok(cardIvs(html).join() === SCIZOR.growth.join(), '[' + lang + '] IV por atributo exato: ' + cardIvs(html).join('/') + ' (verdade ' + SCIZOR.growth.join('/') + ')');
      ok(cardKpi(html, H.t('ivcIvTotal')) === '122/192' && cardKpi(html, H.t('ivcPower').replace('{n}', 80)) === H.nf(SCIZOR.power), '[' + lang + '] IV total 122/192 e poder pela formula no Nv 80 = o do jogo (' + cardKpi(html, H.t('ivcPower').replace('{n}', 80)) + ')');
      ok(html.includes(H.t('ivcPowerGame') + ': <b style="color:var(--tx3)">' + H.nf(SCIZOR.power) + '</b>'), '[' + lang + '] poder do jogo no rodape');
      const pot = cardPot(html);
      ok(pot && pot[0] === 64 && pot[1] === H.t('ivcPot2') && html.includes(H.t('ivcPotD2')), '[' + lang + '] potencial 122/192 = 64%: "' + (pot && pot[1]) + '"');
      ok(cardSprite(html) === SPR + '212.png' && html.includes('>Scizor</span>') && html.includes(' · ' + H.ico('espadas') + '</span>'), '[' + lang + '] sprite do Simples (212), nome e marca de ativo (o icone das espadas)');
      ok(html.includes('>BUG</span>') && html.includes('>STEEL</span>') && !cardAviso(html), '[' + lang + '] tipos canonicos e nenhum aviso');
      const g = golpesDe(H); // a lista mora na aba Golpes
      ok(g.length === 14 && g.filter((x) => x.off).length === 0 && g[g.length - 1].n === 'Hive Crush' && g[g.length - 1].lv === 'TM' && g[0].lv === H.t('ivcMoveLv') + ' 1', '[' + lang + '] golpes da especie (14), por nivel, o de disco TM no fim: ' + g.map((x) => x.n + ' ' + x.lv).join(', '));
      const q155 = lang === 'en' ? '×1.55' : '×1,55'; // decimal no formato do idioma (redesign etapa A)
      ok(html.includes('>' + H.t('rqEpic') + '</span> ' + q155), '[' + lang + '] raridade da qualidade no idioma do app: ' + H.t('rqEpic') + ' ' + q155);
    }
  });

  await secao('card: IV com faixa (nivel baixo, varios IV dao o mesmo stat) e a restricao do IV total', async () => {
    const H = await comCatalogo();
    await leva(H, tipInv('pt', PIKA5, {}));
    const html = H.html(), ivs = cardIvs(html);
    const dentro = ivs.every((x, j) => { const [a, b] = x.split('-').map(Number); return PIKA5.growth[j] >= a && PIKA5.growth[j] <= (b || a); });
    ok(ivs.some((x) => x.includes('-')) && dentro, 'faixa onde nao da exato, e o IV de verdade dentro dela: ' + ivs.join(' ') + ' (verdade ' + PIKA5.growth.join('/') + ')');
    ok(ivs.join() === '8-17,18-27,5-14,30-32,10-19,20-29', 'Nv 5: ' + ivs.join(' '));
    ok(cardKpi(html, H.t('ivcPower').replace('{n}', 5)).startsWith('≈') && !cardAviso(html), 'poder pela formula marcado como aproximado (' + cardKpi(html, H.t('ivcPower').replace('{n}', 5)) + '), sem aviso');
    // no Nv 20 cada stat fica entre dois IV; o IV total do jogo (72) so fecha com 12 em tudo
    const PIKA20 = pk('Pikachu', 20, 1.0, [12, 12, 12, 12, 12, 12]);
    await leva(H, tipInv('pt', PIKA20, {}));
    ok(cardIvs(H.html()).join() === '12,12,12,12,12,12' && !cardKpi(H.html(), H.t('ivcPower').replace('{n}', 20)).startsWith('≈'), 'com o IV total do tooltip (72): exato, pela restricao do total');
    await leva(H, tipInv('pt', Object.assign({}, PIKA20, { ivTotal: null }), {}));
    ok(cardIvs(H.html()).every((x) => x === '12-13') && cardKpi(H.html(), H.t('ivcIvTotal')) === '?/192', 'o mesmo pokemon sem o IV no tooltip: faixa 12-13 em tudo e total "?" (' + cardIvs(H.html()).join(' ') + ')');
  });

  await secao('card: shiny, Mega, Orre e numeros com ponto de milhar', async () => {
    const H = await comCatalogo();
    await leva(H, tipInv('pt', SCIZOR_SH, { equipe: true }));
    let html = H.html();
    ok(H.ivDados.shiny === true && cardSprite(html) === SPR + 'shiny/212.png' && html.includes('>✨ Scizor</span>') && cardIvs(html).join() === '20,20,20,20,20,20', 'shiny: sprite shiny, ✨ no nome (o nome vem sem o ✨) e IV 20 em tudo');
    let pg = await leva(H, tipTv('en', SCIZOR_SH, { semEstrela: true }));
    ok(pg.ultimo().shiny === true && pg.ultimo().nome === 'Scizor', 'shiny tambem pelo chip .shiny (estrutura), mesmo se o nome viesse sem o ✨');
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const card = cardMkt(SCIZOR_SH);
    pg.body.appendChild(h('div', 'win-window', h('div', 'mkt2-main', h('div', 'mkt2-grid', card), anuncio('pt', SCIZOR_SH))));
    pg.clica(card); pg.timers(); await vezes(2); pg.msgs().forEach(H.canal(0));
    ok(pg.ultimo().shiny === true && pg.ultimo().fonte === 'mercado' && cardSprite(H.html()) === SPR + 'shiny/212.png', 'anuncio shiny no Mercado (o ✨ do .mkt2-hero-shiny): card com a sprite shiny');
    await leva(H, tipTv('es', MEGA, {}));
    html = H.html();
    ok(cardIvs(html).join() === '20,20,20,20,20,20' && cardSprite(html) === SPR + '9.png', 'Mega Blastoise (14009): bases da forma Mega e sprite da especie base (9)');
    await leva(H, tipTv('en', ORRE, {}));
    html = H.html();
    ok(cardIvs(html).join() === ORRE.growth.join() && cardSprite(html) === SPR + '258.png', 'Mudkip (tambem 13258, de Orre): IV exato e sprite 258');
    pg = await leva(H, tipInv('en', LUCARIO, { lider: true }));
    html = H.html();
    ok(pg.ultimo().poder === 48070 && pg.ultimo().nivel === 1500 && pg.ultimo().stats.atk === 5189, 'leitor: "💪 Power 48.070" vira 48070, nivel 1500, stats na casa do milhar');
    ok(cardIvs(html).join() === LUCARIO.growth.join() && cardKpi(html, H.t('ivcPower').replace('{n}', 1500)) === H.nf(48070), 'card: IV exato e poder ' + H.nf(48070) + ' no Nv 1500');
  });

  await secao('card: Ditto (nao infere IV por atributo; mostra o total e diz que e Ditto)', async () => {
    const H = await comCatalogo();
    const casos = [
      [tipTv('pt', DITTO_CHAR, { sufixo: ' (Ditto)', equipe: true }), 'Charizard', 89, 'transformado (sufixo " (Ditto)" do jogo)'],
      [tipTv('en', DITTO_CHAR, { sufixo: ' ⚠️ (Ditto transformado)' }), 'Charizard', 89, 'na troca (" ⚠️ (Ditto transformado)")'],
      [tipInv('es', DITTO_SH, { lider: true }), 'Ditto', 119, 'o proprio Ditto shiny']
    ];
    for (const [tela, nome, iv, rot] of casos) {
      const pg = await leva(H, tela);
      const j = pg.ultimo(), html = H.html();
      ok(j.ditto === true && j.nome === nome, rot + ': JSON com ditto=true e nome "' + j.nome + '"');
      ok(cardAviso(html) === H.t('ivcDitto') && cardIvs(html).every((x) => x === '?') && cardKpi(html, H.t('ivcIvTotal')) === iv + '/192', rot + ': card com o aviso do Ditto, IV total ' + iv + ' e nenhum IV por atributo (' + cardIvs(html).join(' ') + ')');
      ok(!cardPot(html) && cardKpi(html, H.t('ivcPower').replace('{n}', j.nivel)) === '–', rot + ': sem potencial nem poder pela formula');
    }
  });

  await secao('card: tooltip sem qualidade (e sem IV), e as edicoes recalculam no proprio app', async () => {
    const H = await comCatalogo();
    // sem IV no tooltip: o total sai da soma do IV por atributo
    let pg = await leva(H, tipTv('en', Object.assign({}, GYARA, { ivTotal: null }), {}));
    let html = H.html();
    ok(pg.ultimo().ivTotal === null && pg.ultimo().qualidade === 1.72 && cardIvs(html).join() === GYARA.growth.join() && cardKpi(html, H.t('ivcIvTotal')) === '131/192', 'sem o /192: IV nulo no JSON, e no card o total 131 sai da soma do IV exato');
    // sem qualidade (link de chat antigo): o card pede, e digitar recalcula aqui mesmo
    const semQ = Object.assign({}, PIKA40, { quality: null });
    pg = await leva(H, tipTv('pt', semQ, { chat: true }));
    html = H.html();
    ok(pg.ultimo().qualidade === null && pg.ultimo().ivTotal === 120 && pg.ultimo().nivel === 40, 'leitor: sem o <small>×</small>, qualidade vai nula');
    ok(cardAviso(html) === H.t('ivcNoQuality') && cardIvs(html).every((x) => x === '?') && cardInput(html, 'ivQ') === '', 'card: pede a qualidade, IV "?"');
    const execs = H.execs.length;
    H.digita('ivQ', '1.2');
    html = H.html();
    ok(cardIvs(html).join() === '20,20,20,20,20,20' && !cardAviso(html) && cardKpi(html, H.t('ivcIvTotal')) === '120/192', 'digitou a qualidade (1.2): IV exato (' + cardIvs(html).join('/') + ')');
    ok(H.execs.length === execs, 'recalculo sem ir ao painel (' + (H.execs.length - execs) + ' executeJavaScript)');
    const g = golpesDe(H); // a lista mora na aba Golpes
    ok(g.filter((x) => x.off).map((x) => x.n).join() === 'Thunderbolt,Agility,Wild Charge,Thunder', 'Nv 40: apagados so os golpes de nivel acima (' + g.filter((x) => x.off).map((x) => x.n + ' ' + x.lv).join(', ') + ')');
    H.digita('ivNv', '60');
    html = H.html();
    const no60 = poderJogo(statsJogo('Pikachu', 60, 1.2, PIKA40.growth), 1.2);
    ok(cardIvs(html).join() === '20,20,20,20,20,20' && cardKpi(html, H.t('ivcPower').replace('{n}', 60)) === H.nf(no60) && (() => { const g2 = golpesDe(H); return g2.length === 11 && g2.every((x) => !x.off); })(), 'nivel 60 no card: o IV fica, o poder vai pro do Nv 60 pela formula do jogo (' + H.nf(no60) + ') e os golpes destravam');
    H.digita('ivA_atk', '50');
    html = H.html();
    ok(cardIvs(html)[1] !== '20', 'atual de Atk mudado: o IV de Atk recalcula (' + cardIvs(html)[1] + ')');
    await leva(H, tipInv('pt', SCIZOR, {}));
    html = H.html();
    ok(cardInput(html, 'ivNv') === '80' && cardIvs(html).join() === SCIZOR.growth.join(), 'pokemon novo: as edicoes do anterior nao valem');
  });

  await secao('card: catalogo ainda carregando e especie fora do catalogo', async () => {
    const R = await catalogo();
    let libera = false;
    const H = monta({ exec: (c) => Promise.resolve(libera && c.includes('map-markers') ? R : null) });
    await vez(); H.setAberto(true);
    desloc += 61e3; // a trava de 60 s do carregaHunts vencida: o pedido que conta e o do card
    const n0 = H.execs.filter((c) => c.includes('map-markers')).length;
    await leva(H, tipInv('pt', SCIZOR, {}));
    let html = H.html();
    ok(cardAviso(html) === H.t('ivcLoading') && cardIvs(html).every((x) => x === '?') && H.execs.filter((c) => c.includes('map-markers')).length > n0, 'sem catalogo: "' + H.t('ivcLoading') + '", IV "?" e o card pede o catalogo ao painel');
    ok(cardKpi(html, H.t('ivcIvTotal')) === '122/192' && !!cardPot(html) && cardInput(html, 'ivA_hp') === String(SCIZOR.stats.hp), 'enquanto isso: IV total, potencial e os stats lidos ja aparecem');
    libera = true; desloc += 61e3; H.ivRender(); await vezes();
    html = H.html();
    ok(cardIvs(html).join() === SCIZOR.growth.join() && !cardAviso(html) && cardSprite(html) === SPR + '212.png', 'o catalogo chegou: o card se redesenha sozinho com IV, sprite e golpes');
    const fora = Object.assign({}, SCIZOR, { name: 'Scizorr Beta' });
    await leva(H, tipInv('pt', fora, {}));
    html = H.html();
    ok(cardAviso(html) === H.t('ivcNoSpecies') && cardIvs(html).every((x) => x === '?') && !cardSprite(html), 'especie fora do catalogo: pede as bases');
    const c = criatura('Scizor');
    [['hp', c.baseHp], ['atk', c.baseAtk], ['def', c.baseDef], ['spa', c.baseSpAtk], ['spd', c.baseSpDef], ['vel', c.baseSpeed]].forEach(([k, v]) => { H.byId.get('ivCard').querySelector('#ivB_' + k).value = String(v); });
    H.ivRecalcula();
    ok(cardIvs(H.html()).join() === SCIZOR.growth.join(), 'bases digitadas: o IV sai (' + cardIvs(H.html()).join('/') + ')');
  });

  await secao('canal: payload forjado ou hostil nao passa (tipo, tamanho, faixa, lista fechada de tipos, esc no HTML)', async () => {
    const H = await comCatalogo();
    const on = H.canal(1);
    const base = esperado(SCIZOR);
    const manda = (o) => on('__PGIV__' + JSON.stringify(o));
    const recusa = (nome, o) => { H.ivRecebe(0, base); const d0 = H.ivDados; manda(o); ok(H.ivDados === d0, 'recusado: ' + nome); };
    recusa('array', [base]);
    recusa('nome vazio', Object.assign({}, base, { nome: '' }));
    recusa('nome numero', Object.assign({}, base, { nome: 123 }));
    recusa('nome com mais de 40', Object.assign({}, base, { nome: 'x'.repeat(41) }));
    recusa('fonte desconhecida', Object.assign({}, base, { fonte: 'painel' }));
    recusa('sem stats', Object.assign({}, base, { stats: null }));
    recusa('stat em texto', Object.assign({}, base, { stats: Object.assign({}, base.stats, { atk: '216' }) }));
    recusa('stat negativo', Object.assign({}, base, { stats: Object.assign({}, base.stats, { def: -1 }) }));
    recusa('stat quebrado', Object.assign({}, base, { stats: Object.assign({}, base.stats, { spa: 85.5 }) }));
    recusa('stat gigante', Object.assign({}, base, { stats: Object.assign({}, base.stats, { hp: 1e7 }) }));
    recusa('stat faltando', Object.assign({}, base, { stats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1 } }));
    recusa('nivel 0', Object.assign({}, base, { nivel: 0 }));
    recusa('nivel em texto', Object.assign({}, base, { nivel: '80' }));
    recusa('nivel absurdo', Object.assign({}, base, { nivel: 1e6 }));
    const H2 = monta(); await vez();
    const on2 = H2.canal(0);
    on2('__PGIV__' + JSON.stringify(Object.assign({}, base, { lixo: 'x'.repeat(5000) })));
    on2('__PGIV_' + JSON.stringify(base)); on2('{"__PGIV__":1}'); on2('__PGIV__{quebrado');
    ok(H2.ivDados === null, 'mensagem acima de 4000 caracteres, marca errada e JSON quebrado: nem chega no card');
    on2('__PGIV__' + JSON.stringify(base));
    ok(H2.ivDados && H2.ivDados.nome === 'Scizor', 'e o mesmo canal aceita o JSON do leitor');
    // aceitos, mas saneados
    manda(Object.assign({}, base, { nome: '<img src=x onerror=alert(1)>', tipos: ['FIRE', 'constructor', '__proto__', '<b>x</b>', 'AOE', 'water', 'GRASS'], qualidade: '1.55', ivTotal: 500, poder: '1335', shiny: 'true', ditto: 1, ativo: 'sim', sprite: { still: 'javascript:alert(1)' }, golpes: [{ nome: '<script>' }], classificacao: { cor: 'red;background:url(x)' } }));
    const d = H.ivDados, html = H.html();
    ok(d.nome === '<img src=x onerror=alert(1)>' && igual(d.tipos, ['FIRE', 'WATER']) && d.qualidade === null && d.ivTotal === null && d.poder === null && d.shiny === false && d.ditto === false && d.ativo === false, 'campos saneados: tipos so da lista fechada ' + JSON.stringify(d.tipos) + ', numeros em texto viram nulo, booleano so true de verdade');
    ok(!('sprite' in d) && !('golpes' in d) && !('classificacao' in d) && Object.keys(d).sort().join() === 'ativo,ditto,fonte,ivTotal,nivel,nome,poder,qualidade,shiny,stats,time,tipos', 'so as chaves do leitor entram: ' + Object.keys(d).sort().join(','));
    ok(html.includes('&lt;img src=x onerror=alert(1)&gt;') && !html.includes('<img src=x') && !/javascript:|<script|url\(x\)/.test(html), 'nome hostil escapado no card, e nada do resto vai pro HTML');
    manda(JSON.parse('{"__proto__":{"poluido":1},"nome":"Scizor","shiny":false,"ditto":false,"tipos":[],"ativo":false,"time":false,"nivel":80,"qualidade":1.55,"ivTotal":122,"stats":{"hp":146,"atk":216,"def":159,"spa":85,"spd":154,"vel":101},"poder":1335,"fonte":"tooltip"}'));
    ok(({}).poluido === undefined && H.ivDados.nome === 'Scizor', '__proto__ no JSON nao polui nada');
    for (const nm of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      manda(Object.assign({}, base, { nome: nm }));
      ok(H.ivDados.nome === nm && cardAviso(H.html()) === H.t('ivcNoSpecies'), 'nome "' + nm + '": sem quebrar, especie fora do catalogo');
    }
  });

  await secao('a calculadora de terceiros saiu (preset, IPC, textos) e o leitor entra sempre, sem os Scripts', async () => {
    ok(!fs.existsSync(path.join(RAIZ, 'presets')), 'pasta presets/ apagada');
    const mj = fs.readFileSync(path.join(RAIZ, 'main.js'), 'utf8'), pl = fs.readFileSync(path.join(RAIZ, 'preload.js'), 'utf8');
    ok(!/preset/i.test(mj) && !/preset/i.test(pl), 'main.js sem o IPC preset:read e preload sem o readPreset');
    ok(!/PRESETS|presetCache|justpok|__pgIv\b|pokemon-reader-panel|ivPanel|IV_SPR_OK|guilherme|creditIV|ivcOpenPanel|ivcMoveLast/i.test(code.replace("if ('justpokedex' in scriptsOn) { delete scriptsOn.justpokedex;", '')), 'index.html sem PRESETS, preset, ponte __pgIv, botao ⧉, credito e textos da calculadora antiga');
    const dom = entre("      wv.addEventListener('dom-ready', () => {", '\n      });');
    ok(dom.includes('wv.executeJavaScript(IV_LEITOR).catch(() => {});') && dom.indexOf('IV_LEITOR') < dom.indexOf('injectScripts(wv)') && !entre('  async function injectScripts(wv) {', '\n  }').includes('IV_LEITOR'), 'o leitor e injetado no dom-ready, junto dos scripts do app, fora do gerenciador de Scripts');
    ok(code.includes("if (m.lastIndexOf('__PGIV__', 0) !== 0 || m.length > 4000) return;"), 'o canal do console tem teto de tamanho');
    const H = monta({ ls: { scriptsOn: JSON.stringify({ justpokedex: true, u1: true }), userScripts: JSON.stringify([{ id: 'u1', name: 'Meu', code: 'console.log(1)' }]) } }); await vez();
    ok(igual(JSON.parse(H.store.get('scriptsOn')), { u1: true }) && igual(H.scriptsOn, { u1: true }), 'scriptsOn["justpokedex"] salvo sai do disco; o do usuario fica');
    ok(H.allScripts().length === 1 && H.allScripts()[0].id === 'u1', 'a lista de Scripts so tem os userscripts do usuario');
    const novas = ['ivcHint', 'ivcPower', 'ivcMoveTm', 'ivcLoading', 'ivcNoSpecies', 'ivcNoQuality', 'ivcNoFit', 'ivcDitto', 'ivcPot0', 'ivcPot1', 'ivcPot2', 'ivcPot3', 'ivcPot4', 'ivcPotD0', 'ivcPotD1', 'ivcPotD2', 'ivcPotD3', 'ivcPotD4', 'scHint', 'scBtnTitle'];
    ok(novas.every((k) => LANGS.every((L) => typeof H.I18N[L][k] === 'string' && H.I18N[L][k] && !/—/.test(H.I18N[L][k]))), 'textos novos nos 3 idiomas, sem travessao');
    ok(LANGS.every((L) => !/IV calc|calculadora de IV ya|ya viene/i.test(H.I18N[L].scHint + H.I18N[L].scBtnTitle)), 'Scripts nao fala mais de calculadora embutida');
    ok(LANGS.every((L) => H.I18N[L].ivcPower.includes('{n}')) && (code.match(/t\('ivcPower'\)/g) || []).length === (code.match(/t\('ivcPower'\)\.replace\('\{n\}', /g) || []).length, 'rotulo do poder com o nivel, trocado em todo uso (card e Times & IV do Simples)');
    const lst = LANGS.map((L) => Object.keys(H.I18N[L]).sort().join());
    ok(lst[0] === lst[1] && lst[1] === lst[2], 'os 3 idiomas com as mesmas chaves');
  });

  // ===================== recursos do card: abas, analise, golpes em uso, comparar, historico, busca, travar, copiar =====================
  const IVM = require(path.join(RAIZ, 'src/domain/iv-math.js'));
  const manda = (H, i, P, extra) => H.canal(i)('__PGIV__' + JSON.stringify(Object.assign(esperado(P), extra || {}))); // o JSON do leitor pelo console REAL
  const tabela = (html) => { const m = /<table class="iv-cmp">([\s\S]*?)<\/table>/.exec(html); return m ? m[1].split('<tr').slice(1).map((r) => [...r.matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g)].map((c) => ({ st: c[1], h: c[2], tx: c[2].replace(/<[^>]+>/g, '').trim() }))) : []; };
  const efet = (html) => { const o = {}; for (const m of html.matchAll(/<div class="iv-ef"><span>([^<]*)<\/span>(.*?)<\/div>/g)) o[m[1]] = [...m[2].matchAll(/>([A-Z]+)<\/span><b[^>]*>×([\d.,]+)<\/b>/g)].map((x) => x[1] + ' ' + x[2].replace(',', '.')); return o; }; // o card escreve no formato do idioma (2,5 em pt): aqui compara o valor
  const potStat = (html) => [...html.matchAll(/<span class="iv-st-n">(\w+)<\/span><\/div><div class="iv-bar iv-bar2">.*?<\/div><span class="iv-st-iv">([^<]*)<span>\/32<\/span><\/span><div class="iv-st-l">([^<]*)<\/div>/g)].map((m) => [m[1], m[2], m[3]]);
  const usoDe = (html) => [...html.matchAll(/<div class="iv-mv iv-uso">(?:<span class="iv-tp"[^>]*>([A-Z]*)<\/span>)?<span class="mv-n">([^<]*)<\/span>(<span class="mv-lv">TM<\/span>)?<span class="mv-p">([^<]*)<\/span><\/div>/g)].map((m) => [m[1] || '', m[2], !!m[3], m[4]]);
  const histLinhas = (html) => [...html.matchAll(new RegExp('<button class="iv-hi" data-a="hist" data-v="(\\d+)"[^>]*><span class="iv-dot" style="background:(#[0-9a-f]+)[^"]*"><\\/span>' + SPW + '<span class="mv-n">([^<]*)<\\/span><span class="mv-lv">[^<]* (\\d+)<\\/span>', 'g'))].map((m) => ({ j: +m[1], cor: m[2], nome: m[3], nv: +m[4] }));
  const STK = { hp: 'hp', atk: 'atk', def: 'def', spa: 'spAtk', spd: 'spDef', vel: 'speed' };

  await secao('abas: Leitor de cara, troca no clique e a ultima fica lembrada (disco torto ou quebrado nao derruba)', async () => {
    const H = await comCatalogo();
    await leva(H, tipInv('pt', SCIZOR, { lider: true }), 2);
    let html = H.html();
    const abas = [...html.matchAll(/<button class="iv-aba( on)?" data-a="aba" data-v="(\w+)"><svg class="ico"[^>]*>[\s\S]*?<\/svg><span class="lbl">([^<]*)<\/span>(?:<b class="iv-n">\d+<\/b>)?<\/button>/g)].map((m) => [m[2], !!m[1], m[3]]); // card novo: o icone da aba e o rotulo
    ok(abas.map((a) => a[0]).join() === 'leitor,analise,golpes,comparar,hist' && abas.filter((a) => a[1]).map((a) => a[0]).join() === 'leitor', 'cinco abas, o Leitor marcado de cara: ' + abas.map((a) => a[2] + (a[1] ? '*' : '')).join(' | '));
    ok(abas.map((a) => a[2]).join() === ['ivcTabRead', 'ivcTabAnalysis', 'ivcMoves', 'ivcTabCompare', 'ivcTabHistory'].map(H.t).join(), 'rotulos das abas pelo i18n');
    ok(cardIvs(html).join() === SCIZOR.growth.join() && !html.includes('class="mv-n"') && html.includes('id="ivBusca"'), 'Leitor: o card de sempre (IV por atributo), sem a lista de golpes (foi pra aba Golpes), com o campo de busca');
    aba(H, 'analise');
    html = H.html();
    ok(abaOn(html) === 'analise' && html.includes(H.t('ivcPotStat')) && !html.includes('id="ivNv"') && H.store.get('ivAba') === 'analise', 'clique em Analise: troca o corpo e grava a aba no disco (ivAba)');
    const H2 = await comCatalogo({ ls: { ivAba: 'analise' } });
    H2.ivRecebe(0, esperado(SCIZOR));
    ok(abaOn(H2.html()) === 'analise', 'app reaberto: volta na ultima aba (Analise)');
    for (const torto of ['xpto', '__proto__', 'constructor', 'toString', '<img src=x>', '']) {
      const H3 = monta({ ls: { ivAba: torto } }); await vez(); H3.setAberto(true); H3.ivRender();
      ok(abaOn(H3.html()) === 'leitor', 'ivAba torto no disco (' + JSON.stringify(torto) + '): cai no Leitor');
    }
    const H4 = monta({ lsQuebra: true }); await vez(); H4.setAberto(true);
    H4.ivRecebe(1, esperado(GYARA)); aba(H4, 'hist');
    ok(abaOn(H4.html()) === 'hist' && histLinhas(H4.html()).length === 1, 'localStorage que lanca em tudo: o card abre, troca de aba e guarda o historico na memoria');
  });

  await secao('historico: os 20 ultimos lidos de qualquer painel, com a cor da conta, no disco; clique reabre; limpar', async () => {
    const H = await comCatalogo();
    const lote = Array.from({ length: 25 }, (_, k) => pk('Pikachu', 10 + k, 1.2, [20, 20, 20, 20, 20, 20]));
    lote.forEach((P, k) => manda(H, k % 4, P));
    const salvo = JSON.parse(H.store.get('ivHist'));
    ok(salvo.length === 20 && salvo[0].d.nivel === 34 && salvo[19].d.nivel === 15, '25 lidos: ficam os 20 mais novos, o ultimo no topo (Nv ' + salvo[0].d.nivel + ' ate Nv ' + salvo[19].d.nivel + ')');
    ok(salvo[0].i === 0 && salvo[1].i === 3 && salvo.every((h) => typeof h.t === 'number' && h.t > 0), 'cada um com a conta de onde veio e a hora');
    manda(H, 1, lote[20]);
    const s2 = JSON.parse(H.store.get('ivHist'));
    ok(s2.length === 20 && s2[0].d.nivel === 30 && s2[0].i === 1 && s2.filter((h) => h.d.nivel === 30).length === 1, 'o mesmo pokemon de novo: sobe pro topo, sem repetir, com a conta nova');
    aba(H, 'hist');
    let L = histLinhas(H.html());
    ok(L.length === 20 && L[0].cor === ACOR[1] && L[1].cor === ACOR[0] && L[0].nome === 'Pikachu' && L[0].nv === 30, '20 linhas, cada uma com a cor da conta (' + L.slice(0, 4).map((x) => x.cor).join(' ') + ') e o nivel');
    ok(H.html().includes('title="' + H.t('trainer') + ' 2"') && H.html().includes('data-a="limpa"'), 'o nome da conta no title da linha e o botao de limpar');
    clica(H, 'hist', 5);
    ok(H.ivDados.nivel === s2[5].d.nivel && abaOn(H.html()) === 'leitor' && H.html().includes('<span class="iv-acc">' + H.t('trainer') + ' ' + (s2[5].i + 1)), 'clique na 6a linha: o card reabre esse pokemon no Leitor, com a conta de onde ele veio');
    const H2 = await comCatalogo({ ls: { ivHist: H.store.get('ivHist'), ivAba: 'hist' } });
    H2.ivRender();
    L = histLinhas(H2.html());
    ok(L.length === 20 && L[0].nv === 30 && L[0].cor === ACOR[1], 'app reaberto: o historico volta do disco, na mesma ordem e com as cores');
    clica(H2, 'limpa');
    ok(H2.store.get('ivHist') === '[]' && H2.ivHist.length === 0 && H2.html().includes(H2.t('ivcHistEmpty')), 'Limpar historico: lista vazia, no disco tambem');
  });

  await secao('historico e fixados no disco: saneados na leitura (lista, tamanho, tipos, nome hostil, edicoes)', async () => {
    const bom = esperado(SCIZOR);
    for (const lixo of ['{"a":1}', 'null', '12', '"x"', 'lixo{', '[1,"x",null,[]]']) {
      const H = await comCatalogo({ ls: { ivHist: lixo, ivFix: lixo } });
      ok(H.ivHist.length === 0 && H.ivFix.length === 0, 'disco com ' + lixo + ': historico e fixados vazios, sem quebrar');
    }
    const hostil = { d: Object.assign({}, bom, { nome: '<img src=x onerror=alert(1)>', tipos: ['FIRE', 'constructor', '<b>x</b>', 'fire'], qualidade: '9', poder: -5, ivTotal: 999, extra: '<script>' }), i: '<b>', t: 'ontem', ed: { nivel: 'x', qualidade: 50, atuais: { hp: '<script>', atk: 1e9, def: 77 }, bases: '<b>' } };
    const ruins = [null, 1, 'x', [], { d: null }, { d: Object.assign({}, bom, { stats: { hp: '1' } }) }, { d: Object.assign({}, bom, { fonte: 'painel' }) }, { d: Object.assign({}, bom, { nome: 'x'.repeat(41) }) }, { d: Object.assign({}, bom, { nivel: 0 }) }];
    const H = await comCatalogo({ ls: { ivHist: JSON.stringify(ruins.concat([hostil])), ivFix: JSON.stringify([hostil]) } });
    ok(H.ivHist.length === 1 && H.ivFix.length === 1, 'so o item com o formato do leitor sobra (os 9 tortos caem)');
    const d = H.ivHist[0].d;
    ok(igual(d.tipos, ['FIRE']) && d.qualidade === null && d.poder === null && d.ivTotal === null && !('extra' in d) && H.ivHist[0].i === -1 && H.ivHist[0].t === 0, 'campos saneados: tipo da lista fechada e sem repetir ' + JSON.stringify(d.tipos) + ', numero torto vira nulo, conta e hora tortas viram -1 e 0');
    const ed = H.ivFix[0].ed;
    ok(ed.nivel === null && ed.qualidade === null && ed.atuais.hp === null && ed.atuais.atk === null && ed.atuais.def === 77 && ed.bases.hp === null, 'edicoes do fixado saneadas: ' + JSON.stringify(ed.atuais));
    for (const a of ['hist', 'comparar']) {
      aba(H, a);
      const html = H.html();
      ok(html.includes('&lt;img src=x onerror=alert(1)&gt;') && !html.includes('<img src=x') && !/<script|<b>/.test(html), 'aba ' + a + ': o nome hostil do disco sai escapado');
    }
    const muitos = Array.from({ length: 1000 }, (_, k) => ({ d: Object.assign({}, bom, { nivel: k + 1 }), i: k % 4, t: k }));
    const H2 = await comCatalogo({ ls: { ivHist: JSON.stringify(muitos), ivFix: JSON.stringify(muitos) } });
    ok(H2.ivHist.length === 20 && H2.ivFix.length === 3 && H2.ivHist[19].d.nivel === 20, 'lista gigante no disco: le so os 20 primeiros do historico e 3 fixados');
    const manual = Object.assign({}, bom, { fonte: 'manual', stats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, vel: 0 } });
    const H3 = await comCatalogo({ ls: { ivFix: JSON.stringify([{ d: manual, i: -1, t: 1 }]) } });
    ok(H3.ivFix.length === 1 && H3.ivFix[0].d.fonte === 'manual', 'fixado da busca (fonte manual) volta do disco');
    H3.ivRecebe(0, bom); const d0 = H3.ivDados;
    manda(H3, 0, SCIZOR, { fonte: 'manual' });
    ok(H3.ivDados === d0, 'mas a fonte manual nao entra pelo canal do painel');
  });

  await secao('busca por nome: sugestoes do catalogo do jogo (sem rede) e a especie em modo manual com IV pelo iv-math', async () => {
    const H = await comCatalogo();
    H.ivRender();
    const busca = (txt) => { H.ivEl.ev.input.forEach((f) => f({ target: { id: 'ivBusca', value: txt } })); return H.ivEl.querySelector('#ivSug').innerHTML; };
    const nomes = (h) => [...h.matchAll(new RegExp('<button data-a="sp" data-v="([^"]*)">' + SPW + '?<span class="mv-n">([^<]*)<\\/span>', 'g'))].map((m) => [m[1], m[2]]); // card novo: a sprite antes do nome
    const execs0 = H.execs.length;
    let sug = busca('scizo');
    ok(igual(nomes(sug), [['scizor', 'Scizor'], ['nightmare scizor', 'Nightmare Scizor']]) && sug.includes('>BUG</span>') && sug.includes('>STEEL</span>'), 'scizo: Scizor (comeca com o texto) antes de Nightmare Scizor, com o nome como o jogo escreve e os tipos do catalogo: ' + nomes(sug).map((x) => x[1]).join(', '));
    sug = busca('PIKA');
    ok(nomes(sug).length >= 1 && nomes(sug)[0][1] === 'Pikachu', 'PIKA (maiuscula): Pikachu primeiro ' + nomes(sug).map((x) => x[1]).join(', '));
    sug = busca('chu');
    const nc = nomes(sug);
    ok(nc.length >= 3 && nc.length <= 8 && nc.every(([sp]) => sp.includes('chu')) && nc.some(([sp]) => sp === 'pikachu') && nc.some(([sp]) => sp === 'raichu'), 'chu: ate 8 especies que contem o texto (' + nc.map((x) => x[1]).join(', ') + ')');
    sug = busca('mr. m');
    ok(nomes(sug).some(([sp, n]) => sp === 'mr. mime' && n === 'Mr. Mime'), 'nome com ponto e espaco: Mr. Mime');
    sug = busca('<img src=x onerror=alert(1)>');
    ok(sug.includes(H.t('ivcSearchNone')) && !sug.includes('<img'), 'texto hostil: nenhuma sugestao e nada cru no HTML');
    ok(busca('   ') === '', 'campo vazio: lista vazia');
    ok(H.execs.length === execs0, 'com o catalogo na memoria, a busca nao pede nada a painel nenhum (' + (H.execs.length - execs0) + ' executeJavaScript)');
    busca('"><img src=x>'); H.ivRender();
    ok(H.html().includes('value="&quot;&gt;&lt;img src=x&gt;"') && !H.html().includes('"><img src=x>'), 'o texto da busca volta escapado no value quando o card se redesenha');
    busca('scizo');
    clica(H, 'sp', 'scizor');
    let html = H.html(), d = H.ivDados;
    const c = criatura('Scizor'), bases = [c.baseHp, c.baseAtk, c.baseDef, c.baseSpAtk, c.baseSpDef, c.baseSpeed];
    ok(d.fonte === 'manual' && d.nome === 'Scizor' && igual(d.tipos, ['BUG', 'STEEL']) && abaOn(html) === 'leitor' && html.includes('value=""') && !html.includes('>scizo<'), 'escolher a sugestao: Scizor no card em modo manual, Leitor aberto, a busca limpa');
    ok(html.includes('>Scizor</span><span class="iv-acc">' + H.t('ivcSearchTag') + '</span>') && cardAviso(html) === H.t('ivcManual') && cardIvs(html).every((x) => x === '?') && cardSprite(html) === SPR + '212.png', 'cabecalho "busca", aviso pedindo nivel, qualidade e atributos, IV "?" e a sprite da especie');
    ok(['hp', 'atk', 'def', 'spa', 'spd', 'vel'].every((k, j) => cardInput(html, 'ivB_' + k) === String(bases[j]) && cardInput(html, 'ivA_' + k) === '') && cardInput(html, 'ivNv') === '100' && cardInput(html, 'ivQ') === '', 'sem stats: as bases do catalogo do jogo nos campos, atuais e qualidade vazios, Nv 100 pra trocar');
    ok(html.includes('>BUG</span>') && html.includes('>STEEL</span>') && !html.includes(H.t('ivcPowerGame')), 'tipos do catalogo e sem "Poder no jogo" (nao veio do jogo)');
    aba(H, 'analise'); html = H.html();
    ok(cardAviso(html) === H.t('ivcManual') && igual(efet(html)[H.t('ivcWeak')], ['FIRE 5.5']), 'Analise sem stats: o aviso e a efetividade dos tipos dele (FIRE x5.5)');
    aba(H, 'golpes');
    ok(cardGolpes(H.html()).length === 14 && cardGolpes(H.html()).filter((x) => x.off).length === 0, 'Golpes sem stats: os 14 da especie, no Nv 100 todos aprendidos');
    aba(H, 'leitor');
    H.ivEl.querySelector('#ivNv').value = '80'; H.ivEl.querySelector('#ivQ').value = '1.55';
    Object.keys(STK).forEach((k) => { H.ivEl.querySelector('#ivA_' + k).value = String(SCIZOR.stats[STK[k]]); });
    H.ivRecalcula();
    html = H.html();
    ok(cardIvs(html).join() === SCIZOR.growth.join() && !cardAviso(html), 'digitou Nv 80, qualidade 1.55 e os 6 atributos do jogo: IV exato pelo iv-math (' + cardIvs(html).join('/') + ')');
    ok(cardKpi(html, H.t('ivcIvTotal')) === '122/192' && cardKpi(html, H.t('ivcPower').replace('{n}', 80)) === H.nf(SCIZOR.power) && !!cardPot(html), 'IV total 122 da soma, poder do jogo pela formula (' + cardKpi(html, H.t('ivcPower').replace('{n}', 80)) + ') e o potencial');
    clica(H, 'fixa');
    ok(H.ivFix.length === 1 && H.ivFix[0].ed.atuais.atk === SCIZOR.stats.atk && H.ivFix[0].ed.nivel === 80, 'fixar o da busca guarda o que foi digitado');
    const H2 = await comCatalogo({ ls: { ivFix: H.store.get('ivFix'), ivAba: 'comparar' } });
    H2.ivRender();
    const hp = tabela(H2.html()).filter((r) => r[0] && r[0].tx === 'HP');
    ok(hp.length === 2 && hp[0][1].tx === '25' && hp[1][1].tx === H2.nf(SCIZOR.stats.hp), 'app reaberto: o fixado da busca volta com o IV calculado do que foi digitado (HP ' + (hp[0] && hp[0][1].tx) + ')');
    busca('gyara');
    H.ivEl.ev.keydown.forEach((f) => f({ key: 'Enter', target: { id: 'ivBusca' } }));
    ok(H.ivDados.nome === 'Gyarados' && H.ivDados.fonte === 'manual', 'Enter na busca: abre a primeira sugestao (Gyarados)');
    ok(H.ivHist.every((h) => h.d.fonte !== 'manual'), 'especie da busca nao entra no historico (ele e dos pokemons lidos)');
    // sem catalogo: avisa que esta carregando, pede ao painel e as sugestoes aparecem quando ele chega
    const R = await catalogo();
    let libera = false;
    const H3 = monta({ exec: (cc) => Promise.resolve(libera && cc.includes('map-markers') ? R : null) });
    await vez(); H3.setAberto(true); H3.ivRender(); desloc += 61e3;
    const n0 = H3.execs.filter((cc) => cc.includes('map-markers')).length;
    H3.ivEl.ev.input.forEach((f) => f({ target: { id: 'ivBusca', value: 'scizo' } }));
    ok(H3.ivEl.querySelector('#ivSug').innerHTML.includes(H3.t('ivcLoading')) && H3.execs.filter((cc) => cc.includes('map-markers')).length > n0, 'sem catalogo: "' + H3.t('ivcLoading') + '" e o card pede o catalogo ao painel');
    libera = true; desloc += 61e3; H3.carregaHunts(); await vezes();
    ok(nomes(H3.html()).some(([sp]) => sp === 'scizor'), 'o catalogo chegou: o card se redesenha com as sugestoes');
    const sec = entre('  // ===== Calculadora de IV do app =====', '  // ----- Atalhos de teclado');
    ok(!/\bfetch\s*\(|XMLHttpRequest|new WebSocket|pokeapi\.co\/api|executeJavaScript/i.test(sec), 'o codigo do card nao faz rede nenhuma (sem fetch, XHR, WebSocket, API da PokeAPI ou executeJavaScript)');
  });

  await secao('efetividade de tipos pela regra da hunt (x2 vira x2.5, x4 vira x5.5, resistencia /1.5, 0 e 1 nao mudam)', async () => {
    const H = await comCatalogo();
    const ve = async (P, tela) => { if (tela) await leva(H, tela); else H.ivRecebe(0, esperado(P)); aba(H, 'analise'); return efet(H.html()); };
    let E = await ve(SCIZOR, tipInv('pt', SCIZOR, {}));
    ok(igual(E[H.t('ivcWeak')], ['FIRE 5.5']), 'Scizor (BUG/STEEL): a unica fraqueza e FIRE, x4 que vira x5.5');
    ok(igual(E[H.t('ivcImmune')], ['POISON 0']), 'imune a POISON: x0 nao muda');
    ok(igual(E[H.t('ivcResist')], ['GRASS 0.17', 'NORMAL 0.33', 'ICE 0.33', 'PSYCHIC 0.33', 'BUG 0.33', 'DRAGON 0.33', 'STEEL 0.33', 'FAIRY 0.33']), 'resistencias: GRASS x0.25 vira x0.17, o resto x0.5 vira x0.33 (' + E[H.t('ivcResist')].join(', ') + ')');
    ok(igual(E[H.t('ivcOffStrong')], ['GRASS 2.5', 'ICE 2.5', 'PSYCHIC 2.5', 'ROCK 2.5', 'DARK 2.5', 'FAIRY 2.5']) && igual(E[H.t('ivcOffWeak')], ['FIRE 0.33', 'STEEL 0.33']) && !E[H.t('ivcOffNone')], 'STAB BUG/STEEL: forte x2.5 contra 6 tipos, fraco contra FIRE e STEEL');
    ok(H.html().includes(H.t('ivcDefHint')) && /FIRE<\/span><b style="color:var\(--er\)">×5,5/.test(H.html()), 'a regra do jogo escrita na aba e o x5,5 em vermelho (virgula em pt)');
    E = await ve(GYARA);
    ok(igual(E[H.t('ivcWeak')], ['ELECTRIC 5.5', 'ROCK 2.5']) && igual(E[H.t('ivcImmune')], ['GROUND 0']) && igual(E[H.t('ivcResist')], ['FIRE 0.33', 'WATER 0.33', 'FIGHTING 0.33', 'BUG 0.33', 'STEEL 0.33']), 'Gyarados (WATER/FLYING): ELECTRIC x5.5, ROCK x2.5, imune a GROUND; GRASS e ICE se anulam (x1, fora da lista)');
    E = await ve(PIKA40);
    ok(igual(E[H.t('ivcWeak')], ['GROUND 2.5']) && igual(E[H.t('ivcResist')], ['ELECTRIC 0.33', 'FLYING 0.33', 'STEEL 0.33']) && !E[H.t('ivcImmune')], 'Pikachu (ELECTRIC, tipo unico): GROUND x2.5 e 3 resistencias, sem imunidade');
    const GENGAR = pk('Gengar', 60, 1.3, [16, 16, 16, 16, 16, 16]);
    E = await ve(GENGAR);
    ok(igual(E[H.t('ivcImmune')], ['NORMAL 0', 'FIGHTING 0']) && igual(E[H.t('ivcWeak')], ['GROUND 2.5', 'PSYCHIC 2.5', 'GHOST 2.5', 'DARK 2.5']) && igual(E[H.t('ivcResist')], ['POISON 0.17', 'BUG 0.17', 'GRASS 0.33', 'FAIRY 0.33']), 'Gengar (GHOST/POISON): duas imunidades e duas resistencias x0.17');
    ok(igual(E[H.t('ivcOffStrong')], ['GRASS 2.5', 'PSYCHIC 2.5', 'GHOST 2.5', 'FAIRY 2.5']) && !E[H.t('ivcOffWeak')], 'STAB GHOST/POISON: um tipo cobre o outro');
    E = await ve(pk('Snorlax', 60, 1.3, [16, 16, 16, 16, 16, 16]));
    ok(igual(E[H.t('ivcOffNone')], ['GHOST 0']) && igual(E[H.t('ivcOffWeak')], ['ROCK 0.33', 'STEEL 0.33']) && !E[H.t('ivcOffStrong')] && igual(E[H.t('ivcWeak')], ['FIGHTING 2.5']) && igual(E[H.t('ivcImmune')], ['GHOST 0']), 'Snorlax (NORMAL): o STAB nao afeta GHOST e nao bate forte em ninguem');
    E = await ve(null, tipTv('pt', DITTO_CHAR, { sufixo: ' (Ditto)', equipe: true }));
    ok(cardAviso(H.html()) === H.t('ivcDitto') && !potStat(H.html()).length && igual(E[H.t('ivcWeak')], ['ROCK 5.5', 'WATER 2.5', 'ELECTRIC 2.5']) && igual(E[H.t('ivcImmune')], ['GROUND 0']), 'Ditto virado Charizard: sem potencial por atributo (IV fixo), mas a efetividade dos tipos da forma');
    H.ivRecebe(0, Object.assign(esperado(SCIZOR), { nome: 'Scizorr Beta', tipos: [] })); aba(H, 'analise');
    ok(H.html().includes(H.t('ivcNoTypes')) && !efet(H.html())[H.t('ivcWeak')], 'sem tipo nenhum (nem no catalogo): avisa, nao inventa');
  });

  await secao('analise: potencial por atributo (melhor e pior, o que falta pro 32 e a faixa quando nao e exato)', async () => {
    const H = await comCatalogo();
    await leva(H, tipInv('pt', SCIZOR, {})); aba(H, 'analise');
    let html = H.html();
    ok(cardKpi(html, H.t('ivcBest')) === 'ATK · 30' && cardKpi(html, H.t('ivcWorst')) === 'VEL · 9', 'Scizor: melhor ATK 30, pior VEL 9');
    const P = potStat(html), c = criatura('Scizor'), B = { hp: c.baseHp, atk: c.baseAtk, def: c.baseDef, spa: c.baseSpAtk, spd: c.baseSpDef, vel: c.baseSpeed };
    const ganho = (k, iv) => IVM.projectStat(B[k], 32, 80, 1.55, k === 'vel' ? 'speed' : k) - IVM.projectStat(B[k], iv, 80, 1.55, k === 'vel' ? 'speed' : k);
    const esp = Object.keys(STK).map((k, j) => [k.toUpperCase(), String(SCIZOR.growth[j]), H.t('ivcFalta').replace('{n}', 32 - SCIZOR.growth[j]) + ' · ' + H.t('ivcGanho').replace('{s}', H.nf(ganho(k, SCIZOR.growth[j]))).replace('{n}', 80)]);
    ok(igual(P, esp), 'cada atributo: o IV, quanto falta pro 32 e quanto de atributo isso daria no Nv 80 (' + P.map((x) => x[0] + ' ' + x[1] + ': ' + x[2]).join(' | ') + ')');
    H.digita('ivNv', '200'); aba(H, 'analise');
    ok(potStat(H.html())[0][2].endsWith(H.t('ivcGanho').replace('{s}', H.nf(IVM.projectStat(B.hp, 32, 200, 1.55, 'hp') - IVM.projectStat(B.hp, 25, 200, 1.55, 'hp'))).replace('{n}', 200)), 'nivel 200 no card: o ganho vai pro do Nv 200');
    H.digita('ivNv', '3000'); aba(H, 'analise');
    const g3 = IVM.projectStat(B.spa, 32, 3000, 1.55, 'spa') - IVM.projectStat(B.spa, 10, 3000, 1.55, 'spa');
    ok(g3 >= 1000 && potStat(H.html())[3][2].includes('+' + H.nf(g3) + ' '), 'Nv 3000: ganho na casa do milhar com o separador do idioma (SPA +' + H.nf(g3) + ')');
    await leva(H, tipInv('pt', PIKA5, {})); aba(H, 'analise');
    html = H.html();
    const P5 = potStat(html);
    ok(P5[0][1] === '8-17' && P5[0][2].startsWith(H.t('ivcFalta').replace('{n}', '15-24')) && P5[3][1] === '30-32' && P5[3][2].startsWith(H.t('ivcFalta').replace('{n}', '0-2')), 'IV com faixa (Nv 5): "faltam" tambem em faixa (' + P5.map((x) => x[1] + ': ' + x[2]).join(' | ') + ')');
    ok(cardKpi(html, H.t('ivcBest')).includes('≈') && cardKpi(html, H.t('ivcWorst')).includes('≈'), 'melhor e pior marcados como aproximados quando o IV nao e exato');
    H.ivRecebe(0, esperado(pk('Scizor', 80, 1.55, [32, 32, 32, 32, 32, 32]))); aba(H, 'analise');
    html = H.html();
    ok(html.includes(H.t('ivcAllEq') + ' (32)') && potStat(html).every((x) => x[2] === H.t('ivcMaxed')), 'IV 32 em tudo: todos iguais e "no maximo" em cada um');
  });

  await secao('golpes: o golpe em uso e o dano medido do lider, do stCache do painel (sem dado, nada inventado)', async () => {
    const H = await comCatalogo();
    const conta = (o) => Object.assign({ ok: true, name: 'Ash', cid: 'c1', hunt: 'Bug Cave', team: [{ name: 'Scizor', level: 80, ld: true }, { name: 'Pikachu', level: 40, ld: false }],
      a: { seconds: 900, mvs: [{ m: 'X-Scissor', n: 412, s: 0, a: 0, hp: 38 }, { m: 'Hive Crush', n: 96, s: 31, a: 96, hp: 61 }, { m: 'Metal Claw', n: 3, s: 0, a: 0, hp: 20 }, { m: 'Thunderbolt', n: 999, s: 0, a: 0, hp: 90 }] } }, o || {});
    const push = (i, o) => H.canal(i)('__PGST__' + JSON.stringify(conta(o)));
    await leva(H, tipInv('pt', SCIZOR, { lider: true }), 2);
    push(2);
    aba(H, 'golpes');
    let html = H.html(), U = usoDe(html);
    ok(html.includes(H.ico('espadas') + '<span>' + H.t('ivcInUse').replace('{h}', 'Bug Cave') + '</span></div>'), 'o Scizor do card e o lider do painel 3 numa hunt: "' + H.t('ivcInUse').replace('{h}', 'Bug Cave') + '"');
    ok(U.length === 2 && igual(U[0], ['BUG', 'X-Scissor', false, H.t('ivcHits').replace('{n}', '412') + ' · ' + H.t('ivcDmg').replace('{p}', '38')]), 'golpe em uso: o da especie com mais acertos (X-Scissor, 412 acertos, 38% da vida por acerto); o Thunderbolt de outro lider fica de fora');
    ok(igual(U[1], ['BUG', 'Hive Crush', true, H.t('ivcHits').replace('{n}', '96') + ' · ' + H.t('ivcDmg').replace('{p}', '61')]), 'o TM elemental da especie (Hive Crush) aparece a parte, marcado TM');
    ok(cardGolpes(html).length === 14, 'e a lista de golpes da especie continua embaixo (14)');
    const nada = async (rot, prep) => { await leva(H, tipInv('pt', SCIZOR, { lider: true }), 2); push(2); prep(); aba(H, 'golpes'); const h = H.html(); ok(!usoDe(h).length && !h.includes(H.t('ivcInUse').split('{h}')[0]) && cardGolpes(h).length === 14, 'sem golpe em uso: ' + rot); };
    await nada('o mesmo Scizor sem ser o lider (tooltip sem ⚔)', () => { manda(H, 2, SCIZOR); });
    await nada('o card veio de outro painel, que nao mandou nada', () => { manda(H, 1, SCIZOR, { ativo: true }); });
    await nada('leitura do painel velha (mais de 60 s)', () => { H.stCache[2].t -= 61e3; });
    await nada('painel fora de hunt', () => { push(2, { hunt: '' }); });
    await nada('o lider do painel agora e outro pokemon', () => { push(2, { team: [{ name: 'Pikachu', level: 40, ld: true }] }); });
    await nada('nenhum golpe medido ainda', () => { push(2, { a: { seconds: 5, mvs: [] } }); });
    await nada('so golpe que nao e dele', () => { push(2, { a: { seconds: 900, mvs: [{ m: 'Thunderbolt', n: 50, s: 0, a: 0, hp: 40 }] } }); });
    await leva(H, tipInv('pt', SCIZOR, { lider: true }), 2);
    push(2, { hunt: '<img src=x onerror=alert(1)>', a: { seconds: 900, mvs: [{ m: 'Bullet Punch', n: 7, s: 0, a: 0, hp: 0 }] } });
    aba(H, 'golpes'); html = H.html(); U = usoDe(html);
    ok(igual(U, [['STEEL', 'Bullet Punch', false, H.t('ivcHits').replace('{n}', '7')]]), 'sem dano medido (sem a vida do selvagem): so os acertos, nenhum % inventado');
    ok(html.includes('&lt;img src=x onerror=alert(1)&gt;') && !html.includes('<img src=x'), 'nome de hunt hostil escapado');
  });

  await secao('fixar e comparar: ate 3, no disco, lado a lado com as diferencas coloridas; tirar o fixado', async () => {
    const H = await comCatalogo();
    await leva(H, tipInv('pt', SCIZOR, {}), 0);
    clica(H, 'fixa');
    ok(H.ivFix.length === 1 && H.html().includes('<button class="on" data-a="fixa" title="' + H.t('ivcUnpin') + '" aria-label="' + H.t('ivcUnpin') + '">' + H.ico('fixar') + '</button>') && JSON.parse(H.store.get('ivFix')).length === 1, '📌: Scizor fixado (no disco) e o botao fica marcado');
    clica(H, 'fixa');
    ok(H.ivFix.length === 0 && H.html().includes('<button data-a="fixa" title="' + H.t('ivcPin') + '" aria-label="' + H.t('ivcPin') + '">' + H.ico('fixar') + '</button>') && H.store.get('ivFix') === '[]', '📌 de novo no mesmo pokemon: solta');
    clica(H, 'fixa');
    await leva(H, tipInv('pt', GYARA, {}), 1); clica(H, 'fixa');
    await leva(H, tipInv('pt', PIKA40, {}), 2); clica(H, 'fixa');
    await leva(H, tipInv('pt', MEGA, {}), 3); clica(H, 'fixa');
    let html = H.html();
    ok(H.ivFix.length === 3 && H.ivFix.map((f) => f.d.nome).join() === 'Scizor,Gyarados,Pikachu' && abaOn(html) === 'comparar' && html.includes(H.t('ivcPinFull')), 'o 4o nao entra (limite 3): o card mostra a aba Comparar com o aviso, pra tirar um');
    ok(html.includes('data-v="comparar">' + H.ico('balanca') + '<span class="lbl">' + H.t('ivcTabCompare') + '</span><b class="iv-n">3</b></button>'), 'a aba Comparar conta os fixados (na bolinha do lado do rotulo)');
    const T = tabela(html), hd = T[0];
    ok(hd.length === 5 && hd[1].tx.includes('Mega Blastoise') && hd[1].tx.includes(H.t('ivcCmpNow')) && hd[2].tx.includes('Scizor') && hd[2].h.includes('data-a="desfixa" data-v="0"') && hd[3].tx.includes('Gyarados') && hd[4].tx.includes('Pikachu'), 'o do card (Mega Blastoise) e os 3 fixados lado a lado, cada fixado com o seu ✕');
    ok(hd[2].h.includes('background:' + ACOR[0]) && hd[3].h.includes('background:' + ACOR[1]) && hd[1].h.includes('background:' + ACOR[3]), 'cada coluna com a cor da conta de onde veio');
    const linha = (rot, n = 0) => T.filter((r) => r[0] && r[0].tx === rot)[n];
    const hp = linha('HP'); // redesign B: o valor fica neutro e so a diferenca (o small) ganha cor
    ok(hp[1].tx === '20' && hp[2].tx === '25 +5' && hp[2].h.includes('<small style="color:var(--ok)">') && hp[3].tx === '18 -2' && hp[3].h.includes('<small style="color:var(--er)">') && !hp[2].st && !hp[3].st && hp[4].tx === '20' && hp[4].st === '', 'IV de HP: 20 no card, Scizor 25 (+5, verde), Gyarados 18 (-2, vermelho), Pikachu 20 (igual, sem cor)');
    const nv = linha(H.t('ivcLevel')), q = linha(H.t('ivcQuality')), tot = linha(H.t('ivcIvTotal')), pw = linha(H.t('ivcPw'));
    ok(nv[1].tx === '100' && nv[2].tx === '80 -20' && nv[3].tx === '120 +20' && nv[4].tx === '40 -60', 'nivel lado a lado: ' + nv.slice(1).map((x) => x.tx).join(' | '));
    ok(q[1].tx === '×1,40' && q[2].tx === '×1,55 +0,15' && q[2].h.includes('<small style="color:var(--ok)">') && q[4].tx === '×1,20 -0,2' && q[4].h.includes('<small style="color:var(--er)">'), 'qualidade (virgula em pt): ' + q.slice(1).map((x) => x.tx).join(' | '));
    ok(tot[1].tx === '120/192' && tot[2].tx === '122/192 +2' && tot[3].tx === '131/192 +11' && tot[4].tx === '120/192', 'IV total: ' + tot.slice(1).map((x) => x.tx).join(' | '));
    ok(pw[1].tx === H.nf(MEGA.power) && pw[2].tx === H.nf(SCIZOR.power) + ' ' + (SCIZOR.power > MEGA.power ? '+' : '') + H.nf(SCIZOR.power - MEGA.power), 'poder pela formula, cada um no seu nivel: ' + pw.slice(1).map((x) => x.tx).join(' | '));
    const atk = linha('ATK', 1);
    ok(atk[1].tx === H.nf(MEGA.stats.atk) && atk[2].tx === H.nf(SCIZOR.stats.atk) + ' ' + (SCIZOR.stats.atk > MEGA.stats.atk ? '+' : '') + H.nf(SCIZOR.stats.atk - MEGA.stats.atk), 'atributos lado a lado (ATK): ' + atk.slice(1).map((x) => x.tx).join(' | '));
    clica(H, 'desfixa', 1);
    html = H.html();
    ok(H.ivFix.map((f) => f.d.nome).join() === 'Scizor,Pikachu' && JSON.parse(H.store.get('ivFix')).length === 2 && !html.includes(H.t('ivcPinFull')) && tabela(html)[0].length === 4, '✕ no Gyarados: sai da comparacao e do disco');
    const H2 = await comCatalogo({ ls: { ivFix: H.store.get('ivFix'), ivAba: 'comparar' } });
    H2.ivRender();
    const T2 = tabela(H2.html());
    ok(T2[0].length === 3 && T2[0][1].tx.includes('Scizor') && !T2.some((r) => r.some((x) => x.h.includes('var(--ok)') || x.h.includes('var(--er)'))), 'app reaberto sem pokemon no card: os 2 fixados voltam, sem diferenca (nao ha com quem comparar)');
    const H3 = await comCatalogo({ ls: { ivAba: 'comparar' } }); H3.ivRender();
    ok(H3.html().includes(H3.t('ivcCmpEmpty').replace('{ico}', H3.ico('fixar'))) && !tabela(H3.html()).length, 'nada fixado: a aba explica como fixar');
  });

  await secao('travar: ⏸ congela o card, o hover segue indo pro historico e o cabecalho mostra', async () => {
    const H = await comCatalogo();
    await leva(H, tipInv('pt', SCIZOR, {}), 0);
    H.digita('ivNv', '95');
    clica(H, 'trava');
    let html = H.html();
    ok(H.ivTrava === true && html.includes(' · ' + H.ico('pausa') + ' ' + H.t('ivcLocked') + '</span>') && html.includes('<button class="iv-sp on" data-a="trava" title="' + H.t('ivcUnlock') + '" aria-label="' + H.t('ivcUnlock') + '">' + H.ico('pausa') + '</button>'), 'travado: o cabecalho diz "' + H.t('ivcLocked') + '" e o ⏸ fica marcado (title pra destravar)');
    await leva(H, tipInv('pt', GYARA, { equipe: true }), 1);
    html = H.html();
    ok(H.ivDados.nome === 'Scizor' && html.includes('>Scizor</span>') && cardInput(html, 'ivNv') === '95' && H.ivHist[0].d.nome === 'Gyarados', 'hover em outro pokemon: o card fica no Scizor (com o Nv 95 digitado) e o Gyarados vai pro historico');
    aba(H, 'hist');
    await leva(H, tipInv('pt', PIKA40, {}), 3);
    ok(histLinhas(H.html())[0].nome === 'Pikachu' && H.ivDados.nome === 'Scizor', 'com o Historico aberto, a lista anda mesmo travado');
    clica(H, 'hist', 1);
    ok(H.ivDados.nome === 'Gyarados' && H.ivTrava === true && H.html().includes(' · ' + H.ico('pausa') + ' '), 'clique no historico abre o escolhido mesmo travado (e o card segue travado nele)');
    clica(H, 'trava');
    ok(!H.html().includes(' · ' + H.ico('pausa')) && H.html().includes('<button class="iv-sp" data-a="trava" title="' + H.t('ivcLock') + '" aria-label="' + H.t('ivcLock') + '">' + H.ico('pausa') + '</button>'), 'destravado: o cabecalho volta ao normal');
    await leva(H, tipInv('pt', PIKA40, {}), 3);
    ok(H.ivDados.nome === 'Pikachu', 'destravado: o proximo hover troca o card');
    const H2 = await comCatalogo(); H2.ivRender();
    ok(!H2.html().includes('data-a="trava"') && !H2.html().includes('data-a="fixa"'), 'card vazio: sem ⏸ nem 📌 (nao ha o que travar)');
  });

  await secao('copiar: texto pro Discord e JSON do card pelo navigator.clipboard (so escrita)', async () => {
    for (const lang of LANGS) {
      const copiados = [];
      const H = await comCatalogo({ ls: { lang }, nav: { clipboard: { writeText: async (s) => { copiados.push(s); } } } });
      await leva(H, tipTv(lang, SCIZOR, { lider: true }), 2);
      let b = clica(H, 'copia', 'txt'); await vezes(2);
      const txt = copiados.pop() || '';
      const esp = ['Scizor · ' + H.t('ivcMoveLv') + ' 80 · ' + H.t('rqEpic') + (lang === 'en' ? ' ×1.55' : ' ×1,55'), H.t('ivcTypes') + ': BUG/STEEL', 'IV 122/192 (64%) · ' + H.t('ivcPot2'), 'HP 25 · ATK 30 · DEF 20 · SPA 10 · SPD 28 · VEL 9', H.t('ivcPowerGame') + ': ' + H.nf(SCIZOR.power)].join('\n');
      ok(txt === esp, '[' + lang + '] texto: nome, nivel, qualidade, tipos, IV total e por atributo, poder\n' + txt);
      ok(b.innerHTML === H.ico('ok') + '<span class="lbl">' + H.t('ivcCopied') + '</span>' && !/—/.test(txt), '[' + lang + '] o botao confirma com o icone de ok e "' + H.t('ivcCopied') + '", sem travessao');
      b = clica(H, 'copia', 'json'); await vezes(2);
      const j = JSON.parse(copiados.pop());
      ok(j.nome === 'Scizor' && j.nivel === 80 && j.qualidade === 1.55 && j.ivTotal === 122 && j.ivExato === true && igual(j.iv, { hp: 25, atk: 30, def: 20, spa: 10, spd: 28, vel: 9 }) && igual(j.tipos, ['BUG', 'STEEL']) && j.poderJogo === SCIZOR.power && j.stats.atk === SCIZOR.stats.atk && j.bases.atk === criatura('Scizor').baseAtk && igual(j.poderNoNivel, { nivel: 80, poder: SCIZOR.power }) && j.fonte === 'tooltip', '[' + lang + '] JSON com os dados do card (IV, stats, bases, poder, tipos)');
    }
    const copiados = [];
    const H = await comCatalogo({ nav: { clipboard: { writeText: async (s) => { copiados.push(s); } } } });
    await leva(H, tipInv('pt', PIKA5, {}));
    H.digita('ivNv', '50');
    clica(H, 'copia', 'json'); clica(H, 'copia', 'txt'); await vezes(2);
    const [jt, tt] = copiados;
    const j = JSON.parse(jt);
    ok(igual(j.iv.hp, [8, 17]) && j.ivExato === false && j.nivel === 5 && j.poderNoNivel.nivel === 50, 'IV com faixa: o JSON leva [min, max] e o poder no nivel escolhido no card');
    ok(tt.includes('HP 8-17 · ATK 18-27') && /\n.* 50: ≈/.test(tt), 'o texto leva a faixa e o poder aproximado no Nv 50:\n' + tt);
    copiados.length = 0;
    await leva(H, tipTv('pt', DITTO_CHAR, { sufixo: ' (Ditto)', equipe: true }));
    clica(H, 'copia', 'txt'); await vezes(2);
    ok(copiados[0].startsWith('Charizard (Ditto) · Nv 60') && copiados[0].includes('IV 89/192 (46%)\n') && !copiados[0].includes('HP '), 'Ditto: marcado, sem potencial e sem IV por atributo:\n' + copiados[0]);
    const mau = Object.assign(esperado(SCIZOR), { nome: '<img src=x onerror=alert(1)>' });
    H.ivRecebe(0, mau); copiados.length = 0;
    clica(H, 'copia', 'txt'); await vezes(2);
    ok(copiados[0].startsWith('<img src=x onerror=alert(1)> · Nv 80') && !H.html().includes('<img src=x'), 'nome hostil: vai cru so pro texto copiado (texto puro), escapado no card');
    for (const [rot, nav] of [['writeText recusado', { clipboard: { writeText: async () => { throw new Error('negado'); } } }], ['sem clipboard', {}]]) {
      const H2 = await comCatalogo({ nav });
      H2.ivRecebe(0, esperado(SCIZOR));
      const b = clica(H2, 'copia', 'txt'); await vezes(2);
      ok(b.innerHTML === H2.ico('fechar') + '<span class="lbl">' + H2.t('ivcCopyFail') + '</span>', rot + ': o botao avisa "' + H2.t('ivcCopyFail') + '" sem quebrar');
    }
  });

  await secao('idiomas, travessao e nome hostil: todas as abas nos 3 idiomas', async () => {
    const H0 = monta(); await vez();
    const ks = Object.keys(H0.I18N.pt).filter((k) => /^ivc/.test(k));
    ok(ks.length >= 77 && ks.every((k) => LANGS.every((L) => typeof H0.I18N[L][k] === 'string' && H0.I18N[L][k] && !/—/.test(H0.I18N[L][k]))), 'os ' + ks.length + ' textos do card nos 3 idiomas, sem travessao');
    ok(ks.every((k) => LANGS.every((L) => (H0.I18N.pt[k].match(/\{\w\}/g) || []).sort().join() === (H0.I18N[L][k].match(/\{\w\}/g) || []).sort().join())), 'os mesmos {n}/{s}/{h}/{p} nos 3 idiomas');
    const PT = ['Fraquezas', 'Resistências', 'Imunidades', 'Histórico', 'Análise', 'Leitor', 'faltam', 'acertos', 'travado', 'Melhor atributo', 'Limpar histórico', 'Fixar pra comparar', 'Buscar espécie', 'da vida do selvagem'];
    const mau = Object.assign(esperado(SCIZOR), { nome: '<img src=x onerror=alert(1)>', ativo: true });
    for (const lang of LANGS) {
      const H = await comCatalogo({ ls: { lang } });
      await leva(H, tipTv(lang, SCIZOR, { lider: true }), 0);
      H.canal(0)('__PGST__' + JSON.stringify({ ok: true, hunt: 'Bug Cave', team: [{ name: 'Scizor', level: 80, ld: true }], a: { seconds: 900, mvs: [{ m: 'X-Scissor', n: 40, s: 0, a: 0, hp: 38 }] } }));
      clica(H, 'fixa'); clica(H, 'trava');
      manda(H, 1, GYARA);
      for (const a of ['leitor', 'analise', 'golpes', 'comparar', 'hist']) {
        aba(H, a);
        const html = H.html(), sobra = lang === 'pt' ? [] : PT.filter((w) => html.includes(w));
        ok(!html.includes('—') && !sobra.length && abaOn(html) === a, '[' + lang + '] aba ' + a + ': sem travessao' + (lang === 'pt' ? '' : ' e sem texto em portugues') + (sobra.length ? ' (sobrou ' + sobra.join(', ') + ')' : ''));
      }
      H.ivRecebe(2, mau); clica(H, 'trava'); H.ivRecebe(2, mau); clica(H, 'fixa');
      for (const a of ['leitor', 'analise', 'golpes', 'comparar', 'hist']) {
        aba(H, a);
        const html = H.html();
        ok(html.includes('&lt;img src=x onerror=alert(1)&gt;') && !html.includes('<img src=x'), '[' + lang + '] aba ' + a + ': nome hostil escapado (cabecalho, historico, fixado)');
      }
    }
  });

  await secao('qualidade com 2 casas no tooltip: o card acha a de verdade e fecha o IV de cada atributo (Tyranitar Nv 149 x1,71)', async () => {
    const H = await comCatalogo();
    const tyr = { nome: 'Tyranitar', shiny: false, ditto: false, tipos: ['ROCK', 'DARK'], ativo: true, time: true, nivel: 149, qualidade: 1.71, ivTotal: 140,
      stats: { hp: 386, atk: 452, def: 370, spa: 240, spd: 361, vel: 250 }, poder: 3513, fonte: 'tooltip' };
    H.ivRecebe(0, tyr); H.ivRender();
    const h = H.html(), ivs = [...h.matchAll(/<span class="iv-st-iv">([^<]*)<span>\/32<\/span><\/span>/g)].map((m) => m[1]);
    ok(!h.includes(H.t('ivcNoFit')), 'sem o aviso de que os atributos nao fecham (com 1,71 exato so o SpA fechava)');
    ok(ivs.slice(0, 6).join() === '28,32,26,5,29,20', 'IV de cada atributo exato: ' + ivs.slice(0, 6).join(' '));
    ok(h.includes(H.nf(3513)) && !h.includes('≈' + H.nf(3528)), 'poder no nivel do card igual ao do jogo (3.513), nao o ≈3.528 da qualidade arredondada');
  });

  await secao('Mercado com o nivel colado no nome ("Cyndaquil Lv.15"): a especie acha o catalogo e o IV sai', async () => {
    const CYN = Object.assign(pk('Cyndaquil', 15, 1.52, [28, 25, 30, 22, 27, 23]), { nomeNv: true });
    const H = await comCatalogo();
    const pg = pagina(); pg.roda(H.IV_LEITOR);
    const card = cardMkt(CYN);
    pg.body.appendChild(h('div', 'win-window', h('div', 'mkt2-main', h('div', 'mkt2-grid', card), anuncio('pt', CYN))));
    await vezes(2); pg.clica(card.querySelector('.mkt2-card-name')); pg.timers(); await vezes(2);
    const lido = pg.ultimo() || {};
    ok(lido.nome === 'Cyndaquil' && lido.nivel === 15 && lido.fonte === 'mercado', 'o leitor tira o "Lv.15" do nome: ' + JSON.stringify({ nome: lido.nome, nivel: lido.nivel }));
    ok(H.ivSane({ ...lido, nome: 'Cyndaquil Lv.15' }).nome === 'Cyndaquil' && H.ivSane({ ...lido, nome: 'Mr. Mime Nv 30' }).nome === 'Mr. Mime', 'o app corta o nivel colado no nome mesmo se ele chegar (Lv.15, Nv 30)');
    H.ivRecebe(0, lido); H.ivRender();
    const htm = H.html();
    ok(!htm.includes(H.t('ivcNoSpecies')) && !htm.includes(H.t('ivcNoFit')), 'sem "especie fora do catalogo" e sem "nao fecham": as bases vieram do catalogo');
  });

  console.log(fail ? '\nFALHOU' : '\nTUDO OK');
  process.exit(fail);
})().catch((e) => { console.log('FAIL excecao no teste: ' + ((e && e.stack) || e)); process.exit(1); });
