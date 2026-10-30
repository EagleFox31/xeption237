import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSeoContentRoutes } from './content/seo';

/** Émet dist/seo-routes.json : routes de contenu SEO consommées par sitemap et prerender. */
const seoRoutesManifest = (): Plugin => ({
  name: 'seo-routes-manifest',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'seo-routes.json', source: JSON.stringify(getSeoContentRoutes(), null, 2) });
  },
});

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const parsedPort = Number.parseInt(env.VITE_PORT || env.PORT || '4173', 10);

  return {
    plugins: [
      react(),
      seoRoutesManifest(),
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
      host: env.VITE_HOST || env.HOST || true,
      port: Number.isFinite(parsedPort) ? parsedPort : 4173,
    },
    server: {
      host: env.VITE_HOST || env.HOST || true,
      port: Number.isFinite(parsedPort) ? parsedPort : 4173,
    },
  };
});
