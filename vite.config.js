import { defineConfig } from 'vite';

const base = process.env.VITE_BASE_PATH
  || (process.env.NODE_ENV === 'production' ? '/health-tracker/' : '/');

export default defineConfig({
  base,
  
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  }
});
