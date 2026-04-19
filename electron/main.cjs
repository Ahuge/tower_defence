/**
 * Electron main process — launches the app window and loads the
 * Vite production bundle from disk.
 *
 * Why CommonJS: Electron's main-process entry point is simplest in
 * CJS and Electron toolchains still assume it. The renderer (our
 * game) stays ESM — nothing changes there.
 *
 * No Steamworks integration here yet. When that lands it attaches
 * to this same process via steamworks.js before createWindow().
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

/** Build output lives at `dist/` with `index.html` at the root when
 *  we build with VITE_BASE_PATH=./. Keep the path relative so the
 *  packaged app resolves it inside the asar archive. */
const INDEX_HTML = path.join(__dirname, '..', 'dist', 'index.html');

/** Dev mode opens devtools and loads from a running Vite dev server
 *  instead of the packaged bundle. Toggled with ELECTRON_DEV=1. */
const IS_DEV = process.env.ELECTRON_DEV === '1';
const DEV_URL = process.env.ELECTRON_DEV_URL || 'http://localhost:5173/';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#15101a',
    title: 'Factions',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep sandboxed by default — flip off later only if a
      // specific plugin needs Node in the renderer.
      sandbox: true,
    },
  });

  // Menu: minimal. We could add a full role-based menu later when
  // Steam overlay / window controls come into scope.
  win.setMenuBarVisibility(false);

  // Open external links in the user's default browser, not inside
  // the Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (IS_DEV) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(INDEX_HTML);
  }

  // Surface renderer console errors in the main-process log —
  // useful when debugging packaged builds.
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[electron] renderer gone:', details);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: re-create a window when the dock icon is clicked and
    // no windows are open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps stay active in the dock until explicitly quit.
  if (process.platform !== 'darwin') app.quit();
});
