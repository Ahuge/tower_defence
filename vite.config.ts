import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// Get git SHA at build time
const gitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
})();

export default defineConfig({
  base: '/tower_defence/',

  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
  },

  build: {
    chunkSizeWarningLimit: 1500,
  },
});
