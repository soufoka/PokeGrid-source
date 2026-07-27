"use strict";

require("node:events").defaultMaxListeners = 30;

const { app, BrowserWindow, ipcMain, session } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const resultFile = path.join(app.getPath("temp"), "pokegrid-menu-runtime.json");
ipcMain.handle("creds:load", () => []);
ipcMain.handle("creds:save", () => true);
ipcMain.handle("awake:set", (_event, value) => !!value);
ipcMain.handle("mintray:set", (_event, value) => !!value);
ipcMain.handle("webhook:send", () => true);
ipcMain.handle("notify", () => true);
ipcMain.handle("preset:read", () => "");
ipcMain.handle("errlog:write", () => true);
ipcMain.handle("errlog:open", () => true);

app.whenReady().then(async () => {
  session.defaultSession.on("will-download", event => event.preventDefault());
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      webviewTag: true,
      preload: path.join(__dirname, "..", "preload.js")
    }
  });
  win.webContents.on("will-attach-webview", (_event, _preferences, params) => {
    params.src = pathToFileURL(path.join(__dirname, "webview-fixture.html")).href;
  });
  await win.loadFile(path.join(__dirname, "..", "index.html"));

  const result = await win.webContents.executeJavaScript(`(async () => {
    const waitFor = async predicate => {
      for (let i = 0; i < 100; i++) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw new Error('timeout esperando inicialização');
    };
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    await waitFor(() => document.querySelectorAll('#grid .panel').length === 4 && window.__pgMenuAudit);

    const menu = document.getElementById('menu');
    const menuBtn = document.getElementById('menuBtn');
    const open = () => { if (!menu.open) menuBtn.click(); assert(menu.open, 'menu não abriu'); };
    const close = () => { if (menu.open) document.getElementById('menuClose').click(); assert(!menu.open, 'menu não fechou'); };
    const report = [];
    const audit = window.__pgMenuAudit();
    assert(audit.ok && audit.shell, 'contrato do menu falhou');

    const toggles = [
      ['alerts', 'alerts'], ['sellguard', 'sellguard'], ['chat', 'chatHidden'],
      ['cleanHud', 'cleanHud'], ['muteAll', 'muted'], ['eco', 'eco'],
      ['awake', 'awake'], ['minTray', 'minTray'], ['sndShiny', 'sndShiny']
    ];
    for (const [id, key] of toggles) {
      open();
      const button = document.getElementById(id);
      const before = localStorage.getItem(key);
      const beforeOn = button.classList.contains('on');
      const beforeState = button.dataset.state;
      button.click();
      await new Promise(resolve => setTimeout(resolve, 30));
      assert(menu.open, id + ' fechou o menu sendo toggle');
      assert(localStorage.getItem(key) !== before, id + ' não persistiu estado');
      assert(button.classList.contains('on') !== beforeOn, id + ' não refletiu estado visual');
      assert(button.dataset.state && button.dataset.state !== beforeState, id + ' não mostrou estado textual');
      assert(button.dataset.active === (button.classList.contains('on') ? '1' : '0'), id + ' badge divergiu do estado');
      button.click();
      await new Promise(resolve => setTimeout(resolve, 20));
      report.push(id);
    }
    close();

    for (const webview of document.querySelectorAll('#grid webview')) {
      let clean = null;
      for (let attempt = 0; attempt < 50 && clean == null; attempt++) {
        try {
          clean = await webview.executeJavaScript("(()=>{const hidden=selector=>getComputedStyle(document.querySelector(selector)).display==='none';return ['.game-hud-tl','.game-hud-tr','nav.game-dock','.cap-panel','.ah-panel','.dex-window','.market-window','.mkt2-window','.clog-window','#pokemon-reader-panel','[data-pgchat]','#hunt-window'].every(hidden);})()");
        } catch {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
      assert(clean === true, 'Limpar jogo não ocultou todos os elementos em um painel');
    }

    open();
    document.getElementById('count').click();
    assert(!menu.open, 'Painéis não fechou o menu');
    assert(document.querySelectorAll('#grid .panel').length === 1, 'Painéis não alterou 4→1');
    document.getElementById('count').click();
    document.getElementById('count').click();
    document.getElementById('count').click();
    assert(document.querySelectorAll('#grid .panel').length === 4, 'Painéis não restaurou quatro contas');
    report.push('count');

    open();
    document.getElementById('layout').click();
    assert(!menu.open && document.getElementById('grid').classList.contains('one-col'), 'Layout não mudou para coluna');
    document.getElementById('layout').click();
    document.getElementById('layout').click();
    report.push('layout');

    open();
    document.querySelector('#langRow [data-lang="en"]').click();
    assert(!menu.open && document.documentElement.lang === 'en', 'Idioma EN não foi aplicado');
    document.querySelector('#langRow [data-lang="pt"]').click();
    report.push('langRow');

    open();
    document.getElementById('scriptsBtn').click();
    assert(!menu.open && document.getElementById('scOverlay').classList.contains('show'), 'Scripts não abriu');
    document.getElementById('scClose').click();
    report.push('scriptsBtn');

    open();
    document.getElementById('hunt').click();
    assert(!menu.open, 'Hunt não fechou Opções');
    report.push('hunt');

    open();
    document.getElementById('bkExp').click();
    assert(!menu.open, 'Exportar não fechou Opções');
    report.push('bkExp');

    let filePicker = false;
    const nativeInputClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file') { filePicker = true; return; }
      return nativeInputClick.call(this);
    };
    open();
    document.getElementById('bkImp').click();
    HTMLInputElement.prototype.click = nativeInputClick;
    assert(!menu.open && filePicker, 'Importar não abriu seletor de arquivo');
    report.push('bkImp');

    open();
    document.getElementById('errlogBtn').click();
    assert(!menu.open, 'Erros não fechou Opções');
    report.push('errlogBtn');

    document.getElementById('experienceV2Btn').click();
    assert(document.getElementById('experienceV2').classList.contains('pgx-open'), 'Central não abriu');
    assert(document.querySelector('[data-pgx-tab="all"]').classList.contains('on'), 'Central não abriu em Todas as contas');

    assert(report.length === 17, 'quantidade de opções testadas: ' + report.length);
    return { ok: true, controls: report };
  })()`);

  process.stdout.write(`Options runtime: ${result.controls.length} controls passed\\n`);
  fs.writeFileSync(resultFile, JSON.stringify(result));
  win.destroy();
  app.exit(0);
}).catch(error => {
  try { fs.writeFileSync(resultFile, JSON.stringify({ ok: false, error: String(error && error.stack || error) })); } catch {}
  process.stderr.write(`${error && error.stack || error}\\n`);
  app.exit(1);
});
