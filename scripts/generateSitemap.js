import { create } from 'xmlbuilder2';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

// ES Module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.xeptionetwork.shop';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const staticRoutes = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/about', changefreq: 'monthly', priority: 0.5 },
    { url: '/contact', changefreq: 'monthly', priority: 0.6 },
    { url: '/shop', changefreq: 'daily', priority: 0.9 },
    { url: '/troc', changefreq: 'weekly', priority: 0.8 },
    { url: '/tracking', changefreq: 'monthly', priority: 0.5 },
    { url: '/sav', changefreq: 'monthly', priority: 0.6 },
    { url: '/mentions-legales', changefreq: 'yearly', priority: 0.3 },
    { url: '/cgv', changefreq: 'yearly', priority: 0.3 },
    { url: '/cgv-smart-troc', changefreq: 'yearly', priority: 0.3 },
    { url: '/politique-confidentialite', changefreq: 'yearly', priority: 0.3 },
    { url: '/politique-cookies', changefreq: 'yearly', priority: 0.3 },
];

const slugify = (input = '') => {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/--+/g, '-');
};

async function generateSitemap() {
    console.log('Generating sitemap...');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

    // Add Static Routes
    staticRoutes.forEach(route => {
        root.ele('url')
            .ele('loc').txt(`${SITE_URL}${route.url}`).up()
            .ele('changefreq').txt(route.changefreq).up()
            .ele('priority').txt(route.priority.toString()).up()
            .up();
    });

    // Fetch Products — tente avec timestamps si disponibles, sinon dégrade gracefully.
    const fetchProducts = async () => {
        // 1. Tentative avec updated_at + created_at (cas idéal)
        let res = await supabase.from('products').select('id, name, updated_at, created_at');
        if (!res.error) return res.data;

        // 2. Fallback : seulement created_at
        res = await supabase.from('products').select('id, name, created_at');
        if (!res.error) return res.data;

        // 3. Fallback ultime : pas de timestamp (sitemap sans lastmod)
        res = await supabase.from('products').select('id, name');
        if (!res.error) return res.data;

        console.error('Error fetching products:', res.error);
        return null;
    };

    const products = await fetchProducts();

    if (products) {
        console.log(`Found ${products.length} products.`);
        products.forEach(product => {
            const slug = `${slugify(product.name || 'product')}-${product.id}`;
            const lastmodDate = product.updated_at || product.created_at;
            const urlEl = root.ele('url')
                .ele('loc').txt(`${SITE_URL}/product/${slug}`).up()
                .ele('changefreq').txt('weekly').up()
                .ele('priority').txt('0.7').up();
            if (lastmodDate) {
                urlEl.ele('lastmod').txt(new Date(lastmodDate).toISOString()).up();
            }
            urlEl.up();
        });
    }

    // Convert to XML
    const xml = root.end({ prettyPrint: true });

    // Write to public/sitemap.xml
    const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(outputPath, xml);
    console.log(`Sitemap generated at ${outputPath}`);
}

generateSitemap();
