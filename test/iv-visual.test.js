// Card de IV, a sprite e o visual (04/10/2026). O leitor REAL (IV_LEITOR) roda numa pagina falsa do jogo com o que ele
// precisa pra achar e recortar a sprite: cadeia :hover, retangulos (getBoundingClientRect), imagens com pixel e tamanho
// natural, canvas (drawImage, getImageData, toDataURL) e o MutationObserver. Os slots imitam o bundle de 02/10: o icone
// img.poke-icon-img (/assets/pokeitems), a folha /assets/pokemon/outfit_N_ recortada como o aF e o canvas do OutfitSprite.
// A mensagem __PGIVS__ passa pelo console-message REAL e chega no app REAL (o <script> inteiro, DOM falso), que guarda a
// sprite por especie e desenha o card. Confere tambem o saneador (ivSprSane), a cadeia jogo -> PokeAPI -> pokebola, a
// memoria por especie (historico, busca, comparar, disco) e os blocos novos de cada aba.
// Roda com: node test/iv-visual.test.js  (PG_INDEX=<outro index.html> roda contra outra copia, pra ver falhar no antigo)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(process.env.PG_INDEX || path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
const css = (/<style>([\s\S]*?)<\/style>/.exec(s) || [])[1] || '';
const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const vezes = async (n = 6) => { for (let k = 0; k < n; k++) await vez(); };
const entre = (a, fim) => { const i = code.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 60)); const j = code.indexOf(fim, i + a.length); if (j < 0) throw new Error('sem fim: ' + fim.slice(0, 40)); return code.slice(i, j); };
const tpl = (marca) => { const i0 = s.indexOf(marca); if (i0 < 0) throw new Error('sem ' + marca); const ini = s.indexOf('`', i0) + 1; return eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`'); };
const regra = (sel) => { const m = new RegExp('(?:^|\\n)\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}').exec(css); return m ? m[1] : ''; };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ORIGEM = 'https://poke.idleworld.online';

// ===================== pagina falsa do jogo (o que o leitor usa do DOM) =====================
const MOS = [];
let entrega = false;
const contem = (a, b) => { for (let p = b; p; p = p.parentNode) if (p === a) return true; return false; };
function avisa(alvo, rec) {
  for (const mo of MOS) for (const r of mo.alvos) {
    if (!(alvo === r.t || (r.o.subtree && contem(r.t, alvo)))) continue;
    if ((rec.type === 'childList' && !r.o.childList) || (rec.type === 'characterData' && !r.o.characterData)) continue;
    mo.fila.push(Object.assign({ target: alvo, addedNodes: [], removedNodes: [] }, rec));
    if (!entrega) { entrega = true; queueMicrotask(() => { entrega = false; for (const m of MOS.slice()) { if (!m.fila.length) continue; const f = m.fila; m.fila = []; m.cb(f, m); } }); }
    break;
  }
}
class FakeMO { constructor(cb) { this.cb = cb; this.alvos = []; this.fila = []; MOS.push(this); } observe(t, o) { this.alvos.push({ t, o: Object.assign({}, o) }); } disconnect() { this.alvos = []; this.fila = []; } }
class Texto { constructor(v) { this.nodeType = 3; this.parentNode = null; this.v = String(v); } get textContent() { return this.v; } }
// seletor: grupos por virgula, descendente por espaco; cada parte com tag, .classes, [attr*="x"] e :hover
const parte = (p) => { const m = /^([a-z0-9]*)((?:\.[\w-]+)*)((?:\[[\w-]+\*="[^"]*"\])*)(:hover)?$/i.exec(p); if (!m) throw new Error('seletor que o DOM falso nao conhece: ' + p); return { tag: m[1], cls: m[2].split('.').filter(Boolean), at: [...m[3].matchAll(/\[([\w-]+)\*="([^"]*)"\]/g)].map((x) => [x[1], x[2]]), hover: !!m[4] }; };
const casaParte = (el, P) => (!P.tag || el.tagName === P.tag.toUpperCase()) && P.cls.every((c) => el.cls.has(c)) && P.at.every(([a, v]) => String(el.getAttribute(a) || '').includes(v)) && (!P.hover || el.hover);
const casa = (el, partes) => { if (!casaParte(el, partes[partes.length - 1])) return false; let i = partes.length - 2; for (let p = el.parentNode; p && i >= 0; p = p.parentNode) if (p.nodeType === 1 && casaParte(p, partes[i])) i--; return i < 0; };
class Elem {
  constructor(tag, cls, at) {
    this.nodeType = 1; this.tagName = tag.toUpperCase(); this.parentNode = null; this.childNodes = []; this.cls = new Set(String(cls || '').split(/\s+/).filter(Boolean)); this.at = Object.assign({}, at);
    this.classList = { contains: (c) => this.cls.has(c) }; this.r = { left: 0, top: 0, width: 0, height: 0 }; this.hover = false; this.ouve = {};
  }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
  appendChild(n) { n.parentNode = this; this.childNodes.push(n); avisa(this, { type: 'childList', addedNodes: [n] }); return n; }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.at, k) ? this.at[k] : null; }
  matches(sel) { return sel.split(',').some((g) => casa(this, g.trim().split(/\s+/).map(parte))); }
  closest(sel) { for (let p = this; p && p.nodeType === 1; p = p.parentNode) if (p.matches(sel)) return p; return null; }
  querySelectorAll(sel) { const out = []; const anda = (e) => { for (const c of e.children) { if (c.matches(sel)) out.push(c); anda(c); } }; anda(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  getBoundingClientRect() { const r = this.r; return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height }; }
  addEventListener(t, f) { (this.ouve[t] = this.ouve[t] || []).push(f); }
}
// imagem com pixel (RGBA) e tamanho natural; desenhar uma imagem de outra origem num canvas o deixa sujo (getImageData lanca)
class Img extends Elem {
  constructor(cls, src, nw, nh, pinta, opt = {}) {
    super('img', cls, { src });
    this.src = new URL(src, ORIGEM + '/play').href; this.currentSrc = this.src; this.naturalWidth = nw; this.naturalHeight = nh; this.complete = opt.complete !== false;
    this.px = new Uint8ClampedArray(nw * nh * 4); this.suja = !!opt.suja; if (pinta) pinta(this);
  }
}
class Canvas extends Elem {
  constructor(w, h) { super('canvas', ''); this.width = w; this.height = h; this.px = null; this.suja = false; }
  get buf() { if (!this.px || this.px.length !== this.width * this.height * 4) this.px = new Uint8ClampedArray(this.width * this.height * 4); return this.px; }
  getContext() {
    const cv = this;
    return {
      drawImage(src, sx, sy, sw, sh, dx = 0, dy = 0) {
        const from = src instanceof Canvas ? src.buf : src.px, fw = src instanceof Canvas ? src.width : src.naturalWidth;
        if (src.suja) cv.suja = true;
        for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const a = ((sy + y) * fw + (sx + x)) * 4, b = ((dy + y) * cv.width + (dx + x)) * 4; for (let k = 0; k < 4; k++) cv.buf[b + k] = from[a + k]; }
      },
      getImageData(x, y, w, h) { if (cv.suja) throw new Error('SecurityError: canvas sujo'); const d = new Uint8ClampedArray(w * h * 4); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) for (let k = 0; k < 4; k++) d[(j * w + i) * 4 + k] = cv.buf[((y + j) * cv.width + x + i) * 4 + k]; return { data: d }; }
    };
  }
  toDataURL() { return 'data:image/png;base64,' + Buffer.from('PNG' + this.width + 'x' + this.height + ':' + Buffer.from(this.buf).toString('hex').slice(0, 2000)).toString('base64'); }
}
const retangulo = (px, W, x0, y0, x1, y1, rgba = [200, 80, 40, 255]) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) rgba.forEach((v, k) => { px[(y * W + x) * 4 + k] = v; }); };
function h(tag, cls, ...kids) {
  const at = kids[0] && kids[0].constructor === Object ? kids.shift() : {};
  const e = new Elem(tag, cls, at);
  for (const k of kids.flat(Infinity)) { if (k == null || k === false || k === '') continue; e.appendChild(k instanceof Elem || k instanceof Texto ? k : new Texto(k)); }
  return e;
}
const em = (el, left, top, width, height) => { el.r = { left, top, width, height }; return el; };
function pagina() {
  const raiz = h('html', ''), body = em(h('body', ''), 0, 0, 1280, 800);
  raiz.appendChild(body);
  const ouvidos = {}, timers = [], logs = [];
  const document = { body, documentElement: raiz, querySelector: (q) => raiz.querySelector(q), querySelectorAll: (q) => raiz.querySelectorAll(q), createElement: (t) => (t === 'canvas' ? new Canvas(300, 150) : new Elem(t, '')), addEventListener: (t, f) => { (ouvidos[t] = ouvidos[t] || []).push(f); } };
  return {
    body, document, logs,
    roda: (js) => new Function('window', 'document', 'MutationObserver', 'console', 'setTimeout', 'location', 'URL', js)({}, document, FakeMO, { log: (...a) => logs.push(a.map(String).join(' ')) }, (f) => { timers.push(f); return timers.length; }, { origin: ORIGEM, href: ORIGEM + '/play' }, URL),
    // o mouse em cima de um elemento: ele e os pais ficam com :hover (no jogo, o tooltip abre no mouseenter do slot)
    passa: (el) => { raiz.querySelectorAll('*').forEach((e) => { e.hover = false; }); for (let p = el; p && p.nodeType === 1; p = p.parentNode) p.hover = true; },
    clica: (alvo) => (ouvidos.click || []).forEach((f) => f({ target: alvo })),
    timers: () => timers.splice(0).forEach((f) => f()),
    sprs: () => logs.filter((l) => l.startsWith('__PGIVS__')).map((l) => JSON.parse(l.slice(9))),
    leituras: () => logs.filter((l) => l.startsWith('__PGIV__'))
  };
}
// '*' (o passa() limpa o :hover de todo mundo): qualquer elemento
Elem.prototype.querySelectorAll = function (sel) { const out = []; const anda = (e) => { for (const c of e.children) { if (sel === '*' || c.matches(sel)) out.push(c); anda(c); } }; anda(this); return out; };

// o tooltip da mochila (window.inventory.* do bundle de 02/10), em pt
const KJ = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'speed'], EXPJ = { hp: 0.95, atk: 0.8, def: 0.8, spAtk: 0.8, spDef: 0.8, speed: 0.95 };
const criatura = (nome) => { const c = J.creatures.find((x) => x.name === nome); if (!c) throw new Error('fixture sem ' + nome); return c; };
function pk(nome, level, q, g, extra) {
  const c = criatura(nome), b = [c.baseHp, c.baseAtk, c.baseDef, c.baseSpAtk, c.baseSpDef, c.baseSpeed];
  const stats = Object.fromEntries(KJ.map((k, j) => [k, Math.round(level / 100 * (b[j] + 2 * g[j]) * Math.pow(q, EXPJ[k]))]));
  return Object.assign({ name: nome, level, quality: q, ivTotal: g.reduce((a, x) => a + x, 0), stats, power: Math.round(KJ.reduce((t, k) => t + stats[k], 0) * q), type1: c.type1, type2: c.type2 || '', growth: g }, extra || {});
}
const tip = (P, o = {}) => h('div', 'inv-tip', { style: 'left:10px;top:10px;width:244px' },
  h('div', 'inv-tip-name', P.name, P.shiny ? ' ✨' : ''),
  h('div', 'inv-tip-types', [P.type1, P.type2].filter(Boolean).map((t) => h('span', 'pp-type pp-type--sm', { title: t }, t))),
  h('div', 'inv-tip-chips', o.lider ? h('span', 'inv-tip-chip leader', '⚔ Ativo') : h('span', 'inv-tip-chip box', 'Guardado'), P.shiny ? h('span', 'inv-tip-chip shiny', 'Shiny') : null),
  h('div', 'inv-tip-poke',
    h('div', 'inv-tip-poke-top', h('span', '', 'Nv ', h('b', '', P.level)), h('span', '', 'Qualidade ', h('b', '', 'Épica'), ' ', h('small', '', '×', P.quality.toFixed(2))), h('span', '', 'IV ', h('b', '', P.ivTotal), h('small', '', '/', 192))),
    h('div', 'inv-tip-poke-grid', ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Vel'].map((r, j) => h('span', '', r, ' ', h('b', '', P.stats[KJ[j]])))),
    h('div', 'inv-tip-poke-power', '💪 Poder ', h('b', '', P.power.toLocaleString('pt-BR')))));
const SCIZOR = pk('Scizor', 80, 1.55, [25, 30, 20, 10, 28, 9]);
const SCIZOR_SH = pk('Scizor', 50, 1.4, [20, 20, 20, 20, 20, 20], { shiny: true });
const GYARA = pk('Gyarados', 120, 1.72, [18, 27, 22, 9, 30, 25]);
const MEGA = pk('Mega Blastoise', 100, 1.4, [20, 20, 20, 20, 20, 20]);
const ESCYTHER = pk('Furious Scyther', 150, 1.74, [26, 30, 22, 24, 19, 20]);
// os slots: icone (32x32, pixel em 5..26 x 3..28), a folha do aF (4 direcoes x 3 quadros de 96: o jogo mostra a coluna 2,
// pixel em 200..250 x 10..80; as outras colunas tambem tem desenho) e o canvas do OutfitSprite (64x64, pixel em 17..46 x 19..51)
const slotIcone = (x, y, src = '/assets/pokeitems/gen2/212.png', o) => { const s = em(h('div', 'inv-slot inv-poke'), x, y, 38, 38); s.appendChild(em(new Img('poke-icon-img', src, 32, 32, (im) => retangulo(im.px, 32, 5, 3, 26, 28), o), x + 3, y + 3, 32, 32)); return s; };
const slotFolha = (x, y) => {
  const s = em(h('div', 'inv-slot inv-poke'), x, y, 38, 38), box = em(h('div', ''), x + 3, y + 3, 32, 32);
  const im = em(new Img('', '/assets/pokemon/outfit_9_.png', 384, 288, (i) => { retangulo(i.px, 384, 200, 10, 250, 80); retangulo(i.px, 384, 10, 10, 80, 80); retangulo(i.px, 384, 300, 120, 370, 200); }), x + 3 - 64, y + 3, 128, 96);
  box.appendChild(im); s.appendChild(box); return s;
};
const slotCanvas = (x, y) => { const s = em(h('div', 'inv-slot inv-poke'), x, y, 38, 38), c = em(new Canvas(64, 64), x + 3, y + 3, 32, 32); retangulo(c.buf, 64, 17, 19, 46, 51, [180, 200, 40, 255]); s.appendChild(c); return s; };
const mochila = (...slots) => { const g = em(h('div', 'inv-grid'), 10, 10, 300, 100); slots.forEach((x) => g.appendChild(x)); return em(h('div', 'win-window', g), 0, 0, 320, 400); };
// hover no slot, o jogo poe o tooltip no body: o leitor le
async function hover(pg, slot, P, o) { pg.passa(slot.children[0] && slot.children[0].children[0] ? slot.children[0].children[0] : slot.children[0] || slot); pg.body.appendChild(tip(P, o)); await vezes(3); }

// ===================== a janela do app (o <script> REAL com DOM falso, como o iv-integrada) =====================
const realNow = Date.now; let desloc = 0; Date.now = () => realNow() + desloc;
function monta(opts = {}) {
  const byId = new Map();
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
  class WV extends El { constructor() { super('webview'); } executeJavaScript(c) { return opts.exec ? opts.exec(String(c)) : Promise.resolve(null); } setAudioMuted() {} setZoomFactor() {} getURL() { return ORIGEM + '/play'; } reload() {} loadURL() { return Promise.resolve(); } getWebContentsId() { return 1; } }
  const grid = new El('div', 'grid');
  document = {
    getElementById: (id) => { if (id === 'grid') return grid; if (!byId.has(id)) byId.set(id, new El(id === 'tlLevel' || id === 'tlTm' || /^sc(Url|Name)$/.test(id) ? 'input' : 'div', id)); return byId.get(id); },
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)), querySelector: () => new El('div'), querySelectorAll: () => [],
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = { addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, appVersion: '1.5.31' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js')) };
  const opc = (n) => 'typeof ' + n + ' !== "undefined" ? ' + n + ' : null';
  const exporta = '\n;return { ivRecebe, ivRender, IV_LEITOR, carregaHunts, t, nf, I18N, setAberto: (v) => { ivAberto = v; }, setAba: (v) => { ivAba = v; }, get basesByName() { return basesByName; }, set catalogoVazio(v) { basesByName = {}; movesByName = {}; huntsCacheT = Date.now(); }, get ivHist() { return ivHist; }, ICO, ico, stSane, stCache,'
    + ' ivSprSane: ' + opc('ivSprSane') + ', ivSprHtml: ' + opc('ivSprHtml') + ', ivSprRecebe: ' + opc('ivSprRecebe') + ', get ivSprMem() { return ' + opc('ivSprMem') + '; }, get ivSprRuim() { return ' + opc('ivSprRuim') + '; } };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, { reload() {} }, noop, noop, noop, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  const ivEl = byId.get('ivCard');
  const CM = entre("wv.addEventListener('console-message', ", '\n      });').slice("wv.addEventListener('console-message', ".length) + '\n      }';
  return Object.assign(api, {
    byId, store, ivEl, html: () => ivEl.innerHTML,
    // o console-message REAL do painel i, ligado no ivRecebe e no ivSprRecebe desta janela
    canal: (i = 0) => { const f = new Function('i', 'dlgT', 'stSane', 'stCache', 'dtPush', 'ivRecebe', 'ivSprRecebe', 'Date', 'return ' + CM)(i, [0, 0, 0, 0], api.stSane, api.stCache, () => {}, api.ivRecebe, api.ivSprRecebe || (() => {}), Date); return (m) => f({ message: m }); }
  });
}
const HUNTS_JS = tpl('const HUNTS_JS = ');
let RCAT = null;
const catalogo = async () => RCAT || (RCAT = await new Function('fetch', 'return ' + HUNTS_JS)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : u.indexOf('items') >= 0 ? { items: [] } : { creatures: J.creatures }) })));
const comCatalogo = async (opts = {}) => { const R = await catalogo(); const H = monta(Object.assign({ exec: (c) => Promise.resolve(c.includes('map-markers') ? R : null) }, opts)); await vez(); desloc += 61e3; H.carregaHunts(); await vezes(); H.setAberto(true); return H; };
// pagina do jogo com o leitor REAL, ligada no console-message do painel i do app H
const leva = (H, pg, i = 0) => { const on = H.canal(i); pg.logs.splice(0).forEach(on); };
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const caixas = (html) => [...html.matchAll(/<span class="iv-spw([^"]*)" data-n="([^"]*)" data-s="(\d)" data-d="(\d)" data-px="(\d+)" style="width:([\d.]+)px;height:([\d.]+)px">(<img class="iv-spr" src="([^"]+)"[^>]*>|<svg[\s\S]*?<\/svg>)<\/span>/g)]
  .map((m) => ({ cl: m[1].trim(), n: m[2], sh: m[3] === '1', px: +m[5], w: +m[6], h: +m[7], src: m[9] || '', img: m[8] }));

(async () => {
  await secao('leitor: acha o slot pelo :hover e recorta a sprite que o jogo desenhou (icone, folha do aF e canvas)', async () => {
    const H = monta(); await vez();
    // icone da mochila: dois slots, o mouse no segundo
    let pg = pagina(); pg.roda(H.IV_LEITOR);
    const a = slotIcone(10, 10, '/assets/pokeitems/36720.png'), b = slotIcone(55, 10);
    pg.body.appendChild(mochila(a, b));
    await hover(pg, b, SCIZOR);
    let S = pg.sprs();
    ok(S.length === 1 && igual(S[0], { nome: 'Scizor', shiny: false, ditto: false, spr: { u: '/assets/pokeitems/gen2/212.png', x: 5, y: 3, w: 22, h: 26, iw: 32, ih: 32 } }), 'icone (img.poke-icon-img): o do slot com o mouse, nao o primeiro da mochila; caminho do jogo e o recorte sem a borda transparente ' + JSON.stringify(S[0]));
    const L = pg.logs.map((l) => l.slice(0, 9));
    ok(L.join() === '__PGIVS__,__PGIV__{' && pg.leituras().length === 1, 'a sprite vai numa mensagem a parte (__PGIVS__), antes da leitura (__PGIV__ segue igual): ' + L.join(' '));
    pg.body.appendChild(tip(SCIZOR)); await vezes(3);
    ok(pg.sprs().length === 1 && pg.leituras().length === 2, 'o mesmo pokemon de novo: a leitura vai (hover novo), a sprite igual nao repete');
    // folha do aF: a caixa de 32x32 com overflow corta a folha (4 direcoes x 3 quadros de 96 px, mostrada em 1/3): coluna 2
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const f = slotFolha(10, 10); pg.body.appendChild(mochila(f));
    await hover(pg, f, MEGA);
    S = pg.sprs();
    ok(S.length === 1 && igual(S[0].spr, { u: '/assets/pokemon/outfit_9_.png', x: 200, y: 10, w: 51, h: 71, iw: 384, ih: 288 }), 'folha recortada (aF): o quadro da coluna 2 em pixel da folha, aparado (as outras colunas ficam de fora) ' + JSON.stringify(S[0] && S[0].spr));
    // canvas do OutfitSprite (especie sem icone no jogo)
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const c = slotCanvas(10, 10); pg.body.appendChild(mochila(c));
    await hover(pg, c, ESCYTHER);
    S = pg.sprs();
    ok(S.length === 1 && S[0].nome === 'Furious Scyther' && S[0].spr.w === 30 && S[0].spr.h === 33 && /^data:image\/png;base64,/.test(S[0].spr.d) && !('u' in S[0].spr), 'canvas (OutfitSprite): vira PNG aparado (30x33 dos 64x64) ' + JSON.stringify(S[0] && { w: S[0].spr.w, h: S[0].spr.h, d: S[0].spr.d.slice(0, 30) }));
    ok(S.length && S[0].spr.d.length <= 30000 && pg.logs[0].length < 32000, 'PNG dentro do teto (30 KB) e a mensagem abaixo do teto do canal (32 KB)');
    // Mercado: o herói do painel de detalhes
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const KM = ['HP', 'Atq', 'Def', 'Atq. Esp.', 'Def. Esp.', 'Veloc.'];
    const card = h('article', 'mkt2-card clickable', h('div', 'mkt2-card-name', 'Gyarados'));
    const hero = em(h('div', 'mkt2-hero', h('div', 'mkt2-hero-glow')), 600, 100, 140, 140);
    hero.appendChild(em(new Img('poke-icon-img', '/assets/pokeitems/36720.png', 32, 32, (im) => retangulo(im.px, 32, 2, 4, 29, 27)), 616, 116, 108, 108));
    pg.body.appendChild(h('div', 'win-window', card, h('aside', 'mkt2-details', h('div', 'mkt2-details-body', hero, h('div', 'mkt2-details-name', 'Gyarados'),
      h('div', 'mkt2-statlist', h('div', 'mkt2-stat', h('span', '', '⚡ Nível'), h('b', '', GYARA.level)), h('div', 'mkt2-stat', h('span', '', 'IV'), h('b', '', GYARA.ivTotal + '/192'))),
      h('div', 'mkt2-stats', KJ.map((k, j) => h('div', 'mkt2-statcell', h('span', 'mkt2-statcell-k', KM[j]), h('b', 'mkt2-statcell-v', GYARA.stats[k]))))))));
    pg.clica(card); pg.timers(); await vezes(2);
    S = pg.sprs();
    ok(S.length === 1 && igual(S[0].spr, { u: '/assets/pokeitems/36720.png', x: 2, y: 4, w: 28, h: 24, iw: 32, ih: 32 }) && pg.leituras().length === 1, 'Mercado: a sprite do herói do anúncio (.mkt2-hero) junto com a leitura ' + JSON.stringify(S[0] && S[0].spr));
  });

  await secao('leitor: sem sprite quando nao da pra saber qual e (chat, bloco grande, mais de um, imagem de fora, canvas vazio)', async () => {
    const H = monta(); await vez();
    // cada caso tem o controle: na mesma pagina, o mouse num slot bom em seguida manda a sprite (a falta dela e escolha do leitor)
    const controle = async (pg) => { const bom = slotIcone(400, 10, '/assets/pokeitems/36720.png'); pg.body.appendChild(mochila(bom)); const n0 = pg.sprs().length; await hover(pg, bom, GYARA); return n0 === 0 && pg.sprs().length === 1; };
    // link do chat: o mouse num texto dentro de uma lista alta, sem sprite no caminho
    let pg = pagina(); pg.roda(H.IV_LEITOR);
    const link = em(h('span', 'chat-link', '[Scizor]'), 20, 600, 60, 16), chat = em(h('div', 'chat-log', em(h('div', 'chat-msg', link), 10, 590, 300, 20)), 0, 300, 320, 400);
    pg.body.appendChild(mochila(slotIcone(10, 10))); pg.body.appendChild(chat);
    pg.passa(link); pg.body.appendChild(tip(SCIZOR)); await vezes(3);
    ok(pg.leituras().length === 1 && await controle(pg), 'link do chat: a leitura vai, sprite nenhuma (o caminho do mouse sobe num bloco alto antes de achar sprite); o slot da mochila depois manda a dele');
    // linha com duas sprites (ambiguo)
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const linha = em(h('div', 'trd-pick'), 10, 10, 300, 34); linha.appendChild(em(new Img('poke-icon-img', '/assets/pokeitems/1.png', 32, 32, (im) => retangulo(im.px, 32, 1, 1, 30, 30)), 12, 11, 22, 22)); linha.appendChild(em(new Img('poke-icon-img', '/assets/pokeitems/2.png', 32, 32, (im) => retangulo(im.px, 32, 1, 1, 30, 30)), 40, 11, 22, 22));
    const nomeEl = em(h('span', 'trd-pick-n', 'Scizor'), 70, 12, 80, 16); linha.appendChild(nomeEl); pg.body.appendChild(linha);
    pg.passa(nomeEl); pg.body.appendChild(tip(SCIZOR)); await vezes(3);
    ok(await controle(pg), 'mais de uma sprite no primeiro bloco que tem sprite: nenhuma (nao chuta); o slot bom depois manda');
    // imagem de outro site e caminho fora das pastas de sprite
    for (const [src, rot] of [['https://evil.example/assets/pokeitems/1.png', 'outra origem'], ['/assets/items/potion.png', 'pasta de item'], ['/assets/pokeitems/../../x.png', 'caminho com ..']]) {
      pg = pagina(); pg.roda(H.IV_LEITOR);
      const sl = slotIcone(10, 10, src); pg.body.appendChild(mochila(sl));
      await hover(pg, sl, SCIZOR);
      ok(pg.leituras().length === 1 && await controle(pg), 'imagem com ' + rot + ' (' + src + '): sprite nenhuma; a do jogo depois vai');
    }
    // canvas que o jogo ainda nao desenhou (so transparencia) e o tamanho padrao de canvas nunca desenhado
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const vazio = em(h('div', 'inv-slot inv-poke'), 10, 10, 38, 38); vazio.appendChild(em(new Canvas(64, 64), 13, 13, 32, 32)); pg.body.appendChild(mochila(vazio));
    await hover(pg, vazio, ESCYTHER);
    ok(await controle(pg), 'canvas so com transparencia: sprite nenhuma');
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const grande = em(h('div', 'inv-slot inv-poke'), 10, 10, 38, 38), cg = em(new Canvas(600, 600), 13, 13, 32, 32); retangulo(cg.buf, 600, 1, 1, 500, 500); grande.appendChild(cg); pg.body.appendChild(mochila(grande));
    await hover(pg, grande, ESCYTHER);
    ok(await controle(pg), 'canvas maior que 512 px: sprite nenhuma');
    // imagem que nao deixa ler o pixel (canvas sujo): vai inteira, sem aparar
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const suja = slotIcone(10, 10, '/assets/pokeitems/36720.png', { suja: true }); pg.body.appendChild(mochila(suja));
    await hover(pg, suja, GYARA);
    ok(pg.sprs().length === 1 && igual(pg.sprs()[0].spr, { u: '/assets/pokeitems/36720.png', x: 0, y: 0, w: 32, h: 32, iw: 32, ih: 32 }), 'imagem que nao deixa ler o pixel: o recorte inteiro, sem aparar');
    // imagem ainda baixando: a sprite vai quando ela carregar
    pg = pagina(); pg.roda(H.IV_LEITOR);
    const lento = slotIcone(10, 10, '/assets/pokeitems/36720.png', { complete: false }); pg.body.appendChild(mochila(lento));
    await hover(pg, lento, GYARA);
    const antes = pg.sprs().length, img = lento.children[0]; img.complete = true; (img.ouve.load || []).forEach((f) => f());
    ok(antes === 0 && pg.sprs().length === 1 && pg.leituras().length === 1, 'imagem ainda baixando no hover: a sprite vai no load dela (' + antes + ' antes, ' + pg.sprs().length + ' depois)');
  });

  await secao('canal e saneador: so caminho do jogo, numero em faixa, recorte dentro da imagem e PNG pequeno', async () => {
    const H = await comCatalogo();
    ok(typeof H.ivSprSane === 'function', 'ivSprSane existe');
    const S = H.ivSprSane || (() => 'sem saneador');
    const bom = { u: '/assets/pokeitems/36720.png', x: 2, y: 4, w: 28, h: 24, iw: 32, ih: 32 };
    ok(igual(S(bom), bom) && igual(S({ u: '/assets/pokemon/outfit_9_.png', x: 200, y: 10, w: 51, h: 71, iw: 384, ih: 288 }), { u: '/assets/pokemon/outfit_9_.png', x: 200, y: 10, w: 51, h: 71, iw: 384, ih: 288 })
      && igual(S({ u: '/assets/shiny/icon_12481.png', x: 0, y: 0, w: 32, h: 32, iw: 32, ih: 32, lixo: 1 }), { u: '/assets/shiny/icon_12481.png', x: 0, y: 0, w: 32, h: 32, iw: 32, ih: 32 }), 'aceita ícone, folha e ícone shiny (e larga o que sobra)');
    const d = 'data:image/png;base64,' + 'iVBORw0KGgo'.repeat(10);
    ok(igual(S({ d, w: 30, h: 33 }), { d, w: 30, h: 33 }), 'aceita o PNG do canvas');
    const ruins = [
      ['outra origem', Object.assign({}, bom, { u: 'https://evil.example/assets/pokeitems/1.png' })], ['URL completa do jogo', Object.assign({}, bom, { u: ORIGEM + '/assets/pokeitems/1.png' })],
      ['pasta de item', Object.assign({}, bom, { u: '/assets/items/potion.png' })], ['caminho com ..', Object.assign({}, bom, { u: '/assets/pokeitems/../x.png' })], ['javascript:', Object.assign({}, bom, { u: 'javascript:alert(1)' })],
      ['aspas no caminho', Object.assign({}, bom, { u: '/assets/pokeitems/1.png" onerror="alert(1)' })], ['sem .png', Object.assign({}, bom, { u: '/assets/pokeitems/1' })],
      ['numero gigante', Object.assign({}, bom, { iw: 1e9, ih: 1e9, w: 1e6 })], ['largura acima de 512', Object.assign({}, bom, { w: 600, iw: 9000 })], ['numero quebrado', Object.assign({}, bom, { x: 2.5 })], ['numero em texto', Object.assign({}, bom, { x: '2' })],
      ['negativo', Object.assign({}, bom, { x: -1 })], ['recorte fora da imagem', Object.assign({}, bom, { x: 20, w: 28 })], ['largura 0', Object.assign({}, bom, { w: 0 })],
      ['data URL gigante', { d: 'data:image/png;base64,' + 'A'.repeat(40000), w: 30, h: 33 }], ['data URL que nao e PNG', { d: 'data:image/svg+xml;base64,PHN2Zz4=', w: 30, h: 33 }], ['data URL com script', { d: 'data:text/html,<script>alert(1)</script>', w: 30, h: 33 }],
      ['data URL com aspas', { d: 'data:image/png;base64,AAA" onerror="alert(1)', w: 30, h: 33 }], ['PNG maior que 256', { d, w: 300, h: 33 }], ['lista', [bom]], ['nulo', null], ['texto', 'x']];
    const passou = ruins.filter(([, o]) => S(o) !== null).map(([r]) => r);
    ok(!passou.length, 'recusa: ' + ruins.map(([r]) => r).join(', ') + (passou.length ? ' (PASSOU: ' + passou.join(', ') + ')' : ''));
    // pelo canal REAL: so __PGIVS__ com o formato certo entra na memoria; nome hostil sai escapado
    const on = H.canal(0), mem = () => (H.ivSprMem ? [...H.ivSprMem.keys()] : []);
    on('__PGIVS__' + JSON.stringify({ nome: 'Scizor', shiny: false, ditto: false, spr: Object.assign({}, bom, { u: 'https://evil.example/x.png' }) }));
    on('__PGIVS__' + JSON.stringify({ nome: 'x'.repeat(41), shiny: false, ditto: false, spr: bom }));
    on('__PGIVS__' + JSON.stringify({ nome: 'Scizor', spr: { d: 'data:image/png;base64,' + 'A'.repeat(31990), w: 30, h: 33 } }));
    on('__PGIVS__{quebrado'); on('__PGIVS_' + JSON.stringify({ nome: 'Scizor', spr: bom }));
    const nada = mem().length;
    on('__PGIVS__' + JSON.stringify({ nome: 'Gyarados', shiny: false, ditto: false, spr: bom })); // o controle: o formato certo entra
    ok(nada === 0 && mem().join() === 'gyarados|0', 'canal: caminho de fora, nome com mais de 40, mensagem acima do teto, JSON quebrado e marca errada nao entram; a sprite certa entra (' + mem().join(',') + ')');
    H.ivSprMem && H.ivSprMem.clear();
    on('__PGIVS__' + JSON.stringify({ nome: '<img src=x onerror=alert(1)>', shiny: 'true', ditto: 1, spr: bom }));
    ok(mem().join() === '<img src=x onerror=alert(1)>|0', 'nome hostil entra so como chave (shiny/ditto so com true de verdade): ' + mem().join());
    H.ivRecebe(0, { nome: '<img src=x onerror=alert(1)>', shiny: false, ditto: false, tipos: [], ativo: false, time: false, nivel: 80, qualidade: 1.5, ivTotal: 100, stats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, vel: 1 }, poder: 10, fonte: 'tooltip' });
    ok(H.html().includes('data-n="&lt;img src=x onerror=alert(1)&gt;"') && !H.html().includes('<img src=x'), 'no card o nome da caixa da sprite sai escapado');
  });

  await secao('card: a sprite do jogo no palco, na escala do recorte, e a cadeia jogo -> PokeAPI -> pokebola', async () => {
    const H = await comCatalogo();
    const pg = pagina(); pg.roda(H.IV_LEITOR);
    const sl = slotIcone(10, 10); pg.body.appendChild(mochila(sl));
    await hover(pg, sl, SCIZOR); leva(H, pg, 2);
    let html = H.html(), C = caixas(html)[0];
    ok(C && C.src === ORIGEM + '/assets/pokeitems/gen2/212.png' && C.px === 84 && /img-src[^;]*'self'[^;]* data: [^;]*https:\/\/poke\.idleworld\.online/.test(s), 'a sprite do palco e a do jogo (' + (C && C.src) + '), que a CSP deixa carregar (img-src com o jogo e data:)');
    // recorte 22x26 num palco de 84: escala inteira 3 (84/26 = 3,2), a caixa 66x78 e o img deslocado pelo recorte
    ok(C && C.w === 66 && C.h === 78 && /style="left:-15px;top:-9px;width:96px;height:96px"/.test(C.img), 'escala inteira (3x) e o img na posicao do recorte: ' + (C && C.w + 'x' + C.h + ' ' + (/style="[^"]*"/.exec(C.img) || [''])[0]));
    ok(/<div class="iv-palco">[\s\S]*?<span class="iv-nv">Nv 80<\/span><\/div>/.test(html) && /#ivCard \.iv-spw > \.iv-spr \{[^}]*image-rendering: pixelated/.test(css.replace(/\n/g, ' ')), 'palco com o selo do nivel e pixel art sem borrao (pixelated)');
    // canvas: PNG no tamanho do recorte, fracao quando nao cabe 2x
    const pg2 = pagina(); pg2.roda(H.IV_LEITOR);
    const c = slotCanvas(10, 10); pg2.body.appendChild(mochila(c));
    await hover(pg2, c, ESCYTHER); leva(H, pg2, 0);
    C = caixas(H.html())[0];
    ok(C && /^data:image\/png;base64,/.test(C.src) && C.w === 60 && C.h === 66 && /width:60px;height:66px/.test(C.img), 'canvas: o PNG aparado em 2x (30x33 -> 60x66): ' + (C && C.w + 'x' + C.h));
    // a mesma sprite num tamanho menor que o recorte: encaixa e suaviza
    const pq = H.ivSprHtml ? caixas(H.ivSprHtml({ nome: 'Furious Scyther' }, 28))[0] : null;
    ok(pq && pq.h === 28 && pq.w === 25.45 && /image-rendering:auto/.test(pq.img), 'menor que o recorte (historico): encaixa em 28 px e suaviza (' + (pq && pq.w + 'x' + pq.h) + ')');
    // cadeia: sem sprite do jogo -> PokeAPI pelo dex do catalogo -> pokebola
    H.ivRecebe(1, { nome: 'Gyarados', shiny: true, ditto: false, tipos: ['WATER', 'FLYING'], ativo: false, time: false, nivel: 120, qualidade: 1.72, ivTotal: 131, stats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, vel: 1 }, poder: 10, fonte: 'tooltip' });
    C = caixas(H.html())[0];
    ok(C && C.src === SPR + 'shiny/130.png' && C.cl === 'iv-spw-api', 'sem sprite do jogo: a da PokeAPI pelo dex (o shiny na pasta shiny): ' + (C && C.src));
    H.ivRecebe(1, { nome: 'Scizorr Beta', shiny: false, ditto: false, tipos: [], ativo: false, time: false, nivel: 12, qualidade: 1.2, ivTotal: 50, stats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, vel: 1 }, poder: 10, fonte: 'tooltip' });
    C = caixas(H.html())[0];
    ok(C && C.cl === 'iv-spw0' && !C.src && C.img === H.ico('pokebola'), 'especie fora do catalogo e sem sprite: a pokebola do app, nunca um buraco');
    // erro de imagem: o ouvinte de erro (captura) marca a URL e redesenha a caixa no degrau seguinte
    const erra = (src, dados) => { let novo = null; const w = { classList: { contains: (k) => k === 'iv-spw' }, dataset: dados, set outerHTML(v) { novo = v; } }; (H.ivEl.ev.error || []).forEach((f) => f({ target: { tagName: 'IMG', parentElement: w, getAttribute: () => src } })); return novo; };
    let novo = erra(ORIGEM + '/assets/pokeitems/gen2/212.png', { n: 'scizor', s: '0', d: '0', px: '84' });
    ok(novo && caixas(novo)[0] && caixas(novo)[0].src === SPR + '212.png', 'a sprite do jogo nao carregou: a caixa vira a da PokeAPI (' + (novo && caixas(novo)[0] && caixas(novo)[0].src) + ')');
    novo = erra(SPR + '212.png', { n: 'scizor', s: '0', d: '0', px: '84' });
    ok(novo && caixas(novo)[0] && caixas(novo)[0].cl === 'iv-spw0', 'a da PokeAPI tambem nao: a pokebola');
    H.ivRecebe(2, { nome: 'Scizor', shiny: false, ditto: false, tipos: ['BUG', 'STEEL'], ativo: false, time: false, nivel: 80, qualidade: 1.55, ivTotal: 122, stats: { hp: 146, atk: 216, def: 159, spa: 85, spd: 154, vel: 101 }, poder: 1335, fonte: 'tooltip' });
    ok(caixas(H.html())[0] && caixas(H.html())[0].cl === 'iv-spw0', 'o card redesenhado depois ja nasce no degrau que funciona (as URLs que falharam ficam marcadas)');
  });

  await secao('memoria por especie: historico, busca e comparar usam a mesma sprite; disco, teto e shiny/Ditto a parte', async () => {
    const H = await comCatalogo();
    const pg = pagina(); pg.roda(H.IV_LEITOR);
    const a = slotIcone(10, 10), b = slotCanvas(55, 10), c = slotIcone(100, 10, '/assets/pokeitems/35025.png');
    pg.body.appendChild(mochila(a, b, c));
    await hover(pg, a, SCIZOR); await hover(pg, b, ESCYTHER); await hover(pg, c, SCIZOR_SH); leva(H, pg, 0);
    H.setAba('hist'); H.ivRender();
    const hist = caixas(H.html()).filter((x) => x.px === 30);
    ok(hist.length === 3 && hist[0].src === ORIGEM + '/assets/pokeitems/35025.png' && hist[0].sh && /^data:image\/png/.test(hist[1].src) && hist[2].src === ORIGEM + '/assets/pokeitems/gen2/212.png', 'historico: cada linha com a sprite que o leitor guardou da especie (shiny com a dele): ' + hist.map((x) => x.n + (x.sh ? '*' : '') + ' ' + x.src.slice(0, 40)).join(' | '));
    H.setAba('leitor'); H.ivRender();
    H.ivEl.ev.input.forEach((f) => f({ target: { id: 'ivBusca', value: 'scizo' } }));
    const sug = caixas(H.ivEl.querySelector('#ivSug').innerHTML);
    ok(sug.length >= 2 && sug[0].n === 'scizor' && sug[0].src === ORIGEM + '/assets/pokeitems/gen2/212.png' && sug[1].n === 'nightmare scizor' && sug[1].src !== sug[0].src, 'busca: Scizor com a sprite do jogo guardada (a normal, nao a shiny); as outras pela cadeia (' + sug.map((x) => x.n + ' ' + (x.src || 'pokebola').slice(0, 45)).join(' | ') + ')');
    H.ivEl.ev.click.forEach((f) => f({ target: { closest: (q) => (q === '[data-a]' ? { dataset: { a: 'fixa' }, textContent: '' } : null) } }));
    H.setAba('comparar'); H.ivRender();
    const cmp = caixas(H.html()).filter((x) => x.px === 40);
    ok(cmp.length >= 1 && cmp.every((x) => x.src === ORIGEM + '/assets/pokeitems/35025.png'), 'comparar: o fixado com a sprite da memoria');
    const disco = JSON.parse(H.store.get('ivSpr') || '[]');
    ok(disco.map((x) => x[0]).join() === 'scizor|0,furious scyther|0,scizor|1', 'no disco (ivSpr), na ordem em que chegaram: ' + disco.map((x) => x[0]).join());
    // app reaberto: volta do disco pelo saneador (o torto cai)
    const torto = disco.concat([['gyarados|0', { u: 'https://evil.example/x.png', x: 0, y: 0, w: 1, h: 1, iw: 1, ih: 1 }], ['lixo', { d: 'data:image/png;base64,AA==', w: 1, h: 1 }], [1, 2], 'x']);
    const H2 = await comCatalogo({ ls: { ivSpr: JSON.stringify(torto), ivHist: H.store.get('ivHist'), ivAba: 'hist' } });
    H2.ivRender();
    ok(H2.ivSprMem && [...H2.ivSprMem.keys()].join() === 'scizor|0,furious scyther|0,scizor|1' && caixas(H2.html()).filter((x) => x.px === 30)[0].src === ORIGEM + '/assets/pokeitems/35025.png', 'app reaberto: as 3 voltam do disco, as tortas (outra origem, chave sem formato) caem');
    // teto: 45 especies, ficam as 40 mais novas
    const on = H.canal(1);
    for (let k = 0; k < 45; k++) on('__PGIVS__' + JSON.stringify({ nome: 'Especie' + k, shiny: false, ditto: false, spr: { u: '/assets/pokeitems/' + (100 + k) + '.png', x: 0, y: 0, w: 32, h: 32, iw: 32, ih: 32 } }));
    const ks = H.ivSprMem ? [...H.ivSprMem.keys()] : [];
    ok(ks.length === 40 && ks[0] === 'especie5|0' && ks[39] === 'especie44|0' && JSON.parse(H.store.get('ivSpr')).length === 40, 'teto de 40 especies: sai a mais antiga (' + ks.length + ', de ' + ks[0] + ' a ' + ks[39] + ')');
    // PNG de canvas sem parar (pagina hostil): no maximo 200 KB deles na memoria e no disco, os mais novos ficam
    const png = (k) => 'data:image/png;base64,' + String(k % 10).repeat(29900);
    for (let k = 0; k < 12; k++) on('__PGIVS__' + JSON.stringify({ nome: 'Canvas' + k, shiny: false, ditto: false, spr: { d: png(k), w: 30, h: 30 } }));
    const pngs = H.ivSprMem ? [...H.ivSprMem].filter(([, v]) => v.d) : [];
    ok(pngs.length === 6 && pngs[5][0] === 'canvas11|0' && pngs.reduce((t, [, v]) => t + v.d.length, 0) <= 200000 && H.ivSprMem.has('especie44|0') && H.store.get('ivSpr').length < 220000, 'PNG de canvas em rajada: ficam os 6 mais novos (ate 200 KB), as sprites de caminho seguem, e o disco nao passa de ~200 KB');
    // Ditto transformado: a chave separa (o icone do Ditto nao vira a sprite do Charizard)
    on('__PGIVS__' + JSON.stringify({ nome: 'Charizard', shiny: true, ditto: true, spr: { u: '/assets/shiny/icon_12481.png', x: 0, y: 0, w: 32, h: 32, iw: 32, ih: 32 } }));
    const ch = H.ivSprHtml ? caixas(H.ivSprHtml({ nome: 'Charizard', shiny: true, ditto: false }, 30))[0] : null;
    ok(H.ivSprMem && H.ivSprMem.has('charizard|1d') && ch && ch.src === SPR + 'shiny/6.png', 'Ditto shiny virado Charizard fica em charizard|1d: o Charizard shiny de verdade segue na PokeAPI');
  });

  await secao('visual: os blocos novos de cada aba (palco, selos, anel, linhas, abas com icone, cartoes de golpe, pokebola)', async () => {
    const H = await comCatalogo();
    const pg = pagina(); pg.roda(H.IV_LEITOR);
    const sl = slotIcone(10, 10), sh = slotIcone(55, 10, '/assets/pokeitems/35025.png');
    pg.body.appendChild(mochila(sl, sh));
    await hover(pg, sl, SCIZOR, { lider: true }); leva(H, pg, 0);
    let html = H.html();
    // cabecalho
    ok(/<div class="iv-hd" id="ivDrag" style="--tc:#a8b820">/.test(html), 'cabecalho tingido pelo 1o tipo (BUG #a8b820) no --tc do palco');
    const selos = [...html.matchAll(/<div class="iv-kpi iv-bdg"><div class="k">([^<]*)<\/div><div class="v"[^>]*>([\s\S]*?)<\/div><\/div>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, '')]);
    ok(selos.length === 3 && selos[0][0] === H.t('ivcQuality') && selos[0][1] === H.t('rqEpic') + ' ×1,55' && selos[1][1] === '122/192' && selos[2][0] === H.t('ivcPower').replace('{n}', 80) && selos[2][1] === H.nf(SCIZOR.power), 'selos: qualidade com a raridade, IV total e poder no nivel do card: ' + selos.map((x) => x.join(' ')).join(' | '));
    const comum = html;
    // abas com icone
    const abas = [...html.matchAll(/<button class="iv-aba[^"]*" data-a="aba" data-v="(\w+)">(<svg[\s\S]*?<\/svg>)<span class="lbl">/g)].map((m) => [m[1], Object.keys(H.ICO).find((k) => H.ico(k) === m[2])]);
    ok(abas.map((x) => x.join(':')).join() === 'leitor:pokebola,analise:grafico,golpes:espadas,comparar:balanca,hist:relogio', 'abas com icone do ICO: ' + abas.map((x) => x.join(':')).join(', '));
    // Leitor: anel, barra do total, linhas com a nota em palavra, melhor e pior
    ok(/<div class="iv-pot" style="--c:#79c0ff"><div class="iv-ring" style="--p:63\.5%"><span><b>64%<\/b><small>[^<]+<\/small><\/span><\/div>/.test(html) && /<div class="iv-trk"><i style="width:63\.5%"><\/i><\/div>/.test(html), 'Leitor: o anel do potencial (63,5%) na cor da faixa e a barra do IV total');
    const linhas = [...html.matchAll(/<div class="iv-st( mx| mn)?"><div class="iv-st-h"><span class="iv-st-n">(\w+)<\/span>(?:<small>([^<]*)<\/small>)?<\/div><div class="iv-bar">[\s\S]*?<\/div><span class="iv-st-iv">(\d+)<span>\/32<\/span><\/span><span class="iv-gr" style="color:([^"]+)">([^<]*)<\/span><input id="ivA_\w+"/g)].map((m) => ({ tag: (m[1] || '').trim(), k: m[2], marca: m[3] || '', iv: +m[4], cor: m[5], nota: m[6] }));
    const notaEsp = (v) => H.t(v === 32 ? 'ivcG0' : v >= 28 ? 'ivcG1' : v >= 22 ? 'ivcG2' : v >= 15 ? 'ivcG3' : 'ivcG4');
    ok(linhas.length === 6 && linhas.every((l) => l.nota === notaEsp(l.iv)) && linhas.map((l) => l.iv).join() === '25,30,20,10,28,9', 'seis linhas com a nota em palavra ao lado da barra: ' + linhas.map((l) => l.k + ' ' + l.iv + ' ' + l.nota).join(', '));
    ok(linhas.filter((l) => l.tag === 'mx').map((l) => l.k + ' ' + l.marca).join() === 'ATK ' + H.t('ivcBestTag') && linhas.filter((l) => l.tag === 'mn').map((l) => l.k + ' ' + l.marca).join() === 'VEL ' + H.t('ivcWorstTag'), 'melhor (ATK 30) e pior (VEL 9) destacados na linha, com a marca em texto');
    ok(/<div class="iv-st iv-cab"><span><\/span><span><\/span><span>IV<\/span><span><\/span><span>[^<]+<\/span><span>[^<]+<\/span><\/div>/.test(html) && /aria-label="[^"]+ HP" value="146"/.test(html), 'rotulos das colunas (IV, atual, base) e cada campo com aria-label');
    // shiny: brilho no palco
    await hover(pg, sh, SCIZOR_SH); leva(H, pg, 0);
    ok(/<span class="iv-brilho" title="Shiny"><i><\/i><i><\/i><\/span>/.test(H.html()) && caixas(H.html())[0].src === ORIGEM + '/assets/pokeitems/35025.png' && !/class="iv-brilho"/.test(comum), 'shiny: o brilho no palco e a sprite shiny do jogo (o comum sem brilho)');
    await hover(pg, sl, SCIZOR, { lider: true }); leva(H, pg, 0);
    // Analise
    H.setAba('analise'); H.ivRender(); html = H.html();
    ok(/<div class="iv-top iv-mxmn">/.test(html) && (html.match(/<div class="iv-st iv-st2">/g) || []).length === 6 && (html.match(/<div class="iv-bar iv-bar2">/g) || []).length === 6 && (html.match(/<div class="iv-efs">/g) || []).length === 2, 'Analise: melhor/pior em cartao, 6 linhas com o que falta pro 32 na barra e a efetividade em dois blocos');
    // Golpes: cartoes em 2 colunas com a barra do poder na cor do tipo; TM marcado
    H.setAba('golpes'); H.ivRender(); html = H.html();
    const cart = [...html.matchAll(/<div class="iv-mv( off)?"([^>]*)><span class="iv-tp"[^>]*>([A-Z]+)<\/span>(?:<span class="tl-cat[^"]*"[^>]*>[^<]*<\/span>)?<span class="mv-n">([^<]*)<\/span><span class="mv-lv"[^>]*>([^<]*)<\/span><span class="mv-p"[^>]*>([^<]*)<\/span><i class="mv-b" style="width:([\d.]+)%;background:([^"]+)"><\/i><\/div>/g)].map((m) => ({ tm: /data-tm/.test(m[2]), ty: m[3], n: m[4], p: m[6], w: +m[7], bg: m[8] }));
    const pmax = Math.max(...cart.filter((x) => !x.tm).map((x) => +x.p.replace(/\D/g, '')));
    ok(/<div class="iv-mvs">/.test(html) && cart.length === 14 && cart.every((x) => x.tm || Math.abs(x.w - (+x.p.replace(/\D/g, '') / pmax * 100)) < 0.11) && cart.filter((x) => x.tm).every((x) => x.w === 100), 'Golpes: 14 cartoes com tipo, nome, nivel e poder, e a barra do poder relativa ao mais forte (o TM passa e fica cheia)');
    H.canal(0)('__PGST__' + JSON.stringify({ ok: true, name: 'Ash', cid: 'c1', hunt: 'Bug Cave', team: [{ name: 'Scizor', level: 80, ld: true }], a: { seconds: 900, mvs: [{ m: 'X-Scissor', n: 412, s: 0, a: 0, hp: 38 }] } }));
    H.ivRender(); const comUso = H.html();
    ok(/<div class="iv-mv iv-uso">/.test(comUso) && (comUso.match(/data-uso="1"/g) || []).length === 1 && /<div class="iv-mv" data-uso="1"><span class="iv-tp"[^>]*>BUG<\/span>(?:<span class="tl-cat[^"]*"[^>]*>[^<]*<\/span>)?<span class="mv-n">X-Scissor<\/span>/.test(comUso) && /#ivCard \.iv-mv\[data-uso\] \{[^}]*var\(--ok-bd\)/.test(css), 'o golpe em uso do lider (X-Scissor) no topo e marcado tambem no cartao dele na lista');
    ok(cart.find((x) => x.n === 'X-Scissor').bg === '#a8b820' && cart.filter((x) => x.tm).map((x) => x.n).join() === 'Hive Crush' && /#ivCard \.iv-mv\[data-tm\] \.mv-lv \{[^}]*color: var\(--gold\)/.test(css.replace(/\n/g, ' ')), 'a barra na cor do tipo do golpe e o TM em dourado');
    // Comparar: sprite e potencial no alto da coluna, linha do potencial
    H.setAba('comparar'); H.ivEl.ev.click.forEach((f) => f({ target: { closest: (q) => (q === '[data-a]' ? { dataset: { a: 'fixa' }, textContent: '' } : null) } })); H.ivRender(); html = H.html();
    ok(/<div class="iv-cmp-hd"><span class="iv-spw[\s\S]*?<\/span><span class="iv-cmp-p" style="color:#79c0ff">64%<\/span><\/div>/.test(html) && new RegExp('<tr><td>' + H.t('ivcPotLbl') + '</td><td>63,5%</td>').test(html), 'Comparar: sprite e potencial no alto de cada coluna e a linha do potencial');
    // Historico: sprite e a barrinha do IV
    H.setAba('hist'); H.ivRender(); html = H.html();
    ok(/<button class="iv-hi"[^>]*><span class="iv-dot"[^>]*><\/span><span class="iv-spw/.test(html) && /<span class="iv-hi-iv"><i class="iv-trk" style="--c:#79c0ff"><i style="width:63\.5%"><\/i><\/i>122\/192<\/span>/.test(html), 'Historico: a sprite em cada linha e a barrinha do IV na cor da faixa');
    // card vazio: pokebola e os 3 passos com icone
    const H2 = await comCatalogo(); H2.setAba('leitor'); H2.ivRender(); html = H2.html();
    ok(/<div class="iv-vazio"><span class="iv-pb" aria-hidden="true"><\/span><div class="iv-vz-t">[^<]+<\/div>/.test(html) && (html.match(/<span><b>\d<\/b><svg class="ico"/g) || []).length === 3 && html.includes(H2.t('ivcHint')), 'card vazio: a pokebola, o titulo, a explicacao e os 3 passos com icone');
    // catalogo chegando: a pokebola rolando no Leitor e na busca
    const H3 = await comCatalogo(); H3.catalogoVazio = 1; H3.ivRecebe(0, { nome: 'Scizor', shiny: false, ditto: false, tipos: ['BUG', 'STEEL'], ativo: false, time: false, nivel: 80, qualidade: 1.55, ivTotal: 122, stats: { hp: 146, atk: 216, def: 159, spa: 85, spd: 154, vel: 101 }, poder: 1335, fonte: 'tooltip' });
    html = H3.html();
    H3.ivEl.ev.input.forEach((f) => f({ target: { id: 'ivBusca', value: 'scizo' } }));
    ok(html.includes('<div class="iv-carr" role="status"><span class="iv-pb" aria-hidden="true"></span><span>' + H3.t('ivcLoading') + '</span></div>') && H3.ivEl.querySelector('#ivSug').innerHTML.includes('<span class="iv-pb" aria-hidden="true"></span>'), 'catalogo chegando: a pokebola no lugar do aviso parado (Leitor e busca)');
    ok(/@keyframes ivRola/.test(css) && /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.iv-palco > \.iv-spw[^}]*\.iv-brilho[^}]*\.iv-carr \.iv-pb[^}]*animation: none/.test(css.replace(/\n/g, ' ')), 'a flutuacao da sprite, o brilho, a pokebola e o golpe em uso param com movimento reduzido');
    // Ditto: o painel do IV fixo no lugar do potencial
    H.setAba('leitor'); H.ivRecebe(0, { nome: 'Ditto', shiny: true, ditto: true, tipos: ['NORMAL'], ativo: false, time: true, nivel: 260, qualidade: 2, ivTotal: 119, stats: { hp: 442, atk: 398, def: 398, spa: 398, spd: 398, vel: 432 }, poder: 4932, fonte: 'tooltip' });
    html = H.html();
    ok(/<div class="iv-pot iv-pot-dt"><div class="iv-ring" style="--p:62\.0%"><span><b>62%<\/b><small>IV<\/small><\/span><\/div><div class="iv-pot-tx"><div class="iv-pot-t">[^<]+<\/div><div class="iv-pot-d">[^<]+<\/div><\/div>/.test(html) && !/<div class="iv-av">/.test(html), 'Ditto: o painel do IV e da qualidade fixos, com o aviso dentro (sem caixa vazia)');
    ok(new RegExp('<span style="color:#a77bea">' + H.t('rqMythic') + '</span> ×2,00').test(html) && !/#6a0dad/.test(html), 'qualidade Mitica escrita em #a77bea (5,5:1), nao no roxo do jogo (#6a0dad, 1,9:1)');
    // textos novos nos 3 idiomas, sem travessao, e o icone novo no desenho do ICO
    const novas = ['ivcG0', 'ivcG1', 'ivcG2', 'ivcG3', 'ivcG4', 'ivcPotLbl', 'ivcBestTag', 'ivcWorstTag', 'ivcEmptyT', 'ivcStep1', 'ivcStep2', 'ivcStep3', 'ivcDittoT'];
    ok(novas.every((k) => ['pt', 'en', 'es'].every((L) => typeof H.I18N[L][k] === 'string' && H.I18N[L][k] && !/—/.test(H.I18N[L][k]))), 'textos novos nos 3 idiomas, sem travessao (' + novas.length + ')');
    ok(typeof H.ICO.balanca === 'string' && /^<path d="M8 2\.5v11/.test(H.ICO.balanca), 'icone novo da balanca (aba Comparar) no ICO');
  });

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('FAIL excecao no teste: ' + ((e && e.stack) || e)); process.exit(1); });
