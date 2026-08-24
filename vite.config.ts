import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// prerender moved to scripts/prerender.mjs (post-build)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const parsedPort = Number.parseInt(env.VITE_PORT || env.PORT || '4173', 10);

  return {
    plugins: [
      react()
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    define: {
      // Polyfill spécifique pour API_KEY
      'process.env.API_KEY': JSON.stringify(
        env.VITE_GEMINI_API_KEY || env.API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || ''
      ),
      // Polyfill sûr pour process.env pour éviter les crashs si d'autres libs l'utilisent, mais sans injecter l'objet Node complet
      'process.env': {}
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: env.VITE_HOST || env.HOST || '127.0.0.1',
      port: Number.isFinite(parsedPort) ? parsedPort : 4173,
    },
  };
});
