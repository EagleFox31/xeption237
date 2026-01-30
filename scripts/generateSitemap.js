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
    { url: '/shop', changefreq: 'daily', priority: 0.9 },
    { url: '/troc', changefreq: 'weekly', priority: 0.8 },
    { url: '/tracking', changefreq: 'monthly', priority: 0.5 },
    { url: '/sav', changefreq: 'monthly', priority: 0.6 },
];

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

    // Fetch Products for Dynamic Routes
    const { data: products, error } = await supabase
        .from('products')
        .select('id, updated_at');

    if (error) {
        console.error('Error fetching products:', error);
    } else if (products) {
        console.log(`Found ${products.length} products.`);
        products.forEach(product => {
            root.ele('url')
                .ele('loc').txt(`${SITE_URL}/product/${product.id}`).up()
                .ele('changefreq').txt('weekly').up()
                .ele('priority').txt('0.7').up()
                //.ele('lastmod').txt(new Date(product.updated_at).toISOString()).up() // Optional
                .up();
        });
    }

    // Convert to XML
    const xml = root.end({ prettyPrint: true });

    // Write to public/sitemap.xml
    const outputPath = path.resolve(__dirname, '../public/sitemap.xml'); // Vite public dir
    // Fallback to root if public doesn't exist (though usually it does in Vite)
    // Actually, in this project structure, sitemap.xml is at root?
    // User had sitemap at e:\xeption-app\xeption237\sitemap.xml
    // Vite normally serves root files efficiently.
    const targetPath = path.resolve(__dirname, '../sitemap.xml');

    fs.writeFileSync(targetPath, xml);
    console.log(`Sitemap generated at ${targetPath}`);
}

generateSitemap();
