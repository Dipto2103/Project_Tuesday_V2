import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// NOTE: Set 'base' to your GitHub repository name so that GitHub Pages
// serves assets from the correct sub-path (https://USER.github.io/REPO/).
// Replace 'The-martian-map' below with your exact repository name on GitHub.
export default defineConfig({
  plugins: [react()],
  base: '/The-martian-map/',   // <-- CHANGE THIS to match your exact GitHub repo name
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
