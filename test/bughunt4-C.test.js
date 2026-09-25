// Caca de bugs 4, lote C (25/09/2026): interface. Compra de pokebolas, secao Times & IV, card de IV, renomear painel,
// Simples congelado com foco em checkbox, filtro de conta das Capturas e textos fixos em portugues.
// Roda o <script> REAL da janela (index.html) com um DOM falso permissivo; a compra roda o JS que o app injeta no painel.
// Roda com: node test/bughunt4-C.test.js
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let code = ''; { const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) if (m[1].length > code.length) code = m[1]; }
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const secao = async (nome, fn) => { console.log('\n--- ' + nome + ' ---'); try { await fn(); } catch (e) { ok(false, 'quebrou: ' + ((e && e.stack) || e)); } };
const vez = () => new Promise((r) => setImmediate(r));

// janela do app com DOM falso: todo querySelector devolve um elemento (guardado por seletor), o foco e de verdade
function monta(opts = {}) {
  const byId = new Map(), salvos = [], prompts = [];
  let document;
  class CL { constructor() { this.s = new Set(); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; } }
  class El {
    constructor(tag, id) { this.tagName = String(tag || 'div').toUpperCase(); this.id = id || ''; this.style = { setProperty() {} }; this.classList = new CL(); this.dataset = {}; this.children = []; this._h = ''; this._t = ''; this.value = ''; this.checked = false; this.title = ''; this.options = [{}, {}]; this.childElementCount = 0; this.offsetHeight = 40; this.scrollTop = 0; this.ev = {}; }
    get innerHTML() { return this._h; } set innerHTML(h) { this._h = String(h); this.children = []; }
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
    executeJavaScript() { return Promise.resolve(null); }
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
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const window = {
    addEventListener() {}, confirm: () => true, alert() {}, open() {},
    pokeAPI: { loadCreds: async () => [], saveCreds: async (a) => { salvos.push(JSON.parse(JSON.stringify(a))); return true; }, logError() {}, notify() {}, webhook: async () => true, onHotkey() {}, onJanela() {}, onAutoStart() {}, getAutoStart: async () => ({ on: false, suportado: true }), setAwake: async () => false, setMinToTray: async () => true, saveBackup: async () => true, appVersion: '1.5.27' },
    PokeGridIvMath: require(path.join(RAIZ, 'src/domain/iv-math.js'))
  };
  const exporta = '\n;return { ivRender, tlLinha, aggCard, statsEl, refreshCards, cardsSet: (v) => { cardsOn = v; }, stCache, get cardsEl() { return cardsEl; }, t, accounts: () => accounts, defName };';
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'location', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'addEventListener', 'getComputedStyle', 'AudioContext', 'MutationObserver', 'FileReader', 'fetch', 'performance', 'prompt', code + exporta);
  const noop = () => 0;
  const api = fn(window, document, localStorage, { clipboard: { writeText: async () => {} } }, { reload() {} }, noop, noop, noop, noop, 1600, 900, noop, () => ({}), function () {}, function () { return { observe() {}, disconnect() {} }; }, function () {}, () => new Promise(() => {}), { now: () => Date.now() }, (...a) => { prompts.push(a); return null; });
  return Object.assign(api, { byId, grid, store, document, salvos, prompts });
}
const conta = (gph, extra) => Object.assign({ ok: true, cid: 'c1', name: 'Ash', level: 120, a: { seconds: 900, gph, xph: 5000, kph: 100 }, team: [], catchLog: [], usedList: [], chatShares: [], invMap: {} }, extra || {});

(async () => {
  await secao('compra de pokebolas manda o Bearer da conta (MEDIA: o servidor recusava com 401)', async () => {
    const ini = s.indexOf("\"(async()=>{try{const r=await fetch('/api/game/balls/buy'");
    ok(ini > 0, 'achei o JS da compra no index.html');
    const expr = s.slice(ini, s.indexOf('})()")', ini) + 5);
    const js = new Function('ballId', 'qtd', 'return ' + expr)(4, 1000);
    const compra = async (auth) => {
      const ped = [];
      const fetch = async (u, init) => { ped.push({ u, init }); const au = init.headers && init.headers.Authorization; return /^Bearer /.test(au || '') ? { status: 200, json: async () => ({ gold: 5 }) } : { status: 401, json: async () => ({}) }; };
      const window = { __poke: auth ? { auth } : {} };
      const r = await new Function('fetch', 'window', 'return ' + js)(fetch, window);
      return { r, ped };
    };
    const a = await compra('Bearer abc.def');
    ok(a.ped.length === 1 && a.ped[0].u === '/api/game/balls/buy' && a.ped[0].init.method === 'POST', 'POST em /api/game/balls/buy');
    ok(a.ped[0].init.headers.Authorization === 'Bearer abc.def' && a.ped[0].init.headers['Content-Type'] === 'application/json', 'leva o Authorization que o coletor guardou, junto do Content-Type (' + JSON.stringify(a.ped[0].init.headers) + ')');
    ok(JSON.parse(a.ped[0].init.body).ballId === 4 && JSON.parse(a.ped[0].init.body).qty === 1000, 'corpo {ballId, qty} igual ao do jogo');
    ok(a.r.st === 200 && a.r.gold === 5, 'com o token o servidor aceita (st ' + a.r.st + ')');
    const b = await compra(null);
    ok(b.ped.length === 1 && !('Authorization' in b.ped[0].init.headers) && b.r.st === 401, 'sem token capturado ainda: manda so o Content-Type e o app mostra o erro (st ' + b.r.st + '), sem quebrar');
  });

  await secao('secao Times & IV do Simples aparece (MEDIA: a chave e team e o construtor era SB.teams)', async () => {
    const H = monta();
    await vez();
    for (let i = 0; i < 4; i++) H.stCache[i] = { t: Date.now(), d: conta(1000, { team: [{ name: 'Scizor', level: 110, q: 1.5, ivt: 150, ld: true, t1: 'BUG', t2: 'STEEL' }] }) };
    H.cardsSet(true);
    await H.refreshCards(true);
    const h = H.cardsEl.innerHTML;
    const secs = [...h.matchAll(/class="cd-it" data-s="(\w+)"/g)].map((m) => m[1]);
    ok(secs.includes('team'), 'a secao team e desenhada (' + secs.join(',') + ')');
    ok(h.includes(H.t('cdTeams')) && h.includes('Scizor') && h.includes('150/192'), 'mostra o titulo, o pokemon do time e o IV');
    ok(h.includes('id="cdPjLv"'), 'e o campo do nivel de projecao');
    const pj = H.cardsEl.querySelector('#cdPjLv'); pj.value = '200'; pj.onchange();
    ok(H.store.get('cdPjLv') === '200', 'o nivel de projecao grava (' + H.store.get('cdPjLv') + ')');
    // acima do Lv500 (179 das 454 hunts): o campo aceita e o pokemon de nivel alto nao aparece com o poder caindo
    pj.value = '1000'; pj.onchange();
    ok(H.store.get('cdPjLv') === '1000', 'projetar no Lv1000 grava 1000, nao 500 (' + H.store.get('cdPjLv') + ')');
    await H.refreshCards(true);
    ok(/id="cdPjLv" type="number" min="1" max="(\d+)"/.exec(H.cardsEl.innerHTML)[1] >= 3000 && H.cardsEl.innerHTML.includes('value="1000"'), 'o campo vai ate a hunt mais alta do jogo (3000) e mostra 1000');
  });

  await secao('card de IV volta onde foi arrastado (baixa: a leitura exigia {x,y} e o arraste grava {l,t})', async () => {
    const H = monta({ ls: { ivCardOpen: '1', ivCardPos: JSON.stringify({ l: 120, t: 300 }) } });
    await vez();
    H.ivRender();
    const st = H.byId.get('ivCard').style;
    ok(st.left === '120px' && st.top === '300px' && st.transform === 'none', 'posicao salva aplicada ao abrir (' + st.left + ', ' + st.top + ')');
    const H2 = monta({ ls: { ivCardOpen: '1', ivCardPos: '{"l":"x","t":null}' } });
    await vez();
    H2.ivRender();
    ok(H2.byId.get('ivCard').style.left === '50%', 'valor torto no disco: centro da tela, sem quebrar');
    ok(/lsSet\('ivCardPos', JSON\.stringify\(ivPos\)\)/.test(s) && /ivPos = \{ l: ev\.clientX - dx, t: ev\.clientY - dy \}/.test(s), 'o arraste continua gravando {l,t}, o formato que a leitura aceita');
  });

  await secao('renomear o painel no proprio rotulo (baixa: prompt() nao abre nada no Electron)', async () => {
    const H = monta();
    await vez();
    const nameEl = H.grid.children[0].querySelector('.name');
    const edita = () => { nameEl.ondblclick(); return nameEl.children[nameEl.children.length - 1]; };
    let inp = edita();
    ok(H.prompts.length === 0, 'nao chama prompt()');
    ok(inp && inp.tagName === 'INPUT' && H.document.activeElement === inp && inp.maxLength === 40, 'clique duplo abre um campo focado, com limite de 40');
    inp.value = '  Farm A  ';
    let parou = false;
    inp.onkeydown({ key: 'Enter', stopPropagation() { parou = true; } });
    ok(H.accounts()[0].name === 'Farm A' && nameEl.textContent === 'Farm A' && nameEl.children.length === 0, 'Enter grava o nome (aparado) e volta a ser rotulo');
    ok(H.salvos.length === 1 && H.salvos[0][0].name === 'Farm A', 'e salva as contas');
    ok(parou, 'a tecla nao sobe pros atalhos da janela');
    inp.onblur();
    ok(H.salvos.length === 1, 'o blur depois do Enter nao salva de novo');
    inp = edita(); inp.value = 'Outro';
    let esc = false;
    inp.onkeydown({ key: 'Escape', stopPropagation() { esc = true; } });
    inp.onblur();
    ok(H.accounts()[0].name === 'Farm A' && nameEl.textContent === 'Farm A' && H.salvos.length === 1, 'Esc cancela (nem o blur que vem depois grava)');
    ok(esc, 'e o Esc nao chega no sairDoFoco (nao desexpande o painel)');
    inp = edita(); inp.value = 'x'.repeat(60); inp.onblur();
    ok(H.accounts()[0].name.length === 40, 'sair do campo grava, cortado em 40');
    inp = edita(); inp.value = '<img src=x onerror=alert(1)>'; inp.onkeydown({ key: 'Enter', stopPropagation() {} });
    ok(nameEl.textContent === '<img src=x onerror=alert(1)>' && nameEl.innerHTML === '', 'nome com HTML vira texto, nunca innerHTML');
    inp = edita(); inp.value = '   '; inp.onkeydown({ key: 'Enter', stopPropagation() {} });
    ok(H.accounts()[0].name === '' && nameEl.textContent === H.defName(0), 'vazio volta pro nome padrao (' + nameEl.textContent + ')');
    let sobe = false;
    inp = edita(); inp.ondblclick({ stopPropagation() { sobe = true; } });
    ok(sobe, 'clique duplo dentro do campo (selecionar palavra) nao abre outro campo');
  });

  await secao('Simples volta a atualizar depois de marcar alerta ou webhook na engrenagem (baixa: foco no checkbox travava o tique)', async () => {
    const H = monta();
    await vez();
    H.stCache[0] = { t: Date.now(), d: conta(1000) };
    H.cardsSet(true);
    await H.refreshCards(true);
    let g = 250;
    for (const id of ['#cdAl_shiny', '#cdWhShiny', '#cdWhSum', '#cdWhProb']) {
      const chk = H.cardsEl.querySelector(id);
      chk.tagName = 'INPUT';
      H.cardsEl.contains = (x) => x === chk || x === H.cardsEl;
      chk.focus(); chk.checked = !chk.checked; chk.onchange();
      g += 10;
      H.stCache[0] = { t: Date.now(), d: conta(g * 1000) };
      await H.refreshCards(); // tique passivo de 10 s
      ok(H.document.activeElement !== chk && H.cardsEl.innerHTML.includes('+' + g + 'K'), id + ': o handler solta o foco e o tique seguinte redesenha (gold/h +' + g + 'K)');
    }
  });

  await secao('filtro de conta das Capturas solta um painel que saiu (baixa: select dizia todas e a lista seguia filtrada)', async () => {
    const now = Date.now();
    const lc = [{ n: 'Pikachu', iv: 100, q: 1.2, t: now - 60000, p: 0, acc: 'Conta1', dot: '#c07bf5' }, { n: 'Gengar', iv: 120, q: 1.5, t: now - 30000, p: 3, acc: 'Conta4', dot: '#eda100' }];
    const H = monta({ ls: { count: '2', cdFC: JSON.stringify({ p: 3 }), lifeCatch: JSON.stringify(lc) } });
    await vez();
    H.cardsSet(true);
    await H.refreshCards(true);
    const h = H.cardsEl.innerHTML;
    const sel = h.slice(h.indexOf('<select id="cdFcP"'), h.indexOf('</select>', h.indexOf('<select id="cdFcP"')));
    ok(/<option value="-1" selected>/.test(sel), 'o select mostra todas e e isso mesmo que esta aplicado');
    ok(h.includes('Pikachu') && h.includes('Gengar'), 'a lista mostra as capturas de todas as contas');
    ok(JSON.parse(H.store.get('cdFC')).p === -1, 'e o filtro salvo volta pra todas');
    const H2 = monta({ ls: { count: '4', cdFC: JSON.stringify({ p: 3 }), lifeCatch: JSON.stringify(lc) } });
    await vez();
    H2.cardsSet(true);
    await H2.refreshCards(true);
    const h2 = H2.cardsEl.innerHTML;
    ok(/<option value="3" selected>/.test(h2) && h2.includes('Gengar') && !h2.includes('Pikachu'), 'com o painel 4 aberto o filtro da conta 4 segue valendo');
  });

  await secao('textos fixos em portugues passam pelo idioma (baixa)', async () => {
    const I18N = new Function('lsGet', code.slice(code.indexOf('  const I18N = {'), code.indexOf('\n  let lang = ')) + '\nreturn I18N;')(() => null);
    const novas = ['tlNotaTip', 'acLife', 'closeT', 'rmTitle', 'shCapT', 'shDefT', 'scHint', 'scDrop', 'scUrlPh', 'scOuCole', 'scNamePh', 'scCodePh', 'scAddBtn'];
    ok(novas.every((k) => ['pt', 'en', 'es'].every((L) => typeof I18N[L][k] === 'string' && I18N[L][k] && !/—/.test(I18N[L][k]))), 'chaves novas nos 3 idiomas, sem travessao');
    ok(['pt', 'en', 'es'].every((L) => !('promptRename' in I18N[L])), 'promptRename saiu (o prompt nao existe mais)');
    const lst = ['pt', 'en', 'es'].map((L) => Object.keys(I18N[L]).sort().join());
    ok(lst[0] === lst[1] && lst[1] === lst[2], 'os 3 idiomas tem as mesmas chaves');
    const H = monta({ ls: { lang: 'en', lifeShiny: JSON.stringify([{ n: 'Scizor', sid: 212, t: Date.now() - 5000, cap: 1, p: 0, acc: 'Ash', dot: '#c07bf5' }, { n: 'Onix', sid: 95, t: Date.now() - 9000, def: 1, p: 0, acc: 'Ash', dot: '#c07bf5' }]) } });
    await vez();
    const tl = H.tlLinha({ sp: 'scizor', tipos: ['bug', 'steel'], comp: 100, sc: 100, sg: { fis: 1, nome: 'X-Scissor', eff: 2, mg: 1.8, tm: '' }, x: { name: 'Bug Cave', level: 50 } }, 1, 100, {}, null);
    ok(tl.includes('margin ×1.8') && !tl.includes('folga'), 'tierlist em ingles: margin, como o Ditto');
    ok(tl.includes('title="100 out of 100 (the best in the tab is the 100 baseline)"'), 'tooltip da nota em ingles');
    const ag = H.aggCard('#fff', 'Ash', { ok: true, gold: 1, diamonds: 0, shinyEnc: 3, balls: 10, potions: 2, revives: 1, a: { gph: 1, xph: 1, kph: 1, captures: 1, shinyFound: 0, shinyCap: 0 } });
    ok(ag.includes('3 lifetime') && ag.includes('10 balls') && !/vida|bolas/.test(ag), 'Resumo por conta: lifetime e balls');
    const hd = H.statsEl.querySelector('.st-head');
    const tits = [hd.querySelector('.st-reset').title, hd.querySelector('.st-gear').title, hd.querySelector('.st-x').title, H.statsEl.querySelector('.st-resize').title];
    ok(tits[0] === H.t('resetTitle') && tits[1] === 'Configure the panel' && tits[2] === 'Close' && tits[3] === 'Drag to adjust the width', 'cabecalho do Resumo em ingles (' + tits.join(' | ') + ')');
    const sc = H.byId.get('scModal');
    ok(sc.querySelector('.hint').innerHTML.includes('<b>Only add scripts you trust</b>') && sc.querySelector('.sc-drop').textContent === 'Drop the .user.js file here' && sc.querySelector('.sc-add .sc-tag').textContent === 'or paste the code', 'modal de Scripts: dica, area de soltar e "ou cole" em ingles');
    ok(H.byId.get('scUrl').placeholder === 'Script link on GitHub (.user.js)' && H.byId.get('scAddUrl').textContent === '+ Add from GitHub' && H.byId.get('scName').placeholder === 'Script name' && H.byId.get('scCode').placeholder.startsWith('Paste the userscript') && H.byId.get('scAdd').textContent === '+ Add script' && H.byId.get('scClose').textContent === 'Close', 'modal de Scripts: campos e botoes em ingles desde a abertura');
    H.cardsSet(true);
    await H.refreshCards(true);
    const ch = H.cardsEl.innerHTML;
    ok(ch.includes('title="caught">✓') && ch.includes('title="defeated">✕'), 'Shinies do Simples: caught e defeated');
    ok(!/title="(Remover|capturado|derrotado)"/.test(s) && !s.includes("' vida</span>") && !s.includes("' bolas</span>") && !s.includes('folga \\u00d7'), 'nenhum desses textos fixos sobrou no index.html');
  });

  console.log(fail ? '\nFALHOU' : '\nTUDO OK');
  process.exit(fail);
})();
