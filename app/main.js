const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 1024, height: 600, show: false, autoHideMenuBar: true, frame: false})
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  //mainWindow.webContents.openDevTools()
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.once('closed', () => mainWindow = null)
}

app.on('ready', createWindow)
app.on('window-all-closed', () => app.quit())

const ipc = require('electron').ipcMain
const dialog = require('electron').dialog

ipc.on('open-directory-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }, function (files) {
    if (files) event.sender.send('selected-directory', files[0])
  })
})