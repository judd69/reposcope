import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the production build works when served from
  // https://judd69.github.io/reposcope/ (GitHub Pages, /docs folder).
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    sourcemap: false,
  },
});
