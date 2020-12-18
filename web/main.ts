import { app, BrowserWindow, screen, session } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import * as process from 'process';
import * as os from 'os';
import * as fs from 'fs';
import { electron } from 'process';

let win: BrowserWindow = null;
let serverPid: any = null;

const args = process.argv.slice(1);
const local = args.some((val) => val === '--local');

function createWindow(): BrowserWindow {
  const electronScreen = screen;

  //const size = electronScreen.getPrimaryDisplay().workAreaSize;
 
  const height = 1920;
  const width = 1080;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: width,
    height: height,
    webPreferences: {
      sandbox: false,
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: false, // false if you want to run 2e2 test with Spectron
      enableRemoteModule: true // true if you want to run 2e2 test  with Spectron or use remote module in renderer context (ie. Angular)
      //preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (local) {
    win.webContents.openDevTools();
  }
  win.loadFile(path.join(__dirname, 'dist/dash-frontend/index.html'));

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  win.webContents.on('did-fail-load', () => {
    win.loadFile(path.join(__dirname, 'dist/dash-frontend/index.html'));
  });

  return win;
}

const startBinary = () => {
  const tmpPath = path.join(os.tmpdir(), 'octant');
  fs.mkdir(path.join(tmpPath), { recursive: true }, (err) => {
    if (err) {
      throw err;
    }
  });

  const out = fs.openSync(path.join(tmpPath, 'api.out.log'), 'a');
  const err = fs.openSync(path.join(tmpPath, 'api.err.log'), 'a');

  let serverBinary: string;
  if (local) {
    serverBinary = path.join(__dirname, 'extraResources', 'octant');
  } else {
    serverBinary = path.join(process.resourcesPath, 'extraResources', 'octant');
  }

  //TODO: find random open port and use --listener-addr
  // Ensure random port can be passed to:
  // web/src/app/data/services/websocket/websocket.service.ts#L206
  const server = child_process.spawn(serverBinary, ['--disable-open-browser'], {
    env: { ...process.env, NODE_ENV: 'production' },
    detached: true,
    stdio: ['ignore', out, err],
  });

  serverPid = server.pid;
  server.unref();
};

try {
  app.on('before-quit', () => {
    process.kill(serverPid, 'SIGHUP');
  });
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window.
  // More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => {
    startBinary();
    setTimeout(createWindow, 400);
    // TODO: ensure this port matches random port.
    session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['ws://localhost:7777/api/v1/stream'] }, (details, callback) => {
      details.requestHeaders['Origin'] = null;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
  });

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });
} catch (e) {
  // Catch Error
  // throw e;
}
