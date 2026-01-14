import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Polyfill spécifique pour API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      // Polyfill sûr pour process.env pour éviter les crashs si d'autres libs l'utilisent, mais sans injecter l'objet Node complet
      'process.env': {}
    },
    build: {
      outDir: 'dist',
    }
  };
});