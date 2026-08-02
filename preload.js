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
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  readPreset: (name) => ipcRenderer.invoke('preset:read', name),
  fetchUserScript: (url) => ipcRenderer.invoke('userscript:fetch', url),
  getUserScriptInfo: (url) => ipcRenderer.invoke('userscript:info', url),
  logError: (origem, msg) => ipcRenderer.invoke('errlog:write', origem, msg),
  openErrorLog: () => ipcRenderer.invoke('errlog:open')
});
