// @ts-ignore
const Deno = globalThis.Deno;

export {};

// Domaine public de la boutique (surchargeable par secret SITE_URL).
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://www.xeptionetwork.shop').replace(/\/$/, '');

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
    `${supabaseUrl}/rest/v1/products?select=id,name,description,price,oldPrice,image,images,brand,condition,stock,category&order=updated_at.desc`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('products REST error', res.status, body);
    return new Response(`Erreur Supabase: ${res.status} ${body}`, { status: 502 });
  }

  const products: Product[] = await res.json();

  // products.brand contient l'id de la table brands : on le traduit en nom.
  const brandsRes = await fetch(`${supabaseUrl}/rest/v1/brands?select=id,name`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  const brandNames = new Map<string, string>(
    brandsRes.ok ? (await brandsRes.json()).map((b: { id: string; name: string }) => [b.id, b.name]) : [],
  );

  // Google/Meta refusent les fiches sans vraie photo (ex. icône de repli `/icons/...`) :
  // on ne publie que les URL d'image absolues ; la fiche revient dès qu'une photo est posée.
  const hasRealImage = (p: Product) => /^https?:\/\//.test(p.image || '');

  const items = products.filter(hasRealImage).map((p) => {
    const url        = `${SITE_URL}/product/${p.id}`;
    const imageUrl   = p.image || '';
    // Spec Google/Meta : g:price = prix normal, g:sale_price = prix promo (seulement si inférieur).
    const onSale     = Number(p.oldPrice) > Number(p.price);
    const price      = `${onSale ? p.oldPrice : p.price} XAF`;
    const condition  = p.condition === 'new' ? 'new' : 'refurbished';
    const available  = p.stock > 0 ? 'in stock' : 'out of stock';
    const desc       = (p.description || p.name).replace(/[<>&'"]/g, (c) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c
    );
    const title = escXml(p.name);
    const brand = escXml((p.brand && brandNames.get(p.brand)) || p.brand || 'Xeption');

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
      ${onSale ? `<g:sale_price>${p.price} XAF</g:sale_price>` : ''}
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
  oldPrice?: number;
  image: string;
  images?: string[];
  brand?: string;
  condition?: string;
  stock: number;
  category?: string;
}
