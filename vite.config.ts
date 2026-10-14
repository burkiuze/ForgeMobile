import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cross-origin isolation lets the on-device model runtime (wllama) use threads.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, headers: isolation },
  preview: { port: 4173, headers: isolation },
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000 },
  worker: { format: 'es' },
});
