import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Get git SHA at build time
const gitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
})();

// Native wrappers (Capacitor, Electron) load the bundle via the
// file:// protocol, so asset URLs must be relative (`./`). Web
// deployments (GitHub Pages) still need the `/tower_defence/`
// prefix. Pick via env — `VITE_BASE_PATH=./ npm run build` for
// native, default web otherwise.
const BASE_PATH = process.env.VITE_BASE_PATH ?? '/tower_defence/';

export default defineConfig({
  base: BASE_PATH,

  // Preact JSX
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxImportSource: 'preact',
  },

  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },

  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().replace('T', ' ').slice(0, 19)),
  },

  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html'),
        skinEditor: resolve(__dirname, 'skin-editor.html'),
        circleEditor: resolve(__dirname, 'circle-editor.html'),
      },
    },
  },
});
