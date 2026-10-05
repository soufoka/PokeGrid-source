const { app, BrowserWindow, ipcMain, safeStorage, Tray, Menu, powerSaveBlocker, shell, session, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

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


// Backups automaticos (config semanal e hunts que sairiam do limite de 150): grava em
// userData/backups sem dialogo. Nome vem do renderer, entao e tratado como hostil: so o
// basename, charset restrito, so .json e .csv (um .html gravado aqui abriria sem a CSP da
// interface), teto de 2MB, e no maximo 12 arquivos por familia (prefixo + data ou numero).
ipcMain.handle('backup:save', (_e, nome, conteudo, cabecalho) => {
  try {
    if (typeof nome !== 'string' || typeof conteudo !== 'string') return false;
    nome = path.basename(nome);
    if (!/^[\w.-]{1,60}$/.test(nome) || !/\.(json|csv)$/i.test(nome) || conteudo.length + (typeof cabecalho === 'string' ? cabecalho.length : 0) > 2e6) return false;
    const dir = path.join(app.getPath('userData'), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const alvo = path.join(dir, nome);
    // anexar so faz sentido no csv; num .json anexado o arquivo deixa de ser JSON valido e o
    // backup nao volta mais na hora que o usuario precisa
    const anexavel = /\.csv$/i.test(nome);
    if (anexavel && fs.existsSync(alvo)) fs.appendFileSync(alvo, conteudo);
    else fs.writeFileSync(alvo, (typeof cabecalho === 'string' ? cabecalho : '') + conteudo);
    // irmaos = mesma familia: prefixo + so data/numero + extensao. Nome so de digitos ('0.json', prefixo vazio) ou de
    // prefixo curto ('h1.json') pegava a pasta inteira, e 12 arquivos de enchimento apagavam o historico de hunts e os config
    const prefixo = nome.replace(/[\d-]+\.\w+$/, '');
    const irmaos = prefixo ? fs.readdirSync(dir).filter((f) => f.startsWith(prefixo) && /^[\d-]+\.\w+$/.test(f.slice(prefixo.length))).sort() : [];
    while (irmaos.length > 12) { try { fs.unlinkSync(path.join(dir, irmaos.shift())); } catch { break; } }
    return true;
  } catch (e) { try { logErro('backup', String(e && e.message).slice(0, 200)); } catch {} return false; }
});

// Limpa os dados do jogo de UMA conta (cookies, storage e cache da particao dela). Resolve conta
// "bugada" sem mexer nas outras; a senha salva do treinador nao mora ai e sobrevive.
ipcMain.handle('conta:limpar', async (_e, i) => {
  i = Math.trunc(+i);
  if (!(i >= 0 && i <= 3)) return false;
  try {
    // os paineis usam persist:conta1..4 (i + 1); sem o +1 aqui limpava a conta do lado
    const ses = session.fromPartition('persist:conta' + (i + 1));
    await ses.clearStorageData();
    await ses.clearCache();
    return true;
  } catch (e) { try { logErro('conta', 'limpar conta' + i + ': ' + String(e && e.message).slice(0, 150)); } catch {} return false; }
});

// Baixa userscript do GitHub (base: PR #4 do JulianoCLI). Guardas: so https, so github.com e
// raw.githubusercontent.com, redirect revalidado pela mesma funcao, no maximo 3 saltos, 2MB e
// timeouts. Conserto proprio: link /blob/ (o que se copia do navegador) vira raw, senao o app
// instalava a PAGINA HTML como se fosse o script.
const US_HOSTS = new Set(['github.com', 'raw.githubusercontent.com']);
function urlRaw(u) {
  if (u.hostname === 'github.com') {
    const p = u.pathname.split('/').filter(Boolean); // owner/repo/blob/branch/caminho...
    const i = p.indexOf('blob');
    if (i >= 2 && p.length > i + 2) return new URL('https://raw.githubusercontent.com/' + p[0] + '/' + p[1] + '/' + p.slice(i + 1).join('/'));
  }
  return u;
}
function baixaUserScript(url, saltos = 0) {
  return new Promise((resolve) => {
    let u;
    try { u = urlRaw(new URL(String(url))); } catch { resolve({ ok: false, error: 'Link invalido.' }); return; }
    if (u.protocol !== 'https:' || !US_HOSTS.has(u.hostname) || !/\.js$/i.test(u.pathname)) {
      resolve({ ok: false, error: saltos ? 'O GitHub redirecionou para um endereco fora da lista (link de release?). Use o link do arquivo .js dentro do repositorio.' : 'Use um link https do GitHub para um arquivo .js' }); return;
    }
    const req = https.get(u, { headers: { 'User-Agent': 'PokeGrid/' + app.getVersion(), Accept: 'text/plain' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (saltos >= 3) { resolve({ ok: false, error: 'Redirecionamentos demais.' }); return; }
        let prox; try { prox = new URL(res.headers.location, u).toString(); } catch { resolve({ ok: false, error: 'Redirecionamento invalido.' }); return; }
        baixaUserScript(prox, saltos + 1).then(resolve); return;
      }
      if (res.statusCode !== 200) { res.resume(); resolve({ ok: false, error: 'GitHub respondeu HTTP ' + res.statusCode }); return; }
      let tam = 0, corpo = '', parou = false;
      res.setEncoding('utf8');
      res.on('data', (c) => {
        if (parou) return;
        tam += Buffer.byteLength(c);
        if (tam > 2 * 1024 * 1024) { parou = true; req.destroy(); resolve({ ok: false, error: 'O script passa de 2 MB.' }); }
        else corpo += c;
      });
      res.on('end', () => {
        if (parou) return;
        const c0 = corpo.trim(); // pagina de erro/HTML do GitHub nao e script: nenhum .js valido comeca com '<'
        if (!c0 || c0[0] === '<') { resolve({ ok: false, error: 'Esse link nao devolveu um arquivo .js. Abra o arquivo no GitHub e copie o link dele.' }); return; }
        resolve({ ok: true, url: u.toString(), code: corpo });
      });
      res.on('error', () => { if (!parou) { parou = true; resolve({ ok: false, error: 'Falha ao ler o script.' }); } });
    });
    req.setTimeout(12000, () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve({ ok: false, error: 'Nao foi possivel acessar o GitHub.' }));
  });
}
ipcMain.handle('userscript:fetch', (_e, url) => baixaUserScript(url));
// Instancia unica: abrir o app de novo so foca a janela ja aberta.
// segunda instancia: fecha e o 'second-instance' da primeira mostra a janela dela. Fica no relatorio, pra separar
// 'nem rodou' (antivirus, Controle inteligente de aplicativos) de 'ja tinha um aberto' quando alguem diz que nada abre
// O quit() antes do ready nao impede o ready: sem o lockOk o whenReady criava a janela e gravava 'janela criada' aqui tambem
const lockOk = app.requestSingleInstanceLock();
if (!lockOk) { logErro('boot', 'ja havia um PokeGrid aberto: esta instancia fechou e mostrou aquele'); app.quit(); }

// ===== GPU que nao abre isolada no Windows =====
// Se o processo da placa de video nao sobe dentro do sandbox, o Chromium tenta 6 vezes e fecha o app antes da janela
// ("GPU process isn't usable. Goodbye."). O --no-sandbox abria, mas tirava o isolamento das paginas do jogo junto. Aqui
// sai do sandbox so a GPU (--disable-gpu-sandbox), um nivel so e sem loop: com a flag ligada nada disto age de novo.
// Medido no Electron 43: se a GPU sobe e cai, o JS recebe 5 child-process-gone antes do fim, e no primeiro o app anota
// e reabre com a flag. Se ela nem chega a abrir (launch-failed), nenhum evento chega; por isso a abertura grava
// gpu-boot-pendente, que so o primeiro quadro da janela (ready-to-show) ou uma saida normal apagam. Se sobrou, a abertura
// anterior morreu antes da janela e esta ja vem com a flag. A marca gpu-sem-sandbox.txt vale so pra esta versao do app e
// do Electron (atualizou, tenta com sandbox de novo); apagar o arquivo tambem volta ao normal.
const gpuArq = (n) => path.join(app.getPath('userData'), n);
const GPU_VERSAO = app.getVersion() + ' / Electron ' + process.versions.electron;
let gpuSemSandbox = process.argv.includes('--disable-gpu-sandbox'), gpuEsperando = false;
const gpuLimpa = () => { try { fs.unlinkSync(gpuArq('gpu-boot-pendente')); } catch {} };
const gpuPronto = () => { gpuEsperando = false; gpuLimpa(); };
function gpuMarca(motivo) {
  gpuSemSandbox = true;
  try {
    fs.writeFileSync(gpuArq('gpu-sem-sandbox.txt'), GPU_VERSAO + '\n' +
      'PokeGrid: a placa de video deste PC nao abriu isolada, entao so ela roda fora do sandbox; as paginas do jogo continuam isoladas. Apague este arquivo pra tentar de novo com o sandbox.\n' +
      'PokeGrid: the graphics process would not start sandboxed on this PC, so only it runs outside the sandbox; game pages stay sandboxed. Delete this file to try the sandbox again.\n' +
      'PokeGrid: la tarjeta de video de este PC no abrio aislada, asi que solo ella corre fuera del sandbox; las paginas del juego siguen aisladas. Borra este archivo para intentar de nuevo con el sandbox.\n');
  } catch (e) { logErro('gpu', 'marca nao gravada: ' + e.message); }
  logErro('gpu', motivo + ': so a placa de video fica fora do sandbox (--disable-gpu-sandbox); as paginas do jogo continuam isoladas');
}
if (lockOk && process.platform === 'win32') {
  gpuEsperando = true;
  app.on('will-quit', gpuLimpa);
  app.on('child-process-gone', (_e, d) => {
    if (!gpuEsperando || gpuSemSandbox || !d || d.type !== 'GPU' || d.reason === 'clean-exit') return;
    gpuMarca('a placa de video caiu antes da janela aparecer (' + d.reason + (d.exitCode != null ? ', exit ' + d.exitCode : '') + '), reabrindo');
    gpuLimpa(); // esta abertura sai de proposito: a proxima nao pode ler a pendencia como falha com a flag ligada
    // Na portatil o process.execPath fica na pasta temporaria que o lancador apaga ao fechar: reabre pelo .exe de fora.
    // ponytail: a pasta temporaria e fixa por build, entao o lancador velho ainda pode estar apagando enquanto o novo
    // extrai. No pior caso esta reabertura falha e a proxima abertura ja vem com a marca; pasta unica resolveria.
    app.relaunch({ execPath: exeReal(), args: process.argv.slice(1).concat('--disable-gpu-sandbox') });
    app.exit(0);
  });
  try {
    let versao = null;
    try { versao = fs.readFileSync(gpuArq('gpu-sem-sandbox.txt'), 'utf8').split(/\r?\n/)[0]; } catch {}
    if (versao === GPU_VERSAO) gpuSemSandbox = true;
    else if (versao !== null) { try { fs.unlinkSync(gpuArq('gpu-sem-sandbox.txt')); } catch {} logErro('gpu', 'versao nova do app ou do Electron: a placa de video volta a tentar com sandbox'); }
    const morreu = fs.existsSync(gpuArq('gpu-boot-pendente'));
    if (morreu && !gpuSemSandbox) gpuMarca('a abertura anterior fechou antes da janela aparecer');
    else if (morreu) logErro('gpu', 'a abertura anterior fechou antes da janela aparecer mesmo com a placa de video fora do sandbox: veja no FAQ "No Windows o app fecha sozinho"');
    else if (gpuSemSandbox) logErro('gpu', 'abrindo com --disable-gpu-sandbox (apague gpu-sem-sandbox.txt nesta pasta pra voltar ao sandbox)');
    if (gpuSemSandbox) app.commandLine.appendSwitch('disable-gpu-sandbox');
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(gpuArq('gpu-boot-pendente'), String(Date.now()));
  } catch (e) { logErro('gpu', 'marca de abertura: ' + ((e && e.message) || e)); }
}

// Paineis presos ao dominio do jogo: nada de popup, e navegar o painel
// (que carrega a sessao logada) para outro site abre no navegador de fora.
const GAME = 'https://poke.idleworld.online';
// Limite deslizante: a pagina do jogo (ou um XSS nela) pedia abrir link e o navegador do
// usuario abria sem limite. 3 por 10s cobre o uso real (clicar num link) e corta enxurrada.
let aberturas = [];
const abreFora = (url) => {
  if (!/^https?:\/\//i.test(url)) return;
  const agora = Date.now();
  aberturas = aberturas.filter((t) => agora - t < 10000);
  if (aberturas.length >= 3) { try { logErro('painel', 'link externo descartado (limite de 3 por 10s): ' + String(url).slice(0, 120)); } catch {} return; }
  aberturas.push(agora);
  shell.openExternal(url);
};
app.on('web-contents-created', (_e, contents) => {
  if (contents.getType() !== 'webview') return;
  contents.setWindowOpenHandler(({ url }) => { abreFora(url); return { action: 'deny' }; });
  // compara a ORIGEM, nao o prefixo: 'https://poke.idleworld.online.evil.com' comeca igual e
  // passaria, levando a sessao logada pra um site clonado sem barra de endereco
  const mesmoJogo = (u) => { try { return new URL(u).origin === new URL(GAME).origin; } catch { return false; } };
  const guarda = (e, url) => {
    if (!mesmoJogo(url) && url !== 'about:blank') { e.preventDefault(); abreFora(url); }
  };
  contents.on('will-navigate', guarda);
  contents.on('will-redirect', guarda);
  // watchdog: se o processo do painel morrer (crash/OOM), recarrega sozinho. Recuo crescente (1,5 s, 3 s, 6 s... ate 1 min):
  // painel que cai de novo antes de terminar de carregar nao fica recarregando a cada 1,5 s pra sempre. Carregou, zera.
  let quedas = 0;
  contents.on('did-finish-load', () => { quedas = 0; });
  contents.on('render-process-gone', (_ev, d) => {
    if (d.reason !== 'clean-exit') {
      const espera = Math.min(1500 * 2 ** quedas++, 60000);
      logErro('painel', 'processo do painel caiu: ' + d.reason + (d.exitCode != null ? ' (exit ' + d.exitCode + ')' : '') + ', recarrega em ' + espera / 1000 + ' s');
      setTimeout(() => { try { contents.reload(); } catch {} }, espera);
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
  try {
    const json = JSON.stringify(accounts);
    // sem cripto do sistema, gravar em texto puro seria quebrar a promessa do app calado:
    // melhor recusar e dizer, que o renderer avisa e o relatorio de erros guarda o motivo
    if (!safeStorage.isEncryptionAvailable()) { logErro('creds', 'sistema sem cripto (safeStorage indisponivel): as senhas NAO foram salvas'); return false; }
    const data = safeStorage.encryptString(json);
    const f = credFile();
    fs.writeFileSync(f + '.tmp', data);
    fs.renameSync(f + '.tmp', f); // troca atomica: fechar o app no meio nao corrompe
    return true;
  } catch (e) {
    // disco cheio, antivirus segurando o .tmp (EPERM), pasta sem permissao: quem chamou precisa saber,
    // senao o modal fecha como se tivesse salvo e a senha some no proximo boot
    logErro('creds', 'falha ao salvar contas: ' + e.message);
    return false;
  }
});

// UA consistente pra passar na Cloudflare: remove o token "Electron/..." e
// congela a versão do Chrome em .0.0.0, casando com os client hints (navigator.userAgentData).
// Deriva da versão real do Chromium, então acompanha upgrades do Electron sozinho.
app.userAgentFallback = app.userAgentFallback
  .replace(/ Electron\/[\d.]+/, '')
  // tira tambem o token do proprio app (pokegrid/1.5.x): a UA nao precisa entregar quem usa o
  // PokeGrid pro servidor do jogo
  .replace(/ [\w.-]+\/[\d.]+ (?=Chrome\/)/i, ' ')
  .replace(/(Chrome\/\d+)[\d.]+/, '$1.0.0.0');

// Notificacao do SO (alertas de queda e de sem pokebola).
// versao do app pro badge do topo (sendSync: disponivel no load, mesmo com o preload em sandbox)
ipcMain.on('app:version', (e) => { e.returnValue = app.getVersion(); });
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
// A portatil se extrai numa pasta temporaria e roda de la: process.execPath e %TEMP%\<id>\PokeGrid.exe,
// que e apagada ao fechar. O .exe que o usuario abriu vem nesta variavel, que o electron-builder exporta.
const exeReal = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
function setAutoStart(on) {
  if (process.platform !== 'win32') return false;
  try {
    if (on) {
      const opts = { target: exeReal(), description: 'PokeGrid', appUserModelId: 'online.idleworld.pokegrid' };
      if (!app.isPackaged) opts.args = `"${app.getAppPath()}"`; // rodando pelo codigo: electron + a pasta do app
      shell.writeShortcutLink(startupLnk(), 'create', opts);
    } else {
      try { fs.unlinkSync(startupLnk()); } catch {}
    }
  } catch (e) { logErro('autostart', String((e && e.message) || e)); }
  return autoStartOn();
}
ipcMain.handle('autostart:get', () => ({ on: autoStartOn(), suportado: process.platform === 'win32' }));
let itemAuto = null; // o item "Abrir com o Windows" da bandeja, pra acompanhar o botao da janela
ipcMain.handle('autostart:set', (_e, on) => { const r = setAutoStart(!!on); if (itemAuto) itemAuto.checked = r; return r; });

// Webhook do Discord (opcional): o usuario cola a URL do proprio servidor. So aceita o dominio
// oficial de webhooks; o envio sai daqui porque a CSP do renderer bloqueia rede externa.
ipcMain.handle('webhook:send', (_e, url, text) => {
  try {
    const u = new URL(String(url));
    if (u.protocol !== 'https:' || !/^(?:(?:ptb|canary)\.)?discord(?:app)?\.com$/.test(u.hostname) || !u.pathname.startsWith('/api/webhooks/')) return false; // ptb. e canary.: a URL que o Discord PTB/Canary copia
    // Mencao: so os IDs de usuario que JA estao no texto (o app so poe o que voce configurou).
    // parse: [] segue barrando @everyone/@here e cargos, mesmo se o nome de uma conta tentar.
    const ids = (String(text).match(/<@(\d{5,20})>/g) || []).map(x => x.replace(/\D/g, '')).slice(0, 5);
    const body = JSON.stringify({ content: String(text).slice(0, 1900), allowed_mentions: { parse: [], users: ids } });
    // resolve com o status de verdade: sem isso o botao Testar dava OK ate com webhook apagado
    return new Promise((pronto) => {
      const req = https.request(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => { res.resume(); pronto(res.statusCode < 300); });
      req.on('error', () => pronto(false));
      req.setTimeout(8000, () => { req.destroy(); pronto(false); });
      req.end(body);
    });
  } catch { return false; }
});

let tray; // referencia viva para o icone nao sumir (GC)

app.whenReady().then(() => {
  if (!lockOk) return; // segunda instancia: ja esta saindo
  // Nada aqui pode derrubar a criacao da janela: se qualquer peca do sistema falhar (registro,
  // particao de sessao corrompida, bandeja), o app tem que abrir assim mesmo. Antes destas
  // guardas, uma excecao aqui deixava o processo vivo e SEM JANELA, que e o pior sintoma possivel.
  try { app.setAppUserModelId('online.idleworld.pokegrid'); } catch (e) { logErro('boot', 'appUserModelId: ' + e.message); } // notificacoes do Windows com o nome certo

  // Nega pedidos de permissao dos jogos (mic, camera, localizacao, notificacao...). So a escrita no clipboard passa:
  // sem ela os botoes Copiar do jogo (Recovery Key, codigos 2FA, Pix, link de indicacao) falhavam calados. O Chromium
  // ja exige foco e gesto do usuario pra essa escrita, e a leitura (clipboard-read) segue negada.
  const soClipboard = (_wc, p, cb) => cb(p === 'clipboard-sanitized-write');
  for (let i = 1; i <= 4; i++)
    try {
      const ses = session.fromPartition('persist:conta' + i);
      ses.setPermissionRequestHandler(soClipboard);
      // Checagem sem pedido: o padrao responde "concedido", e o jogo e os userscripts liam os nomes do microfone, da
      // camera e do alto-falante (enumerateDevices). Nega so essas duas; o resto segue o padrao.
      ses.setPermissionCheckHandler((_wc, p) => p !== 'media' && p !== 'speaker-selection');
    } catch (e) { logErro('boot', 'sessao conta' + i + ': ' + e.message); }
  // A janela principal (onde ficam as senhas) tambem: sem isto a sessao padrao concedia tudo. O botao de copiar o link usa o clipboard.
  try { session.defaultSession.setPermissionRequestHandler(soClipboard); } catch (e) { logErro('boot', 'sessao padrao: ' + e.message); }

  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    webPreferences: { webviewTag: true, preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  win.loadFile(path.join(__dirname, 'index.html')); // caminho absoluto: robusto no build empacotado (asar)
  // A janela principal (que le as senhas) so mostra o index.html e nao navega pra lugar nenhum, nem file:// (um .html
  // gravado no disco ou arrastado pra janela abria sem a CSP e com o pokeAPI). Passa so a recarga da propria pagina:
  // o importar backup termina em location.reload(), que no Electron 43 tambem dispara will-navigate. Pro navegador de
  // fora vao so os links fixos da interface; antes ia qualquer URL, e um XSS mandava as senhas na query de um link.
  const LINKS = new Set(['https://github.com/soufoka/PokeGrid-source', 'https://github.com/soufoka/PokeGrid-source/blob/main/FAQ.md',
    'https://github.com/soufoka/PokeGrid-source/blob/main/MANUAL.md', 'https://link.mercadopago.com.br/pokegrid',
    'https://github.com/soufoka/PokeGrid/releases/latest']); // selo de versao nova no instalador/portatil
  const linkFixo = (url) => { if (LINKS.has(url)) abreFora(url); };
  win.webContents.on('will-navigate', (e, url) => { if (url !== win.webContents.getURL()) { e.preventDefault(); linkFixo(url); } });
  win.webContents.setWindowOpenHandler(({ url }) => { linkFixo(url); return { action: 'deny' }; });

  // registra travamento/queda da propria interface no relatorio de erros
  win.webContents.on('unresponsive', () => logErro('janela', 'interface travou (sem responder)'));
  win.webContents.on('responsive', () => logErro('janela', 'interface voltou a responder'));
  // A interface caiu (falta de memoria, por exemplo): os 4 paineis morrem junto e nada voltava. Recarregar recria os
  // paineis; no maximo 3 vezes por hora, pra uma interface que cai em loop nao ficar recarregando sem fim.
  let quedasJanela = [];
  win.webContents.on('render-process-gone', (_e2, d) => {
    if (d.reason === 'clean-exit') return;
    const agora = Date.now();
    quedasJanela = quedasJanela.filter((t) => agora - t < 3600e3);
    const volta = quedasJanela.length < 3;
    if (volta) { quedasJanela.push(agora); setTimeout(() => { try { if (!win.isDestroyed()) win.webContents.reload(); } catch {} }, 1500); }
    logErro('janela', 'interface caiu: ' + d.reason + (d.exitCode != null ? ' (exit ' + d.exitCode + ')' : '') + (volta ? ', recarregando' : ', ja recarregou 3 vezes na ultima hora: nao recarrega mais, feche e abra o app'));
  });
  // Mostra a janela quando o conteudo esta pronto. Precisa do show() explicito: no Linux
  // varios gerenciadores de janela ignoram maximize() em janela ainda nao exibida, e o app
  // subia sem abrir nada. --hidden: nasce na bandeja, farmando.
  logErro('boot', 'janela criada');
  win.once('ready-to-show', gpuPronto); // a GPU entregou o primeiro quadro (dispara tambem com --hidden, janela escondida)
  if (!process.argv.includes('--hidden')) {
    // rede de seguranca se o evento nao vier; se ele veio, ela sai de cena (senao reabria a janela que o usuario minimizou)
    const rede = setTimeout(() => { if (!win.isDestroyed() && !win.isVisible()) { logErro('boot', 'rede de seguranca: mostrando a janela'); win.show(); win.maximize(); } }, 8000);
    win.once('ready-to-show', () => { clearTimeout(rede); logErro('boot', 'conteudo pronto'); win.show(); win.maximize(); });
  }

  // Atalhos (funcionam mesmo com o jogo focado): Ctrl+1..4 expande painel, Ctrl+M mudo.
  // O menu Edicao tem que existir: no macOS e ele que faz Cmd+C/V/X/A/Z funcionarem nos campos de
  // texto (login do jogo, chat, campos do app), e sem ele o Cmd+V nao colava nada. No Windows e no
  // Linux o Ctrl+V ja funcionava sem menu. No macOS o primeiro menu vira o menu do app (com o nome
  // PokeGrid), por isso o appMenu (Ocultar, Sair com Cmd+Q) vem antes, senao a Edicao sumia la dentro.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu', label: 'Edição' },
    {
      label: 'Atalhos',
      submenu: [
        ...[1, 2, 3, 4].map(n => ({
          label: `Expandir painel ${n}`, accelerator: `CmdOrCtrl+${n}`,
          click: () => win.webContents.send('hotkey', 'expand' + (n - 1))
        })),
        { label: 'Mudo', accelerator: 'CmdOrCtrl+M', click: () => win.webContents.send('hotkey', 'mute') }
      ]
    }
  ]));

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
    // versao portatil movida de pasta deixa o atalho da Inicializar apontando pra um exe que nao
    // existe mais, e o botao seguia dizendo "ligado": regrava quando o alvo mudou
    try { if (autoStartOn() && shell.readShortcutLink(startupLnk()).target !== exeReal()) setAutoStart(true); } catch {}
    // limpeza do autostart antigo (chave Run, que abria com --hidden): uma unica vez na vida.
    // Apaga pelo nome do valor, sem perguntar antes: o getLoginItemSettings() compara o caminho COM os
    // argumentos, e o antigo gravava '--hidden', entao a checagem dizia "desligado" e nada era apagado
    // (da 1.5.5 a 1.5.24 a marca 'runkey-limpo' foi gravada sem limpar nada). Da 1.1.3 a 1.5.4 o valor
    // tinha o AppUserModelId do app; antes, o nome padrao do Electron, 'electron.app.' + ProductName do
    // exe: PokeGrid nos builds 1.1.0 a 1.1.2, Electron no zip da 1.0.x e rodando pelo codigo.
    try {
      const marca = path.join(app.getPath('userData'), 'runkey-limpo-2');
      if (process.platform === 'win32' && !fs.existsSync(marca)) {
        for (const name of ['online.idleworld.pokegrid', 'electron.app.PokeGrid'])
          try { app.setLoginItemSettings({ openAtLogin: false, name }); } catch (e) { logErro('boot', 'runkey ' + name + ': ' + e.message); }
        // 'electron.app.Electron' e o nome de qualquer app Electron sem marca: nao da pra apagar as cegas.
        // Apaga so o que o proprio Electron casa com o NOSSO exe e que abria escondido (--hidden). O caminho vai entre
        // aspas, como o Electron espera: sem elas "C:\Users\Joao Silva\..." virava "C:\Users\Joao" e casava com a entrada
        // de OUTRO programa gravada sem aspas (que era apagada no lugar da nossa). O set com openAtLogin false apaga pelo nome.
        try {
          for (const it of (app.getLoginItemSettings({ path: '"' + exeReal() + '"' }).launchItems || []))
            if (it && it.scope === 'user' && (it.args || []).includes('--hidden')) app.setLoginItemSettings({ openAtLogin: false, name: it.name });
        } catch (e) { logErro('boot', 'runkey itens: ' + e.message); }
        try { fs.writeFileSync(marca, '1'); } catch {}
      }
    } catch {}
  // Bandeja nao existe em todo ambiente (Linux sem indicador, por exemplo). Se falhar, o app
  // segue funcionando sem bandeja em vez de morrer no boot.
  try {
    tray = new Tray(path.join(__dirname, 'tray.png'));
    tray.setToolTip('PokeGrid');
    const menuBandeja = Menu.buildFromTemplate([
      { label: 'Mostrar', click: mostrar },
      { label: 'Abrir com o Windows', type: 'checkbox',
        checked: autoStartOn(), visible: process.platform === 'win32',
        click: (item) => { const r = setAutoStart(item.checked); item.checked = r; win.webContents.send('autostart', r); } },
      { label: 'Sair', click: () => app.quit() }
    ]);
    tray.setContextMenu(menuBandeja);
    itemAuto = (menuBandeja.items || []).find((it) => it.type === 'checkbox') || null;
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
  // A interface nao percebe sozinha que a janela sumiu: com backgroundThrottling desligado (o que segura o farm)
  // a pagina fica 'visible' ate na bandeja e os 4 jogos seguiam desenhando pra ninguem. Avisa, e ela poe os jogos
  // no modo leve do Simples. Some = false; qualquer sinal de volta (show, restore, focus) = true, pra nunca ficar preso.
  const avisaJanela = (v) => { try { if (!win.isDestroyed()) win.webContents.send('janela', v); } catch {} };
  win.on('hide', () => avisaJanela(false)); win.on('minimize', () => avisaJanela(false));
  win.on('show', () => avisaJanela(true)); win.on('restore', () => avisaJanela(true)); win.on('focus', () => avisaJanela(true));
  win.webContents.on('did-finish-load', () => avisaJanela(win.isVisible() && !win.isMinimized())); // nasceu na bandeja (--hidden)
  app.on('second-instance', () => mostrar());

  // checa atualizacao (nao incomoda quem abriu escondido na bandeja pra farmar)
});

app.on('window-all-closed', () => app.quit());
