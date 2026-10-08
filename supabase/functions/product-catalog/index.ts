// @ts-ignore
const Deno = globalThis.Deno;

export {};

const SITE_URL = 'https://xeption237.vercel.app';

Deno.serve(async (req: Request) => {
  // Facebook crawle en GET sans auth
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Récupère tous les produits en stock + hors stock (Facebook veut tout pour désactiver les ruptures)
  const res = await fetch(
    `${supabaseUrl}/rest/v1/products?select=id,name,description,price,old_price,image,images,brand,condition,stock,category,slug&order=created_at.desc`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    return new Response('Erreur Supabase', { status: 502 });
  }

  const products: Product[] = await res.json();

  const items = products.map((p) => {
    const url        = `${SITE_URL}/product/${p.slug || p.id}`;
    const imageUrl   = p.image || '';
    const price      = `${p.price} XAF`;
    const condition  = p.condition === 'new' ? 'new' : 'refurbished';
    const available  = p.stock > 0 ? 'in stock' : 'out of stock';
    const desc       = (p.description || p.name).replace(/[<>&'"]/g, (c) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c
    );
    const title = escXml(p.name);
    const brand = escXml(p.brand || 'Xeption');

    // Images additionnelles (jusqu'à 10 pour Facebook)
    const additionalImages = (p.images || [])
      .slice(0, 9)
      .map((img: string) => `<g:additional_image_link>${escXml(img)}</g:additional_image_link>`)
      .join('\n        ');

    return `
    <item>
      <g:id>${p.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${escXml(url)}</g:link>
      <g:image_link>${escXml(imageUrl)}</g:image_link>
      ${additionalImages}
      <g:price>${price}</g:price>
      ${p.old_price ? `<g:sale_price>${p.price} XAF</g:sale_price>` : ''}
      ${p.old_price ? `<g:original_price>${p.old_price} XAF</g:original_price>` : ''}
      <g:availability>${available}</g:availability>
      <g:condition>${condition}</g:condition>
      <g:brand>${brand}</g:brand>
      <g:google_product_category>Electronics</g:google_product_category>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Xeption Network 237 — Catalogue</title>
    <link>${SITE_URL}</link>
    <description>Smartphones, PC, Tablettes et accessoires tech au Cameroun</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

function escXml(str: string): string {
  return (str || '').replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c
  );
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  old_price?: number;
  image: string;
  images?: string[];
  brand?: string;
  condition?: string;
  stock: number;
  category?: string;
  slug?: string;
}
