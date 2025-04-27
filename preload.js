const fs = require('fs');
const path = require('path');
const { mergeMarkdownWithTemplate } = require('./modules/yamlProcessor');
const imageProcessor = require('./modules/imageProcessor');
const { contextBridge, ipcRenderer } = require('electron');

const configPath = path.join(__dirname, 'import-config.json');

contextBridge.exposeInMainWorld('api', {
  fs,
  path,
  ipc: {
    invoke: ipcRenderer.invoke.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer),
    send: ipcRenderer.send.bind(ipcRenderer)
  },
  mergeMarkdownWithTemplate,
  utils: {
    isValidDirectory: (targetPath) => {
      try {
        const stat = fs.statSync(targetPath);
        return stat.isDirectory();
      } catch {
        return false;
      }
    }
  },
  configAPI: {
    saveConfig: (config) => {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    },
    loadConfig: () => {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(raw);
      }
      return null;
    }
  },
  processImageLinks: imageProcessor.processImageLinks
});
