import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the AI‑aktie‑hjalp project.  This sets up the
// React plugin and defines the server port for local development.  Vercel
// automatically detects the build command and output directory, so no
// additional configuration is required here.

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});