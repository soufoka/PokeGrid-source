// Redesign, etapa C (03/10/2026): os icones do app. Um conjunto proprio de SVG (o ICO e o ico() do index.html) no lugar dos
// emoji e glifos dos controles (barra do topo, menu ☰, cabecalho dos paineis, card de IV, Resumo, Simples, janelas), o texto
// dos controles pelo rotulo()/soIco()/topo() (o icone nao some ao ligar uma chave nem ao trocar o idioma), a barra que fica so
// com os icones abaixo de 1280 px e a pendencia da etapa B: o cartao "Por conta" do Σ pelo statusConta.
// As checagens de CSS e HTML leem o index.html; as de comportamento rodam o <script> REAL com o DOM falso do redesign-b, mais
// os botoes de idioma do menu (pra trocar de lingua como o usuario) e um querySelector que guarda o elemento por seletor.
// Roda com: node test/redesign-c.test.js   (contra outra copia, pra comparar: node test/redesign-c.test.js caminho/do/index.html)
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const ARQ = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAIZ, 'index.html');
const s = fs.readFileSync(ARQ, 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
const css = s.slice(s.indexOf('<style>'), s.indexOf('</style>'));
const html = s.slice(s.indexOf('<body>'), s.indexOf('<script>', s.indexOf('<body>')));
const TOK = Object.fromEntries([...(((/:root \{([^}]*)\}/.exec(css) || [])[1]) || '').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const cor = (v) => String(v == null ? '' : v).replace(/var\((--[\w-]+)\)/g, (x, k) => TOK[k] || x);
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const vezes = async (n) => { for (let k = 0; k < n; k++) await vez(); };
const regra = (sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : cor(css.slice(i, css.indexOf('}', i) + 1)); };
// emoji ou simbolo fazendo papel de icone: pictograma (Extended_Pictographic) e os blocos de setas, formas e simbolos (⟳ ☰ ▦ ✓ ✕ −)
const GLIFO = /[\p{Extended_Pictographic}←-⯿−️]/u;
const TAGS = {};
for (const m of html.matchAll(/<(\w+)\b([^>]*)>/g)) { const a = {}; for (const x of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) a[x[1]] = x[2]; if (a.id) TAGS[a.id] = { tag: m[1], a }; }

function monta(opts = {}) {
  const byId = new Map(), ints = [], copiados = [];
  let document;
  class CL { constructor(c) { this.s = new Set(c || []); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag, id, a) {
      a = a || {}; this.tagName = String(tag || 'div').toUpperCase(); this.id = id || ''; this.attrs = Object.assign({}, a);
      this.style = { setProperty() {}, display: /display:\s*none/.test(a.style || '') ? 'none' : '' };
      this.classList = new CL(String(a.class || '').split(/\s+/).filter(Boolean)); this.dataset = {};
      for (const k in a) if (k.startsWith('data-')) this.dataset[k.slice(5)] = a[k];
      this.children = []; this._h = ''; this._t = ''; this.value = ''; this.checked = false; this.title = a.title || ''; this.options = [{}, {}]; this.childElementCount = 0; this.offsetHeight = 40; this.scrollTop = 0; this.ev = {}; this.parent = null;
    }
    get innerHTML() { return this._h; } set innerHTML(h) { this._h = String(h); this.children = []; }
    get textContent() { return this._t; } set textContent(v) { this._t = String(v); this._h = ''; this.children = []; }
    get firstChild() { return this.children[0] || (this._h ? {} : null); }
    get className() { return [...this.classList.s].join(' '); } set className(v) { this.classList = new CL(String(v).split(/\s+/).filter(Boolean)); }
    get outerHTML() { return ''; } set outerHTML(v) {}
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } removeEventListener() {}
    emit(t, e) { (this.ev[t] || []).forEach((f) => f(e || {})); }
    querySelector(q) { this._q = this._q || {}; return this._q[q] || (this._q[q] = new El('div')); }
    querySelectorAll(q) { return q === 'input' ? [new El('input'), new El('input'), new El('input')] : []; } // a linha do treinador pega os 3 campos
    appendChild(c) { this.children.push(c); this.childElementCount = this.children.length; c.parent = this; return c; }
    remove() { if (this.parent) { const k = this.parent.children.indexOf(this); if (k >= 0) this.parent.children.splice(k, 1); } }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; }
    focus() { document.activeElement = this; } blur() { if (document.activeElement === this) document.activeElement = null; } select() {}
    click() { if (this.onclick) this.onclick({ target: this, stopPropagation() {}, preventDefault() {} }); }
    contains(x) { for (let e = x; e; e = e.parent) if (e === this) return true; return false; }
    closest() { return null; }
  }
  class WV extends El {
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; }
    executeJavaScript(c) { return opts.exec ? opts.exec(String(c), this) : Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() {} reloadIgnoringCache() {} loadURL(u) { this.url = u; return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid');
  grid.querySelectorAll = (q) => (q === '.panel' ? grid.children.slice() : []); // a troca de idioma passa pelos paineis
  const pega = (id) => {
    if (id === 'grid') return grid;
    if ((opts.nulos || []).includes(id)) return null; // elemento que ainda nao existe na tela
    if (!byId.has(id)) { const T = TAGS[id] || { tag: 'div', a: {} }; byId.set(id, new El(T.tag, id, T.a)); }
    return byId.get(id);
  };
  // os botoes PT/EN/ES do menu (o app pega pelo querySelectorAll no boot) e um elemento guardado por seletor no querySelector
  const langBtns = ['pt', 'en', 'es'].map((l) => new El('button', '', { 'data-lang': l }));
  const porSel = {};
  document = {
    getElementById: pega, createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: (q) => porSel[q] || (porSel[q] = new El('div')), querySelectorAll: (q) => (q === '#langRow button' ? langBtns : []),
    addEventListener() {}, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAutoStart: async (on) => !!on, setAwake: async () => true, setMinToTray: async () => true, saveBackup: async () => true, openErrorLog() {}, appVersion: '1.5.31' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  // o que a etapa C criou vem por typeof: contra o app antigo a checagem FALHA em vez de o harness quebrar
  const novo = (n) => 'typeof ' + n + " !== 'undefined' ? " + n + ' : null';
  const exporta = '\n;return { t, I18N, webviews, togglePower, refreshCards, cardsSet: (v) => { cardsOn = v; }, cfgCards: (v) => { cardsCfgOpen = v; }, get cardsEl() { return cardsEl; },'
    + ' ivRender, setIv: (d, i) => { ivAberto = true; ivRecebe(i, d); }, setIvAba: (a) => { ivAba = a; }, ivCopia, festaShiny, aggCard, renderAggregate, renderStats, statsEl, setStatsOpen: (v) => { statsOpen = v; }, setStatsIdx: (v) => { statsIdx = v; },'
    + ' renderTier, renderDitto, carregaHunts, statusConta: ' + novo('statusConta') + ', ICO: ' + novo('ICO') + ', ico: ' + novo('ico') + ', rotuloHtml: ' + novo('rotuloHtml') + ' };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, { clipboard: { writeText: async (x) => { copiados.push(x); } } }, { reload() {} }, (f, ms) => { ints.push({ f, ms }); return ints.length; }, noop, noop, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  return Object.assign(api, { byId: pega, grid, store, document, langBtns, porSel, copiados });
}

// o que o usuario ve num controle: os <svg class="ico"> de dentro, o nome do icone no ICO e o texto (sem as tags)
const svgs = (h) => [...String(h || '').matchAll(/<svg\b[^>]*>([\s\S]*?)<\/svg>/g)];
const nomeIco = (H, h) => { const v = svgs(h); if (v.length !== 1 || !H.ICO || !/^<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">/.test(v[0][0])) return null; return Object.keys(H.ICO).find((k) => H.ICO[k] === v[0][1]) || null; };
const texto = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
// um controle no padrao novo: exatamente um icone do ICO (o esperado), nenhum emoji/glifo no texto e o texto certo
const confere = (H, h, icone, rot) => nomeIco(H, h) === icone && !GLIFO.test(texto(h)) && (rot == null || texto(h) === rot);
const diz = (H, h) => (nomeIco(H, h) || '?') + ' "' + texto(h) + '"';
const SCIZOR = { nome: 'Scizor', shiny: false, ditto: false, tipos: ['BUG', 'STEEL'], ativo: true, time: false, nivel: 80, qualidade: 1.55, ivTotal: 122, stats: { hp: 146, atk: 216, def: 159, spa: 85, spd: 154, vel: 101 }, poder: 1335, fonte: 'tooltip' };
const conta = (extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 300, gold: 1000, diamonds: 5, balls: 5000, potions: 5000, a: { seconds: 900, gph: 1000, xph: 5000, kph: 100 }, team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra || {});
// catalogo do jogo pelo HUNTS_JS real com a fixture de 17/09 (como no redesign-b): sem ele a tierlist e o Ditto so dizem "aguardando".
// O carregaHunts tem trava de 60 s: o relogio do app anda quando o teste quer
const zlib = require('zlib');
const realNow = Date.now; let desloc = 0; Date.now = () => realNow() + desloc;
let RCAT = null;
async function catalogo() {
  if (RCAT) return RCAT;
  const i0 = s.indexOf('const HUNTS_JS = '), ini = s.indexOf('`', i0) + 1, HUNTS_JS = eval('`' + s.slice(ini, s.indexOf('`', ini)) + '`');
  const J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'jogo-2026-09-17.json.gz'))).toString('utf8'));
  RCAT = await new Function('fetch', 'return ' + HUNTS_JS)((u) => Promise.resolve({ json: async () => (u.indexOf('map-markers') >= 0 ? { hunts: J.hunts } : u.indexOf('items') >= 0 ? { items: [] } : { creatures: J.creatures }) }));
  return RCAT;
}
const comCatalogo = async (o) => { const R = await catalogo(); const H = monta(Object.assign({ exec: (c) => Promise.resolve(c.includes('map-markers') ? R : null) }, o)); await vezes(3); desloc += 61e3; H.carregaHunts(); await vezes(4); return H; };

// os controles e o icone de cada um (o nome no ICO). Os rotulos vem do i18n (ou sao iguais nos 3 idiomas)
const TOPO = { loginAll: ['play', 'loginAll'], reloadAll: ['atualizar', 'reloadAll'], statsBtn: ['grafico', 'stats'], cardsBtn: ['folha', 'cards'], ivsBtn: ['pokebola', null, 'IVs'],
  accounts: ['pessoa', 'accounts'], menuBtn: ['menu', 'optionsBtn'], donTop: ['coracao', 'donTitle'] };
const MENU = { hunt: ['alvo', 'hunt'], tierBtn: ['trofeu', 'tier'], dittoBtn: ['ditto', 'dtBtn'], scriptsBtn: ['peca', null, 'Scripts'], layout: ['grade', 'layout'], propNat: ['imagem', 'prop'],
  cleanHud: ['bolhas', 'clean'], chat: ['chat', 'chatHidden'], eco: ['raio', 'eco'], awake: ['cafe', 'awake'], minTray: ['bandeja', 'minTray'], autoStart: ['liga', 'autoStart'],
  alerts: ['sino', 'alerts'], sellguard: ['escudo', 'sellguard'], voltaHunt: ['voltar', 'volta'], sndShiny: ['som', 'snd'], muteAll: ['mudo', 'muted'],
  manBtn: ['livro', 'manual'], faqBtn: ['ajuda', 'faq'], bkExp: ['salvar', 'bkExp'], bkImp: ['pasta', 'bkImp'], errlogBtn: ['inseto', 'errlog'] };
const CHAVES = ['muteAll', 'eco', 'chat', 'awake', 'minTray', 'voltaHunt', 'alerts', 'sellguard', 'cleanHud', 'autoStart', 'sndShiny', 'propNat'];
const CABECA = { zo: ['menos', 'tZoomOut'], zi: ['mais', 'tZoomIn'], reload: ['atualizar', 'tReload'], expand: ['expandir', 'tExpand'] };
const rotDe = (H, def) => (def[1] ? H.t(def[1]) : def[2]);

(async () => {
  await secao('ICO: desenhos proprios em 16x16, SVG bem formado, sem cor fixa (pintam com a cor do texto)', async () => {
    const H = monta(); await vezes(3);
    const I = H.ICO || {}, nomes = Object.keys(I);
    ok(nomes.length >= 40 && typeof H.ico === 'function' && H.ico('play') === '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">' + I.play + '</svg>',
      'um mapa so (ICO, ' + nomes.length + ' icones) e o ico(nome) devolvendo <svg class="ico" viewBox="0 0 16 16" aria-hidden="true">');
    // gramatica do que o ICO pode ter: so path/circle/rect/ellipse fechados, atributos de geometria (numero) e nenhum fill/stroke/style
    const ATR = { path: ['d'], circle: ['cx', 'cy', 'r'], rect: ['x', 'y', 'width', 'height', 'rx', 'transform'], ellipse: ['cx', 'cy', 'rx', 'ry'] };
    const NUM = /^-?(?:\d+\.?\d*|\.\d+)$/, D = /^[Mm][MmLlHhVvCcSsQqTtAaZz\d.\s,-]*$/;
    const ruins = [];
    for (const n of nomes) {
      const m = String(I[n]); let k = 0, els = 0, erro = '';
      const re = /<(path|circle|rect|ellipse)((?: [a-z-]+="[^"<>&]*")+)\/>/y;
      while (k < m.length && !erro) {
        re.lastIndex = k; const e = re.exec(m);
        if (!e) { erro = 'markup fora da gramatica em ' + k; break; }
        els++; k = re.lastIndex;
        for (const [, a, v] of e[2].matchAll(/ ([a-z-]+)="([^"]*)"/g)) {
          if (!ATR[e[1]].includes(a)) erro = e[1] + ' com ' + a;
          else if (a === 'd' ? !D.test(v) : a === 'transform' ? !/^rotate\(-?[\d.]+ [\d.]+ [\d.]+\)$/.test(v) : !NUM.test(v)) erro = a + '="' + v + '"';
        }
      }
      if (erro || !els) ruins.push(n + ': ' + (erro || 'vazio'));
    }
    ok(nomes.length && !ruins.length, 'cada entrada e SVG bem formado (path/circle/rect/ellipse com atributos de geometria) e sem cor propria' + (ruins.length ? ': ' + ruins.slice(0, 4).join(' | ') : ''));
    const ic = regra('.ico');
    ok(/fill: none;/.test(ic) && /stroke: currentColor;/.test(ic) && /stroke-width: 1\.5;/.test(ic) && /stroke-linecap: round;/.test(ic) && /stroke-linejoin: round;/.test(ic) && /width: 14px; height: 14px;/.test(ic)
      && /width: 16px; height: 16px;/.test(regra('#topbar > button .ico, #menuBtn .ico')), 'o .ico pinta com currentColor, traco 1,5 arredondado, 14 px nos botoes e 16 px na barra do topo');
    // pontas dos segmentos e circulos dentro do quadro com 1 px de folga (centro do traco entre 1,5 e 14,5): pega numero digitado errado
    const fora = [];
    const ARG = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
    for (const n of nomes) {
      const m = String(I[n]);
      for (const [, cx, cy, r] of m.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) if (+cx - r < 1.5 || +cx + +r > 14.5 || +cy - r < 1.5 || +cy + +r > 14.5) fora.push(n + ' (circulo)');
      for (const [, d] of m.matchAll(/ d="([^"]*)"/g)) {
        const tk = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) || [];
        let x = 0, y = 0, x0 = 0, y0 = 0, c = '', i = 0;
        while (i < tk.length) {
          if (/[a-zA-Z]/.test(tk[i])) c = tk[i++];
          const C = c.toUpperCase(), rel = c !== C, q = ARG[C];
          if (C === 'Z') { x = x0; y = y0; continue; }
          const v = tk.slice(i, i + q).map(Number); i += q;
          if (C === 'H') x = (rel ? x : 0) + v[0]; else if (C === 'V') y = (rel ? y : 0) + v[0];
          else { x = (rel ? x : 0) + v[q - 2]; y = (rel ? y : 0) + v[q - 1]; }
          if (C === 'M') { x0 = x; y0 = y; c = rel ? 'l' : 'L'; }
          if (x < 1.5 || x > 14.5 || y < 1.5 || y > 14.5) { fora.push(n + ' (' + x.toFixed(1) + ',' + y.toFixed(1) + ')'); break; }
        }
      }
    }
    ok(nomes.length && !fora.length, 'pontas e circulos dentro do quadro de 16 com 1 px de folga' + (fora.length ? ': ' + fora.join(', ') : ''));
  });

  await secao('todo icone pedido existe no ICO e todo desenho do ICO e usado (nada de nome digitado errado ou icone morto)', async () => {
    const H = monta(); await vez();
    const usados = new Set();
    const pegaLit = (expr) => { for (const m of String(expr).matchAll(/(?:^|[?:]\s*)'([a-z-]+)'/g)) usados.add(m[1]); };
    for (const m of code.matchAll(/\bico\(([^()]*)\)/g)) pegaLit(m[1].trim());
    for (const m of code.matchAll(/\brotuloHtml\('([a-z-]+)'/g)) usados.add(m[1]);
    for (const m of code.matchAll(/\b(?:rotulo|soIco|topo)\([^,()]*(?:\([^()]*\))?[^,()]*, ([^,]*?(?:\?[^,]*?:[^,]*?)?), /g)) pegaLit(m[1].trim());
    for (const m of code.matchAll(/\['\.[\w-]+', '([a-z-]+)', 't[A-Z]\w*'\]/g)) usados.add(m[1]); // botoes do cabecalho do painel (rotulaCabeca)
    for (const m of code.matchAll(/\bsec\('[^']*', [^;]*?, '', '([a-z-]+)'\)/g)) usados.add(m[1]); // titulo de secao do Resumo com icone
    const I = H.ICO || {}, faltam = [...usados].filter((n) => !Object.prototype.hasOwnProperty.call(I, n)), sobram = Object.keys(I).filter((n) => !usados.has(n));
    ok(usados.size >= 40 && !faltam.length, usados.size + ' nomes de icone no codigo, todos no ICO' + (faltam.length ? ' (faltam: ' + faltam.join(', ') + ')' : ''));
    ok(Object.keys(I).length && !sobram.length, 'nenhum desenho sobrando no ICO' + (sobram.length ? ' (sobram: ' + sobram.join(', ') + ')' : ''));
  });

  await secao('barra do topo, menu ☰, cabecalho dos paineis e cabecalho do card de IV: um icone do ICO por controle, sem emoji', async () => {
    const H = monta(); await vezes(4);
    const ruim = [];
    for (const [id, def] of Object.entries(Object.assign({}, TOPO, MENU))) { const h = H.byId(id).innerHTML; if (!confere(H, h, def[0], rotDe(H, def))) ruim.push(id + ' = ' + diz(H, h)); }
    const cr = H.byId('countRow').querySelector('span').innerHTML, lr = H.porSel['#langRow > span'] ? H.porSel['#langRow > span'].innerHTML : '';
    if (!confere(H, cr, 'numero', H.t('count'))) ruim.push('countRow = ' + diz(H, cr));
    if (!confere(H, lr, 'globo', '')) ruim.push('langRow = ' + diz(H, lr));
    const rf = H.byId('refBtn');
    if (!confere(H, rf.innerHTML, 'link', '') || rf.getAttribute('aria-label') !== H.t('refTitle')) ruim.push('refBtn = ' + diz(H, rf.innerHTML));
    ok(!ruim.length, 'barra do topo (' + (Object.keys(TOPO).length + 1) + ') e os 24 itens do menu com o icone certo e o texto do idioma' + (ruim.length ? ': ' + ruim.join(' | ') : ''));
    const pain = [];
    H.grid.children.forEach((p, i) => {
      for (const [c, [ic, k]] of Object.entries(CABECA)) { const b = p.querySelector('.' + c); if (!confere(H, b.innerHTML, ic, '') || b.getAttribute('aria-label') !== H.t(k) || b.title !== H.t(k)) pain.push((i + 1) + c + ' = ' + diz(H, b.innerHTML)); }
      const r = p.querySelector('.pg-rec').innerHTML; if (!confere(H, r, 'atualizar', H.t('tReload'))) pain.push((i + 1) + ' Recarregar = ' + diz(H, r));
    });
    ok(H.grid.children.length === 4 && !pain.length, 'cabecalho dos 4 paineis: − + ⟳ ⛶ viraram icones so (com aria-label e dica) e o Recarregar tem o icone e o texto' + (pain.length ? ': ' + pain.slice(0, 4).join(' | ') : ''));
    H.setIv(SCIZOR, 0); H.ivRender();
    const iv = H.byId('ivCard').innerHTML, bt = (a) => (new RegExp('<button[^>]*' + a + '[^>]*>([\\s\\S]*?)</button>').exec(iv) || [])[0] || '';
    const tr = bt('data-a="trava"'), fx = bt('data-a="fixa"'), x = bt('id="ivX"');
    const aria = (b, k) => b.includes('title="' + H.t(k) + '" aria-label="' + H.t(k) + '"');
    ok(confere(H, tr, 'pausa', '') && aria(tr, 'ivcLock') && confere(H, fx, 'fixar', '') && aria(fx, 'ivcPin') && confere(H, x, 'fechar', '') && aria(x, 'spClose'),
      'card de IV: travar, fixar e fechar como icones (pausa, alfinete, x) com dica e aria-label (' + [tr, fx, x].map((b) => diz(H, b)).join(', ') + ')');
    const acc = (/<span class="iv-acc">([\s\S]*?)<\/span><\/div>/.exec(iv) || [])[1] || ''; // card novo (04/10): a conta fecha a linha do nome; os botoes ficam no canto
    ok(H.ico && acc.includes(' · ' + H.ico('espadas')) && !GLIFO.test(texto(acc)), 'a marca de lider em uso no cabecalho do card e o icone das espadas (' + texto(acc) + ')');
    // o HTML fixo (o que aparece antes do applyLang) tambem sem emoji nos rotulos desses controles
    const fixo = Object.keys(Object.assign({}, TOPO, MENU)).concat(['refBtn']).map((id) => [id, (new RegExp('<button id="' + id + '"[^>]*>([^<]*)</button>').exec(html) || [])[1]]);
    const comGlifo = fixo.filter(([, v]) => v == null || GLIFO.test(v)).map(([id, v]) => id + '="' + v + '"');
    const spans = ['countRow', 'langRow'].map((id) => (new RegExp('<div id="' + id + '"[^>]*><span>([^<]*)</span>').exec(html) || [])[1]);
    ok(!comGlifo.length && spans.every((v) => v != null && !GLIFO.test(v)), 'no HTML fixo os rotulos ficam sem emoji (o icone vem do JS)' + (comGlifo.length ? ': ' + comGlifo.slice(0, 4).join(' | ') : ''));
  });

  await secao('i18n: os rotulos desses controles sem pictograma nos 3 idiomas; ajuda que cita um botao desenha o icone dele', async () => {
    const H = monta(); await vez();
    const K = ['loginAll', 'reloadAll', 'stats', 'cards', 'accounts', 'optionsBtn', 'donTitle', 'hunt', 'tier', 'dtBtn', 'count', 'layout', 'layoutCol', 'layoutRow', 'prop', 'clean', 'chatHidden',
      'eco', 'awake', 'minTray', 'autoStart', 'alerts', 'sellguard', 'volta', 'snd', 'muted', 'manual', 'faq', 'bkExp', 'bkImp', 'errlog', 'tReload', 'tZoomOut', 'tZoomIn', 'tExpand', 'refTitle', 'refCopied',
      'ivcLock', 'ivcUnlock', 'ivcPin', 'ivcUnpin', 'spClose', 'closeT', 'rmTitle', 'statsResumo', 'reset', 'csvDia', 'csvHunts', 'cdTime', 'ivcCopyTxt', 'ivcCopyJson', 'ivcHistClear', 'ivcCopied', 'ivcCopyFail',
      'ivcSearch', 'tlPoke', 'dtShiny', 'tlTitle', 'dtTitle', 'scAtualizar', 'whTestOk', 'whTestErr', 'stTargetLabel', 'cfgBalls', 'cfgLock', 'alLocalTitle', 'cdConfig'];
    const ruins = [];
    for (const k of K) for (const L of ['pt', 'en', 'es']) { const v = H.I18N[L][k]; if (typeof v !== 'string' || !v || GLIFO.test(v) || /—/.test(v)) ruins.push(L + '.' + k + '=' + JSON.stringify(v)); }
    ok(!ruins.length, K.length + ' rotulos x 3 idiomas sem emoji, simbolo ou travessao' + (ruins.length ? ': ' + ruins.slice(0, 5).join(' | ') : ''));
    const ajuda = ['stTargetHow', 'stPinnedHow', 'ivcCmpEmpty', 'alLocalHint'];
    const ruins2 = [];
    for (const k of ajuda) for (const L of ['pt', 'en', 'es']) { const v = H.I18N[L][k]; if (typeof v !== 'string' || (v.match(/\{ico\}/g) || []).length !== 1 || GLIFO.test(v)) ruins2.push(L + '.' + k); }
    ok(!ruins2.length, 'textos de ajuda que citam a engrenagem, o alfinete e o sino trazem {ico} no lugar do emoji (' + ajuda.join(', ') + ')' + (ruins2.length ? ': ' + ruins2.join(', ') : ''));
    // e o app troca o {ico} pelo desenho: Resumo sem alvo nem fixados, Comparar vazio e a engrenagem do Simples
    const R = monta({ ls: { ivAba: 'comparar' } }); await vezes(3);
    R.renderStats(conta());
    const st = R.statsEl.querySelector('.st-body').innerHTML;
    R.setIv(SCIZOR, 0); R.ivRender();
    const iv = R.byId('ivCard').innerHTML;
    R.cardsSet(true); R.cfgCards(true); await R.refreshCards(true);
    const cd = R.cardsEl.innerHTML;
    const tem = (h, k, n) => R.ico && h.includes(R.t(k).split('{ico}')[0] + R.ico(n) + R.t(k).split('{ico}')[1]);
    ok(tem(st, 'stTargetHow', 'engrenagem') && tem(st, 'stPinnedHow', 'engrenagem') && tem(iv, 'ivcCmpEmpty', 'fixar') && tem(cd, 'alLocalHint', 'sino') && !/\{ico\}/.test(st + iv + cd),
      'o texto aparece com o icone desenhado no lugar do {ico} (Resumo, Comparar e Simples)');
  });

  await secao('ligar e desligar uma chave e trocar o idioma: o icone fica', async () => {
    const H = monta(); await vezes(4);
    const ruim = [];
    for (const id of CHAVES) {
      const b = H.byId(id), a = b.innerHTML, on0 = b.classList.contains('on');
      b.onclick(); await vezes(2);
      const d = b.innerHTML;
      if (!(confere(H, a, MENU[id][0], H.t(MENU[id][1])) && d === a && b.classList.contains('on') !== on0)) ruim.push(id + ': ' + diz(H, a) + ' -> ' + diz(H, d));
    }
    ok(!ruim.length, 'as 12 chaves: depois do clique, o mesmo icone e o mesmo texto (so a chave muda)' + (ruim.length ? ': ' + ruim.join(' | ') : ''));
    const lb = H.byId('layout'), modos = [];
    for (let k = 0; k < 3; k++) { modos.push(nomeIco(H, lb.innerHTML) + ' ' + texto(lb.innerHTML)); lb.onclick(); }
    ok(modos.join() === ['grade ' + H.t('layout'), 'coluna ' + H.t('layoutCol'), 'linha ' + H.t('layoutRow')].join(), 'a Grade troca o icone junto com o modo: ' + modos.join(' -> '));
    const en = H.langBtns.find((b) => b.dataset.lang === 'en');
    if (typeof en.onclick !== 'function') { ok(false, 'botao EN sem clique'); return; }
    en.onclick(); await vezes(3);
    const ruim2 = [];
    for (const [id, def] of Object.entries(Object.assign({}, TOPO, MENU))) { const h = H.byId(id).innerHTML; if (!confere(H, h, def[0], def[1] ? H.I18N.en[def[1]] : def[2])) ruim2.push(id + ' = ' + diz(H, h)); }
    H.grid.children.forEach((p, i) => { const b = p.querySelector('.reload'); if (!confere(H, b.innerHTML, 'atualizar', '') || b.getAttribute('aria-label') !== H.I18N.en.tReload) ruim2.push((i + 1) + ' reload'); });
    ok(!ruim2.length && H.t('loginAll') === H.I18N.en.loginAll, 'trocou pra EN: barra, menu e paineis com o texto em ingles e o mesmo icone' + (ruim2.length ? ': ' + ruim2.slice(0, 4).join(' | ') : ''));
    const eco = H.byId('eco'); eco.onclick(); await vezes(2);
    ok(confere(H, eco.innerHTML, 'raio', H.I18N.en.eco), 'e em ingles a chave tambem guarda o icone ao ligar e desligar (' + diz(H, eco.innerHTML) + ')');
  });

  await secao('janela estreita: abaixo de 1280 px a barra fica so com os icones, o nome segue na dica e no aria-label', async () => {
    const media = /@media \(max-width: 1279px\) \{([\s\S]*?)\n  \}/.exec(css);
    ok(!!media && /#topbar > button:not\(#loginAll\) \.lbl, #menuBtn \.lbl \{ display: none; \}/.test(media[1]) && /#topbar > button:not\(#loginAll\) \.ico, #menuBtn \.ico \{ margin-right: 0; \}/.test(media[1]),
      'regra de 1279 px: esconde o texto (.lbl) dos botoes secundarios e tira a folga do icone; o Logar equipe fica de fora');
    ok(/padding: 6px 10px; white-space: nowrap;/.test(regra('#topbar > button, #menuBtn')), 'acima disso o rotulo nao quebra em 2 linhas (em espanhol, a 1280 px, quebrava): uma linha so e 10 px de lado');
    const H = monta(); await vezes(4);
    const sec = Object.keys(TOPO).filter((id) => id !== 'loginAll');
    const ruim = sec.filter((id) => { const b = H.byId(id), r = rotDe(H, TOPO[id]); return !b.innerHTML.endsWith('<span class="lbl">' + r + '</span>') || b.getAttribute('aria-label') !== r || b.title.split('\n')[0] !== r; });
    ok(!ruim.length, 'os ' + sec.length + ' secundarios: texto no .lbl, aria-label com o nome e a dica comecando pelo nome' + (ruim.length ? ' (sem: ' + ruim.join(', ') + ')' : ''));
    ok(H.byId('statsBtn').title === H.t('stats') + '\n' + H.t('statsTitle') && H.byId('cardsBtn').title === H.t('cards') + '\n' + H.t('cardsTitle'), 'quem ja tinha dica mantem a explicacao na 2a linha (' + JSON.stringify(H.byId('statsBtn').title.slice(0, 40)) + ')');
    ok(/\[hidden\] \{ display: none !important; \}/.test(css) && /display: inline-flex;/.test(regra('button:has(> .ico)')), 'botao com icone e flex, e o atributo hidden continua escondendo (o Recarregar so aparece no erro de carga)');
  });

  await secao('o resto que era emoji/glifo: Resumo, Simples, tierlist, Ditto, Scripts, Treinadores, aviso de shiny e rodape do card', async () => {
    const H = monta({ ls: { userScripts: JSON.stringify([{ id: 'u1', name: 'Auto Berry', code: '1', url: 'https://raw.githubusercontent.com/a/b/main/x.user.js', version: '1.0' }]), scriptsOn: JSON.stringify({ u1: true }) } }); await vezes(4);
    const sh = H.statsEl.querySelector('.st-head'), t = H.t;
    const so = (b, n, k) => confere(H, b.innerHTML, n, '') && b.getAttribute('aria-label') === t(k) && b.title === t(k);
    ok(confere(H, H.statsEl.querySelector('.st-head .st-tt').innerHTML, 'grafico', t('statsResumo')) && so(sh.querySelector('.st-reset'), 'zerar', 'resetTitle') && so(sh.querySelector('.st-gear'), 'engrenagem', 'cdConfig') && so(sh.querySelector('.st-x'), 'fechar', 'closeT'),
      'Resumo: titulo com o grafico, ⟲ ⚙ ✕ viraram icones com dica e aria-label');
    H.cardsSet(true); H.cfgCards(true); await H.refreshCards(true);
    const cd = H.cardsEl.innerHTML, bt = (id) => (new RegExp('<button id="' + id + '"[^>]*>([\\s\\S]*?)</button>').exec(cd) || [])[0] || '';
    const th = (k) => (new RegExp('<th data-k="' + k + '">([\\s\\S]*?)</th>').exec(cd) || [])[1] || '';
    ok(confere(H, bt('cdGear'), 'engrenagem', '') && bt('cdGear').includes('aria-label="' + t('cdConfig') + '"') && confere(H, bt('cdReset'), 'zerar', t('reset')) && confere(H, bt('cdCsv'), 'baixar', t('csvDia'))
      && confere(H, th('secs'), 'relogio', t('cdTime')) && confere(H, th('sh'), 'brilho', '') && (cd.match(/<span class="busca-ico">/g) || []).length === 2 && cd.includes(H.ico('sino') + '<span class="lbl">' + t('alLocalTitle') + '</span>'),
      'Simples: ⚙, ⟲ Zerar, ⬇ Dia, ⏱ e ✨ das colunas, as lupas das buscas e o 🔔 da config viraram icones (' + [bt('cdGear'), bt('cdReset'), bt('cdCsv'), th('secs')].map((x) => diz(H, x)).join(', ') + ')');
    ok(!/[⚙⟲⬇⏱🔎🎯]/u.test(cd), 'e nenhum desses glifos sobrou no Simples (nem o 🎯 do seletor de alvos)');
    const C = await comCatalogo({ nulos: ['dtChips'] }); // dtChips ausente: o Ditto monta os controles como na 1a abertura
    C.byId('tlOverlay').classList.add('show'); C.renderTier();
    C.byId('dtOverlay').classList.add('show'); C.renderDitto();
    const tc = C.byId('tlClose'), dc = C.byId('dtClose'), dt = C.byId('dtCtl').innerHTML;
    ok(confere(C, C.byId('tlT1').innerHTML, 'trofeu', t('tlTitle')) && confere(C, C.byId('dtT1').innerHTML, 'ditto', t('dtTitle')) && so(tc, 'fechar', 'closeT') && so(dc, 'fechar', 'closeT')
      && confere(C, C.byId('tlBody').innerHTML, 'espera', '') && confere(C, C.byId('dtBody').innerHTML, 'espera', '') && !!C.ico && dt.includes(C.ico('brilho') + '<span class="lbl">' + t('dtShiny') + '</span>'),
      'tierlist e Ditto: titulo com trofeu/Ditto, ✕ com icone e aria-label, o carregando e a ampulheta e o chip Shiny com o brilho');
    H.byId('scriptsBtn').onclick();
    const sl = H.byId('scList').innerHTML, up = (/<button class="sc-upd"[^>]*>([\s\S]*?)<\/button>/.exec(sl) || [])[0] || '', del = (/<button class="sc-del"[^>]*>([\s\S]*?)<\/button>/.exec(sl) || [])[0] || '';
    ok(confere(H, up, 'atualizar', t('scAtualizar')) && confere(H, del, 'lixeira', '') && del.includes('aria-label="' + t('rmTitle') + '"') && confere(H, H.byId('scModal').querySelector('h2').innerHTML, 'peca', 'Scripts / Extras'),
      'Scripts: titulo com a peca, Atualizar com o icone e o remover com a lixeira (' + diz(H, up) + ', ' + diz(H, del) + ')');
    H.byId('accounts').onclick();
    const row = (H.byId('accRows').children[0] || {}).innerHTML || '', b1 = (/<button class="acc-del"[^>]*>[\s\S]*?<\/button>/.exec(row) || [])[0] || '', b2 = (/<button class="acc-wipe"[^>]*>[\s\S]*?<\/button>/.exec(row) || [])[0] || '';
    ok(confere(H, b1, 'lixeira', '') && b1.includes('aria-label="' + t('accClear') + '"') && confere(H, b2, 'vassoura', '') && b2.includes('aria-label="' + t('accWipe') + '"'), 'Treinadores: 🗑 e 🧹 viraram a lixeira e a vassoura, com aria-label');
    H.festaShiny({ n: 'Furious Scyther', sid: 10506, acc: 'RedFire', dot: '#c07bf5', iv: 152, q: 1.86, t: Date.now() });
    const sp = (H.byId('shinyParty').children[0] || {}).innerHTML || '', spx = (/<button class="sp-x"[^>]*>[\s\S]*?<\/button>/.exec(sp) || [])[0] || '';
    ok(confere(H, spx, 'fechar', '') && spx.includes('aria-label="' + t('spClose') + '"') && sp.includes('✨ ' + t('spTitle') + ' ✨'), 'aviso de shiny: o ✕ e o icone fechar (a festa de ✨ no titulo e conteudo e fica)');
    const I2 = monta({ ls: { ivAba: 'hist' } }); await vezes(3);
    I2.setIv(SCIZOR, 0); I2.ivRender();
    const iv = I2.byId('ivCard').innerHTML, foot = (/<div class="iv-foot"><button data-a="copia"[\s\S]*?<\/div>/.exec(iv) || [])[0] || '', bus = (/<div class="iv-busca">([\s\S]*?)<input/.exec(iv) || [])[1] || '';
    const limpa = (/<button data-a="limpa">([\s\S]*?)<\/button>/.exec(iv) || [])[0] || '';
    ok(confere(I2, (/<button data-a="copia" data-v="txt">[\s\S]*?<\/button>/.exec(foot) || [])[0], 'copiar', I2.t('ivcCopyTxt')) && confere(I2, (/<button data-a="copia" data-v="json">[\s\S]*?<\/button>/.exec(foot) || [])[0], 'json', I2.t('ivcCopyJson'))
      && confere(I2, limpa, 'lixeira', I2.t('ivcHistClear')) && confere(I2, bus, 'lupa', '') && !GLIFO.test(I2.t('ivcSearch')),
      'card de IV: 📋 Copiar texto, { } Copiar JSON e 🗑 Limpar historico com icones, e a lupa dentro da busca (placeholder sem o 🔍)');
    const b = { dataset: {} }; I2.ivCopia('txt', b); await vezes(3);
    ok(I2.rotuloHtml && b.innerHTML === I2.rotuloHtml('ok', I2.t('ivcCopied')), 'copiou: o botao mostra o icone de ok e "' + I2.t('ivcCopied') + '" (era "✓ ' + I2.t('ivcCopied') + '")');
  });

  await secao('pendencia da etapa B: o cartao "Por conta" do Σ sem leitura diz o estado da conta (statusConta), nao sempre "aguardando"', async () => {
    const H = monta(); await vezes(3);
    const W = H.webviews, T = H.t;
    W[3].emit('did-start-loading'); W[3].emit('did-fail-load', { errorCode: -105, isMainFrame: true }); // sem rede: erro de carga
    H.togglePower(2); // painel 3 desligado
    H.setStatsOpen(true); H.setStatsIdx(-1); await H.renderAggregate();
    const h = H.statsEl.querySelector('.st-body').innerHTML;
    const card = (n) => (new RegExp('<span class="acn">' + n + '</span>[\\s\\S]*?</div><div class="ac2">([\\s\\S]*?)</div></div>').exec(h) || [])[1] || '';
    const sc = (i) => (H.statusConta ? H.statusConta(i) : {});
    const pil = (i) => '<span class="cd-st ' + sc(i).cls + '"' + (sc(i).sub ? ' title="' + sc(i).sub + '"' : '') + '>' + sc(i).txt + '</span>';
    const c4 = card(T('trainer') + ' 4'), c3 = card(T('trainer') + ' 3'), c1 = card(T('trainer') + ' 1');
    ok(sc(3).cls === 'er' && c4 === pil(3) && !c4.includes(T('statsWaiting')), 'painel com erro de carga: "' + texto(c4) + '" na pilula vermelha, como o cabecalho e o Simples (era "' + T('statsWaiting') + '")');
    ok(sc(2).cls === 'off' && c3 === pil(2) && !c3.includes(T('statsOff')), 'painel desligado: "' + texto(c3) + '" (a mesma pilula cinza)');
    const comDado = H.aggCard('#c07bf5', 'Ash', conta({ shinyEnc: 3 }), 0);
    ok(c1 === pil(0) && texto(c1) === T('cdWaiting') && !/class="cd-st/.test(comDado) && comDado.includes('✨3 ' + T('acLife')) && comDado.includes('💎'),
      'ligado sem leitura ainda: "' + texto(c1) + '", o mesmo "aguardando" da coluna Status; com leitura o cartao segue com os numeros (shiny e diamante sao dado e ficam)');
  });

  Date.now = realNow;
  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})();
