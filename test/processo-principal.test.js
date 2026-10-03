// Processo principal: o main.js REAL com um Electron de mentira (no molde do boot.test.js e do gpu-sandbox.test.js).
// Janela principal (que le as senhas): navegacao, links pra fora, permissoes, queda da interface e rede de seguranca.
// E mais: backups com nome hostil, permissoes dos paineis e o watchdog que recarrega painel caido.
// Roda com: node test/processo-principal.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const MAIN = path.join(RAIZ, 'main.js');
let falhas = 0;
const ok = (c, l) => { console.log((c ? 'ok   ' : 'FALHA ') + l); if (!c) falhas++; };
process.setMaxListeners(0); // cada abertura do main.js registra os seus uncaughtException/unhandledRejection
process.on('uncaughtException', (e) => { console.log('FALHA excecao no teste: ' + ((e && e.stack) || e)); process.exit(1); });

// relogio e timers de mentira (o teste nao espera nada de verdade): setTimeout guarda funcao e atraso, clearTimeout cancela
let agora = Date.parse('2026-10-03T12:00:00Z');
Date.now = () => agora;
let R; // o que o main.js fez nesta abertura
global.setTimeout = (fn, ms) => { R.timers.set(++R.seq, { fn, ms }); return R.seq; };
global.clearTimeout = (id) => { R.timers.delete(id); };
const novosTimers = (desde) => [...R.timers.entries()].filter(([id]) => id > desde);
const roda = (lista) => lista.forEach(([id, t]) => { R.timers.delete(id); t.fn(); });

const URL_INTERFACE = 'file:///' + path.join(RAIZ, 'index.html').replace(/\\/g, '/');
const eventos = (alvo) => ({ on: (n, fn) => { (alvo[n] = alvo[n] || []).push(fn); }, once: (n, fn) => { (alvo[n] = alvo[n] || []).push(fn); } });
const dispara = (fns, ...a) => (fns || []).forEach((f) => f(...a));
function janela() {
  // como no Electron 43 no Windows: isVisible() e falso com a janela minimizada
  const w = { ev: {}, st: { vis: false, min: false }, mostras: 0 };
  Object.assign(w, eventos(w.ev), {
    loadFile: () => Promise.resolve(), show() { w.st.vis = true; w.st.min = false; w.mostras++; }, hide() { w.st.vis = false; },
    minimize() { w.st.min = true; }, maximize() { w.st.min = false; }, isVisible: () => w.st.vis && !w.st.min,
    isMinimized: () => w.st.min, isMaximized: () => false, isDestroyed: () => false
  });
  const wc = { ev: {}, recargas: 0 };
  Object.assign(wc, eventos(wc.ev), {
    send() {}, setWindowOpenHandler(fn) { wc.abrir = fn; }, isDestroyed: () => false, getURL: () => URL_INTERFACE, reload() { wc.recargas++; }
  });
  w.webContents = wc;
  R.janelas.push(w);
  return w;
}
const sessao = (nome) => { const s = { setPermissionRequestHandler(fn) { s.pedido = fn; }, setPermissionCheckHandler(fn) { s.checa = fn; } }; R.sessoes[nome] = s; return s; };
const eletron = {
  app: {
    on: (n, fn) => { (R.app[n] = R.app[n] || []).push(fn); }, once: (n, fn) => { (R.app[n] = R.app[n] || []).push(fn); },
    whenReady: () => ({ then(cb) { cb(); } }), quit() {}, exit() {}, relaunch() {}, focus() {}, setAppUserModelId() {},
    getPath: () => R.tmp, getVersion: () => '9.9.9', getAppPath: () => RAIZ, isPackaged: true, requestSingleInstanceLock: () => true,
    userAgentFallback: 'Mozilla/5.0 Chrome/150.0.0.0 Electron/43.7.7 Safari/537.36', commandLine: { appendSwitch() {} },
    setLoginItemSettings() {}, getLoginItemSettings: () => ({ launchItems: [] })
  },
  BrowserWindow: Object.assign(function () { return janela(); }, { getAllWindows: () => R.janelas }),
  ipcMain: { handle: (c, fn) => { R.ipc[c] = fn; }, on() {} },
  shell: { openExternal: (u) => { R.fora.push(u); return Promise.resolve(); }, showItemInFolder() {}, writeShortcutLink: () => true, readShortcutLink: () => ({ target: '' }) },
  session: { get defaultSession() { return sessao('padrao'); }, fromPartition: (p) => sessao(p) },
  Menu: { buildFromTemplate: (t) => ({ items: t }), setApplicationMenu() {} },
  Tray: function () { return { setToolTip() {}, setContextMenu() {}, on() {} }; },
  dialog: { showMessageBox: () => Promise.resolve({ response: 1 }) },
  safeStorage: { isEncryptionAvailable: () => false },
  powerSaveBlocker: { start: () => 1, stop() {} },
  Notification: Object.assign(function () { return { show() {} }; }, { isSupported: () => false })
};
const Modulo = require('module');
const res0 = Modulo._resolveFilename;
Modulo._resolveFilename = function (p, ...x) { if (p === 'electron') return 'electron-principal'; if (p === 'https') return 'https-principal'; return res0.call(this, p, ...x); };
require.cache['electron-principal'] = { id: 'electron-principal', filename: 'electron-principal', loaded: true, exports: eletron };
require.cache['https-principal'] = { id: 'https-principal', filename: 'https-principal', loaded: true, exports: { get: () => ({ on() { return this; } }) } };

const tmps = [];
function abre() {
  R = { app: {}, janelas: [], ipc: {}, fora: [], sessoes: {}, timers: new Map(), seq: 0 };
  R.tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-principal-'));
  tmps.push(R.tmp);
  agora += 60e3; // o limite de 3 links por 10 s do main.js nao passa de uma abertura pra outra
  delete require.cache[require.resolve(MAIN)];
  require(MAIN);
  return R;
}
const relatorio = (x) => { try { return fs.readFileSync(path.join(x.tmp, 'relatorio-de-erros.log'), 'utf8'); } catch { return ''; } };

try {
  console.log('--- janela principal: nao navega e so os links fixos da interface vao pro navegador de fora ---');
  {
    const x = abre();
    const wc = x.janelas[0].webContents;
    const navega = (url) => { let barrou = false; dispara(wc.ev['will-navigate'], { preventDefault() { barrou = true; } }, url); return barrou; };
    const segredo = 'https://exfil.example/c?d=' + encodeURIComponent('[{"email":"a@b.c","pass":"senha123"}]');
    ok(navega(segredo) && !x.fora.length, 'location.href = URL com as senhas: nao navega e NAO abre no navegador padrao (antes abria a mesma URL la)');
    ok(navega('file:///C:/Users/x/AppData/Roaming/pokegrid/backups/pagina.html') && navega('file:///C:/Users/x/Downloads/arrastado.html'), 'file:// de outro arquivo tambem e barrado (backup .html, arquivo arrastado pra janela)');
    ok(!navega(URL_INTERFACE), 'recarregar a propria interface passa (o importar backup termina em location.reload, que dispara will-navigate)');
    const abre1 = (url) => { agora += 11e3; return wc.abrir({ url }); };
    ok(abre1(segredo).action === 'deny' && !x.fora.length, 'window.open(URL com as senhas): negado e nada vai pro navegador padrao');
    abre1('https://github.com/soufoka/PokeGrid-source/issues/new?body=senha123'); abre1('https://github.com/soufoka/PokeGrid-source.evil.com/');
    ok(!x.fora.length, 'nem disfarcada de link do GitHub do PokeGrid');
    const index = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    // link literal ou escolhido na hora (o selo de versao abre o instalador ou o fonte)
    const links = [...index.matchAll(/window\.open\(([^)]*)\)/g)].flatMap((m) => [...m[1].matchAll(/'(https:[^']+)'/g)].map((l) => l[1]));
    links.forEach((u) => abre1(u));
    ok(links.length >= 5 && links.every((u) => x.fora.includes(u)), 'todo window.open do index.html abre (FAQ, Manual, doacao, repositorio do aviso de versao): ' + links.length + ' links' + (links.every((u) => x.fora.includes(u)) ? '' : ' -> faltou ' + links.filter((u) => !x.fora.includes(u)).join(', ')));
    const antes = x.fora.length; agora += 11e3;
    ok(navega(links[0]) && x.fora.length === antes + 1, 'um link fixo que chegue por navegacao tambem abre fora, sem a janela sair da interface');

    console.log('--- permissoes: janela principal e paineis ---');
    const pede = (s, p) => { let r; s.pedido(null, p, (b) => { r = b; }); return r; };
    const padrao = x.sessoes.padrao;
    ok(!!padrao && !!padrao.pedido, 'a sessao padrao (janela principal) tem handler de pedido de permissao');
    ok(!!padrao && !!padrao.pedido && pede(padrao, 'clipboard-sanitized-write') === true && ['media', 'notifications', 'geolocation', 'openExternal', 'clipboard-read', 'fullscreen'].every((p) => pede(padrao, p) === false), 'janela principal: so a escrita no clipboard passa (botao de copiar o link); mic, camera, notificacao e o resto negados');
    const contas = [1, 2, 3, 4].map((i) => x.sessoes['persist:conta' + i]);
    ok(contas.every((s) => s && s.pedido && pede(s, 'clipboard-sanitized-write') === true && pede(s, 'media') === false), 'paineis: o pedido segue so com o clipboard liberado');
    ok(contas.every((s) => s && s.checa && s.checa(null, 'media') === false && s.checa(null, 'speaker-selection') === false), 'paineis: checagem de media e speaker-selection negada (o jogo e os userscripts liam os nomes de microfone, camera e alto-falante)');
    ok(contas.every((s) => s && s.checa && s.checa(null, 'clipboard-sanitized-write') === true && s.checa(null, 'notifications') === true), 'paineis: as outras checagens seguem o padrao do Electron (concedido)');

    console.log('--- backups: so .json e .csv, e a poda fica na mesma familia ---');
    const salva = (n, c = '{}') => x.ipc['backup:save'](null, n, c, '');
    const dir = path.join(x.tmp, 'backups');
    ok(salva('pagina.html', '<script>1</script>') === false && salva('x.htm') === false && salva('x.svg') === false && salva('x.log') === false && !fs.existsSync(path.join(dir, 'pagina.html')), 'backup:save recusa .html, .svg, .log: so .json e .csv');
    ok(salva('hunts-historico.csv', 'a\n') && salva('hunts-historico.csv', 'b\n') && fs.readFileSync(path.join(dir, 'hunts-historico.csv'), 'utf8') === 'a\nb\n' && salva('hunts-historico-drops.csv', 'd\n'), 'os nomes da interface continuam: o csv do historico anexa');
    for (let d = 1; d <= 14; d++) salva('config-auto-2026-09-' + String(d).padStart(2, '0') + '.json');
    salva('config-antes-de-importar-1790000000000.json');
    const familia = (p) => fs.readdirSync(dir).filter((f) => f.startsWith(p));
    ok(familia('config-auto-').length === 12 && !familia('config-auto-').includes('config-auto-2026-09-01.json'), 'poda normal: 12 config-auto, sai o mais antigo');
    for (let i = 1; i <= 12; i++) salva('zzz' + i + '.json');
    salva('0.json'); // prefixo vazio: antes a poda tratava a pasta inteira como irmaos
    for (let i = 1; i <= 12; i++) salva('hz' + i + '.json');
    salva('h1.json'); // prefixo 'h': antes pegava os hunts-historico
    const sobrou = fs.readdirSync(dir);
    ok(['hunts-historico.csv', 'hunts-historico-drops.csv', 'config-antes-de-importar-1790000000000.json'].every((f) => sobrou.includes(f)) && familia('config-auto-').length === 12,
      'nome so de digitos ou de prefixo curto + 12 de enchimento: historico de hunts e config ficam' + (sobrou.includes('hunts-historico.csv') ? '' : ' -> sobrou ' + sobrou.slice(0, 6).join(', ')));
  }

  console.log('--- a interface cai: recarrega (os paineis morrem junto), no maximo 3 vezes por hora ---');
  {
    const x = abre();
    const wc = x.janelas[0].webContents;
    const cai = (reason) => { const s = x.seq; dispara(wc.ev['render-process-gone'], {}, { reason, exitCode: -536870904 }); roda(novosTimers(s)); };
    cai('clean-exit');
    ok(wc.recargas === 0, 'saida normal (clean-exit): nada a fazer');
    cai('oom');
    ok(wc.recargas === 1 && /\[janela\] interface caiu: oom \(exit -536870904\), recarregando/.test(relatorio(x)), 'caiu por falta de memoria: recarrega e anota no relatorio (antes so anotava, e os 4 paineis ficavam mortos)');
    agora += 60e3; cai('crashed'); agora += 60e3; cai('crashed'); agora += 60e3; cai('crashed');
    ok(wc.recargas === 3 && /ja recarregou 3 vezes na ultima hora/.test(relatorio(x)), 'quarta queda na mesma hora: nao recarrega e diz no relatorio (' + wc.recargas + ' recargas)');
    agora += 3600e3; cai('crashed');
    ok(wc.recargas === 4, 'passada a hora, volta a recarregar');
  }

  console.log('--- rede de seguranca de 8 s: so age se o primeiro quadro nao vier ---');
  {
    let x = abre();
    let w = x.janelas[0];
    dispara(w.ev['ready-to-show']);
    w.minimize(); // o usuario minimiza logo depois de a janela aparecer
    const rede = (y) => [...y.timers.entries()].filter(([, t]) => /rede de seguranca/.test(String(t.fn)));
    roda(rede(x));
    ok(w.mostras === 1 && w.isMinimized(), 'a janela apareceu no ready-to-show e foi minimizada: os 8 s passam e ela fica minimizada (antes reabria e maximizava)');
    x = abre(); w = x.janelas[0];
    const r2 = rede(x); roda(r2);
    ok(r2.length === 1 && w.mostras === 1 && w.isVisible(), 'sem o ready-to-show: a rede mostra a janela');
  }

  console.log('--- painel caido: recarrega com recuo crescente, zerado quando carrega ---');
  {
    const x = abre();
    const wv = { ev: {}, recargas: 0, getType: () => 'webview', setWindowOpenHandler() {}, isDestroyed: () => false, reload() { wv.recargas++; }, hostWebContents: { send() {} } };
    Object.assign(wv, eventos(wv.ev));
    dispara(x.app['web-contents-created'], {}, wv);
    const cai = () => { const s = x.seq; dispara(wv.ev['render-process-gone'], {}, { reason: 'crashed', exitCode: 1 }); const t = novosTimers(s); roda(t); return t.map(([, v]) => v.ms)[0]; };
    const esperas = [];
    for (let i = 0; i < 8; i++) esperas.push(cai());
    ok(esperas.every((v, i) => i === 0 || v > esperas[i - 1] || v === 60000) && esperas[0] === 1500 && esperas[7] === 60000, 'quedas seguidas: espera cresce ate 1 min -> ' + esperas.map((v) => v / 1000 + 's').join(' '));
    ok(wv.recargas === 8, 'e recarrega toda vez');
    dispara(wv.ev['did-finish-load']);
    ok(cai() === 1500, 'carregou (did-finish-load): a proxima queda volta a esperar 1,5 s');
  }
} finally {
  Modulo._resolveFilename = res0;
  tmps.forEach((t) => { try { fs.rmSync(t, { recursive: true, force: true }); } catch {} });
}
console.log(falhas ? '\n' + falhas + ' falha(s)' : '\nProcesso principal: tudo certo');
process.exit(falhas ? 1 : 0);
