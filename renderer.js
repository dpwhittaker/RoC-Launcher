const ipc = require('electron').ipcRenderer;
const shell = require('electron').shell;
const remote = require('electron').remote;
const fs = require('fs');
const process = require('child_process');
const server = require('./server');

const playBtn = document.getElementById('play');
const settingsBtn = document.getElementById('settings');
const websiteBtn = document.getElementById('web');
const discordBtn = document.getElementById('disc');

const rightContent = document.getElementById('rightcontent');
const rightSettings = document.getElementById('rightsettings');
const folderBox = document.getElementById('folder');
const browseBtn = document.getElementById('browse');
const news = document.getElementById('news');
const updates = document.getElementById('updates');
const minBtn = document.getElementById('minimize');
const maxBtn = document.getElementById('maximize');
const closeBtn = document.getElementById('close');

const configFile = require('os').homedir() + '/RoC-Launcher.json';
var config = {folder: 'C:/'};
if (fs.existsSync(configFile))
    config = JSON.parse(fs.readFileSync(configFile));
folderBox.value = config.folder;

minBtn.addEventListener('click', event => remote.getCurrentWindow().minimize());
maxBtn.addEventListener('click', event => {
    var window = remote.getCurrentWindow();
    if (!window.isMaximized()) window.maximize();
    else window.unmaximize();
});
closeBtn.addEventListener('click', event => remote.getCurrentWindow().close());

playBtn.addEventListener('click', event => {
    var args = ["--",
        "-s", "ClientGame", "loginServerAddress0=" + server.address, "loginServerPort0=" + server.port,
        "-s", "Station", "gameFeatures=34929",
        "-s", "SwgClient", "allowMultipleInstances=true"];
    const child = process.spawn("SWGEmu.exe", args, {cwd: config.folder, detached: true, stdio: 'ignore'});
    child.unref();
});

settings.addEventListener('click', event => {
    if (rightContent.style.display == 'none') {
        rightContent.style.display = 'block';
        rightSettings.style.display = 'none';
        settings.className = "button";
    } else {
        rightContent.style.display = 'none';
        rightSettings.style.display = 'block';
        settings.className = "button active";
    }
});

websiteBtn.addEventListener('click', event => shell.openExternal("http://relicsofcorbantis.com/"));
discordBtn.addEventListener('click', event => shell.openExternal("https://discordapp.com/channels/126343966848188417/289458004745650176"));

browseBtn.addEventListener('click', function (event) {
    ipc.send('open-directory-dialog');
});

ipc.on('selected-directory', function (event, path) {
    document.getElementById('folder').value = path;
    config.folder = path;
    fs.writeFileSync(configFile, JSON.stringify(config));
});

function removeHeader(webview) {
    return event => {
    webview.executeJavaScript(
        "document.getElementById('header').remove();" +
        "document.querySelector('.mob-menu-header-holder').remove();" +
        (webview == updates ?
        "document.querySelector('.entry-title').remove();" +
        "document.querySelector('.entry-content > p').remove();" +
        "document.querySelector('.entry-content > p').remove();"
        : "") +
        "document.querySelector('.mobmenu-push-wrap').style.paddingTop = 0;" +
        "document.getElementById('primary').style.marginTop = '" + (webview == updates ? 0 : 20) + "px';" +
        "document.getElementsByTagName('head')[0].innerHTML += \"<style>body::-webkit-scrollbar-track\
      {\
        -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3);\
        border-radius: 8px;\
        background-color: #cc9966;\
      }\
\
      body::-webkit-scrollbar\
      {\
        width: 8px;\
        background-color: #cc9966;\
      }\
\
      body::-webkit-scrollbar-thumb\
      {\
        border-radius: 8px;\
        -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,.3);\
        background-color: #7b1b1d;\
      }</style>\"");
    }
}
news.addEventListener("dom-ready", removeHeader(news));
updates.addEventListener("dom-ready", removeHeader(updates));
