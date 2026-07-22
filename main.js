const { app, BrowserWindow, ipcMain, safeStorage, Tray, Menu, powerSaveBlocker, shell, session, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

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
    if (d.reason !== 'clean-exit') setTimeout(() => { try { contents.reload(); } catch {} }, 1500);
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

// Doacao: abre no navegador padrao, fora do app.
ipcMain.handle('donate', () => shell.openExternal('https://www.buymeacoffee.com/foka'));

// Notificacao do SO (alertas de queda e de sem pokebola).
ipcMain.handle('notify', (_e, title, body) => {
  try { if (Notification.isSupported()) new Notification({ title, body }).show(); } catch {}
});

// Anti-sono: impede o PC de dormir enquanto farma (a tela ainda pode desligar).
let awakeId = null;
ipcMain.handle('awake:set', (_e, on) => {
  if (on && awakeId === null) awakeId = powerSaveBlocker.start('prevent-app-suspension');
  if (!on && awakeId !== null) { powerSaveBlocker.stop(awakeId); awakeId = null; }
  return awakeId !== null;
});

let tray; // referencia viva para o icone nao sumir (GC)

app.whenReady().then(() => {
  app.setAppUserModelId('online.idleworld.pokegrid'); // notificacoes do Windows aparecem com o nome certo

  // Nega pedidos de permissao dos jogos (mic, camera, localizacao, notificacao...).
  for (let i = 1; i <= 4; i++)
    session.fromPartition('persist:conta' + i).setPermissionRequestHandler((_wc, _p, cb) => cb(false));

  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    webPreferences: { webviewTag: true, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'index.html')); // caminho absoluto: robusto no build empacotado (asar)
  if (!process.argv.includes('--hidden')) win.maximize(); // --hidden: nasce na bandeja, farmando

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
  // "Iniciar com o Windows" abre ja escondido na bandeja (--hidden).
  const liOpts = { path: process.execPath, args: app.isPackaged ? ['--hidden'] : [__dirname, '--hidden'] };
  tray = new Tray(path.join(__dirname, 'tray.png'));
  tray.setToolTip('PokeGrid');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mostrar', click: () => win.show() },
    { label: 'Iniciar com o Windows', type: 'checkbox',
      checked: app.getLoginItemSettings(liOpts).openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, ...liOpts }) },
    { label: 'Sair', click: () => app.quit() }
  ]));
  tray.on('click', () => win.isVisible() ? win.hide() : win.show());
  win.on('minimize', () => win.hide());
  app.on('second-instance', () => win.show());
});

app.on('window-all-closed', () => app.quit());
