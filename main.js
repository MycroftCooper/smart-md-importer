const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false, // ✅ 更安全写法
          sandbox: false,
          devTools: true
        }
    });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


const { ipcMain, dialog } = require('electron');

// 选择 .md 文件
ipcMain.handle('select-md-file', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    properties: ['openFile', 'multiSelections']
  });
  return result.canceled ? null : result.filePaths;
});

// 选择目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-yaml-file', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'YAML 或 Markdown', extensions: ['md', 'yml', 'yaml'] }],
      properties: ['openFile']
    });
    return result.canceled ? null : result.filePaths;
  });
  
