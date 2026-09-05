import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const parsedPort = Number.parseInt(env.VITE_PORT || env.PORT || '4173', 10);

  return {
    plugins: [
      react()
    ],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      alias: {
        react: path.resolve(rootDir, 'node_modules/react'),
        'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
    define: {
      // Polyfill sûr pour process.env (évite les crashs si une lib le lit) — sans injecter de secrets
      'process.env': {},
    },
    build: {
      outDir: 'dist',
    },
    appType: 'spa',
    preview: {
      host: env.VITE_HOST || env.HOST || '127.0.0.1',
      port: Number.isFinite(parsedPort) ? parsedPort : 4173,
    },
    server: {
      host: env.VITE_HOST || env.HOST || '127.0.0.1',
      port: Number.isFinite(parsedPort) ? parsedPort : 4173,
    },
  };
});
