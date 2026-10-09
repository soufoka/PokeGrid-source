// Redesign, etapa A (03/10/2026): contraste, piso de fonte, botao principal, foco azul, estado "ligado", menu ☰ Opcoes em
// grupos com chaves de rotulo fixo, ordem da barra do topo, cabecalho dos paineis e os bugs da lista (grade do card de IV,
// Comparar, Treinadores, menu por cima das janelas, decimais por idioma no card, "3080M", rolagem clara, ✕ da tierlist e
// do Ditto, dois botoes vermelhos nos Scripts).
// As checagens de CSS e HTML leem o index.html; as de comportamento rodam o <script> REAL com um DOM falso que conhece os
// ids, tags e atributos do proprio HTML (o menu sabe quem esta dentro dele, pra o clique "subir" como no navegador).
// Roda com: node test/redesign-a.test.js   (contra outra copia, pra comparar: node test/redesign-a.test.js caminho/do/index.html)
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const ARQ = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAIZ, 'index.html');
const s = fs.readFileSync(ARQ, 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
const css0 = s.slice(s.indexOf('<style>'), s.indexOf('</style>'));
// etapa B: as cores viraram variaveis do :root; as regras daqui comparam a cor de verdade (var(--x) vira o valor dela)
const TOK = Object.fromEntries([...(((/:root \{([^}]*)\}/.exec(css0) || [])[1]) || '').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const css = css0.replace(/var\((--[\w-]+)\)/g, (x, k) => TOK[k] || x);
const html = s.slice(s.indexOf('<body>'), s.indexOf('<script>', s.indexOf('<body>')));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const vezes = async (n) => { for (let k = 0; k < n; k++) await vez(); };
const regra = (sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i) + 1); }; // a regra CSS com esse seletor exato
// trecho do HTML do elemento com esse id, ate o fechamento dele (conta as <div> abertas e fechadas)
const bloco = (id) => {
  const i = html.indexOf('<div id="' + id + '"'); if (i < 0) return '';
  let d = 0; const re = /<\/?div\b/g; re.lastIndex = i;
  for (let m; (m = re.exec(html));) { d += m[0] === '<div' ? 1 : -1; if (!d) return html.slice(i, html.indexOf('>', m.index) + 1); }
  return '';
};
// tag e atributos de cada id do HTML (o DOM falso nasce igual ao HTML)
const TAGS = {};
for (const m of html.matchAll(/<(\w+)\b([^>]*)>/g)) { const a = {}; for (const x of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) a[x[1]] = x[2]; if (a.id) TAGS[a.id] = { tag: m[1], a }; }
const NO_MENU = new Set([...bloco('menu').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((id) => id !== 'menu'));

function monta(opts = {}) {
  const byId = new Map(), ints = [], copiados = [], docEv = {};
  let document;
  class CL { constructor(c) { this.s = new Set(c || []); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag, id, a) {
      a = a || {}; this.tagName = String(tag || 'div').toUpperCase(); this.id = id || ''; this.attrs = Object.assign({}, a);
      this.style = { setProperty() {}, display: /display:\s*none/.test(a.style || '') ? 'none' : '' };
      this.classList = new CL(String(a.class || '').split(/\s+/).filter(Boolean)); this.dataset = {};
      for (const k in a) if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = a[k];
      this.children = []; this._h = ''; this._t = ''; this.value = ''; this.checked = false; this.title = a.title || ''; this.options = [{}, {}]; this.childElementCount = 0; this.offsetHeight = 40; this.scrollTop = 0; this.ev = {}; this.parent = null;
    }
    get innerHTML() { return this._h; } set innerHTML(h) { this._h = String(h); this.children = []; }
    get textContent() { return this._t; } set textContent(v) { this._t = String(v); this.children = []; }
    get firstChild() { return this._h ? {} : null; }
    get outerHTML() { return ''; } set outerHTML(v) {}
    addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); } removeEventListener() {}
    querySelector(q) { this._q = this._q || {}; return this._q[q] || (this._q[q] = new El('div')); }
    querySelectorAll() { return []; }
    appendChild(c) { this.children.push(c); this.childElementCount = this.children.length; return c; }
    remove() {}
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; }
    focus() { document.activeElement = this; } blur() { if (document.activeElement === this) document.activeElement = null; } select() {}
    click() { clicar(this); }
    contains(x) { for (let e = x; e; e = e.parent) if (e === this) return true; return false; }
    closest(sel) { const um = (e, q) => (q[0] === '#' ? e.id === q.slice(1) : q === '[data-a]' ? e.dataset.a != null : e.tagName === q.toUpperCase()); for (let e = this; e; e = e.parent) if (sel.split(',').some((q) => um(e, q.trim()))) return e; return null; }
  }
  // clique como o do navegador: o onclick do botao e depois os ouvintes de quem esta acima dele (o menu, no caso)
  function clicar(el) {
    const ev = { target: el, stopPropagation() {}, preventDefault() {} };
    if (el.onclick) el.onclick(ev);
    for (let p = el; p; p = p.parent) (p.ev.click || []).forEach((f) => f(ev));
  }
  class WV extends El {
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; }
    executeJavaScript() { return Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() {} reloadIgnoringCache() {} loadURL() { return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid');
  const pega = (id) => {
    if (id === 'grid') return grid;
    if ((opts.nulos || []).includes(id)) return null;
    if (!byId.has(id)) { const T = TAGS[id] || { tag: 'div', a: {} }; const e = new El(T.tag, id, T.a); byId.set(id, e); if (NO_MENU.has(id)) e.parent = pega('menu'); }
    return byId.get(id);
  };
  const grupos = [...bloco('menu').matchAll(/<div class="mg" data-t="(\w+)">/g)].map((m) => { const e = new El('div', '', { class: 'mg', 'data-t': m[1] }); e.parent = pega('menu'); return e; });
  document = {
    getElementById: pega,
    createElement: (t) => (t === 'webview' ? new WV() : new El(t)),
    querySelector: () => new El('div'), querySelectorAll: (q) => (q === '#menu .mg' ? grupos : []),
    addEventListener(t, f) { (docEv[t] = docEv[t] || []).push(f); }, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAutoStart: async (on) => !!on, setAwake: async () => true, setMinToTray: async () => true, saveBackup: async () => true, openErrorLog() {}, appVersion: '1.5.31' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  const exporta = '\n;return { t, nc, I18N, ivRender, setIv: (d, i) => { ivAberto = true; ivRecebe(i, d); }, renderTier, renderDitto, ico: typeof ico !== "undefined" ? ico : () => "?" };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, { clipboard: { writeText: async (x) => { copiados.push(x); } } }, { reload() {} }, (f, ms) => { ints.push({ f, ms }); return ints.length; }, noop, noop, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, () => null);
  return Object.assign(api, { byId: pega, store, clicar, El, copiados, document, docEv, grid });
}
// o JSON do leitor (o mesmo que chega pelo console do painel): Scizor Nv 80 x1.55, IV total 122 (63,5%)
const SCIZOR = { nome: 'Scizor', shiny: false, ditto: false, tipos: ['BUG', 'STEEL'], ativo: false, time: false, nivel: 80, qualidade: 1.55, ivTotal: 122, stats: { hp: 146, atk: 216, def: 159, spa: 85, spd: 154, vel: 101 }, poder: 1335, fonte: 'tooltip' };
const FIXADO = JSON.stringify([{ d: Object.assign({}, SCIZOR, { nome: 'Kabutops', qualidade: 1.4 }), i: 1, t: 1 }]);

(async () => {
  await secao('contraste: nenhum texto em #6e7681 (3,8:1) ou #586069 (2,7:1), no CSS e nos estilos montados no JS', async () => {
    const ruins = [];
    for (const m of s.matchAll(/#(6e7681|586069)\b/gi)) {
      const antes = s.slice(Math.max(0, m.index - 80), m.index), p = /([a-z-]+)\s*:\s*[^:;{}"']*$/i.exec(antes);
      if (!(p && /^(border|background|outline|box-shadow|fill|stroke)/.test(p[1]))) ruins.push(s.slice(Math.max(0, m.index - 30), m.index + 8).replace(/\s+/g, ' '));
    }
    ok(!ruins.length, 'texto com os cinzas antigos: ' + ruins.length + (ruins.length ? ' (ex.: ' + ruins.slice(0, 3).join(' | ') + ')' : ''));
  });

  await secao('piso de fonte: nada abaixo de 11px; rotulo em caixa alta com espacamento de no maximo .05em', async () => {
    const pequenas = [...s.matchAll(/font-size:\s*([0-9.]+)px/g)].filter((m) => +m[1] < 11).map((m) => s.slice(Math.max(0, m.index - 40), m.index + 18).replace(/\s+/g, ' '));
    const curtas = [...s.matchAll(/\bfont:\s*[^;'"]*?\b([0-9.]+)px/g)].filter((m) => +m[1] < 11);
    ok(!pequenas.length && !curtas.length, 'font-size abaixo de 11px (CSS e inline): ' + (pequenas.length + curtas.length) + (pequenas.length ? ' (ex.: ' + pequenas.slice(0, 3).join(' | ') + ')' : ''));
    const largas = [];
    for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!/text-transform:\s*uppercase/.test(m[2])) continue;
      const ls = /letter-spacing:\s*(-?[0-9.]+)(em|px)/.exec(m[2]); if (!ls) continue;
      const fs2 = +((/font-size:\s*([0-9.]+)px/.exec(m[2]) || [])[1] || 11);
      const em = ls[2] === 'em' ? +ls[1] : +ls[1] / fs2;
      if (em > 0.0501) largas.push(m[1].trim() + ' (' + ls[1] + ls[2] + ')');
    }
    ok(!largas.length, 'caixa alta com letter-spacing acima de .05em: ' + largas.length + (largas.length ? ' (' + largas.slice(0, 4).join(' | ') + ')' : ''));
  });

  await secao('botoes, foco, ligado, caixas de marcar, rolagem e cabecalho dos paineis', async () => {
    const pr = regra('button.primary'), prh = regra('button.primary:hover');
    ok(/background: #d9300b;/.test(pr) && /border-color: #d9300b;/.test(pr) && /background: #e8401a;/.test(prh), 'botao principal em #d9300b (hover #e8401a): branco a 4,8:1 (' + pr + ')');
    const foco = regra('button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible');
    const focoVermelho = [...css.matchAll(/([^{}]*:focus[^{}]*)\{([^}]*)\}/g)].filter((m) => /#e3350d/.test(m[2])).map((m) => m[1].trim());
    ok(/outline: 2px solid #58a6ff;/.test(foco) && /outline-offset: 1px;/.test(foco) && !focoVermelho.length, 'foco de teclado azul (outline 2px #58a6ff) e nenhum campo com foco vermelho' + (focoVermelho.length ? ' (sobrou ' + focoVermelho.join(' | ') + ')' : ''));
    const on = regra('button.on');
    ok(/background: rgba\(46,160,67,\.14\);/.test(on) && /border-color: rgba\(46,160,67,\.45\);/.test(on) && /color: #aff5b4;/.test(on), 'ligado vira tom de verde, nao bloco chapado (' + on + ')');
    const acc = [...s.matchAll(/accent-color:\s*(#[0-9a-f]+)/gi)].map((m) => m[1].toLowerCase());
    ok(/accent-color: #2ea043;/.test(regra('input[type=checkbox]')) && acc.every((c) => c === '#2ea043'), 'caixas de marcar verdes em todo lugar (' + acc.join(', ') + ')');
    ok(/width: 10px;/.test(regra('::-webkit-scrollbar')) && /background: #30363d;/.test(regra('::-webkit-scrollbar-thumb')) && /transparent/.test(css.slice(css.indexOf('::-webkit-scrollbar-track'), css.indexOf('}', css.indexOf('::-webkit-scrollbar-track')))), 'barra de rolagem escura no app todo (a Tierlist e o Ditto mostravam a clara)');
    const ph = regra('.panel-header button'), phh = regra('.panel-header button:hover');
    ok(/background: transparent;/.test(ph) && /border-color: transparent;/.test(ph) && /color: #8b949e;/.test(ph) && /background: #21262d;/.test(phh) && /color: #e6edf3;/.test(phh), 'botoes − + ⟳ ⛶ do painel discretos (hover #21262d)');
  });

  await secao('barra do topo: Logar equipe em destaque, o resto discreto, na ordem combinada', async () => {
    const tb = bloco('topbar'), semMenu = tb.replace(bloco('menuWrap'), '<div id="menuWrap">');
    const seq = [...semMenu.matchAll(/<(?:button|span|div)\b[^>]*?(?:\sid="(\w+)"|\sclass="(logo|tb-fill|tb-sep)")/g)].map((m) => m[1] || m[2]).filter((x) => x !== 'topbar' && x !== 'appVer');
    const quer = ['logo', 'loginAll', 'reloadAll', 'tb-fill', 'statsBtn', 'cardsBtn', 'ivsBtn', 'tb-sep', 'accounts', 'menuWrap', 'tb-sep', 'donTop', 'refBtn'];
    ok(seq.join() === quer.join(), 'ordem: ' + seq.join(' '));
    const prim = [...tb.matchAll(/<button\b[^>]*class="[^"]*\bprimary\b[^"]*"[^>]*>/g)].map((m) => (/id="(\w+)"/.exec(m[0]) || [])[1]);
    const ghost = regra('#topbar > button:not(.primary):not(.on), #menuBtn'), don = regra('#topbar > #donTop'), cor = regra('#donTop .ico');
    ok(prim.join() === 'loginAll' && /background: transparent;/.test(ghost) && /border-color: transparent;/.test(ghost) && /color: #c9d1d9;/.test(ghost) && /border-color: #30363d;/.test(don) && /color: #f778ba;/.test(cor), 'so o Logar equipe preenchido; os outros sem fundo, o Ajude o projeto em contorno neutro com o coracao rosa (primarios: ' + prim.join() + ')');
    const HI = monta(); await vezes(3); // redesign C: a pokebola do IVs e o icone do ICO
    ok(/<button id="ivsBtn"[^>]*>IVs<\/button>/.test(tb) && HI.byId('ivsBtn').innerHTML === HI.ico('pokebola') + '<span class="lbl">IVs</span>' && !/IV's/.test(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')), 'rotulo "IVs" com a pokebola (sem "IV\'s")');
    ok(/margin-left: 10px;/.test(regra('#loginAll')) && /width: 1px; height: 20px; background: #30363d;/.test(regra('#topbar .tb-sep')) && /flex: 1;/.test(regra('#topbar .tb-fill')), 'Logar equipe com folga depois da versao e separadores de 1px #30363d');
  });

  await secao('menu ☰ Opcoes: 2 colunas, 5 grupos, os 24 itens, cabe em 1366x768', async () => {
    const M = bloco('menu');
    const cols = M.split('<div class="mcol">').slice(1).map((c) => {
      const out = []; let g = null;
      for (const m of c.matchAll(/<div class="mg" data-t="(\w+)">|<(?:button|div) id="(\w+)"/g)) { if (m[1]) out.push(g = { g: m[1], ids: [] }); else if (g) g.ids.push(m[2]); }
      return out.map((x) => x.g + ':' + x.ids.join(',')).join(' ');
    });
    const quer = ['mgTools:hunt,tierBtn,dittoBtn,scriptsBtn mgScreen:countRow,layout,propNat,cleanHud,chat mgSystem:eco,awake,minTray,autoStart,langRow',
      'mgAlerts:alerts,sellguard,voltaHunt,sndShiny,muteAll mgHelp:manBtn,faqBtn,bkExp,bkImp,errlogBtn'];
    ok(cols.length === 2 && cols[0] === quer[0] && cols[1] === quer[1], 'grupos e itens por coluna: ' + JSON.stringify(cols));
    const ids = quer.join(' ').split(/[ :,]/).filter((x) => x && !/^mg/.test(x));
    const H = monta(); await vezes(3);
    const nomes = ['mgTools', 'mgScreen', 'mgSystem', 'mgAlerts', 'mgHelp'];
    ok(ids.length === 24 && ids.every((id) => html.split('id="' + id + '"').length === 2) && /id="autoStart"[^>]*style="display:none"/.test(M) && /if \(!r \|\| !r\.suportado\) return;\s*autoStart = !!r\.on; asBtn\.style\.display = '';/.test(code)
      && nomes.every((k) => ['pt', 'en', 'es'].every((L) => typeof H.I18N[L][k] === 'string' && H.I18N[L][k] && !/—/.test(H.I18N[L][k]))) && H.document.querySelectorAll('#menu .mg').map((g) => g.textContent).join() === nomes.map(H.t).join(),
    '24 itens, cada id uma vez so; o 🚀 continua escondido ate o sistema dizer que suporta; titulos dos grupos nos 3 idiomas (' + H.document.querySelectorAll('#menu .mg').map((g) => g.textContent).join(' | ') + ')');
    const mr = regra('#menu'), ms = regra('#menu.show'), mg = regra('#menu .mg');
    ok(/grid-template-columns: 1fr 1fr;/.test(mr) && /width: 520px;/.test(mr) && /max-height: calc\(100vh - 64px\); overflow-y: auto;/.test(mr) && /display: grid;/.test(ms) && /font-size: 11px;/.test(mg) && /text-transform: uppercase;/.test(mg) && /color: #8b949e;/.test(mg), 'menu de 520px em 2 colunas, com teto de altura e titulo de grupo em caixa alta 11px');
    const it = regra('#menu button'), hv = regra('#menu button:hover'), sel = regra('#menu #langRow button.on, #menu #countRow button.on'), sp = regra('#langRow span, #countRow span');
    ok(/background: transparent; border-color: transparent;/.test(it) && /background: #21262d;/.test(hv) && /background: #e6edf3; color: #0d1117;/.test(sel) && /font-size: 12px;/.test(sp), 'itens sem borda (hover #21262d), escolhido de Paineis/idioma invertido e o "🔢 Painéis" em 12px (herdava 16px)');
    const tr = regra('#menu [role=switch].on::after'), kn = regra('#menu [role=switch].on::before');
    ok(/content: '';/.test(regra('#menu [role=switch]::after')) && /background: #238636;/.test(tr) && /right: 10px; background: #fff;/.test(kn), 'chave por CSS: ligada = trilho verde #238636 e o botao a direita');
  });

  await secao('chaves do menu: rotulo fixo, .on e aria-checked seguem o estado de verdade', async () => {
    const SW = { muteAll: ['Silenciar jogos', 'muted'], eco: ['Modo Eco', 'eco'], chat: ['Esconder chat', 'chatHidden'], awake: ['Manter o PC acordado', 'awake'],
      minTray: ['Minimizar pra bandeja', 'minTray'], voltaHunt: ['Voltar pra hunt', 'voltaHunt'], alerts: ['Alertas', 'alerts'], sellguard: ['Venda protegida', 'sellguard'],
      cleanHud: ['Limpar jogo', 'cleanHud'], autoStart: ['Abrir com o Windows', null], sndShiny: ['Som do shiny', 'sndShiny'], propNat: ['Proporção original', 'propNat'] };
    const rot = (b) => (/<span class="lbl">([^<]*)<\/span>$/.exec(b.innerHTML) || [])[1] || ''; // redesign C: o texto do rotulo, depois do icone
    const comRole = Object.keys(TAGS).filter((id) => TAGS[id].a.role === 'switch').sort();
    ok(comRole.join() === Object.keys(SW).sort().join() && TAGS.layout && !TAGS.layout.a.role, 'role="switch" nos 12 liga/desliga e so neles (a Grade alterna 3 modos, nao e chave): ' + comRole.join(', '));
    const H = monta(); await vezes(4);
    const est = (b) => [rot(b), b.classList.contains('on'), b.getAttribute('aria-checked')];
    for (const [id, [rot, chave]] of Object.entries(SW)) {
      const b = H.byId(id), a = est(b);
      H.clicar(b); await vezes(3);
      const d = est(b);
      const disco = chave ? H.store.get(chave) === (d[1] ? '1' : '0') : true;
      ok(a[0] === rot && d[0] === rot && d[1] === !a[1] && a[2] === String(a[1]) && d[2] === String(d[1]) && disco,
        id + ': "' + a[0] + '" ' + (a[1] ? 'ligada' : 'desligada') + ' -> "' + d[0] + '" ' + (d[1] ? 'ligada' : 'desligada') + ' (aria-checked ' + a[2] + ' -> ' + d[2] + (chave ? ', disco ' + chave + '=' + H.store.get(chave) : '') + ')');
    }
    ok(H.byId('chat').classList.contains('on') === (H.store.get('chatHidden') === '1') && H.store.get('chatHidden') === '0', 'Esconder chat: ligada = chat escondido (o padrao e escondido; desligou, o chat aparece)');
    for (const lang of ['en', 'es']) {
      const L = monta({ ls: { lang } }); await vezes(4);
      const r = Object.keys(SW).map((id) => { const b = L.byId(id), t0 = rot(b), on0 = b.classList.contains('on'); L.clicar(b); return { id, t0, t1: rot(b), aria: b.getAttribute('aria-checked') }; });
      await vezes(3);
      ok(r.every((x) => x.t0 && x.t0 === x.t1 && x.t0 === rot(L.byId(x.id)) && L.byId(x.id).getAttribute('aria-checked') === String(L.byId(x.id).classList.contains('on'))), '[' + lang + '] rotulos fixos ao ligar e desligar, aria-checked junto: ' + r.map((x) => x.t1).join(' | '));
    }
  });

  await secao('abrir janela pelo menu fecha o menu (ficava aberto por cima do fundo da janela)', async () => {
    const H = monta(); await vezes(4);
    const menu = H.byId('menu');
    const abre = (id) => { menu.classList.add('show'); H.clicar(H.byId(id)); return !menu.classList.contains('show'); };
    const acoes = ['scriptsBtn', 'tierBtn', 'dittoBtn', 'hunt', 'manBtn', 'faqBtn', 'bkExp', 'errlogBtn'].map((id) => [id, abre(id)]);
    const janelas = [['scriptsBtn', 'scOverlay'], ['tierBtn', 'tlOverlay'], ['dittoBtn', 'dtOverlay']].every(([b, ov]) => { abre(b); return H.byId(ov).classList.contains('show'); });
    const linha = new H.El('div', 'countRow'); linha.parent = menu;
    const n3 = new H.El('button'); n3.parent = H.byId('countRow'); n3.dataset.n = '3';
    const ficam = ['eco', 'chat', 'layout'].map((id) => [id, !abre(id)]).concat([['Paineis', !abre2(n3)]]);
    function abre2(el) { menu.classList.add('show'); H.clicar(el); return !menu.classList.contains('show'); }
    ok(acoes.every((x) => x[1]) && janelas && ficam.every((x) => x[1]), 'itens de acao fecham (' + acoes.map((x) => x[0] + (x[1] ? '' : ' ABERTO')).join(', ') + '); chave, Grade e Paineis deixam aberto (' + ficam.map((x) => x[0] + (x[1] ? '' : ' FECHOU')).join(', ') + ')');
  });

  await secao('card de IV: grade sem rolagem lateral, Comparar sem quebrar "Qualidade" e decimais no formato do idioma', async () => {
    // card de IV novo (04/10): os atributos viraram linhas (a barra e a coluna elastica) e os golpes, cartoes em 2 colunas
    const top = regra('#ivCard .iv-top'), st = regra('#ivCard .iv-st'), mvs = regra('#ivCard .iv-mvs'), c1 = regra('#ivCard .iv-cmp th:first-child, #ivCard .iv-cmp td:first-child');
    ok(/repeat\(2, minmax\(0, 1fr\)\)/.test(top) && /grid-template-columns: 52px minmax\(0, 1fr\) [\d px]+;/.test(st) && /repeat\(2, minmax\(0, 1fr\)\)/.test(mvs) && !/1fr/.test((top + st + mvs).replace(/minmax\(0, 1fr\)/g, '')),'colunas com minmax(0,1fr): o campo nao empurra a coluna (em espanhol cortava a 3a)');
    ok(/width: 86px;/.test(c1) && /white-space: nowrap;/.test(c1), '1a coluna do Comparar com 86px e sem quebra ("Qualidad/e")');
    const visto = {};
    for (const lang of ['pt', 'en', 'es']) {
      const H = monta({ ls: { lang, ivFix: FIXADO } }); await vezes(3);
      H.setIv(SCIZOR, 0); H.ivRender();
      const ivEl = H.byId('ivCard'), clica = (a, v) => (ivEl.ev.click || []).forEach((f) => f({ target: { closest: (q) => (q === '[data-a]' ? { dataset: { a, v }, textContent: '' } : null) } }));
      const leitor = ivEl.innerHTML;
      clica('aba', 'analise'); const analise = ivEl.innerHTML;
      clica('aba', 'comparar'); const cmp = ivEl.innerHTML;
      clica('aba', 'hist'); const hist = ivEl.innerHTML;
      clica('copia', 'txt'); await vezes(2);
      visto[lang] = { pct: (/\((\d+[.,]\d)%/.exec(leitor) || [])[1], q: (/<\/span> ×(\d[.,]\d\d)\)/.exec(leitor) || [])[1], fogo: (/FIRE<\/span><b[^>]*>×([\d.,]+)/.exec(analise) || [])[1],
        regra: (/×2 \S+ (?:a )?×(2[.,]5)/.exec(analise) || [])[1], cmpQ: (/<td[^>]*>×(1[.,]40) <small[^>]*>-(0[.,]15)<\/small>/.exec(cmp) || []).slice(1).join(' '), /* etapa B: a cor da diferenca foi pro small */ hist: (/>×(1[.,]55)<\/span>/.exec(hist) || [])[1], txt: (/×(1[.,]55)/.exec(H.copiados.pop() || '') || [])[1] };
    }
    const forma = (L) => Object.values(visto[L]).join(' | ');
    const virg = (L) => visto[L].pct === '63,5' && visto[L].q === '1,55' && visto[L].fogo === '5,5' && visto[L].regra === '2,5' && visto[L].cmpQ === '1,40 0,15' && visto[L].hist === '1,55' && visto[L].txt === '1,55';
    const ponto = visto.en.pct === '63.5' && visto.en.q === '1.55' && visto.en.fogo === '5.5' && visto.en.regra === '2.5' && visto.en.cmpQ === '1.40 0.15' && visto.en.hist === '1.55' && visto.en.txt === '1.55';
    ok(virg('pt') && virg('es') && ponto, 'virgula em pt e es, ponto em en (porcentagem, ×qualidade, efetividade, regra da hunt, Comparar, Historico e o texto copiado): pt ' + forma('pt') + ' / en ' + forma('en') + ' / es ' + forma('es'));
  });

  await secao('numero grande: degrau B depois do M (o XP total aparecia "3080M")', async () => {
    const esp = { pt: ['3,08B', '1B', '999M', '1,5B', '-2B', '12,3B'], en: ['3.08B', '1B', '999M', '1.5B', '-2B', '12.3B'], es: ['3,08B', '1B', '999M', '1,5B', '-2B', '12,3B'] };
    for (const lang of ['pt', 'en', 'es']) {
      const H = monta({ ls: { lang } }); await vez();
      const v = [3.08e9, 999.5e6, 999.4e6, 1.5e9, -2e9, 12.34e9].map(H.nc);
      ok(v.join() === esp[lang].join() && H.nc(1500000) === (lang === 'en' ? '1.5M' : '1,5M'), '[' + lang + '] ' + v.join(' · ') + ' (o M segue: ' + H.nc(1500000) + ')');
    }
  });

  await secao('janelas: Treinadores numa linha, um vermelho so nos Scripts, ✕ no canto da Tierlist e do Ditto', async () => {
    const tpl = (/row\.innerHTML = `([\s\S]*?)`;/.exec(code) || [])[1] || '';
    const campos = (tpl.match(/<(input|button)\b/g) || []).length, trilhas = (/grid-template-columns: ([^;]+);/.exec(regra('.acc-row')) || [])[1] || '';
    ok(campos === 5 && trilhas.trim().split(/\s+/).length === 5, 'linha do treinador: ' + campos + ' controles e ' + trilhas.trim().split(/\s+/).length + ' colunas (' + trilhas + '): o 🧹 nao cai pra linha de baixo');
    const prim = [...bloco('scModal').matchAll(/<button id="(\w+)" class="primary"/g)].map((m) => m[1]);
    ok(prim.join() === 'scAddUrl' && /<button id="scAdd">/.test(bloco('scModal')), 'Scripts: so o "+ Adicionar pelo GitHub" e principal (' + prim.join(', ') + ')');
    const hd = (id, x) => new RegExp('<div class="md-hd"><h2>[^<]*<span id="' + id + 'T1"></span></h2><button id="' + id + 'Close" class="md-x"></button></div>\\s*<details class="md-how"><summary id="' + id + 'How">[^<]*</summary><p class="hint" id="' + id + 'Hint"></p></details>').test(bloco(x));
    const H = monta(); await vezes(3);
    H.byId('tlOverlay').classList.add('show'); H.renderTier();
    H.byId('dtOverlay').classList.add('show'); H.renderDitto();
    if (H.byId('dtClose').onclick) H.clicar(H.byId('dtClose'));
    ok(hd('tl', 'tlModal') && hd('dt', 'dtModal') && H.byId('tlClose').innerHTML === H.ico('fechar') && H.byId('dtClose').getAttribute('aria-label') === H.t('closeT') && H.byId('tlHow').textContent === H.t('howWorks') && H.byId('dtHow').textContent === H.t('howWorks') && !H.byId('dtOverlay').classList.contains('show') && !/dtClose/.test(code.slice(code.indexOf('function dtControles'), code.indexOf('function renderDitto'))),
      '✕ no cabecalho (o do Ditto fixo, nao refeito com os controles) e a explicacao recolhida em "' + H.t('howWorks') + '"');
    const L = monta({ ls: { lang: 'en' } }); await vezes(3);
    ok(['pt', 'en', 'es'].every((k) => L.I18N[k].howWorks && !/—/.test(L.I18N[k].howWorks)) && L.I18N.en.howWorks !== L.I18N.pt.howWorks, '"Como funciona" nos 3 idiomas (' + ['pt', 'en', 'es'].map((k) => L.I18N[k].howWorks).join(' | ') + ')');
  });

  await secao('menu de icones do jogo: so o Limpar jogo esconde (e o hover mostra); F2 e M ligam e desligam o Limpar jogo', async () => {
    ok(!/id="dock"/.test(html) && !/dockScript|dockBtn|__dockHide/.test(code), 'saiu o botao "Menu do jogo", que escondia o menu de vez (display none, sem volta no hover)');
    ok(/nav\.game-dock\{opacity:0 !important/.test(code) && /nav\.game-dock:hover\{opacity:1 !important\}/.test(code) && !/game-dock[^\n]{0,80}display/.test(code), 'com o Limpar jogo o menu fica transparente e aparece ao passar o mouse; nada mais da display none nele');
    ok(/\.ha-window,nav\.game-dock\{opacity:0 !important/.test(code) && /\.ha-window:hover,nav\.game-dock:hover\{opacity:1 !important\}/.test(code) && code.includes('o menu do jogo e o Hunt Analyzer aparecem ao passar o mouse'), 'o Hunt Analyzer do jogo (.ha-window) tambem some com o Limpar jogo e aparece ao passar o mouse, e a dica do Limpar jogo diz isso');
    // o F2 que vai pra pagina do jogo: avisa o app pelo console, uma vez por aperto
    const f2 = (/const F2_SCRIPT = `([^`]*)`/.exec(code) || [])[1] || '';
    const ouv = [], logs = [], w = {};
    const roda = () => new Function('window', 'addEventListener', 'console', f2.replace(/window\./g, 'window.'))(w, (t, f, c) => ouv.push({ t, f, c }), { log: (x) => logs.push(x) });
    roda(); roda(); // a cada carga da pagina o app injeta de novo: um ouvinte so
    const aperta = (key, repeat) => ouv.forEach((o) => o.t === 'keydown' && o.f({ key, repeat: !!repeat, preventDefault() {} }));
    aperta('F2'); aperta('F2', true); aperta('a');
    ok(f2 && ouv.length === 1 && ouv[0].c === true && logs.join() === '__PGF2__', 'F2 dentro do jogo manda __PGF2__ (uma vez; tecla segurada e outras teclas nao), ouvinte na captura e um so (' + logs.join() + ')');
    // o app: __PGF2__ do painel e F2 com o foco na janela ligam/desligam o Limpar jogo
    const H = monta(); await vezes(3);
    const cl = H.byId('cleanHud'), estado = () => cl.getAttribute('aria-checked');
    const wv = H.grid.children.map((p) => p.children.find((c) => c.tagName === 'WEBVIEW')).filter(Boolean)[0];
    const e0 = estado();
    (wv.ev['console-message'] || []).forEach((f) => f({ message: '__PGF2__' }));
    const e1 = estado();
    (H.docEv.keydown || []).forEach((f) => f({ key: 'F2', repeat: false, preventDefault() {}, ctrlKey: false, altKey: false, metaKey: false }));
    const e2 = estado();
    (H.docEv.keydown || []).forEach((f) => f({ key: 'F2', repeat: true, preventDefault() {}, ctrlKey: false, altKey: false, metaKey: false }));
    ok(e0 === 'true' && e1 === 'false' && e2 === 'true' && estado() === 'true' && H.store.get('cleanHud') === '1', 'o __PGF2__ do painel e o F2 da janela alternam o Limpar jogo (ligado ' + [e0, e1, e2, estado()].join(' > ') + '), tecla segurada nao repete');
    ok(/m: \(\) => cleanBtn\.click\(\)/.test(code) && /F2 liga e desliga/.test(H.I18N.pt.cleanTitle) && /F2/.test(H.I18N.en.cleanTitle) && /F2/.test(H.I18N.es.cleanTitle), 'M tambem liga/desliga o Limpar jogo, e a dica dele cita o F2 nos 3 idiomas');
    ok(['pt', 'en', 'es'].every((k) => !('dockLabel' in H.I18N[k]) && !('dockTitle' in H.I18N[k])), 'rotulo e dica do botao que saiu fora do i18n');
  });

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})();
