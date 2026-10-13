import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// NOTE: Set 'base' to your GitHub repository name so that GitHub Pages
// serves assets from the correct sub-path (https://USER.github.io/REPO/).
// Replace 'The-martian-map' below with your exact repository name on GitHub.
export default defineConfig({
  plugins: [react()],
  base: '/Project_Mongol_Pathik_2/',   // GitHub Pages sub-path: https://Dipto2103.github.io/Project_Mongol_Pathik_2/
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
