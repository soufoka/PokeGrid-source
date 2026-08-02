const { app, BrowserWindow, ipcMain, safeStorage, Tray, Menu, powerSaveBlocker, shell, session, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https'); // so pro webhook opcional do Discord

// Silencia o spam do Chromium no terminal (ex.: STUN/WebRTC do jogo que a rede nao resolve).
// E so log, nao afeta o app. Mantem so erros fatais.
app.commandLine.appendSwitch('log-level', '3');

// ===== Relatorio de erros: qualquer crash/travamento cai num arquivo que o usuario pode enviar =====
const errFile = () => path.join(app.getPath('userData'), 'relatorio-de-erros.log');
let errCabecalho = false;
function logErro(origem, detalhe) {
  try {
    const f = errFile();
    try { if (fs.statSync(f).size > 512 * 1024) fs.renameSync(f, f.replace(/\.log$/, '.antigo.log')); } catch {}
    let txt = '';
    if (!errCabecalho) {
      errCabecalho = true;
      txt += `\n=== sessao de ${new Date().toLocaleString('pt-BR')} · PokeGrid v${app.getVersion()} · Electron ${process.versions.electron} · ${process.platform} ${require('os').release()} ===\n`;
    }
    txt += `[${new Date().toLocaleString('pt-BR')}] [${origem}] ${String(detalhe).slice(0, 4000)}\n`;
    fs.appendFileSync(f, txt);
  } catch {}
}
process.on('uncaughtException', (e) => {
  logErro('app', (e && e.stack) || e);
  // erro nao previsto nao pode deixar o usuario com processo vivo e nenhuma janela
  try { const w = BrowserWindow.getAllWindows()[0]; if (w && !w.isDestroyed() && !w.isVisible()) { w.show(); w.maximize(); } } catch {}
});
process.on('unhandledRejection', (e) => logErro('app-promise', (e && e.stack) || e));
app.on('child-process-gone', (_e, d) => { if (d && d.reason !== 'clean-exit') logErro('processo-' + (d.type || '?'), d.reason + (d.exitCode != null ? ' (exit ' + d.exitCode + ')' : '')); });
// erros vindos da interface (window.onerror do index.html)
ipcMain.handle('errlog:write', (_e, origem, msg) => { if (typeof origem === 'string' && typeof msg === 'string') logErro(origem.slice(0, 40), msg); });
// abre a pasta com o arquivo selecionado, pro usuario mandar pro suporte
ipcMain.handle('errlog:open', () => {
  try {
    if (!fs.existsSync(errFile())) fs.writeFileSync(errFile(), 'Nenhum erro registrado ate agora. / No errors recorded yet.\n');
    shell.showItemInFolder(errFile());
  } catch {}
});

// Instancia unica: abrir o app de novo so foca a janela ja aberta.
if (!app.requestSingleInstanceLock()) app.quit();

// Paineis presos ao dominio do jogo: nada de popup, e navegar o painel
// (que carrega a sessao logada) para outro site abre no navegador de fora.
const GAME = 'https://poke.idleworld.online';
const abreFora = (url) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); };
app.on('web-contents-created', (_e, contents) => {
  if (contents.getType() !== 'webview') return;
  contents.setWindowOpenHandler(({ url }) => { abreFora(url); return { action: 'deny' }; });
  const guarda = (e, url) => {
    if (!url.startsWith(GAME) && url !== 'about:blank') { e.preventDefault(); abreFora(url); }
  };
  contents.on('will-navigate', guarda);
  contents.on('will-redirect', guarda);
  // watchdog: se o processo do painel morrer (crash/OOM), recarrega sozinho
  contents.on('render-process-gone', (_ev, d) => {
    if (d.reason !== 'clean-exit') {
      logErro('painel', 'processo do painel caiu: ' + d.reason + (d.exitCode != null ? ' (exit ' + d.exitCode + ')' : ''));
      setTimeout(() => { try { contents.reload(); } catch {} }, 1500);
    }
  });
  // travou (processo vivo mas sem responder): 20s de tolerancia; se nao voltar,
  // derruba o processo de proposito, o watchdog acima recarrega o painel sozinho
  let hangTimer = null;
  contents.on('unresponsive', () => {
    logErro('painel', 'painel travou (sem responder)');
    clearTimeout(hangTimer);
    hangTimer = setTimeout(() => { try { if (!contents.isDestroyed()) contents.forcefullyCrashRenderer(); } catch {} }, 20000);
  });
  contents.on('responsive', () => { clearTimeout(hangTimer); logErro('painel', 'painel voltou a responder'); });
  contents.on('destroyed', () => clearTimeout(hangTimer));
  // Esc com o jogo focado: avisa a interface (fechar card de IV / desexpandir) SEM consumir a
  // tecla, o jogo usa Esc pra fechar dialogos. Por isso nao e um accelerator de menu, que engoliria.
  contents.on('before-input-event', (_ev, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && !input.isAutoRepeat) {
      try { contents.hostWebContents && contents.hostWebContents.send('hotkey', 'collapse'); } catch {}
    }
  });
  // clique direito no jogo: modo foco (expande/volta). Campo editavel fica de fora,
  // senao o clique de colar num input viraria tela cheia.
  contents.on('context-menu', (_ev, params) => {
    if (params && params.isEditable) return;
    try { contents.hostWebContents && contents.hostWebContents.send('hotkey', 'ctx' + contents.id); } catch {}
  });
});

const credFile = () => path.join(app.getPath('userData'), 'accounts.enc');

// Contas salvas: criptografadas em disco via DPAPI/keychain do SO (safeStorage).
ipcMain.handle('creds:load', () => {
  let buf;
  try { buf = fs.readFileSync(credFile()); } catch { return []; } // nunca salvo
  try {
    if (safeStorage.isEncryptionAvailable()) return JSON.parse(safeStorage.decryptString(buf));
    return JSON.parse(buf.toString('utf8')); // fallback se o SO nao oferecer cripto
  } catch {
    // Ilegivel (ex.: chave de cripto mudou apos upgrade do Electron): preserva o
    // arquivo antes que um save por cima destrua a unica copia.
    try { fs.copyFileSync(credFile(), credFile() + '.bak-' + Date.now()); } catch {}
    return [];
  }
});

ipcMain.handle('creds:save', (_e, accounts) => {
  const json = JSON.stringify(accounts);
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf8');
  const f = credFile();
  fs.writeFileSync(f + '.tmp', data);
  fs.renameSync(f + '.tmp', f); // troca atomica: fechar o app no meio nao corrompe
  return true;
});

// UA consistente pra passar na Cloudflare: remove o token "Electron/..." e
// congela a versão do Chrome em .0.0.0, casando com os client hints (navigator.userAgentData).
// Deriva da versão real do Chromium, então acompanha upgrades do Electron sozinho.
app.userAgentFallback = app.userAgentFallback
  .replace(/ Electron\/[\d.]+/, '')
  .replace(/(Chrome\/\d+)[\d.]+/, '$1.0.0.0');

// Notificacao do SO (alertas de queda e de sem pokebola).
ipcMain.handle('notify', (_e, title, body) => {
  try { if (Notification.isSupported()) new Notification({ title, body }).show(); } catch {}
});

// Le um preset de userscript da pasta presets/ (nome saneado, sem path traversal).
ipcMain.handle('preset:read', (_e, name) => {
  if (typeof name !== 'string' || !/^[\w.-]+\.js$/.test(name)) return '';
  try { return fs.readFileSync(path.join(__dirname, 'presets', name), 'utf8'); } catch { return ''; }
});

const USER_SCRIPT_HOSTS = new Set(['github.com', 'raw.githubusercontent.com']);
function dataUltimoCommitGitHub(rawUrl) {
  return new Promise((resolve) => {
    let parts = rawUrl.pathname.split('/').filter(Boolean), owner = parts[0], repo = parts[1], branch, file;
    if (parts[2] === 'refs' && parts[3] === 'heads') { branch = parts[4]; file = parts.slice(5).join('/'); }
    else { branch = parts[2]; file = parts.slice(3).join('/'); }
    if (rawUrl.hostname !== 'raw.githubusercontent.com' || !owner || !repo || !branch || !file) { resolve(null); return; }
    const apiPath = '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/commits?path=' + encodeURIComponent(file) + '&sha=' + encodeURIComponent(branch) + '&per_page=1';
    const req = https.get({ hostname: 'api.github.com', path: apiPath, headers: { 'User-Agent': 'PokeGrid/' + app.getVersion(), Accept: 'application/vnd.github+json' } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      let body = '', size = 0;
      res.setEncoding('utf8');
      res.on('data', chunk => { size += Buffer.byteLength(chunk); if (size <= 256 * 1024) body += chunk; });
      res.on('end', () => { try { const data = JSON.parse(body); resolve(data[0] && data[0].commit && data[0].commit.committer && data[0].commit.committer.date || null); } catch { resolve(null); } });
      res.on('error', () => resolve(null));
    });
    req.setTimeout(8000, () => req.destroy()); req.on('error', () => resolve(null));
  });
}
function baixaUserScript(url, redirects = 0) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(String(url)); } catch { resolve({ ok: false, error: 'Link invalido.' }); return; }
    if (u.protocol !== 'https:' || !USER_SCRIPT_HOSTS.has(u.hostname) || !/\.js$/i.test(u.pathname)) {
      resolve({ ok: false, error: 'Use um link HTTPS do GitHub para um arquivo .js.' }); return;
    }
    const req = https.get(u, { headers: { 'User-Agent': 'PokeGrid/' + app.getVersion(), Accept: 'text/plain' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects >= 3) { resolve({ ok: false, error: 'Redirecionamentos demais.' }); return; }
        let next; try { next = new URL(res.headers.location, u).toString(); } catch { resolve({ ok: false, error: 'Redirecionamento invalido.' }); return; }
        baixaUserScript(next, redirects + 1).then(resolve); return;
      }
      if (res.statusCode !== 200) { res.resume(); resolve({ ok: false, error: 'GitHub respondeu com HTTP ' + res.statusCode + '.' }); return; }
      let size = 0, body = '', done = false;
      res.setEncoding('utf8');
      res.on('data', (chunk) => { if (done) return; size += Buffer.byteLength(chunk); if (size > 2 * 1024 * 1024) { done = true; req.destroy(); resolve({ ok: false, error: 'O script excede 2 MB.' }); } else body += chunk; });
      res.on('end', async () => { if (!done) resolve({ ok: true, url: u.toString(), code: body, githubUpdatedAt: await dataUltimoCommitGitHub(u) }); });
      res.on('error', () => { if (!done) { done = true; resolve({ ok: false, error: 'Falha ao ler o script.' }); } });
    });
    req.setTimeout(12000, () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve({ ok: false, error: 'Nao foi possivel acessar o GitHub.' }));
  });
}
ipcMain.handle('userscript:fetch', (_e, url) => baixaUserScript(url));
ipcMain.handle('userscript:info', async (_e, url) => {
  let u; try { u = new URL(String(url)); } catch { return { githubUpdatedAt: null }; }
  if (u.protocol !== 'https:' || u.hostname !== 'raw.githubusercontent.com' || !/\.js$/i.test(u.pathname)) return { githubUpdatedAt: null };
  return { githubUpdatedAt: await dataUltimoCommitGitHub(u) };
});

// Anti-sono: impede o PC de dormir enquanto farma (a tela ainda pode desligar).
let awakeId = null;
ipcMain.handle('awake:set', (_e, on) => {
  if (on && awakeId === null) awakeId = powerSaveBlocker.start('prevent-app-suspension');
  if (!on && awakeId !== null) { powerSaveBlocker.stop(awakeId); awakeId = null; }
  return awakeId !== null;
});

// Minimizar: pra bandeja (padrao) ou normal, na barra de tarefas. A interface persiste a escolha.
let minToTray = true;
ipcMain.handle('mintray:set', (_e, on) => { minToTray = !!on; return minToTray; });

// ===== Abrir com o Windows (desligado por padrao) =====
// Feito com um atalho na pasta Inicializar do usuario, e nao escrevendo na chave Run do registro
// (que e o metodo do setLoginItemSettings). Motivo: gravar em Run e abrir invisivel sao os dois
// comportamentos que antivirus tratam como persistencia suspeita. O atalho fica num lugar que o
// usuario ve e pode apagar sozinho (Win+R > shell:startup), e o app abre com a janela visivel.
const startupDir = () => path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const startupLnk = () => path.join(startupDir(), 'PokeGrid.lnk');
const autoStartOn = () => { try { return process.platform === 'win32' && fs.existsSync(startupLnk()); } catch { return false; } };
function setAutoStart(on) {
  if (process.platform !== 'win32') return false;
  try {
    if (on) {
      const opts = { target: process.execPath, description: 'PokeGrid', appUserModelId: 'online.idleworld.pokegrid' };
      if (!app.isPackaged) opts.args = `"${app.getAppPath()}"`; // rodando pelo codigo: electron + a pasta do app
      shell.writeShortcutLink(startupLnk(), 'create', opts);
    } else {
      try { fs.unlinkSync(startupLnk()); } catch {}
    }
  } catch (e) { logErro('autostart', String((e && e.message) || e)); }
  return autoStartOn();
}
ipcMain.handle('autostart:get', () => ({ on: autoStartOn(), suportado: process.platform === 'win32' }));
ipcMain.handle('autostart:set', (_e, on) => setAutoStart(!!on));

// Webhook do Discord (opcional): o usuario cola a URL do proprio servidor. So aceita o dominio
// oficial de webhooks; o envio sai daqui porque a CSP do renderer bloqueia rede externa.
ipcMain.handle('webhook:send', (_e, url, text) => {
  try {
    const u = new URL(String(url));
    if (u.protocol !== 'https:' || !/^(discord\.com|discordapp\.com)$/.test(u.hostname) || !u.pathname.startsWith('/api/webhooks/')) return false;
    // allowed_mentions vazio: nome de conta/pokemon vem do jogo, nao pode virar ping de @everyone
    const body = JSON.stringify({ content: String(text).slice(0, 1900), allowed_mentions: { parse: [] } });
    const req = https.request(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => res.resume());
    req.on('error', () => {});
    req.setTimeout(8000, () => req.destroy());
    req.end(body);
    return true;
  } catch { return false; }
});


let tray; // referencia viva para o icone nao sumir (GC)

app.whenReady().then(() => {
  // Nada aqui pode derrubar a criacao da janela: se qualquer peca do sistema falhar (registro,
  // particao de sessao corrompida, bandeja), o app tem que abrir assim mesmo. Antes destas
  // guardas, uma excecao aqui deixava o processo vivo e SEM JANELA, que e o pior sintoma possivel.
  try { app.setAppUserModelId('online.idleworld.pokegrid'); } catch (e) { logErro('boot', 'appUserModelId: ' + e.message); } // notificacoes do Windows com o nome certo

  // Nega pedidos de permissao dos jogos (mic, camera, localizacao, notificacao...).
  for (let i = 1; i <= 4; i++)
    try { session.fromPartition('persist:conta' + i).setPermissionRequestHandler((_wc, _p, cb) => cb(false)); } catch (e) { logErro('boot', 'sessao conta' + i + ': ' + e.message); }

  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    webPreferences: { webviewTag: true, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'index.html')); // caminho absoluto: robusto no build empacotado (asar)
  // a janela principal so mostra index.html: bloqueia qualquer navegacao dela (canal de exfiltracao se houver XSS)
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); abreFora(url); } });
  win.webContents.setWindowOpenHandler(({ url }) => { abreFora(url); return { action: 'deny' }; });

  // registra travamento/queda da propria interface no relatorio de erros
  win.webContents.on('unresponsive', () => logErro('janela', 'interface travou (sem responder)'));
  win.webContents.on('responsive', () => logErro('janela', 'interface voltou a responder'));
  win.webContents.on('render-process-gone', (_e2, d) => { if (d.reason !== 'clean-exit') logErro('janela', 'interface caiu: ' + d.reason); });
  // Mostra a janela quando o conteudo esta pronto. Precisa do show() explicito: no Linux
  // varios gerenciadores de janela ignoram maximize() em janela ainda nao exibida, e o app
  // subia sem abrir nada. --hidden: nasce na bandeja, farmando.
  logErro('boot', 'janela criada');
  if (!process.argv.includes('--hidden')) {
    win.once('ready-to-show', () => { logErro('boot', 'conteudo pronto'); win.show(); win.maximize(); });
    setTimeout(() => { if (!win.isDestroyed() && !win.isVisible()) { logErro('boot', 'rede de seguranca: mostrando a janela'); win.show(); win.maximize(); } }, 8000); // rede de seguranca se o evento nao vier
  }

  // Atalhos (funcionam mesmo com o jogo focado): Ctrl+1..4 expande painel, Ctrl+M mudo.
  Menu.setApplicationMenu(Menu.buildFromTemplate([{
    label: 'Atalhos',
    submenu: [
      ...[1, 2, 3, 4].map(n => ({
        label: `Expandir painel ${n}`, accelerator: `CmdOrCtrl+${n}`,
        click: () => win.webContents.send('hotkey', 'expand' + (n - 1))
      })),
      { label: 'Mudo', accelerator: 'CmdOrCtrl+M', click: () => win.webContents.send('hotkey', 'mute') }
    ]
  }]));

  // Bandeja: minimizar esconde da barra de tarefas; clique no icone alterna.
  // Ao voltar da bandeja, restaura o mesmo estado de antes: hide()+show() no
  // Windows perde o "maximizado", entao rastreamos e reaplicamos.
  let wasMax = true; // nasce maximizado (win.maximize() acima)
  win.on('maximize', () => { wasMax = true; });
  win.on('unmaximize', () => { wasMax = false; });
  const mostrar = () => { const m = wasMax; win.show(); if (m && !win.isMaximized()) win.maximize(); };
  // Bandeja, registro do Windows e pasta Inicializar entram DEPOIS que a janela aparece.
  // Sao chamadas sincronas ao sistema, e antivirus costumam interceptar justamente essas; se
  // travarem, o processo principal congela e a janela nunca abre (processo vivo, tela nenhuma).
  // Foi o que usuarios relataram na 1.5.5-1.5.7. Agora nada disso bloqueia a abertura.
  const prepararBandeja = () => {
    // limpeza do autostart antigo (chave Run, que abria com --hidden): uma unica vez na vida
    try {
      const marca = path.join(app.getPath('userData'), 'runkey-limpo');
      if (!fs.existsSync(marca)) {
        try { if (app.getLoginItemSettings().openAtLogin) app.setLoginItemSettings({ openAtLogin: false }); } catch (e) { logErro('boot', 'runkey: ' + e.message); }
        try { fs.writeFileSync(marca, '1'); } catch {}
      }
    } catch {}
  // Bandeja nao existe em todo ambiente (Linux sem indicador, por exemplo). Se falhar, o app
  // segue funcionando sem bandeja em vez de morrer no boot.
  try {
    tray = new Tray(path.join(__dirname, 'tray.png'));
    tray.setToolTip('PokeGrid');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Mostrar', click: mostrar },
      { label: 'Abrir com o Windows', type: 'checkbox',
        checked: autoStartOn(), visible: process.platform === 'win32',
        click: (item) => { const r = setAutoStart(item.checked); item.checked = r; win.webContents.send('autostart', r); } },
      { label: 'Sair', click: () => app.quit() }
    ]));
    tray.on('click', () => win.isVisible() ? win.hide() : mostrar());
  } catch (e) {
    tray = null;
    logErro('bandeja', 'sem bandeja neste sistema: ' + e.message);
  }
    // nasceu escondido pra bandeja, mas nao ha bandeja: mostra, senao seria um processo invisivel
    if (!tray && process.argv.includes('--hidden')) mostrar();
    logErro('boot', 'bandeja pronta');
  };
  setTimeout(prepararBandeja, 1500); // a janela ja esta na tela quando isso roda
  // sem bandeja, esconder ao minimizar deixaria a janela inalcancavel: minimiza normal
  win.on('minimize', () => { if (minToTray && tray) win.hide(); });
  app.on('second-instance', () => mostrar());
});

app.on('window-all-closed', () => app.quit());
