import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local development mirrors Netlify: /api/* is proxied to the backend with the /api prefix removed.
const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
