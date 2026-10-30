import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  classifyDataRequests,
  codeFingerprint,
  createDataContext,
  extractAssetRefs,
  extractLinkedRoutes,
  hashOf,
  isExpired,
  openPrerenderCache,
  planRoutes,
  rebaseHtmlAssets,
  stableStringify,
  // @ts-expect-error module .mjs sans déclarations de types
} from '../../scripts/lib/prerenderCache.mjs';

const catalog = {
  table: 'products',
  routePrefix: '/product/',
  categoryField: 'category',
  membershipFields: ['id', 'brand', 'category', 'is_published', 'rejected_at'],
  ignoreFields: [],
};
const routeOf = (row: { id: string }) => `/product/p-${row.id}`;
const rows = [
  { id: 'a', name: 'A', category: 'phones', brand: 'x', price: 100 },
  { id: 'b', name: 'B', category: 'phones', brand: 'y', price: 200 },
  { id: 'c', name: 'C', category: 'laptops', brand: 'z', price: 300 },
];
const globals = { brands: [{ id: 1, name: 'X', slug: 'x' }] };
const ctx = (productRows = rows, g = globals) => createDataContext({ productRows, routeOf, globals: g, catalog });
const withRow = (id: string, patch: object) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row));

describe('stableStringify / hashOf', () => {
  it("ne dépend pas de l'ordre des clés", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
    expect(hashOf({ b: 1, a: 2 })).toBe(hashOf({ a: 2, b: 1 }));
  });
});

describe('rebaseHtmlAssets', () => {
  const shell =
    '<html><head><title>x</title><script type="module" crossorigin src="/assets/index-NEW.js"></script>' +
    '<link rel="stylesheet" crossorigin href="/assets/index-NEW.css"></head><body><div id="root"></div></body></html>';
  const cached =
    '<html><head><title>Produit</title><script type="module" crossorigin src="/assets/index-OLD.js"></script>' +
    '<link rel="stylesheet" crossorigin href="/assets/index-OLD.css">' +
    '<link rel="modulepreload" as="script" crossorigin href="/assets/LandingPage-OLD.js">' +
    '<link rel="stylesheet" href="/assets/LandingPage-OLD.css"></head>' +
    '<body><div id="root"><img src="/assets/logo-abc.png"><a href="/product/p-a">A</a></div></body></html>';

  it('remplace toutes les balises JS/CSS du build par celles du shell courant', () => {
    const html = rebaseHtmlAssets(cached, shell);
    expect(html).not.toMatch(/OLD/);
    expect(html).toContain('src="/assets/index-NEW.js"');
    expect(html).toContain('href="/assets/index-NEW.css"');
    expect(html).toContain('<title>Produit</title>');
    expect(extractAssetRefs(html).sort()).toEqual(['/assets/index-NEW.css', '/assets/index-NEW.js', '/assets/logo-abc.png']);
  });

  it('est idempotent', () => {
    const once = rebaseHtmlAssets(cached, shell);
    expect(rebaseHtmlAssets(once, shell)).toBe(once);
  });

  it('refuse un HTML sans </head>', () => {
    expect(() => rebaseHtmlAssets('<div></div>', shell)).toThrow();
  });
});

describe('extractLinkedRoutes', () => {
  it('extrait les liens produit sans doublon, query ni slash final', () => {
    const html = '<a href="/product/p-a">x</a><a href="/product/p-b/?ref=1">y</a><a href="/product/p-a">z</a><a href="/shop">s</a>';
    expect(extractLinkedRoutes(html, '/product/')).toEqual(['/product/p-a', '/product/p-b']);
  });
});

describe('classifyDataRequests', () => {
  const options = {
    supabaseUrl: 'https://abc.supabase.co',
    knownTables: ['products', 'brands'],
    ignoredPaths: ['/auth/v1/', '/storage/v1/'],
  };

  it('sépare sources connues et inconnues, ignore les autres origines', () => {
    const result = classifyDataRequests(
      [
        'https://abc.supabase.co/rest/v1/products?select=*',
        'https://abc.supabase.co/rest/v1/brands?select=id',
        'https://abc.supabase.co/rest/v1/reviews?product_id=eq.a',
        'https://abc.supabase.co/rest/v1/rpc/get_stock',
        'https://abc.supabase.co/functions/v1/quote',
        'https://abc.supabase.co/auth/v1/user',
        'https://abc.supabase.co/storage/v1/object/public/img.png',
        'https://www.googletagmanager.com/gtm.js',
        'not a url',
      ],
      options,
    );
    expect(result.tables).toEqual(['brands', 'products']);
    expect(result.unknown).toEqual(['/functions/v1/quote', 'reviews', 'rpc:get_stock']);
  });
});

describe('createDataContext', () => {
  const pageA = '/product/p-a';
  const base = ctx();

  it('fiche : stable si un produit non lié et hors catégorie change', () => {
    expect(ctx(withRow('c', { price: 999 })).fingerprint(pageA, [])).toBe(base.fingerprint(pageA, []));
  });

  it('fiche : change si sa propre ligne change (prix, stock, specs…)', () => {
    expect(ctx(withRow('a', { price: 101 })).fingerprint(pageA, [])).not.toBe(base.fingerprint(pageA, []));
  });

  it('fiche : change si un produit qu’elle lie change ou disparaît', () => {
    const deps = ['/product/p-c'];
    expect(ctx(withRow('c', { price: 999 })).fingerprint(pageA, deps)).not.toBe(base.fingerprint(pageA, deps));
    expect(ctx(rows.filter((row) => row.id !== 'c')).fingerprint(pageA, deps)).not.toBe(base.fingerprint(pageA, deps));
  });

  it('fiche : change si la composition de sa catégorie change (produits similaires)', () => {
    const added = [...rows, { id: 'd', name: 'D', category: 'phones', brand: 'x', price: 50 }];
    expect(ctx(added).fingerprint(pageA, [])).not.toBe(base.fingerprint(pageA, []));
    // Le prix d'un produit de la même catégorie, non lié, ne touche pas la composition.
    expect(ctx(withRow('b', { price: 250 })).fingerprint(pageA, [])).toBe(base.fingerprint(pageA, []));
  });

  it('listing : change dès que le catalogue change', () => {
    expect(ctx(withRow('c', { price: 999 })).fingerprint('/shop', [])).not.toBe(base.fingerprint('/shop', []));
    expect(ctx().fingerprint('/shop', [])).toBe(base.fingerprint('/shop', []));
  });

  it('toutes les pages changent si une source globale change', () => {
    const g2 = { brands: [{ id: 1, name: 'X2', slug: 'x' }] };
    expect(ctx(rows, g2).fingerprint(pageA, [])).not.toBe(base.fingerprint(pageA, []));
    expect(ctx(rows, g2).fingerprint('/', [])).not.toBe(base.fingerprint('/', []));
  });

  it("indépendant de l'ordre des lignes renvoyées", () => {
    expect(ctx([...rows].reverse()).fingerprint('/shop', [])).toBe(base.fingerprint('/shop', []));
    expect(ctx([...rows].reverse()).fingerprint(pageA, ['/product/p-c'])).toBe(base.fingerprint(pageA, ['/product/p-c']));
  });

  it('ignoreFields exclut les champs volatils', () => {
    const c = { ...catalog, ignoreFields: ['views'] };
    const a = createDataContext({ productRows: withRow('a', { views: 1 }), routeOf, globals, catalog: c });
    const b = createDataContext({ productRows: withRow('a', { views: 2 }), routeOf, globals, catalog: c });
    expect(a.fingerprint(pageA, [])).toBe(b.fingerprint(pageA, []));
  });
});

describe('codeFingerprint', () => {
  const hashes = { 'App.tsx': '1', 'pages/ProductPage.tsx': '2' };
  it('change si un module chargé change ou disparaît, pas sinon', () => {
    const fp = codeFingerprint(['pages/ProductPage.tsx', 'App.tsx'], hashes);
    expect(codeFingerprint(['App.tsx', 'pages/ProductPage.tsx'], { ...hashes, 'pages/AdminPage.tsx': '9' })).toBe(fp);
    expect(codeFingerprint(['App.tsx', 'pages/ProductPage.tsx'], { ...hashes, 'App.tsx': '3' })).not.toBe(fp);
    expect(codeFingerprint(['App.tsx', 'pages/ProductPage.tsx'], { 'App.tsx': '1' })).not.toBe(fp);
  });
});

describe('isExpired', () => {
  const ttl = { ttlDays: 7, ttlJitterDays: 2 };
  const day = 24 * 60 * 60 * 1000;
  const now = Date.parse('2026-10-30T00:00:00Z');
  const at = (days: number) => ({ renderedAt: new Date(now - days * day).toISOString() });

  it('jamais avant TTL - gigue, toujours après TTL', () => {
    expect(isExpired(at(4.9), '/x', now, ttl)).toBe(false);
    expect(isExpired(at(7), '/x', now, ttl)).toBe(true);
    expect(isExpired({ renderedAt: 'garbage' }, '/x', now, ttl)).toBe(true);
  });
});

describe('planRoutes', () => {
  const now = Date.parse('2026-10-30T00:00:00Z');
  const fresh = new Date(now - 1000).toISOString();
  const entry = (patch = {}) => ({ setId: 's', codeFp: 'c', dataFp: 'd', deps: [], renderedAt: fresh, html: 'h', ...patch });
  const base = {
    now,
    ttl: { ttlDays: 7, ttlJitterDays: 2 },
    full: false,
    codeFp: () => 'c',
    dataFp: (route: string) => (route === '/data' ? 'd2' : 'd'),
    htmlExists: (e: { html?: string }) => e.html !== 'missing',
  };

  it('donne la bonne raison pour chaque cas', () => {
    const entries = new Map<string, object>([
      ['/same', entry()],
      ['/data', entry()],
      ['/code', entry({ codeFp: 'old' })],
      ['/old', entry({ renderedAt: new Date(now - 8 * 24 * 3600 * 1000).toISOString() })],
      ['/volatile', entry({ volatile: true })],
      ['/missing', entry({ html: 'missing' })],
      ['/removed', entry()],
    ]);
    const routes = ['/same', '/data', '/code', '/old', '/volatile', '/missing', '/new'];
    const plan = planRoutes({ ...base, routes, entries });
    expect(plan.reuse).toEqual(['/same']);
    expect(Object.fromEntries(plan.render.map((r: { route: string; reason: string }) => [r.route, r.reason]))).toEqual({
      '/data': 'donnees',
      '/code': 'code',
      '/old': 'ttl',
      '/volatile': 'volatile',
      '/missing': 'cache-incomplet',
      '/new': 'nouvelle',
    });
    expect(plan.removed).toEqual(['/removed']);
  });

  it('second passage convergé : zéro rendu', () => {
    const entries = new Map([['/a', entry()], ['/b', entry()]]);
    const plan = planRoutes({ ...base, routes: ['/a', '/b'], entries });
    expect(plan.render).toEqual([]);
    expect(plan.removed).toEqual([]);
  });

  it('full rend tout ; pruneAllowed=false ne retire rien', () => {
    const entries = new Map([['/a', entry()], ['/gone', entry()]]);
    const plan = planRoutes({ ...base, routes: ['/a'], entries, full: true, pruneAllowed: false });
    expect(plan.render).toEqual([{ route: '/a', reason: 'complet' }]);
    expect(plan.removed).toEqual([]);
  });
});

describe('openPrerenderCache', () => {
  const dirs: string[] = [];
  const tmp = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prerender-cache-'));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

  it('reprise après arrêt : chaque page stockée est relue par une nouvelle instance', () => {
    const dir = tmp();
    const first = openPrerenderCache(dir);
    first.reset({ renderVersion: 'v1' });
    const setId = first.writeModuleSet(['b', 'a']);
    first.store('/product/p-a', '<html>A</html>', { setId, codeFp: 'c', dataFp: 'd', deps: [], renderedAt: 'now' });

    const second = openPrerenderCache(dir);
    expect(second.readMeta()).toEqual({ renderVersion: 'v1' });
    const entries = second.readEntries();
    expect([...entries.keys()]).toEqual(['/product/p-a']);
    const stored = entries.get('/product/p-a');
    expect(second.htmlExists(stored)).toBe(true);
    expect(second.readHtml(stored)).toBe('<html>A</html>');
    expect(second.readModuleSet(setId)).toEqual(['a', 'b']);
    expect(second.writeModuleSet(['a', 'b'])).toBe(setId);
  });

  it('remove et reset retirent les entrées, pas le manifeste de modules', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'modules.json'), '{}');
    const cache = openPrerenderCache(dir);
    cache.store('/a', 'A', { renderedAt: 'now' });
    cache.store('/b', 'B', { renderedAt: 'now' });
    cache.remove('/a');
    expect([...cache.readEntries().keys()]).toEqual(['/b']);
    cache.reset({ renderVersion: 'v2' });
    expect(cache.readEntries().size).toBe(0);
    expect(fs.existsSync(path.join(dir, 'modules.json'))).toBe(true);
  });
});
