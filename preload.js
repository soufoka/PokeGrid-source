const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pokeAPI', {
  loadCreds: () => ipcRenderer.invoke('creds:load'),
  saveCreds: (accounts) => ipcRenderer.invoke('creds:save', accounts),
  setAwake: (on) => ipcRenderer.invoke('awake:set', on),
  onHotkey: (cb) => ipcRenderer.on('hotkey', (_e, k) => cb(k)),
  donate: () => ipcRenderer.invoke('donate'),
  notify: (title, body) => ipcRenderer.invoke('notify', title, body)
});
