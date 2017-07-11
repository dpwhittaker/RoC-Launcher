const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const log = require('electron-log');
const {autoUpdater} = require('electron-updater');
const path = require('path');
const url = require('url');

log.transports.file.file = require('os').homedir() + '/RoC-Launcher-log.txt';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({width: 1024, height: 600, show: false, autoHideMenuBar: true, frame: false});
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  if (require('electron-is-dev')) mainWindow.webContents.openDevTools();
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.once('closed', () => mainWindow = null);
}

app.on('ready', createWindow);
app.on('window-all-closed', () => app.quit());

ipcMain.on('open-directory-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }, function (files) {
    if (files) event.sender.send('selected-directory', files[0])
  });
});

autoUpdater.on('update-downloaded', (info) => {
  autoUpdater.quitAndInstall();  
});

autoUpdater.on('update-available', info => {
  mainWindow.webContents.send('downloading-update', 'Downloading version ' + info.version);
})

app.on('ready', function()  {
  autoUpdater.checkForUpdates();
});