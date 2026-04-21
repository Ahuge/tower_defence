/**
 * Electron preload script.
 *
 * Runs in the renderer *before* any page script but with access to
 * Node APIs (limited by contextIsolation + sandbox). Exposes a
 * minimal surface on `window.__td_electron` that the renderer's
 * PlatformBridge detection watches for.
 *
 * Kept deliberately small. Real native APIs (Steamworks, IAP, etc)
 * live behind contextBridge.exposeInMainWorld calls added as they
 * land — each gets its own named namespace to keep accidents
 * contained.
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('__td_electron', {
  // Version / platform info so the renderer can show build metadata
  // and the PlatformBridge detector can hit an always-truthy probe.
  version: process.versions.electron,
  platform: process.platform, // 'darwin' | 'win32' | 'linux'
  // When Steam integration lands we'll add:
  //   steam: { init(), getUser(), unlockAchievement(id), ... }
  // — exposed through its own IPC channel.
});
