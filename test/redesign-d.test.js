// Redesign, etapa D (03/10/2026): os dialogos do app. pgConfirma/pgAviso no tema do app (verbo no botao, destrutivo com o foco
// no Cancelar, Enter so pelo botao, Esc e fundo cancelam, Tab fica dentro, o foco volta, um por vez) no lugar dos 22
// window.confirm/alert da janela. A guarda de venda roda na pagina do jogo (outro documento) e segue com o confirm dela.
// As checagens de CSS e HTML leem o index.html; os fluxos rodam o <script> REAL com o DOM falso do redesign-c, mais: a lista de
// Scripts devolvendo as linhas desenhadas, os ouvintes do document (soltar arquivo), o input de arquivo do Importar config, e
// FileReader e location falsos. Cada fluxo passa pelo caminho de confirmar e pelo de cancelar.
// Roda com: node test/redesign-d.test.js   (contra outra copia, pra comparar: node test/redesign-d.test.js caminho/do/index.html)
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const ARQ = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAIZ, 'index.html');
const s = fs.readFileSync(ARQ, 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
const css = s.slice(s.indexOf('<style>'), s.indexOf('</style>'));
const html = s.slice(s.indexOf('<body>'), s.indexOf('<script>', s.indexOf('<body>')));
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));
const vezes = async (n) => { for (let k = 0; k < n; k++) await vez(); };
const ate = async (cond, n = 40) => { for (let k = 0; k < n && !cond(); k++) await vez(); return cond(); };
const realST = setTimeout;
const corre = (p, ms) => Promise.race([Promise.resolve(p).then(() => 'terminou'), new Promise((r) => realST(() => r('PENDENTE apos ' + ms + ' ms'), ms))]);
const regra = (sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i) + 1); };
// emoji ou simbolo fazendo papel de icone (o mesmo do redesign-c)
const GLIFO = /[\p{Extended_Pictographic}←-⯿−️]/u;
const TAGS = {};
for (const m of html.matchAll(/<(\w+)\b([^>]*)>/g)) { const a = {}; for (const x of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) a[x[1]] = x[2]; if (a.id) TAGS[a.id] = { tag: m[1], a }; }

function monta(opts = {}) {
  const byId = new Map(), criados = [], docEv = {}, nativos = [], reg = { recargas: 0, limpou: [], backups: 0 };
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
    querySelector(q) { this._q = this._q || {}; return this._q[q] || (this._q[q] = new El('div')); }
    querySelectorAll(q) { return q === 'input' ? [new El('input'), new El('input'), new El('input')] : []; } // a linha do treinador pega os 3 campos
    appendChild(c) { this.children.push(c); this.childElementCount = this.children.length; c.parent = this; return c; }
    remove() { if (this.parent) { const k = this.parent.children.indexOf(this); if (k >= 0) this.parent.children.splice(k, 1); } }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 600 }; }
    focus() { document.activeElement = this; } blur() { if (document.activeElement === this) document.activeElement = null; } select() {}
    click() { if (this.onclick) this.onclick({ target: this, stopPropagation() {}, preventDefault() {} }); }
    contains(x) { for (let e = x; e; e = e.parent) if (e === this) return true; return false; }
    closest() { return null; }
  }
  class WV extends El {
    constructor() { super('webview'); this.url = 'https://poke.idleworld.online/play'; this.recarregou = 0; }
    executeJavaScript(c) { return opts.exec ? opts.exec(String(c), this) : Promise.resolve(null); }
    setAudioMuted() {} setZoomFactor() {} getURL() { return this.url; } reload() { this.recarregou++; } reloadIgnoringCache() { this.recarregou++; } loadURL(u) { this.url = u; return Promise.resolve(); } getWebContentsId() { return 1; }
  }
  const grid = new El('div', 'grid');
  grid.querySelectorAll = (q) => (q === '.panel' ? grid.children.slice() : []);
  // a lista de Scripts devolve as linhas que o app desenhou (caixa de ligar, remover, atualizar): as mesmas ate o proximo desenho
  const linhas = (el) => (q) => {
    if (!el._qa || el._qa.h !== el._h) el._qa = { h: el._h };
    if (el._qa[q]) return el._qa[q];
    const R = { '.sc-chk input': [/<input type="checkbox" data-sid="([^"]*)"( checked)?>/g, (m) => { const e = new El('input', '', { 'data-sid': m[1] }); e.checked = !!m[2]; return e; }],
      '.sc-del': [/<button class="sc-del" data-del="([^"]*)"/g, (m) => new El('button', '', { 'data-del': m[1] })],
      '.sc-upd': [/<button class="sc-upd" data-upd="([^"]*)"/g, (m) => new El('button', '', { 'data-upd': m[1] })] }[q];
    return (el._qa[q] = R ? [...el._h.matchAll(R[0])].map(R[1]) : []);
  };
  const pega = (id) => {
    if (id === 'grid') return grid;
    if (!byId.has(id)) { const T = TAGS[id] || { tag: 'div', a: {} }; const e = new El(T.tag, id, T.a); if (id === 'scList') e.querySelectorAll = linhas(e); byId.set(id, e); }
    return byId.get(id);
  };
  const langBtns = ['pt', 'en', 'es'].map((l) => new El('button', '', { 'data-lang': l }));
  const porSel = {};
  document = {
    getElementById: pega, createElement: (t) => { const e = t === 'webview' ? new WV() : new El(t); criados.push(e); return e; },
    querySelector: (q) => porSel[q] || (porSel[q] = new El('div')), querySelectorAll: (q) => (q === '#langRow button' ? langBtns : []),
    addEventListener: (t, f) => { (docEv[t] = docEv[t] || []).push(f); }, body: new El('body'), documentElement: new El('html'), head: new El('head'), activeElement: null
  };
  const store = new Map(Object.entries(opts.ls || {}));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  // o confirm/alert do Windows so anotam (no app novo ninguem chama; no antigo o confirm diz sim e o fluxo passa sem dialogo)
  const window = {
    addEventListener() {}, confirm: (m) => { nativos.push('confirm: ' + m); return true; }, alert: (m) => { nativos.push('alert: ' + m); }, open() {},
    pokeAPI: Object.assign({ loadCreds: async () => [], saveCreds: async () => true, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {},
      getAutoStart: async () => ({ on: false, suportado: true }), setAutoStart: async (on) => !!on, setAwake: async () => true, setMinToTray: async () => true, openErrorLog() {}, appVersion: '1.5.31',
      saveBackup: async () => { reg.backups++; return true; }, clearAccount: async (i) => { reg.limpou.push(i); return true; }, fetchUserScript: async () => ({ ok: false }) }, opts.api || {}),
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  // Importar config: o FileReader devolve na hora o texto que o teste pos no arquivo; o reload da janela so e contado
  function FileReader() {}
  FileReader.prototype.readAsText = function (f) { this.result = f.texto; if (this.onload) this.onload(); };
  const location = { reload() { reg.recargas++; } };
  // o que a etapa D criou vem por typeof: contra o app antigo a checagem FALHA em vez de o harness quebrar
  const novo = (n) => 'typeof ' + n + " !== 'undefined' ? " + n + ' : null';
  const exporta = '\n;return { t, I18N, webviews, off, statsEl, get cardsEl() { return cardsEl; }, cardsSet: (v) => { cardsOn = v; }, refreshCards, renderSettings, stCache,'
    + ' atualizaScript, renderScriptsList, get userScripts() { return userScripts; }, get scriptsOn() { return scriptsOn; }, ico, pgConfirma: ' + novo('pgConfirma') + ', pgAviso: ' + novo('pgAviso') + ' };';
  // pokeAPI solto: no navegador o window.pokeAPI tambem e global (o Importar config chama pokeAPI.saveBackup assim)
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', 'pokeAPI', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, location, noop, noop, noop, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, FileReader, () => new Promise(() => {}), { now: () => Date.now() }, () => null, window.pokeAPI);
  return Object.assign(api, { byId: pega, store, document, criados, docEv, nativos, reg, El });
}

// o dialogo do app no DOM falso: o que esta aberto (null se fechado), com o texto sem as tags e quem tem o foco
const dialogo = (H) => {
  const g = H.byId;
  if (!g('dlgOverlay').classList.contains('show')) return null;
  const a = H.document.activeElement;
  return { tit: g('dlgTit').hidden ? '' : g('dlgTit').textContent, html: g('dlgTxt').hidden ? '' : g('dlgTxt').innerHTML, txt: g('dlgTxt').hidden ? '' : g('dlgTxt').innerHTML.replace(/<[^>]+>/g, ''),
    ok: g('dlgOk').textContent, no: g('dlgNo').hidden ? null : g('dlgNo').textContent, perigo: g('dlgOk').classList.contains('perigo'), foco: a === g('dlgNo') ? 'cancelar' : a === g('dlgOk') ? 'ok' : '?' };
};
// responder como o usuario: o clique no botao do dialogo (o Enter no botao em foco e esse mesmo clique)
// texto do idioma; chave que nao existe (app antigo) vira '' e a checagem falha sozinha em vez de quebrar a secao
const tr = (H) => (k) => { const v = H.t(k); return v == null ? '' : String(v); };
const responde = (H, sim) => H.byId(sim ? 'dlgOk' : 'dlgNo').click();
const tecla = (H, key, extra) => { const ev = Object.assign({ key, parou: 0, impediu: 0, stopPropagation() { this.parou++; }, preventDefault() { this.impediu++; } }, extra || {}); const f = H.byId('dlgOverlay').onkeydown; if (f) f(ev); return ev; };
// confirmacao com o titulo, o verbo, o Cancelar e o foco esperados (perigo: vermelho e foco no Cancelar; senao foco no verbo)
const pede = (d, T, tit, verbo, perigo) => !!d && d.tit === tit && d.ok === verbo && d.no === T('mCancel') && d.perigo === !!perigo && d.foco === (perigo ? 'cancelar' : 'ok');
const aviso = (d, T, txt) => !!d && d.no === null && d.ok === T('dlgEntendi') && d.foco === 'ok' && !d.perigo && (txt == null || d.txt === txt);
const mostra = (d) => (d ? '"' + (d.tit || d.txt).slice(0, 60) + '" [' + (d.no ? d.no + ' | ' : '') + d.ok + ']' + (d.perigo ? ' perigo' : '') + ' foco=' + d.foco : 'nenhum dialogo');
const URL1 = 'https://raw.githubusercontent.com/a/b/main/x.user.js';
const S1 = (on, extra) => ({ ls: { userScripts: JSON.stringify([{ id: 'u1', name: 'Auto Berry', code: '// v1', url: URL1, version: '1' }]), scriptsOn: JSON.stringify({ u1: on }) }, api: extra });

(async () => {
  await secao('nenhum confirm/alert do Windows na janela do app; a guarda de venda (pagina do jogo) segue com o dela', async () => {
    const i0 = code.indexOf('const SELLGUARD = `'), i1 = code.indexOf('`;', i0);
    const guarda = i0 >= 0 && i1 > i0 ? code.slice(i0, i1) : '';
    const janela = guarda ? code.slice(0, i0) + code.slice(i1) : code;
    const chamadas = [...janela.matchAll(/\b(?:window\.)?(?:confirm|alert)\(/g)].map((m) => janela.slice(Math.max(0, m.index - 20), m.index + 30).replace(/\s+/g, ' '));
    ok(guarda.includes('window.confirm(T[0]') && guarda.includes("['alert', 'confirm', 'prompt'].forEach") && !chamadas.length,
      'window.confirm/alert na janela: ' + chamadas.length + (chamadas.length ? ' (ex.: ' + chamadas.slice(0, 2).join(' | ') + ')' : '') + '; a guarda de venda, injetada no jogo, segue com o confirm dela');
    ok(code.includes("'#overlay.show, #scOverlay.show, #tlOverlay.show, #dtOverlay.show, #dlgOverlay.show'"), 'com o dialogo aberto os atalhos de letra ficam quietos (R recarregava os paineis por tras dele)');
  });

  await secao('o dialogo: alertdialog modal rotulado e descrito, Cancelar e a acao a direita, texto com quebra de linha, por cima de tudo', async () => {
    const bx = TAGS.dlgBox ? TAGS.dlgBox.a : {};
    ok(bx.role === 'alertdialog' && bx['aria-modal'] === 'true' && bx['aria-labelledby'] === 'dlgTit' && bx['aria-describedby'] === 'dlgTxt' && bx.tabindex === '-1' && TAGS.dlgTit && TAGS.dlgTit.tag === 'h2' && TAGS.dlgTxt,
      'role="alertdialog", aria-modal, rotulado pelo titulo (h2) e descrito pelo texto; a caixa pega o foco de um clique no texto (tabindex -1)');
    ok(/<div class="modal-actions"><button id="dlgNo"><\/button><button id="dlgOk" class="primary"><\/button><\/div>/.test(html) && /justify-content: flex-end;/.test(regra('.modal-actions')),
      'botoes a direita, Cancelar antes da acao (a ordem do Tab), como nas outras janelas');
    const zs = [...css.matchAll(/([^{}]+)\{[^}]*?z-index:\s*(\d+)/g)].filter((m) => !/#dlgOverlay/.test(m[1])).map((m) => +m[2]);
    const z = +((/z-index:\s*(\d+)/.exec(regra('#dlgOverlay')) || [])[1] || 0);
    ok(z > Math.max(...zs) && /display: flex;/.test(regra('#dlgOverlay.show')), 'fundo por cima de tudo (z-index ' + z + ', o maior do resto e ' + Math.max(...zs) + ': janelas, card de IV, aviso de shiny)');
    ok(/white-space: pre-line;/.test(regra('#dlgTxt')) && /width: 420px;/.test(regra('#dlgBox')) && /background: var\(--sf\)/.test(regra('#dlgBox')) && /var\(--bd2\)/.test(regra('#dlgBox')),
      'caixa de 420 px no tema das janelas (--sf, borda --bd2) e o texto mantem as quebras de linha');
    const pr = regra('#dlgOk.perigo');
    ok(/var\(--er-bg\)/.test(pr) && /var\(--er-bd\)/.test(pr) && /var\(--er-tx\)/.test(pr), 'perigo: o botao no vermelho de erro (--er-bg, --er-bd, --er-tx), diferente do vermelho cheio do principal');
  });

  await secao('pgConfirma e pgAviso: verbo no botao, foco inicial, Enter so pelo botao, Esc e fundo cancelam, Tab fica dentro, foco volta', async () => {
    const H = monta(); await vezes(3);
    const T = tr(H), conf = H.pgConfirma || (async () => null), avisa = H.pgAviso || (async () => null);
    const quem = new H.El('button'); H.document.activeElement = quem;
    let r = 'pendente'; conf({ titulo: 'Fazer X?', texto: 'linha 1\nlinha 2 <b>', ok: 'Fazer X' }).then((v) => { r = v; });
    const d = dialogo(H);
    ok(pede(d, T, 'Fazer X?', 'Fazer X', false) && d.html === 'linha 1\nlinha 2 &lt;b&gt;' && H.byId('dlgOk').classList.contains('primary') && H.byId('dlgBox').getAttribute('aria-labelledby') === 'dlgTit',
      'abre na hora: titulo, texto (quebra de linha mantida, HTML escapado), Cancelar e o verbo no botao principal; foco no verbo (' + mostra(d) + ')');
    const t1 = tecla(H, 'Tab'), f1 = H.document.activeElement === H.byId('dlgNo'), t2 = tecla(H, 'Tab'), f2 = H.document.activeElement === H.byId('dlgOk');
    const t3 = tecla(H, 'Tab', { shiftKey: true }), f3 = H.document.activeElement === H.byId('dlgNo');
    ok(!!d && f1 && f2 && f3 && t1.impediu && t2.impediu && t3.impediu, 'Tab e Shift+Tab giram entre os dois botoes sem sair do dialogo');
    const en = tecla(H, 'Enter'), let1 = tecla(H, 'r'); await vezes(2);
    ok(!!d && !!dialogo(H) && r === 'pendente' && !en.impediu && en.parou && let1.parou, 'Enter nao e atalho: com o foco no Cancelar nada confirma (so o clique do proprio botao responde); nenhuma tecla passa do dialogo (R, F2, Esc do card de IV)');
    const rep = tecla(H, 'Enter', { repeat: true });
    ok(!!d && rep.impediu === 1, 'Enter segurado (repeticao) nao vira clique no botao em foco');
    H.byId('dlgOk').onclick && H.byId('dlgOk').onclick({ detail: 2 }); await vezes(2);
    ok(!!d && !!dialogo(H) && r === 'pendente', 'o 2o clique de um clique duplo nao responde (o dialogo acabou de abrir debaixo do mouse)');
    responde(H, true); await vezes(2);
    ok(r === true && !dialogo(H) && H.document.activeElement === quem, 'o verbo confirma (true), o dialogo fecha e o foco volta pra quem abriu');

    const quem2 = new H.El('button'); H.document.activeElement = quem2;
    r = 'pendente'; conf({ titulo: 'Y?', ok: 'Fazer Y' }).then((v) => { r = v; });
    const esc = tecla(H, 'Escape'); await vezes(2);
    ok(r === false && esc.impediu && esc.parou && !dialogo(H) && H.document.activeElement === quem2, 'Esc cancela (false) sem chegar no Esc do card de IV / painel expandido, e o foco volta');
    r = 'pendente'; conf({ titulo: 'Z?', ok: 'Fazer Z' }).then((v) => { r = v; });
    const ov = H.byId('dlgOverlay');
    if (ov.onclick) { ov.onclick({ target: H.byId('dlgBox') }); ov.onclick({ target: ov, detail: 2 }); }
    await vezes(2); const aberto = !!dialogo(H);
    if (ov.onclick) ov.onclick({ target: ov }); await vezes(2);
    ok(aberto && r === false && !dialogo(H), 'clique no fundo cancela; clique dentro da caixa (ou o 2o de um clique duplo) nao');
    // apertar o fundo nao pode levar o foco pro body (o 2o clique de um duplo fica com o dialogo aberto e o Esc/Tab nao chegavam)
    const md = (alvo) => { let n = 0; if (ov.onmousedown) ov.onmousedown({ target: alvo, preventDefault() { n++; } }); return n; };
    ok(md(ov) === 1 && md(H.byId('dlgBox')) === 0, 'apertar o fundo nao tira o foco do dialogo; dentro da caixa o mouse segue normal (selecionar texto)');

    r = 'pendente'; conf({ titulo: 'Apagar?', ok: 'Apagar tudo', perigo: true }).then((v) => { r = v; });
    const dp = dialogo(H), desc = H.byId('dlgBox').getAttribute('aria-describedby');
    H.document.activeElement && H.document.activeElement.click(); await vezes(2); // Enter no botao em foco = o clique dele
    ok(pede(dp, T, 'Apagar?', 'Apagar tudo', true) && dp.txt === '' && desc === '' && r === false, 'perigo: botao vermelho e foco no Cancelar (Enter ali cancela); sem texto, o corpo some e nada o descreve (' + mostra(dp) + ')');

    let ra = 'pendente'; avisa('Pronto.\nSegunda linha').then((v) => { ra = v; });
    const da = dialogo(H), lab = H.byId('dlgBox').getAttribute('aria-labelledby');
    tecla(H, 'Tab'); const fica = H.document.activeElement === H.byId('dlgOk');
    responde(H, true); await vezes(2);
    ok(aviso(da, T, 'Pronto.\nSegunda linha') && da.tit === '' && lab === 'dlgTxt' && fica && ra === undefined && !dialogo(H), 'pgAviso: so o "' + T('dlgEntendi') + '", o texto rotula o dialogo, Tab fica no botao e a promessa resolve vazia (' + mostra(da) + ')');
    avisa('Abra {ico} Opcoes', { ico: 'menu' });
    const di = dialogo(H); responde(H, true);
    ok(!!di && di.html === 'Abra ' + H.ico('menu') + ' Opcoes' && !H.nativos.length, '{ico} no texto vira o icone do app (o botao citado tem icone, nao glifo); nenhum dialogo nativo');
  });

  await secao('um dialogo por vez: o seguinte espera na fila e cada resposta vai pro seu', async () => {
    const H = monta(); await vezes(3);
    const conf = H.pgConfirma || (async () => null), avisa = H.pgAviso || (async () => null);
    const quem = new H.El('button'); H.document.activeElement = quem;
    const res = [];
    conf({ titulo: 'A?', ok: 'A' }).then((v) => res.push('A=' + v));
    avisa('B').then((v) => res.push('B=' + v));
    conf({ titulo: 'C?', ok: 'C', perigo: true }).then((v) => res.push('C=' + v));
    const d1 = dialogo(H); responde(H, true); await vezes(2);
    const d2 = dialogo(H); responde(H, true); await vezes(2);
    const d3 = dialogo(H); responde(H, false); await vezes(2);
    ok(!!d1 && d1.ok === 'A' && !!d2 && d2.txt === 'B' && d2.no === null && !!d3 && d3.ok === 'C' && d3.foco === 'cancelar' && !dialogo(H) && res.join() === 'A=true,B=undefined,C=false' && H.document.activeElement === quem,
      'tres pedidos juntos: um na tela por vez, na ordem, cada resposta pro seu (' + res.join(' ') + ') e no fim o foco volta pra quem abriu o primeiro');
  });

  await secao('Zerar (⟲ do Resumo e do Simples): um clique abre, "Zerar sessão" zera, Cancelar e Esc nao', async () => {
    let H = null; const zerou = [];
    H = monta({ exec: (c, wv) => { if (c.includes('analyzer-clear')) zerou.push(H.webviews.indexOf(wv)); return Promise.resolve(null); } }); await vezes(3);
    const T = tr(H), bt = H.statsEl.querySelector('.st-reset');
    H.document.activeElement = bt;
    bt.onclick(); await vezes(2);
    const d = dialogo(H);
    ok(pede(d, T, T('resetT'), T('dlgZerar'), true) && d.txt === T('resetConfirm'), 'um clique no ⟲ abre o dialogo: destrutivo, foco no Cancelar (' + mostra(d) + ')');
    responde(H, false); await vezes(4);
    ok(!!d && !dialogo(H) && !zerou.length && H.document.activeElement === bt, 'Cancelar: nada zera e o foco volta pro ⟲');
    bt.onclick(); await vezes(2); const de = dialogo(H); tecla(H, 'Escape'); await vezes(4);
    ok(!!de && !dialogo(H) && !zerou.length, 'Esc tambem cancela');
    bt.onclick(); await vezes(2); const d2 = dialogo(H); responde(H, true); await ate(() => zerou.length >= 4);
    ok(!!d2 && zerou.sort().join() === '0,1,2,3', 'um clique no ⟲ e um no "' + T('dlgZerar') + '" zeram os 4 paineis (' + zerou.join() + ')');
    zerou.length = 0; H.cardsSet(true); await corre(H.refreshCards(true), 1500);
    const rb = H.cardsEl.querySelector('#cdReset');
    if (rb.onclick) rb.onclick(); await vezes(2);
    const d3 = dialogo(H); responde(H, true); await ate(() => zerou.length >= 4);
    ok(pede(d3, T, T('resetT'), T('dlgZerar'), true) && zerou.length === 4 && !H.nativos.length, 'o ⟲ Zerar do Simples abre o mesmo dialogo e zera os 4 (' + mostra(d3) + ')');
  });

  await secao('Treinadores: limpar dados do jogo (🧹) pergunta com o nome da conta e avisa o resultado; senha que nao grava avisa', async () => {
    let H = monta(); await vezes(3);
    const T = tr(H), nome = T('trainer') + ' 2';
    H.byId('accounts').onclick();
    const wipe = (H.byId('accRows').children[1] || new H.El('div')).querySelector('.acc-wipe');
    H.document.activeElement = wipe;
    if (wipe.onclick) wipe.onclick(); await vezes(2);
    let d = dialogo(H);
    ok(pede(d, T, T('accWipeT').replace('{n}', nome), T('dlgLimpar'), true) && d.txt === T('accWipeConfirm'), 'pergunta destrutiva com o nome da conta no titulo (' + mostra(d) + ')');
    responde(H, false); await vezes(3);
    ok(!!d && !H.reg.limpou.length && !dialogo(H) && H.document.activeElement === wipe && !H.webviews[1].recarregou, 'Cancelar: nada e limpo, o foco volta pra vassoura');
    if (wipe.onclick) wipe.onclick(); await vezes(2); responde(H, true); await ate(() => dialogo(H));
    d = dialogo(H);
    ok(H.reg.limpou.join() === '1' && H.webviews[1].recarregou === 1 && aviso(d, T, T('accWipeOk')), '"' + T('dlgLimpar') + '": limpa a conta 2, recarrega o painel dela e avisa (' + mostra(d) + ')');
    responde(H, true);
    H = monta({ api: { clearAccount: async () => false } }); await vezes(3);
    H.byId('accounts').onclick();
    const w2 = (H.byId('accRows').children[0] || new H.El('div')).querySelector('.acc-wipe');
    if (w2.onclick) w2.onclick(); await vezes(2); responde(H, true); await ate(() => dialogo(H));
    d = dialogo(H);
    ok(aviso(d, T, T('accWipeErr')) && !H.webviews[0].recarregou, 'nao conseguiu limpar: avisa o erro e nao recarrega (' + mostra(d) + ')');
    responde(H, true);
    H = monta({ api: { saveCreds: async () => false } }); await vezes(3);
    H.byId('accounts').onclick(); await (H.byId('accSave').onclick ? H.byId('accSave').onclick() : null); await vezes(2);
    d = dialogo(H);
    ok(aviso(d, T, T('accSaveErr').replace('{ico}', '')) && d.html.includes(H.ico('menu')) && !/[☰{}]/.test(d.html.replace(H.ico('menu'), '')) && H.byId('overlay').classList.contains('show') && !H.nativos.length,
      'senha que nao gravou: aviso com o icone do menu Opcoes no lugar do ☰, e a janela de Treinadores fica aberta');
  });

  await secao('Importar config: arquivo ruim avisa; confirmar importa, Cancelar nao; sem a copia de seguranca pergunta de novo (destrutivo)', async () => {
    const prepara = async (api) => {
      const H = monta({ api }); await vezes(3);
      H.importa = async (texto) => { H.byId('bkImp').onclick(); const inp = H.criados.filter((e) => e.tagName === 'INPUT').pop(); inp.files = [{ texto }]; if (inp.onchange) inp.onchange(); await vezes(3); };
      return H;
    };
    let H = await prepara(); const T = tr(H);
    await H.importa('{x'); const b1 = dialogo(H); responde(H, true);
    await H.importa('[1,2]'); const b2 = dialogo(H); responde(H, true);
    ok(aviso(b1, T, T('bkBad')) && aviso(b2, T, T('bkBad')), 'nao e JSON, ou e uma lista: "' + T('bkBad') + '" no dialogo do app');
    await H.importa('{"tema":"azul"}');
    let d = dialogo(H);
    ok(pede(d, T, T('bkT'), T('dlgImportar'), false) && d.txt === T('bkConfirm'), 'arquivo bom: pergunta com o verbo "' + T('dlgImportar') + '" (' + mostra(d) + ')');
    responde(H, false); await vezes(3);
    ok(!!d && !H.store.has('tema') && !H.reg.recargas && !H.reg.backups, 'Cancelar: nada muda, nem a copia de seguranca e feita');
    await H.importa('{"tema":"azul"}'); const dc = dialogo(H); responde(H, true); await ate(() => H.reg.recargas);
    ok(pede(dc, T, T('bkT'), T('dlgImportar'), false) && H.store.get('tema') === 'azul' && H.reg.recargas === 1 && H.reg.backups === 1, '"' + T('dlgImportar') + '": guarda a copia do estado atual, grava o arquivo e recarrega');
    H = await prepara({ saveBackup: async () => false });
    await H.importa('{"tema":"verde"}'); responde(H, true); await ate(() => dialogo(H));
    d = dialogo(H);
    ok(pede(d, T, T('bkNoCopyT'), T('dlgImportarMesmo'), true) && d.txt === T('bkNoCopy'), 'a copia falhou: segunda pergunta, destrutiva, foco no Cancelar (' + mostra(d) + ')');
    responde(H, false); await vezes(3);
    ok(!!d && !H.store.has('tema') && !H.reg.recargas, 'Cancelar: o arquivo nao entra');
    await H.importa('{"tema":"verde"}'); responde(H, true); await ate(() => dialogo(H)); const dm = dialogo(H); responde(H, true); await ate(() => H.reg.recargas);
    ok(pede(dm, T, T('bkNoCopyT'), T('dlgImportarMesmo'), true) && H.store.get('tema') === 'verde' && H.reg.recargas === 1 && !H.nativos.length, '"' + T('dlgImportarMesmo') + '": grava e recarrega');
  });

  await secao('comprar pokebolas (engrenagem do Resumo): pergunta com o verbo "Comprar"; Cancelar nao compra', async () => {
    let H = null; const comprou = [];
    H = monta({ exec: (c) => {
      if (c.includes('o.balls=bm.catalog')) return Promise.resolve({ items: [{ id: 1, name: 'Potion' }], balls: [{ id: 4, name: 'Ultra Ball', p: 200 }] });
      if (c.includes('/api/game/balls/buy')) { comprou.push(c); return Promise.resolve({ st: 200, gold: 1 }); }
      return Promise.resolve(null);
    } }); await vezes(3);
    const T = tr(H);
    H.stCache[0] = { t: Date.now(), d: { ok: true, gold: 5000000 } };
    await corre(H.renderSettings(), 1500); await vezes(6);
    const cfg = H.statsEl.querySelector('.st-cfg'), sel = cfg.querySelector('#cfgBallSel'), b1 = cfg.querySelector('#cfgBallB1');
    sel.options = [{ value: '4', dataset: { p: '200' }, textContent: 'Ultra Ball · 200g' }]; sel.selectedIndex = 0;
    if (b1.onclick) b1.onclick(); await vezes(2);
    const d = dialogo(H);
    ok(pede(d, T, T('cfgBallsT').replace('{q}', '1.000').replace('{b}', 'Ultra Ball'), T('dlgComprar'), false) && d.txt.includes('200.000') && d.txt.includes('5.000.000') && d.txt.includes(T('trainer') + ' 1'),
      'titulo com quantidade e bola, texto com o custo, a conta e o gold dela (' + mostra(d) + ' / ' + (d ? d.txt : '') + ')');
    responde(H, false); await vezes(3);
    ok(!!d && !comprou.length, 'Cancelar: nao compra');
    if (b1.onclick) b1.onclick(); await vezes(2); const dc = dialogo(H); responde(H, true); await ate(() => comprou.length);
    ok(pede(dc, T, T('cfgBallsT').replace('{q}', '1.000').replace('{b}', 'Ultra Ball'), T('dlgComprar'), false) && comprou.length === 1 && /ballId:4,qty:1000/.test(comprou[0]) && !H.nativos.length, '"' + T('dlgComprar') + '": manda a compra de 1.000 Ultra Ball na conta do painel');
  });

  await secao('Scripts: confianca nos 3 jeitos de adicionar (link, colar, soltar), falha e arquivo errado avisam', async () => {
    const baixou = [];
    let H = monta({ api: { fetchUserScript: async (u) => { baixou.push(u); return { ok: true, url: u, code: '// ==UserScript==\n// @name Contador\n// ==/UserScript==\n1' }; } } }); await vezes(3);
    const T = tr(H), conf = (d) => pede(d, T, T('scTrustT'), T('dlgAdicionar'), false) && d.txt === T('scTrust');
    const btn = H.byId('scAddUrl'); H.byId('scUrl').value = URL1;
    btn.onclick({ target: btn }); await vezes(2);
    let d = dialogo(H);
    ok(conf(d), 'link do GitHub: pergunta de confianca com o verbo "' + T('dlgAdicionar') + '" (' + mostra(d) + ')');
    responde(H, false); await vezes(3);
    ok(!!d && !baixou.length && !H.userScripts.length, 'Cancelar: nem baixa');
    btn.onclick({ target: btn }); await vezes(2); const dc = dialogo(H); responde(H, true); await ate(() => H.userScripts.length);
    ok(conf(dc) && baixou.length === 1 && (H.userScripts[0] || {}).name === 'Contador' && H.scriptsOn[(H.userScripts[0] || {}).id] === true, '"' + T('dlgAdicionar') + '": baixa e instala ligado');
    for (const [resp, txt] of [[{ ok: false, error: 'Link invalido.' }, 'Link invalido.'], [null, T('scFalhou')]]) {
      H = monta({ api: { fetchUserScript: async () => resp } }); await vezes(3);
      const b = H.byId('scAddUrl'); H.byId('scUrl').value = URL1; b.onclick({ target: b }); await vezes(2); const dc = dialogo(H); responde(H, true); await ate(() => dialogo(H));
      d = dialogo(H);
      ok(conf(dc) && aviso(d, T, txt) && !H.userScripts.length, 'download falhou: avisa "' + txt + '" e nao instala');
      responde(H, true);
    }
    H = monta(); await vezes(3);
    H.byId('scName').value = 'Meu'; H.byId('scCode').value = 'console.log(1)';
    H.byId('scAdd').onclick(); await vezes(2);
    d = dialogo(H); responde(H, false); await vezes(3);
    ok(conf(d) && !H.userScripts.length && H.byId('scName').value === 'Meu', 'colar codigo: mesma pergunta; Cancelar nao instala e o que foi digitado fica');
    H.byId('scAdd').onclick(); await vezes(2); const dp = dialogo(H); responde(H, true); await vezes(3);
    ok(conf(dp) && (H.userScripts[0] || {}).name === 'Meu' && H.byId('scName').value === '' && H.byId('scCode').value === '', 'confirmar: instala e limpa os campos');
    H = monta(); await vezes(3);
    H.byId('scName').value = 'Grande'; H.byId('scCode').value = 'x'.repeat(4.5 * 1024 * 1024);
    H.byId('scAdd').onclick(); await vezes(2); const dg = dialogo(H); responde(H, true); await vezes(3);
    d = dialogo(H);
    ok(conf(dg) && aviso(d, T, T('scGrande')) && !H.userScripts.length, 'passou de 4 MB somados: avisa e o script nao fica (' + mostra(d) + ')');
    responde(H, true);
    H = monta(); await vezes(3);
    H.byId('scOverlay').classList.add('show');
    const solta = (files) => Promise.all((H.docEv.drop || []).map((f) => f({ dataTransfer: { types: ['Files'], files }, preventDefault() {} })));
    const arq = (name, size, texto) => ({ name, size, text: texto === null ? async () => { throw new Error('x'); } : async () => texto });
    const avisos = [];
    for (const [fs2, txt] of [[[arq('a.user.js', 9, 'a'), arq('b.user.js', 9, 'b')], T('scSoUser')], [[arq('a.js', 9, 'a')], T('scSoUser')], [[arq('a.user.js', 3 * 1024 * 1024, 'a')], T('scGrande')], [[arq('a.user.js', 9, null)], T('scFalhou')]]) {
      await solta(fs2); await vezes(2); const dd = dialogo(H); avisos.push(aviso(dd, T, txt)); responde(H, true);
    }
    ok(avisos.length === 4 && avisos.every(Boolean) && !H.userScripts.length, 'soltar 2 arquivos, um .js qualquer, um de 3 MB ou um que nao le: cada um avisa no dialogo do app (' + avisos.join() + ')');
    await solta([arq('Coletor.user.js', 9, 'console.log(3)')]); await ate(() => dialogo(H));
    d = dialogo(H); responde(H, false); await vezes(3);
    ok(conf(d) && !H.userScripts.length, 'soltar .user.js: a mesma pergunta de confianca; Cancelar nao instala');
    await solta([arq('Coletor.user.js', 9, 'console.log(3)')]); await ate(() => dialogo(H)); const ds = dialogo(H); responde(H, true); await ate(() => H.userScripts.length);
    ok(conf(ds) && (H.userScripts[0] || {}).name === 'Coletor' && !H.nativos.length, 'confirmar: instala com o nome do arquivo');
  });

  await secao('Scripts: desligar, remover e atualizar avisam que recarrega; Cancelar volta como estava', async () => {
    let H = monta(S1(true)); await vezes(3);
    const T = tr(H);
    H.renderScriptsList();
    const [chk] = H.byId('scList').querySelectorAll('.sc-chk input');
    if (!chk) { ok(false, 'a lista de scripts nao desenhou a caixa de ligar'); return; }
    chk.checked = false; chk.onchange(); await vezes(2);
    let d = dialogo(H);
    ok(pede(d, T, T('scDesligarT').replace('{n}', 'Auto Berry'), T('dlgDesligar'), false) && d.txt === T('scReloadAviso'), 'desmarcar script ligado: avisa que recarrega, com o nome no titulo (' + mostra(d) + ')');
    responde(H, false); await vezes(3);
    ok(!!d && chk.checked === true && H.scriptsOn.u1 === true && H.webviews.every((w) => !w.recarregou), 'Cancelar: a caixa volta marcada, o script segue ligado e nada recarrega');
    chk.checked = false; chk.onchange(); await vezes(2); const dc = dialogo(H); responde(H, true); await vezes(3);
    ok(pede(dc, T, T('scDesligarT').replace('{n}', 'Auto Berry'), T('dlgDesligar'), false) && H.scriptsOn.u1 === false && JSON.parse(H.store.get('scriptsOn')).u1 === false && H.webviews.every((w) => w.recarregou === 1), '"' + T('dlgDesligar') + '": desliga, grava e recarrega os paineis ligados');

    H = monta(S1(true)); await vezes(3);
    H.renderScriptsList();
    const [del] = H.byId('scList').querySelectorAll('.sc-del');
    H.document.activeElement = del;
    del.onclick(); await vezes(2);
    d = dialogo(H);
    ok(pede(d, T, T('scRemover').replace('{n}', 'Auto Berry'), T('dlgRemover'), true) && d.txt === T('scReloadAviso'), 'remover script ligado: destrutivo (foco no Cancelar) e avisa que recarrega (' + mostra(d) + ')');
    const ov = H.byId('dlgOverlay'); if (ov.onclick) ov.onclick({ target: ov }); await vezes(3);
    ok(!!d && !dialogo(H) && H.userScripts.length === 1 && H.webviews.every((w) => !w.recarregou) && H.document.activeElement === del, 'clique no fundo cancela: o script fica e o foco volta pro botao');
    del.onclick(); await vezes(2); const dr = dialogo(H); responde(H, true); await vezes(3);
    ok(pede(dr, T, T('scRemover').replace('{n}', 'Auto Berry'), T('dlgRemover'), true) && !H.userScripts.length && !JSON.parse(H.store.get('userScripts')).length && H.webviews.every((w) => w.recarregou === 1), '"' + T('dlgRemover') + '": sai da lista e do disco, e os paineis recarregam');
    H = monta(S1(false)); await vezes(3);
    H.renderScriptsList();
    const [del2] = H.byId('scList').querySelectorAll('.sc-del');
    del2.onclick(); await vezes(2); d = dialogo(H); responde(H, true); await vezes(3);
    ok(pede(d, T, T('scRemover').replace('{n}', 'Auto Berry'), T('dlgRemover'), true) && d.txt === '' && !H.userScripts.length && H.webviews.every((w) => !w.recarregou), 'script desligado: so o titulo, sem aviso de recarregar, e nada recarrega');

    let novo = '// ==UserScript==\n// @version 2\n// ==/UserScript==\nconsole.log(2)';
    const api = { fetchUserScript: async () => ({ ok: true, url: URL1, code: novo }) };
    H = monta(S1(true, api)); await vezes(3);
    let p = H.atualizaScript('u1'); await ate(() => dialogo(H));
    d = dialogo(H);
    ok(!!d && d.tit === T('scReloadT') && d.ok === T('dlgRecarregar') && d.no === T('dlgAgoraNao') && d.foco === 'ok' && !d.perigo && d.txt === T('scReloadAviso'),
      'versao nova de script ligado: pergunta antes de recarregar, com "' + T('dlgAgoraNao') + '" no lugar do Cancelar (' + mostra(d) + ')');
    responde(H, false); await corre(p, 1500);
    d = dialogo(H);
    ok(aviso(d, T, T('scAtualizado') + ' v2\n' + T('scValeNoReload').replace('{ico}', '')) && d.html.includes(H.ico('atualizar')) && H.webviews.every((w) => !w.recarregou),
      '"' + T('dlgAgoraNao') + '": nada recarrega e o aviso diz, numa linha so, que a versao nova entra no proximo reload (com o icone do Atualizar tudo)');
    responde(H, true);
    novo = novo.replace('@version 2', '@version 3');
    p = H.atualizaScript('u1'); await ate(() => dialogo(H)); const du = dialogo(H); responde(H, true); await corre(p, 1500);
    d = dialogo(H);
    ok(!!du && du.ok === T('dlgRecarregar') && aviso(d, T, T('scAtualizado') + ' v3') && H.webviews.every((w) => w.recarregou === 1), '"' + T('dlgRecarregar') + '": recarrega os paineis e o aviso so diz que atualizou');
    responde(H, true);
    p = H.atualizaScript('u1'); await corre(p, 1500); await vezes(2);
    d = dialogo(H);
    ok(aviso(d, T, T('scJaAtual')) && H.webviews.every((w) => w.recarregou === 1), 'mesma versao: so avisa que ja esta em dia, sem perguntar nem recarregar');
    responde(H, true);
    H = monta(S1(true, { fetchUserScript: async () => ({ ok: false, error: 'GitHub respondeu HTTP 404' }) })); await vezes(3);
    await corre(H.atualizaScript('u1'), 1500); await vezes(2);
    d = dialogo(H);
    ok(aviso(d, T, 'GitHub respondeu HTTP 404') && H.userScripts[0].code === '// v1' && !H.nativos.length, 'atualizar falhou: avisa o motivo e o script fica o de antes');
  });

  await secao('i18n: verbos e titulos nos 3 idiomas, sem travessao nem glifo; texto que cita botao desenha o icone; nada de "\\n" na tela', async () => {
    const H = monta(); await vezes(2);
    const novos = ['dlgEntendi', 'dlgZerar', 'dlgLimpar', 'dlgImportar', 'dlgImportarMesmo', 'dlgComprar', 'dlgAdicionar', 'dlgRecarregar', 'dlgAgoraNao', 'dlgDesligar', 'dlgRemover',
      'resetT', 'accWipeT', 'bkT', 'bkNoCopyT', 'cfgBallsT', 'scTrustT', 'scReloadT', 'scDesligarT'];
    const textos = ['resetConfirm', 'accWipeConfirm', 'accWipeOk', 'accWipeErr', 'bkConfirm', 'bkNoCopy', 'bkBad', 'cfgBallsConfirm', 'scTrust', 'scReloadAviso', 'scRemover', 'scGrande', 'scFalhou', 'scAtualizado', 'scJaAtual', 'scSoUser'];
    const ruins = [];
    for (const k of novos.concat(textos)) for (const L of ['pt', 'en', 'es']) { const v = H.I18N[L][k]; if (typeof v !== 'string' || !v || /—/.test(v) || GLIFO.test(v)) ruins.push(L + '.' + k); }
    ok(!ruins.length, novos.length + ' chaves novas e ' + textos.length + ' textos dos dialogos x 3 idiomas, sem travessao nem glifo' + (ruins.length ? ': ' + ruins.slice(0, 6).join(', ') : ''));
    const verbos = novos.filter((k) => k.startsWith('dlg')).map((k) => H.I18N.pt[k]);
    ok(['Zerar sessão', 'Remover script', 'Adicionar script', 'Recarregar painéis', 'Importar e substituir', 'Comprar', 'Entendi'].every((v) => verbos.includes(v)) && !verbos.some((v) => /^(ok|sim|confirmar|cancelar)$/i.test(v || '')),
      'o botao diz a acao (' + verbos.join(', ') + '), nunca OK/Sim');
    const barra = [];
    for (const L of ['pt', 'en', 'es']) for (const [k, v] of Object.entries(H.I18N[L])) if (typeof v === 'string' && v.includes('\\n')) barra.push(L + '.' + k);
    ok(!barra.length, 'nenhum texto com "\\n" literal: no confirm nativo a barra e o n apareciam na tela (accWipeConfirm, scTrust, cfgBallsConfirm)' + (barra.length ? ': ' + barra.join(', ') : ''));
    const ruins2 = [];
    for (const k of ['accSaveErr', 'scValeNoReload']) for (const L of ['pt', 'en', 'es']) { const v = H.I18N[L][k]; if (typeof v !== 'string' || (v.match(/\{ico\}/g) || []).length !== 1 || GLIFO.test(v)) ruins2.push(L + '.' + k); }
    ok(!ruins2.length, 'avisos que citam o ☰ Opcoes e o ⟳ Atualizar tudo trazem {ico} no lugar do glifo (o dialogo desenha o icone)' + (ruins2.length ? ': ' + ruins2.join(', ') : ''));
    ok(/\(\{ico\} Recargar todo\)/.test(H.I18N.es.scValeNoReload || '') && H.I18N.es.reloadAll === 'Recargar todo', 'em espanhol o aviso cita o botao pelo nome que ele tem na tela ("Recargar todo", nao "Actualizar todo")');
  });

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})();
