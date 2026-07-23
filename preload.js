const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pokeAPI', {
  loadCreds: () => ipcRenderer.invoke('creds:load'),
  saveCreds: (accounts) => ipcRenderer.invoke('creds:save', accounts),
  setAwake: (on) => ipcRenderer.invoke('awake:set', on),
  onHotkey: (cb) => ipcRenderer.on('hotkey', (_e, k) => cb(k)),
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  readPreset: (name) => ipcRenderer.invoke('preset:read', name),
  logError: (origem, msg) => ipcRenderer.invoke('errlog:write', origem, msg),
  openErrorLog: () => ipcRenderer.invoke('errlog:open')
});
