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
// Chave Run como o Electron 43 le (browser_win.cc): o caminho pedido e cada valor passam pelo CommandLine::FromString e so o
// programa (argv[0]) e comparado. Sem aspas, um caminho com espaco vira "D:\Meus" e casa com o valor de outro programa.
const programa = (s) => { const m = /^\s*(?:"([^"]*)"|(\S+))/.exec(String(s || '')); return m ? (m[1] !== undefined ? m[1] : m[2]) : ''; };
const EXE_PORTATIL = 'D:\\Meus Jogos\\PokeGrid-portable.exe';
const CHAVE_RUN = [
  ['electron.app.Electron', '"' + EXE_PORTATIL + '" --hidden', 'user'], // 1.0.x e npm start: o Electron grava entre aspas
  ['OutroApp', 'D:\\Meus Jogos\\Outro App\\outro.exe --hidden', 'user'], // outro programa, gravado sem aspas
  ['electron.app.Maquina', '"' + EXE_PORTATIL + '" --hidden', 'machine'] // HKLM: o app nunca gravou la
];
const eletronFalso = {
  app: Object.assign(eventos(), {
    // sincrono: o corpo que cria janela e menu roda dentro do require (antes o process.exit do fim
    // chegava antes da Promise e esse trecho nunca era exercitado). A bandeja fica num setTimeout de
    // 1500 ms e NAO e exercitada aqui.
    whenReady: () => ({ then(cb) { try { cb(); } catch (e) { erroPronto = e; } } }),
    getPath: (n) => { if (!(n in CAMINHOS)) throw new Error("path desconhecido: " + n); return CAMINHOS[n]; },
    getVersion: () => '0.0.0-teste', getName: () => 'PokeGrid', getAppPath: () => RAIZ, isPackaged: false,
    quit() {}, focus() {}, setAppUserModelId() {}, setLoginItemSettings(o) { itensLogin.push(o); },
    // como no Electron: sem args, a entrada antiga com --hidden le 'desligado'; launchItems vem casado pelo programa do caminho
    getLoginItemSettings: (o) => {
      consultasLogin.push(o);
      const alvo = programa(o && o.path).toLowerCase();
      return { openAtLogin: false, launchItems: CHAVE_RUN.filter(([, v]) => alvo && programa(v).toLowerCase() === alvo)
        .map(([name, v, scope]) => ({ name, path: programa(v), args: v.includes('--hidden') ? ['--hidden'] : [], scope })) };
    },
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
  session: { defaultSession: { setPermissionRequestHandler() {} }, fromPartition: () => ({ setPermissionRequestHandler() {}, setPermissionCheckHandler() {} }) },
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
  const exePortatil = EXE_PORTATIL;
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
  ok(apagou('electron.app.Electron') && consultasLogin.some((o) => o && o.path === '"' + exePortatil + '"'), 'a entrada da 1.0.x/npm start (electron.app.Electron) sai, casada pelo exe real entre aspas (caminho com espaco)');
  ok(!apagou('OutroApp') && !apagou('electron.app.Maquina'), 'entrada de outro programa (gravada sem aspas, com --hidden) e de HKLM ficam intactas');
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

console.log('--- janela minimizada ou na bandeja: a interface fica sabendo (e poe os jogos no modo leve) ---');
{
  const ev = (e, v) => main.includes("win.on('" + e + "', () => avisaJanela(" + v + '))');
  ok(ev('hide', false) && ev('minimize', false), 'main.js avisa quando a janela some (hide e minimize)');
  ok(ev('show', true) && ev('restore', true) && ev('focus', true), 'e quando volta, por show, restore ou focus (nenhum caminho deixa os jogos presos no modo leve)');
  ok(preload.includes("onJanela: (cb) => ipcRenderer.on('janela'") && index.includes('window.pokeAPI.onJanela(aplicaJanela)'), 'o preload repassa e a interface escuta');
  ok(index.includes('const ecoFps = () => leve() ? 1 : (eco ? 15 : 0);') && index.includes('if (leve()) wv.executeJavaScript(ultraScript(true))'), 'escondida, os jogos vao pro modo do Simples, inclusive painel que recarrega nesse meio tempo');
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
    const iPede = bat.indexOf('node -e "require(\'electron\')"'), iConfere = bat.indexOf('if exist "node_modules\\electron\\path.txt" if exist "node_modules\\electron\\dist\\electron.exe" goto abre');
    ok(iPede > 0 && iPede < iConfere, 'Abrir PokeGrid.bat pede o download do Electron antes de conferir o path.txt e o electron.exe');
    ok(iConfere < bat.indexOf('\r\n:abre\r\n') && bat.indexOf('\r\n:abre\r\n') < bat.indexOf('start "" '), 'Abrir PokeGrid.bat so chega no start pelo goto abre, com path.txt e electron.exe no lugar');
    ok(bat.includes('if not exist "node_modules\\electron\\path.txt" set "PG_FALTA=1"') && bat.includes('if not exist "node_modules\\electron\\dist\\electron.exe" set "PG_FALTA=1"') && bat.includes('if defined PG_FALTA ('), 'Abrir PokeGrid.bat reinstala se faltar o path.txt (extracao pela metade) OU o electron.exe (antivirus levou depois)');
    ok(!/[^\r]\n/.test(bat), 'Abrir PokeGrid.bat todo em CRLF (com LF o cmd erra goto e blocos)');
    ok(bat.split('\r\n').filter((l) => /^\s+echo /i.test(l)).every((l) => !/[()]/.test(l)), 'Abrir PokeGrid.bat sem parenteses nos echo dentro de bloco');
    // 27/09/2026: o motivo real da falha rolava pra fora da janela. A saida vai pra tela e pro instalacao.log, recriado a cada tentativa.
    ok(/set PG_TEE=node -e "[^"\r\n]*createWriteStream\('instalacao\.log'/.test(bat) && bat.includes('call npm install --no-audit --no-fund 2>&1 | %PG_TEE%') && bat.includes('node -e "require(\'electron\')" 2>&1 | %PG_TEE%') && /" > instalacao\.log\r\n/.test(bat), 'Abrir PokeGrid.bat copia npm install e download do Electron pra tela e pro instalacao.log');
    const achas = ['Cannot find module', 'fetch failed', 'expected checksum', 'os error 32', 'native binding'].map((p) => bat.lastIndexOf('/c:"' + p + '"'));
    ok(achas.every((i, k) => i > iConfere && (k === 0 || i > achas[k - 1])), 'Abrir PokeGrid.bat le o motivo no log: dependencia < rede < checksum < arquivo travado < extrator barrado (o ultimo vence)');
    ok(bat.includes('echo A instalacao nao terminou. %PG_MOTIVO%') && /instalacao\.log no Discord/.test(bat), 'Abrir PokeGrid.bat diz o motivo provavel e pede o instalacao.log no Discord');
    // Extrator nativo barrado (Controle inteligente de aplicativos, Visual C++ faltando, .node apagado): o zip ja baixou e passou
    // no checksum, entao o tar do Windows extrai. path.txt sem quebra de linha, senao o Electron procura "electron.exe\r\n".
    const iNativo = bat.indexOf('findstr /c:"native binding" instalacao.log >nul 2>&1 && (');
    ok(iNativo > iPede && iNativo < iConfere && bat.includes('"%SystemRoot%\\System32\\tar.exe" -xf ') && bat.includes('&& <nul set /p "=electron.exe" > "node_modules\\electron\\path.txt"'), 'Abrir PokeGrid.bat extrai com o tar do Windows quando o extrator do Electron foi barrado');
    // aberto de dentro do zip ou copiado sozinho pra Area de Trabalho: rodava o npm install fora da pasta do app
    const iPkg = bat.indexOf('if not exist "package.json" (\r\n'), blocoPkg = iPkg > 0 ? bat.slice(iPkg, bat.indexOf('\r\n)\r\n', iPkg)) : '';
    ok(iPkg > bat.indexOf('cd /d "%~dp0"\r\n') && iPkg < bat.indexOf('set "PG_FALTA="') && blocoPkg.includes('Extrair tudo') && /\r\n {2}pause\r\n {2}exit \/b$/.test(blocoPkg), 'Abrir PokeGrid.bat fora da pasta do app (sem o package.json do lado): explica e para antes do npm install');
  } else ok(true, 'sem lancador .bat neste repo (o instalador abre o app)');
  if (naRaiz.includes('iniciar.bat')) {
    // o electron.cmd que o npm cria em node_modules\.bin quebra com & no caminho da pasta, e o npm start passava por ele
    const ini = fs.readFileSync(path.join(RAIZ, 'iniciar.bat'), 'utf8'), iCli = ini.indexOf('node "node_modules\\electron\\cli.js" .');
    ok(iCli > 0 && !/call npm start/i.test(ini) && ini.indexOf('if errorlevel 1 (') > iCli, 'iniciar.bat abre pelo cli.js do Electron, sem o npm start, e segue mostrando o erro');
  }
  if (naRaiz.includes('iniciar.sh')) {
    // instalacao interrompida deixava a pasta node_modules sem o Electron; com Node velho o erro falava de sandbox
    const sh = fs.readFileSync(path.join(RAIZ, 'iniciar.sh'), 'utf8'), iSemPath = sh.indexOf('if [ ! -f node_modules/electron/path.txt ]; then\n');
    ok(iSemPath > 0 && !sh.includes('[ ! -d node_modules ]') && iSemPath < sh.indexOf('a>22||a===22&&b>=12') && sh.indexOf('a>22||a===22&&b>=12') < sh.indexOf('\n  npm install\n') && !sh.includes('\r'), 'iniciar.sh reinstala quando falta o path.txt do Electron, confere o Node 22.12 antes e segue em LF');
  }
}
try { fs.rmSync(path.join(RAIZ, '.teste-tmp'), { recursive: true, force: true }); } catch {}
console.log(falhas ? '\n' + falhas + ' falha(s)' : '\nInicializacao: tudo certo');
process.exit(falhas ? 1 : 0);
