import { defineConfig } from 'vite';

export default defineConfig({
  // For GitHub Pages: set base to repo name
  // e.g. if deployed to https://username.github.io/tower-defence/
  // Change this to match your repo name:
  base: '/tower-defence/',

  build: {
    chunkSizeWarningLimit: 1500,
  },
});
