// Teste de inicializacao: o app tem que ABRIR sempre.
//
// Existe por causa de um incidente real (1.5.5 a 1.5.9): o canal 'webhook:send' ficou registrado
// duas vezes no main.js. O Electron recusa registro repetido e interrompe o carregamento do
// arquivo, entao o programa subia como processo e a janela nunca era criada. Ninguem percebeu por
// quatro versoes porque os testes olhavam outras coisas.
//
// Rode com: npm test    (ou: node test/boot.test.js)
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
let falhas = 0;
const ok = (cond, rotulo) => { console.log((cond ? 'ok   ' : 'FALHA ') + rotulo); if (!cond) falhas++; };

const main = fs.readFileSync(path.join(RAIZ, 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(RAIZ, 'preload.js'), 'utf8');
const index = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

console.log('--- registros que o Electron recusa se vierem repetidos ---');
const canais = [...main.matchAll(/ipcMain\.handle\(\s*'([^']+)'/g)].map((m) => m[1]);
const repetidos = canais.filter((c, i) => canais.indexOf(c) !== i);
ok(canais.length > 0, 'main.js registra canais de IPC (' + canais.length + ')');
ok(repetidos.length === 0, 'nenhum canal repetido' + (repetidos.length ? ' -> ' + [...new Set(repetidos)].join(', ') : ''));
const expostos = [...preload.matchAll(/exposeInMainWorld\(\s*'([^']+)'/g)].map((m) => m[1]);
ok(expostos.filter((c, i) => expostos.indexOf(c) !== i).length === 0, 'preload sem exposicao repetida');

console.log('--- o main.js carrega de verdade (Electron de mentira, que recusa repetidos) ---');
const registrados = new Set();
let menuApp = null, erroPronto = null;
const atalhos = [], itensLogin = [], consultasLogin = []; // o que o main.js grava no atalho da Inicializar e na chave Run
const tratadores = {}; let menuBandeja = null;
const eventos = () => { const o = { on: () => o, once: () => o, removeListener: () => o }; return o; };
const janela = Object.assign(eventos(), {
  loadFile: () => Promise.resolve(), loadURL: () => Promise.resolve(), show() {}, hide() {}, focus() {},
  maximize() {}, minimize() {}, restore() {}, destroy() {}, close() {}, center() {}, setMenu() {},
  setMenuBarVisibility() {}, setSkipTaskbar() {}, setAlwaysOnTop() {}, setBounds() {}, setSize() {}, setTitle() {},
  isMinimized: () => false, isVisible: () => false, isMaximized: () => false, isDestroyed: () => false,
  getBounds: () => ({ x: 0, y: 0, width: 1280, height: 800 }), getSize: () => [1280, 800],
  webContents: Object.assign(eventos(), {
    send() {}, executeJavaScript: () => Promise.resolve(null), setWindowOpenHandler() {}, setAudioMuted() {},
    setZoomFactor() {}, openDevTools() {}, reload() {}, id: 1, getWebContentsId: () => 1,
    isDestroyed: () => false, hostWebContents: null
  })
});
function JanelaFalsa() { return janela; }
JanelaFalsa.getAllWindows = () => [janela];
JanelaFalsa.fromWebContents = () => janela;
const CAMINHOS = { appData: path.join(RAIZ, '.teste-tmp'), userData: path.join(RAIZ, '.teste-tmp'), temp: path.join(RAIZ, '.teste-tmp'), exe: process.execPath, home: RAIZ, desktop: RAIZ, documents: RAIZ, downloads: RAIZ, logs: RAIZ, crashDumps: RAIZ, sessionData: RAIZ, module: RAIZ };
const eletronFalso = {
  app: Object.assign(eventos(), {
    // sincrono: o corpo que cria janela e menu roda dentro do require (antes o process.exit do fim
    // chegava antes da Promise e esse trecho nunca era exercitado). A bandeja fica num setTimeout de
    // 1500 ms e NAO e exercitada aqui.
    whenReady: () => ({ then(cb) { try { cb(); } catch (e) { erroPronto = e; } } }),
    getPath: (n) => { if (!(n in CAMINHOS)) throw new Error("path desconhecido: " + n); return CAMINHOS[n]; },
    getVersion: () => '0.0.0-teste', getName: () => 'PokeGrid', getAppPath: () => RAIZ, isPackaged: false,
    quit() {}, focus() {}, setAppUserModelId() {}, setLoginItemSettings(o) { itensLogin.push(o); },
    // como no Electron: sem args, a entrada antiga com --hidden le 'desligado'; launchItems vem casado pelo exe
    getLoginItemSettings: (o) => { consultasLogin.push(o); return { openAtLogin: false, launchItems: [
      { name: 'electron.app.Electron', path: 'x', args: ['--hidden'], scope: 'user' }, // 1.0.x e npm start
      { name: 'OutroApp', path: 'x', args: [], scope: 'user' }, // nao e nosso: nao abria com --hidden
      { name: 'electron.app.Maquina', path: 'x', args: ['--hidden'], scope: 'machine' } // HKLM: o app nunca gravou la
    ] }; },
    requestSingleInstanceLock: () => true,
    userAgentFallback: 'Mozilla/5.0 Chrome/150.0.0.0 Electron/43.1.1 Safari/537.36',
    commandLine: { appendSwitch() {} }
  }),
  BrowserWindow: JanelaFalsa,
  // igual ao Electron: canal repetido LANCA. E isto que o incidente exigiu.
  ipcMain: {
    handle(canal, fn) {
      tratadores[canal] = fn;
      if (registrados.has(canal)) throw new Error("Attempted to register a second handler for '" + canal + "'");
      registrados.add(canal);
    },
    on() {}, removeHandler(c) { registrados.delete(c); }
  },
  shell: {
    openExternal: () => Promise.resolve(), showItemInFolder() {}, openPath: () => Promise.resolve(''),
    writeShortcutLink: (p, a, b) => { atalhos.push(b || a); try { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, ''); } catch {} return true; },
    readShortcutLink: () => ({ target: process.execPath }) // o atalho antigo da portatil: a pasta temporaria
  },
  session: { defaultSession: { setPermissionRequestHandler() {} }, fromPartition: () => ({ setPermissionRequestHandler() {} }) },
  Menu: { buildFromTemplate: (t) => ({ items: t || [] }), setApplicationMenu(m) { menuApp = m; } },
  Tray: function () { return Object.assign(eventos(), { setToolTip() {}, setContextMenu(m) { menuBandeja = m; }, destroy() {} }); },
  dialog: { showMessageBox: () => Promise.resolve({ response: 1 }), showErrorBox() {} },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: (s) => Buffer.from(s), decryptString: (b) => String(b) },
  powerSaveBlocker: { start: () => 1, stop() {}, isStarted: () => false },
  Notification: Object.assign(function () { return { show() {} }; }, { isSupported: () => true }),
  nativeImage: { createFromPath: () => ({ isEmpty: () => false }) },
  globalShortcut: { register: () => true, unregisterAll() {} },
  clipboard: { writeText() {} },
  screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }) }
};
const Modulo = require('module');
const resolverOriginal = Modulo._resolveFilename;
Modulo._resolveFilename = function (pedido, ...resto) {
  if (pedido === 'electron') return 'electron-de-teste';
  if (pedido === 'https') return 'https-de-teste'; // o checador de atualizacao nao sai pra rede no teste
  return resolverOriginal.call(this, pedido, ...resto);
};
require.cache['electron-de-teste'] = { id: 'electron-de-teste', filename: 'electron-de-teste', loaded: true, exports: eletronFalso };
require.cache['https-de-teste'] = { id: 'https-de-teste', filename: 'https-de-teste', loaded: true, exports: { get: () => ({ on() { return this; } }) } };
// o main.js registra um uncaughtException que so loga: sem este (que roda antes, por ser o primeiro),
// um erro do proprio teste terminaria calado com exit 0 e o npm test seguiria verde
process.on('uncaughtException', (e) => { console.log('FALHA excecao no teste: ' + ((e && e.stack) || e)); try { fs.rmSync(path.join(RAIZ, '.teste-tmp'), { recursive: true, force: true }); } catch {} process.exit(1); });
// comeca limpo: uma execucao interrompida nao pode deixar marca ou atalho pra proxima
try { fs.rmSync(path.join(RAIZ, '.teste-tmp'), { recursive: true, force: true }); } catch {}
try { fs.mkdirSync(path.join(RAIZ, '.teste-tmp'), { recursive: true }); } catch {}
let carregou = true, erroCarga = '';
try { require(path.join(RAIZ, 'main.js')); } catch (e) { carregou = false; erroCarga = e.message; }
ok(carregou, 'main.js carrega sem estourar' + (carregou ? '' : ' -> ' + erroCarga));
ok(registrados.size === canais.length, 'todos os canais foram registrados uma vez (' + registrados.size + ')');
ok(!erroPronto, 'a janela nasce: o corpo do whenReady roda sem erro' + (erroPronto ? ' -> ' + erroPronto.message : ''));

console.log('--- menu do app tem Edicao (sem ele o Cmd+V nao cola nada no macOS) ---');
const temEdicao = (mn) => !!mn && mn.items.some((it) => it.role === 'editMenu' || (it.submenu || []).some((x) => x.role === 'paste'));
ok(temEdicao(menuApp), process.platform + ': menu com Edicao (copiar/colar)');
{
  // de novo fingindo macOS: la o primeiro menu vira o menu do app, entao a Edicao nao pode ser o primeiro
  const plat0 = process.platform;
  Object.defineProperty(process, 'platform', { value: 'darwin' });
  menuApp = null; erroPronto = null; registrados.clear();
  delete require.cache[require.resolve(path.join(RAIZ, 'main.js'))];
  try { require(path.join(RAIZ, 'main.js')); } catch (e) { erroPronto = e; }
  Object.defineProperty(process, 'platform', { value: plat0 });
  ok(!erroPronto, 'macOS: main.js carrega e a janela nasce' + (erroPronto ? ' -> ' + erroPronto.message : ''));
  ok(temEdicao(menuApp) && menuApp.items[0].role === 'appMenu', 'macOS: menu do app primeiro e Edicao depois (senao Cmd+V e Cmd+Q somem)');
}

console.log('--- Abrir com o Windows: atalho no exe real da portatil e chave Run antiga apagada de verdade ---');
{
  // a bandeja roda num setTimeout de 1500 ms: aqui os timers sao guardados e o prepararBandeja roda na mao
  const timers = [], st0 = global.setTimeout, plat0 = process.platform;
  global.setTimeout = (fn) => { timers.push(fn); return 0; };
  Object.defineProperty(process, 'platform', { value: 'win32' });
  menuApp = null; erroPronto = null; registrados.clear();
  delete require.cache[require.resolve(path.join(RAIZ, 'main.js'))];
  try { require(path.join(RAIZ, 'main.js')); } catch (e) { erroPronto = e; }
  global.setTimeout = st0;
  const lnk = path.join(RAIZ, '.teste-tmp', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'PokeGrid.lnk');
  try { fs.mkdirSync(path.dirname(lnk), { recursive: true }); fs.writeFileSync(lnk, ''); } catch {} // opcao ja ligada
  const exePortatil = 'D:\\Jogos\\PokeGrid-portable.exe';
  process.env.PORTABLE_EXECUTABLE_FILE = exePortatil;
  const bandeja = timers.find((f) => f.name === 'prepararBandeja');
  let erroB = null;
  try { if (bandeja) bandeja(); } catch (e) { erroB = e; }
  delete process.env.PORTABLE_EXECUTABLE_FILE;
  Object.defineProperty(process, 'platform', { value: plat0 });
  ok(!erroPronto && !!bandeja && !erroB, 'a bandeja prepara sem erro' + (erroPronto || erroB ? ' -> ' + (erroPronto || erroB).message : (bandeja ? '' : ' -> prepararBandeja nao foi agendado')));
  ok(atalhos.length > 0 && atalhos[atalhos.length - 1].target === exePortatil, 'portatil: o atalho da Inicializar aponta pro .exe que o usuario abriu, nao pra pasta temporaria' + (atalhos.length ? ' (gravou ' + atalhos[atalhos.length - 1].target + ')' : ' (nao regravou)'));
  const apagou = (n) => itensLogin.some((o) => o && o.openAtLogin === false && o.name === n);
  ok(apagou('online.idleworld.pokegrid') && apagou('electron.app.PokeGrid'), 'chave Run antiga apagada pelos dois nomes, sem depender do getLoginItemSettings (que lia "desligado" por causa do --hidden)');
  ok(apagou('electron.app.Electron') && consultasLogin.some((o) => o && o.path === exePortatil), 'a entrada da 1.0.x/npm start (electron.app.Electron) sai, casada pelo exe real');
  ok(!apagou('OutroApp') && !apagou('electron.app.Maquina'), 'entrada de outro app (sem --hidden) e de HKLM ficam intactas');
  // o item da bandeja acompanha o botao da janela (antes ficava dessincronizado e pedia dois cliques)
  const itemB = menuBandeja && (menuBandeja.items || []).find((it) => it.type === 'checkbox');
  Object.defineProperty(process, 'platform', { value: 'win32' });
  let sinc = false;
  try { const r1 = tratadores['autostart:set'](null, false), c1 = itemB.checked, r2 = tratadores['autostart:set'](null, true); sinc = r1 === false && c1 === false && r2 === true && itemB.checked === true; } catch {}
  Object.defineProperty(process, 'platform', { value: plat0 });
  ok(!!itemB && sinc, 'bandeja: o item Abrir com o Windows segue o botao da janela nos dois sentidos');
  ok(fs.existsSync(path.join(RAIZ, '.teste-tmp', 'runkey-limpo-2')), 'limpeza marcada pra nao repetir');
}
console.log('--- scripts injetados nos paineis parseiam ---');
const pega = (marca) => { const i = index.indexOf(marca); if (i < 0) return null; const ini = index.indexOf('`', i) + 1; return index.slice(ini, index.indexOf('`;', ini)); };
[['READ_STATE', 'READ_STATE = `'], ['READ_ALERTS', 'READ_ALERTS = `('], ['HUNTS_JS', 'const HUNTS_JS = `'], ['SELLGUARD', 'const SELLGUARD = `']].forEach(([nome, marca]) => {
  const cru = pega(marca);
  if (cru == null) { ok(false, nome + ' sumiu do index.html'); return; }
  // o template literal e desescapado antes de rodar no painel; aqui fazemos o mesmo
  try { new Function(eval('`' + cru.replace(/\$\{[^}]*\}/g, '0') + '`')); ok(true, nome + ' parseia'); }
  catch (e) { ok(false, nome + ' com erro: ' + e.message.slice(0, 70)); }
});

console.log('--- o <script> da interface parseia ---');
const re = /<script>([\s\S]*?)<\/script>/g; let m, maior = '';
while ((m = re.exec(index))) { if (m[1].length > maior.length) maior = m[1]; }
try { new Function(maior); ok(true, 'index.html parseia (' + maior.length + ' chars)'); }
catch (e) { ok(false, 'index.html nao parseia: ' + e.message.slice(0, 80)); }

console.log('--- tudo que o app carrega vai no pacote (incidente 1.5.5 a 1.5.23: src/ ficou de fora e a tierlist morreu no instalador) ---');
{
  const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  const files = pkg.build && Array.isArray(pkg.build.files) ? pkg.build.files : null;
  const pedidos = [...index.matchAll(/<script src="([^"]+)"/g)].map((m2) => m2[1])
    .concat([...main.matchAll(/path\.join\(__dirname, '([^']+)'\)/g)].map((m2) => m2[1]));
  ok(pedidos.length >= 3, 'index.html e main.js pedem arquivos do app: ' + pedidos.join(', '));
  pedidos.forEach((p) => ok(fs.existsSync(path.join(RAIZ, p)), p + ' existe na pasta'));
  if (!files) ok(true, 'sem build.files no package.json: roda pelo codigo, nada e empacotado');
  else {
    const cobre = (p) => files.some((g) => g === p || (g.endsWith('/**/*') && p.startsWith(g.slice(0, -4))) || (g.endsWith('/**') && p.startsWith(g.slice(0, -2))));
    pedidos.forEach((p) => ok(cobre(p), p + ' esta em build.files (senao o instalador sobe sem ele e quem depende dele fica vazio)'));
  }
}

console.log('--- lancadores do Windows sem VBS (22/09/2026: o Defender marcou o zip do source como Trojan:Script/Wacatac.H!ml) ---');
{
  const naRaiz = fs.readdirSync(RAIZ);
  const scripts = naRaiz.filter((f) => /\.(vbs|vbe|wsf|wsh|hta|ps1)$/i.test(f));
  ok(scripts.length === 0, 'nenhum VBS/WSF/HTA/PowerShell na raiz' + (scripts.length ? ' -> ' + scripts.join(', ') : ''));
  if (naRaiz.includes('Abrir PokeGrid.bat')) {
    const bat = fs.readFileSync(path.join(RAIZ, 'Abrir PokeGrid.bat'), 'utf8');
    ok(bat.includes('start "" "node_modules\\electron\\dist\\electron.exe" .'), 'Abrir PokeGrid.bat abre o electron.exe direto (app de janela, sem terminal escondido)');
    ok(!/wscript|cscript|powershell|mshta|WindowStyle/i.test(bat), 'Abrir PokeGrid.bat sem wscript/powershell/janela oculta');
    // Electron 43 nao tem postinstall: o programa so e baixado quando alguem faz require('electron').
    // A 1.5.25 procurava o electron.exe logo depois do npm install e avisava 'nao terminou' pra sempre.
    const iPede = bat.indexOf('node -e "require(\'electron\')"'), iConfere = bat.lastIndexOf('if not exist "node_modules\\electron\\dist\\electron.exe"');
    ok(iPede > 0 && iPede < iConfere, 'Abrir PokeGrid.bat pede o download do Electron antes de conferir o electron.exe');
  } else ok(true, 'sem lancador .bat neste repo (o instalador abre o app)');
}
try { fs.rmSync(path.join(RAIZ, '.teste-tmp'), { recursive: true, force: true }); } catch {}
console.log(falhas ? '\n' + falhas + ' falha(s)' : '\nInicializacao: tudo certo');
process.exit(falhas ? 1 : 0);
