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
      // Polyfill sûr pour process.env (évite les crashs si une lib le lit) — sans injecter de secrets
      'process.env': {},
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
