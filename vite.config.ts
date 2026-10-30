import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
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

/**
 * Écrit le manifeste des modules du build (chunk → modules, module → hash du code transformé)
 * dans le cache du prérendu, hors de dist/. Il permet au prérendu incrémental de savoir si le
 * code exécuté par une page a changé, sans liste de fichiers à maintenir.
 */
const prerenderModuleManifest = (): Plugin => {
  const manifest = { entry: '', chunks: {} as Record<string, string[]>, modules: {} as Record<string, string> };
  const keyOf = (id: string) => path.relative(rootDir, id.split('?')[0]).split(path.sep).join('/');
  return {
    name: 'prerender-module-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        if (chunk.isEntry) manifest.entry = chunk.fileName;
        manifest.chunks[chunk.fileName] = chunk.moduleIds.map(keyOf);
        for (const id of chunk.moduleIds) {
          const code = this.getModuleInfo(id)?.code ?? id;
          manifest.modules[keyOf(id)] = createHash('sha256').update(code).digest('hex');
        }
      }
    },
    writeBundle() {
      const config = JSON.parse(fs.readFileSync(path.join(rootDir, 'scripts/prerender.config.json'), 'utf8'));
      const cacheDir = path.resolve(rootDir, process.env.PRERENDER_CACHE_DIR || config.cacheDir);
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, 'modules.json'), JSON.stringify(manifest));
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const parsedPort = Number.parseInt(env.VITE_PORT || env.PORT || '4173', 10);

  return {
    plugins: [
      react(),
      seoRoutesManifest(),
      prerenderModuleManifest(),
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
