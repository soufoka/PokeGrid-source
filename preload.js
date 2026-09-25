const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pokeAPI', {
  loadCreds: () => ipcRenderer.invoke('creds:load'),
  saveCreds: (accounts) => ipcRenderer.invoke('creds:save', accounts),
  setAwake: (on) => ipcRenderer.invoke('awake:set', on),
  setMinToTray: (on) => ipcRenderer.invoke('mintray:set', on),
  webhook: (url, text) => ipcRenderer.invoke('webhook:send', url, text),
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (on) => ipcRenderer.invoke('autostart:set', on),
  onAutoStart: (cb) => ipcRenderer.on('autostart', (_e, on) => cb(on)),
  onHotkey: (cb) => ipcRenderer.on('hotkey', (_e, k) => cb(k)),
  onJanela: (cb) => ipcRenderer.on('janela', (_e, v) => cb(!!v)), // janela visivel (true) ou minimizada/na bandeja (false)
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  readPreset: (name) => ipcRenderer.invoke('preset:read', name),
  logError: (origem, msg) => ipcRenderer.invoke('errlog:write', origem, msg),
  openErrorLog: () => ipcRenderer.invoke('errlog:open'),
  saveBackup: (nome, conteudo, cabecalho) => ipcRenderer.invoke('backup:save', nome, conteudo, cabecalho),
  clearAccount: (i) => ipcRenderer.invoke('conta:limpar', i),
  fetchUserScript: (url) => ipcRenderer.invoke('userscript:fetch', url),
  // versao do app: vem do processo principal (a UA nao carrega mais o token pokegrid/x, e o
  // preload roda em sandbox, entao require de arquivo local nao e confiavel)
  appVersion: (() => { try { return ipcRenderer.sendSync('app:version'); } catch { return ''; } })()
});
