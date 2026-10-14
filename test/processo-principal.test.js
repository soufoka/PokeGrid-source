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
// desde 14/10/2026 o main.js so atende o frame principal da janela (medido no Electron 43: no invoke, e.senderFrame e o e.sender.mainFrame)
const fr0 = { url: URL_INTERFACE }, EV = { sender: { getType: () => 'window', mainFrame: fr0 }, senderFrame: fr0 };
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
const sessao = (nome) => { const s = { ev: {}, setPermissionRequestHandler(fn) { s.pedido = fn; }, setPermissionCheckHandler(fn) { s.checa = fn; }, on(n, fn) { s.ev[n] = fn; } }; R.sessoes[nome] = s; return s; };
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
require.cache['https-principal'] = { id: 'https-principal', filename: 'https-principal', loaded: true, exports: { get: () => ({ on() { return this; } }),
  // webhook: guarda o que iria pro Discord e responde 204
  request: (u, _o, cb) => ({ on() { return this; }, setTimeout() {}, end(b) { R.webhook = { u: String(u), body: JSON.parse(b) }; cb({ statusCode: 204, resume() {} }); } }) } };

const tmps = [];
function abre(tmp) { // tmp: reabre o app no mesmo userData (o que ficou gravado da abertura anterior)
  R = { app: {}, janelas: [], ipc: {}, fora: [], sessoes: {}, timers: new Map(), seq: 0 };
  R.tmp = tmp || fs.mkdtempSync(path.join(os.tmpdir(), 'pg-principal-'));
  if (!tmp) tmps.push(R.tmp);
  agora += 60e3; // o limite de 3 links por 10 s do main.js nao passa de uma abertura pra outra
  delete require.cache[require.resolve(MAIN)];
  require(MAIN);
  return R;
}
const relatorio = (x) => { try { return fs.readFileSync(path.join(x.tmp, 'relatorio-de-erros.log'), 'utf8'); } catch { return ''; } };

(async () => {
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
    ok(contas.every((s) => s && s.checa && s.checa(null, 'clipboard-sanitized-write') === true && s.checa(null, 'fullscreen') === true), 'paineis: as outras checagens seguem o padrao do Electron (concedido)');
    ok(contas.every((s) => s && s.checa && s.checa(null, 'notifications') === false), 'paineis: checagem de notificacao negada (com ela concedida, o new Notification() de um userscript ou de um XSS no chat mostrava aviso do Windows com o nome PokeGrid; o jogo nao usa)');
    const baixa = (s, url) => { let barrou = false; s.ev['will-download']({ preventDefault() { barrou = true; } }, { getURL: () => url }); return barrou; };
    ok(contas.every((s) => s && s.ev['will-download'] && !baixa(s, 'data:image/png;base64,iVBORw0KGgo=') && baixa(s, 'https://evil.example/PokeGrid-Setup-1.5.39.exe') && baixa(s, 'blob:https://poke.idleworld.online/1') && baixa(s, 'data:application/octet-stream;base64,TVqQ')), 'download pedido pela pagina do jogo: so a imagem gerada nela (o "baixar imagem") abre o Salvar como; .exe, blob e o resto nao');

    console.log('--- backups: so .json e .csv, e a poda fica na mesma familia ---');
    const salva = (n, c = '{}') => x.ipc['backup:save'](EV, n, c, '');
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

  console.log('--- painel novo (<webview>): so do jogo, numa das 4 particoes, sem preload nem Node ---');
  {
    const x = abre();
    const wc = Object.assign(x.janelas[0].webContents, { getType: () => 'window' });
    dispara(x.app['web-contents-created'], {}, wc);
    // o que o Electron 43 entrega (medido num app isolado): params com src e partition, e as preferencias do painel
    const anexa = (params) => {
      let barrou = false;
      const wp = { nodeIntegration: true, preload: 'C:\\x\\mal.js', webSecurity: false, contextIsolation: false, sandbox: false, backgroundThrottling: false };
      dispara(wc.ev['will-attach-webview'], { preventDefault() { barrou = true; } }, wp, Object.assign({ src: 'https://poke.idleworld.online/login?ref=CJNKGPB', partition: 'persist:conta1' }, params));
      return { barrou, wp };
    };
    const bom = anexa({});
    ok(!bom.barrou && bom.wp.backgroundThrottling === false, 'o painel do app (login do jogo, persist:conta1, backgroundThrottling=no) passa com as opcoes dele');
    ok(bom.wp.nodeIntegration === false && bom.wp.contextIsolation === true && bom.wp.sandbox === true && bom.wp.webSecurity === true && !('preload' in bom.wp), 'Node, preload, isolamento e webSecurity ficam fixos, mesmo se a interface pedir o contrario');
    ok(['https://exfil.example/', 'https://poke.idleworld.online.evil.com/', 'file:///C:/x/a.html', 'about:blank', ''].every((src) => anexa({ src }).barrou), 'outro site, dominio parecido, arquivo local ou vazio: recusado');
    ok(['', 'persist:conta5', 'persist:outra', 'conta1'].every((partition) => anexa({ partition }).barrou) && [2, 3, 4].every((n) => !anexa({ partition: 'persist:conta' + n }).barrou), 'so as particoes das 4 contas passam');
    ok(/painel recusado: https:\/\/exfil\.example/.test(relatorio(x)), 'a recusa vai pro relatorio de erros');
    let barrouI = false;
    const wpI = { partition: 'persist:outra', webviewTag: true, experimentalFeatures: true, enableBlinkFeatures: 'X', plugins: true };
    dispara(wc.ev['will-attach-webview'], { preventDefault() { barrouI = true; } }, wpI, { src: 'https://poke.idleworld.online/play', partition: 'persist:conta2' });
    ok(!barrouI && wpI.partition === 'persist:conta2' && wpI.webviewTag === false && wpI.experimentalFeatures === false && wpI.plugins === false && !('enableBlinkFeatures' in wpI), 'webpreferences="partition=persist:outra, webviewTag=yes" no <webview>: o painel nasce na particao conferida e sem as opcoes injetadas (medido no Electron 43: e o wp que cria o painel, e o params so traz o atributo partition)');
  }

  console.log('--- webhook: so pro webhook que o usuario liberou num dialogo do sistema ---');
  {
    // a URL vem da interface: um XSS ali mandava as senhas (loadCreds) pro webhook do Discord do atacante, por fora da CSP
    const x = abre();
    const URL_WH = 'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz0123456789', URL_MAL = 'https://discord.com/api/webhooks/666666666666666666/token-do-atacante-0123456789';
    let perguntas = 0, resposta = 0, ultima = null;
    eletron.dialog.showMessageBox = (w, o) => { perguntas++; ultima = o || w; return Promise.resolve({ response: resposta }); };
    R.webhook = null; let r = await x.ipc['webhook:send'](EV, URL_WH, 'oi');
    ok(perguntas === 1 && r === true && R.webhook && R.webhook.u === URL_WH, 'webhook novo: pergunta no dialogo do sistema (que a pagina nao clica) e, liberado, manda');
    ok(/abcdef…/.test(ultima.detail) && !/ghijklmnop/.test(ultima.detail), 'o dialogo mostra o webhook com o token cortado');
    R.webhook = null; r = await x.ipc['webhook:send'](EV, URL_WH, 'de novo');
    ok(perguntas === 1 && r === true && !!R.webhook, 'liberado: nao pergunta de novo a cada aviso');
    const x2 = abre(x.tmp);
    r = await x2.ipc['webhook:send'](EV, URL_WH, 'reaberto');
    ok(perguntas === 1 && r === true, 'a liberacao fica gravada: reabrindo o app, nao pergunta');
    ok(!fs.readFileSync(path.join(x.tmp, 'webhooks-liberados.json'), 'utf8').includes('abcdefghijklmnop'), 'grava o hash, nao a URL (o token do webhook)');
    resposta = 1; R.webhook = null;
    const [a1, a2] = await Promise.all([x2.ipc['webhook:send'](EV, URL_MAL, '[{"email":"a@b.c","senha":"S3nha"}]'), x2.ipc['webhook:send'](EV, URL_MAL, 'de novo')]);
    ok(perguntas === 2 && a1 === null && a2 === null && !R.webhook, 'webhook que o usuario nao colou (as senhas indo pro do atacante): um dialogo so pros dois envios, negado, nada sai');
    r = await x2.ipc['webhook:send'](EV, URL_MAL, 'insiste');
    ok(perguntas === 2 && r === null, 'negado: nao pergunta de novo nesta sessao, e o null (nao false) nao faz a fila da interface insistir');
    console.log('--- webhook: so a mencao do comeco notifica (o resto do texto vem do jogo) ---');
    resposta = 0;
    const manda = async (txt) => { R.webhook = null; await x2.ipc['webhook:send'](EV, URL_WH, txt); return R.webhook ? R.webhook.body : { allowed_mentions: {} }; };
    let b = await manda('<@111111111111111111> ✨ Conta: shiny <@222222222222222222> Pikachu capturado');
    ok(JSON.stringify(b.allowed_mentions.users) === '["111111111111111111"]' && b.allowed_mentions.parse.length === 0, 'mencao configurada (no comeco) notifica; um <@id> no nome que veio do jogo nao (' + JSON.stringify(b.allowed_mentions) + ')');
    b = await manda('✨ <@333333333333333333>: shiny Pikachu visto');
    ok(Array.isArray(b.allowed_mentions.users) && b.allowed_mentions.users.length === 0, 'sem mencao configurada, nenhum ID do texto vira notificacao');
    ok((await x2.ipc['webhook:send'](EV, 'https://exfil.example/api/webhooks/1/a', 'x')) === false && perguntas === 2, 'URL fora do Discord continua recusada, sem nem perguntar');
    console.log('--- webhook: a mesma URL escrita de outro jeito e a mesma liberacao; o "nao" gruda e nao vira enxurrada ---');
    const p0 = perguntas, W = URL_WH.replace('https://discord.com', ''), rs = [];
    resposta = 0;
    for (const u of ['https://ptb.discord.com' + W, 'https://canary.discord.com' + W + '/', 'https://discordapp.com' + W]) rs.push(await x2.ipc['webhook:send'](EV, u, 'oi'));
    ok(rs.every((r) => r === true) && perguntas === p0 && R.webhook.u === URL_WH, 'ptb., canary., discordapp e barra no fim: e o webhook ja liberado, sem perguntar de novo, e manda pro endereco de discord.com');
    ok((await x2.ipc['webhook:send'](EV, URL_WH + '?x=1', 'oi')) === false && (await x2.ipc['webhook:send'](EV, URL_WH + '#a', 'oi')) === false && (await x2.ipc['webhook:send'](EV, URL_MAL + '/', 'oi')) === null && perguntas === p0, 'fora do formato (?x=1, #) e recusado sem dialogo, e o negado com barra no fim segue negado (antes cada variacao era um webhook novo, com dialogo novo)');
    resposta = 1;
    const outro = (n) => 'https://discord.com/api/webhooks/9' + String(n).padStart(17, '0') + '/token-de-enxurrada-' + n + '-xxxxxxxx';
    const fila = []; for (let n = 1; n <= 50; n++) fila.push(x2.ipc['webhook:send'](EV, outro(n), 'x'));
    const rf = await Promise.all(fila);
    ok(perguntas - p0 === 1 && rf.every((r) => r === null), '50 webhooks novos de uma vez (interface tomada): um dialogo so, e nada sai (' + (perguntas - p0) + ' dialogos)');
    for (let n = 51; n <= 60; n++) await x2.ipc['webhook:send'](EV, outro(n), 'x');
    ok(perguntas - p0 === 2, 'depois de 3 "nao" na sessao, webhook novo nem pergunta mais (antes: um dialogo atras do outro ate alguem cansar e clicar Liberar) (' + (perguntas - p0) + ')');
    resposta = 0;
    ok((await x2.ipc['webhook:send'](EV, URL_WH, 'segue')) === true, 'o webhook liberado segue mandando');
    const x4 = abre(); perguntas = 0; resposta = 1;
    await x4.ipc['webhook:send'](EV, URL_WH + '?thread_id=1234567890123', 'oi');
    ok(perguntas === 1 && /\/api\/webhooks\/123456789012345678\/abcdef…\?thread_id=1234567890123/.test(ultima.detail) && !/ghijklmnop/.test(ultima.detail), 'webhook de forum (?thread_id=): o dialogo corta o token tambem (antes a query fazia o corte falhar e o token aparecia inteiro)');
    eletron.dialog.showMessageBox = () => Promise.resolve({ response: 1 });
  }

  console.log('--- IPC: so o frame principal da janela fala com o main (painel com o renderer tomado pedia as senhas) ---');
  {
    const x = abre();
    fs.writeFileSync(path.join(x.tmp, 'accounts.enc'), JSON.stringify([{ name: 'A', email: 'a@b.c', senha: 'S3nha!' }])); // sem cripto no Electron de mentira: texto puro
    const lidas = x.ipc['creds:load'](EV);
    ok(Array.isArray(lidas) && lidas[0].senha === 'S3nha!', 'a janela principal le as contas, como sempre');
    const painel = { sender: { getType: () => 'webview', mainFrame: {} } }; painel.senderFrame = painel.sender.mainFrame;
    const iframe = { sender: EV.sender, senderFrame: { url: 'https://poke.idleworld.online/x' } };
    const r = [x.ipc['creds:load'](painel), x.ipc['creds:load'](iframe), x.ipc['creds:load']({ sender: EV.sender, senderFrame: null }), x.ipc['creds:load'](null)];
    ok(r.every((v) => v === undefined), 'painel do jogo, iframe dentro da janela, frame que ja sumiu ou evento nenhum: nada de senha');
    ok(x.ipc['backup:save'](painel, 'x.json', '{}', '') === undefined && x.ipc['webhook:send'](painel, URL_INTERFACE, 'x') === undefined && /canal creds:load recusado/.test(relatorio(x)) && /canal webhook:send recusado/.test(relatorio(x)), 'vale pra todo canal, e a recusa vai pro relatorio');
  }

  console.log('--- painel: redirect dentro de um iframe (captcha, login do Google) e do iframe ---');
  {
    const x = abre();
    const wv = { ev: {}, getType: () => 'webview', setWindowOpenHandler() {}, isDestroyed: () => false, reload() {}, hostWebContents: { send() {} } };
    Object.assign(wv, eventos(wv.ev));
    dispara(x.app['web-contents-created'], {}, wv);
    const vai = (isMainFrame, url) => { let barrou = false; dispara(wv.ev['will-redirect'], { isMainFrame, preventDefault() { barrou = true; } }, url); return barrou; };
    ok(!vai(false, 'https://challenges.cloudflare.com/cdn-cgi/x') && !x.fora.length, 'redirect de iframe pra outro site: segue no iframe e nada abre no navegador (antes cancelava e abria la fora)');
    ok(vai(true, 'https://exfil.example/x') && x.fora.length === 1, 'o painel em si (frame principal) segue preso ao jogo: barra e manda pro navegador de fora');
  }

  console.log('--- avisos do sistema com teto, relatorio sem linha forjada, backups com teto de arquivos ---');
  {
    const N0 = eletron.Notification; let avisos = 0;
    eletron.Notification = Object.assign(function () { avisos++; return { show() {} }; }, { isSupported: () => true });
    const x = abre();
    for (let k = 0; k < 25; k++) x.ipc['notify'](EV, 'PokeGrid', 'Conta 1 caiu');
    ok(avisos === 20, 'enxurrada de avisos do Windows: no maximo 20 por minuto (' + avisos + ')');
    agora += 61e3; x.ipc['notify'](EV, 'PokeGrid', 'de novo');
    ok(avisos === 21, 'passado o minuto, avisa de novo');
    eletron.Notification = N0;
    x.ipc['errlog:write'](EV, 'x]\n[01/01/2000, 00:00:00] [boot', 'ok\n[01/01/2000, 00:00:00] [boot] janela criada');
    const rel = relatorio(x);
    ok(!/\n\[01\/01\/2000, 00:00:00\] \[boot\]/.test(rel) && /\n    \[01\/01\/2000, 00:00:00\] \[boot\] janela criada/.test(rel) && /\[x01012000000000boot\]/.test(rel), 'texto com quebra de linha vindo da interface nao forja linha no relatorio (vai recuado), e a origem so leva letra, numero e traco');
    const dir = path.join(x.tmp, 'backups'); fs.mkdirSync(dir, { recursive: true });
    for (let k = 0; k < 300; k++) fs.writeFileSync(path.join(dir, 'vazio' + k + 'x.json'), '');
    ok(x.ipc['backup:save'](EV, 'config-auto-2026-10-14.json', '{}', '') === false && /pasta de backups com 300 arquivos/.test(relatorio(x)), '300 arquivos na pasta (vazios, fora de qualquer familia): para de gravar e diz no relatorio, em vez de ler a pasta inteira a cada gravacao');
    ok(x.ipc['backup:save'](EV, 'vazio7x.json', '{"a":1}', '') === true, 'regravar um arquivo que ja existe continua valendo');
  }

  console.log('--- contas salvas que nao abriram: branco nao grava por cima ---');
  {
    const ss = eletron.safeStorage, ss0 = Object.assign({}, ss);
    Object.assign(ss, { isEncryptionAvailable: () => true, decryptString: () => { throw new Error('a chave do Windows nao abriu'); }, encryptString: (s) => Buffer.from('ENC:' + s) });
    const x = abre();
    const arq = path.join(x.tmp, 'accounts.enc'), antigo = Buffer.from('cifrado-com-a-chave-de-antes:S3nha!');
    fs.writeFileSync(arq, antigo);
    const baks = () => fs.readdirSync(x.tmp).filter((f) => f.startsWith('accounts.enc.bak-'));
    ok(Array.isArray(x.ipc['creds:load'](EV)) && baks().length === 1, 'nao abriu: a interface recebe lista vazia e o arquivo ganha uma copia .bak');
    x.ipc['creds:load'](EV); x.ipc['creds:load'](EV);
    ok(baks().length === 1, 'o mesmo arquivo ilegivel nao vira um .bak a cada abertura');
    const branco = [0, 1, 2, 3].map((i) => ({ name: 'Conta ' + (i + 1), email: '', senha: '' }));
    ok(x.ipc['creds:save'](EV, branco) === false && fs.readFileSync(arq).equals(antigo), 'renomear um painel (save com as 4 contas em branco) nao grava por cima das senhas que nao abriram');
    ok(/nao gravou contas em branco/.test(relatorio(x)), 'e diz no relatorio');
    ok(x.ipc['creds:save'](EV, [{ name: 'A', email: 'a@b.c', senha: 'nova' }]) === true && fs.readFileSync(arq).toString().startsWith('ENC:'), 'contas preenchidas de novo gravam (o .bak segue com as antigas)');
    ok(x.ipc['creds:save'](EV, branco) === true, 'depois disso o arquivo e desta sessao: apagar as contas grava normal');
    Object.keys(ss).forEach((k) => delete ss[k]); Object.assign(ss, ss0);
  }

  console.log('--- backups: teto em bytes e teto da pasta ---');
  {
    const x = abre();
    const salva = (n, c) => x.ipc['backup:save'](EV, n, c, '');
    ok(salva('acentos.json', 'é'.repeat(1.5e6)) === false, '1,5 milhao de "é" sao 3 MB em UTF-8: passa do teto de 2 MB (antes o teto contava caracteres)');
    const bloco = 'x'.repeat(1.9e6), nomes = 'abcdefghijklmnopqrstuvwxyz'.split('').concat(['za', 'zb']);
    const res = nomes.map((n) => salva('enchimento-' + n + '.json', bloco));
    const total = fs.readdirSync(path.join(x.tmp, 'backups')).reduce((s, f) => s + fs.statSync(path.join(x.tmp, 'backups', f)).size, 0);
    ok(res.indexOf(false) > 0 && total <= 50e6 && /pasta de backups com \d+ MB/.test(relatorio(x)), 'nomes sem data (fora de qualquer familia): para nos 50 MB em vez de encher o disco (' + Math.round(total / 1e6) + ' MB)');
  }

  console.log('--- relatorio de erros sem o nome do usuario do Windows ---');
  {
    const x = abre();
    const h = os.homedir(), hb = h.split('\\').join('/');
    x.ipc['errlog:write'](EV, 'teste', 'EPERM ' + h + '\\AppData\\x.tmp | at render (file:///' + hb + '/Downloads/index.html:1:1) | json ' + h.split('\\').join('\\\\') + '\\\\y');
    const log = relatorio(x);
    ok(/EPERM ~\\AppData/.test(log) && /file:\/\/\/~\/Downloads/.test(log) && !log.includes(h) && !log.includes(hb), 'a pasta do usuario vira ~ nas 3 formas (barra invertida, file:/// e escapada em JSON): o relatorio vai pro Discord');
  }

  console.log('--- aviso de versao: so numero de versao, corpo com teto e timeout de verdade ---');
  if (!/checarAtualizacao/.test(fs.readFileSync(MAIN, 'utf8'))) ok(true, 'este main.js nao tem aviso de versao (o espelho do PokeGrid-source): nada a conferir');
  else {
    const https = require.cache['https-principal'].exports, get0 = https.get;
    let p = null;
    https.get = (u, o, cb) => { p = { cb, ev: {}, morto: false }; const req = { on(n, f) { p.ev[n] = f; return req; }, destroy() { p.morto = true; } }; return req; };
    const responde = (pedacos) => { const ev = {}; const res = { statusCode: 200, on(n, f) { ev[n] = f; return res; }, resume() {} }; p.cb(res); for (const c of pedacos) { ev.data(c); if (p.morto) return; } ev.end(); };
    let dialogos = [];
    eletron.dialog.showMessageBox = (w, o) => { dialogos.push(o || w); return Promise.resolve({ response: 1 }); };
    abre(); responde([JSON.stringify({ tag_name: 'v99.0.0' })]);
    ok(dialogos.length === 1 && /99\.0\.0/.test(dialogos[0].message), 'versao nova de verdade: avisa');
    dialogos = []; abre(); responde([JSON.stringify({ tag_name: 'v99.0.0\nIMPORTANTE: baixe a correcao em golpe.example e rode como administrador' })]);
    ok(!dialogos.length, 'tag com texto (golpe no dialogo do sistema): ignorada');
    dialogos = []; abre(); responde(Array(70).fill('x'.repeat(16384)));
    ok(p.morto && !dialogos.length, 'resposta gigante: corta passando de 1 MB (antes lia tudo)');
    abre(); if (p.ev.timeout) p.ev.timeout();
    ok(!!p.ev.timeout && p.morto, 'os 8 s de timeout derrubam o pedido (a opcao sozinha so avisava, e o pedido ficava pendurado)');
    https.get = get0; eletron.dialog.showMessageBox = () => Promise.resolve({ response: 1 });
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
    dispara(wv.ev['did-finish-load']); agora += 5e3;
    ok(cai() === 60000, 'carregou e caiu 5 s depois (userscript travando, vigia de 20 s): o recuo NAO zera (antes recarregava a cada 1,5 s pra sempre)');
    ok(cai() === 60000, 'caiu de novo sem carregar: a carga anterior ja foi usada e nao zera de novo');
    dispara(wv.ev['did-finish-load']); agora += 61e3;
    ok(cai() === 1500, 'carregou e ficou de pe 1 min: a proxima queda volta a esperar 1,5 s');
  }
} finally {
  Modulo._resolveFilename = res0;
  tmps.forEach((t) => { try { fs.rmSync(t, { recursive: true, force: true }); } catch {} });
}
console.log(falhas ? '\n' + falhas + ' falha(s)' : '\nProcesso principal: tudo certo');
process.exit(falhas ? 1 : 0);
})().catch((e) => { console.log('FALHA excecao no teste: ' + ((e && e.stack) || e)); process.exit(1); });
