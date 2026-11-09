import { describe, expect, it } from 'vitest';
import { productJsonLd } from '../../utils/seo';
import { parseGoogleReviewUrl } from '../../utils/googleReview';
import { buildPriceTableRows, formatPriceTableDate } from '../../utils/landingPriceTable';
import { buildLlmsTxt } from '../../content/seo/llmsTxt';
import { GUIDES, LANDING_PAGES } from '../../content/seo';
import type { Product } from '../../types';
import { checkLlmsTxt, checkProductOffer, checkSingleH1, countH1 } from '../../scripts/lib/seoChecks.mjs';

const ldScript = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const product = (price = 250000) =>
  productJsonLd({ name: 'iPhone 13', price, url: 'https://www.xeptionetwork.shop/product/iphone-13', condition: 'refurbished' });

describe('seoChecks — H1 unique', () => {
  it('compte les vraies balises h1 seulement', () => {
    expect(countH1('<h1>a</h1><h10></h10><div role="heading">b</div>')).toBe(1);
    expect(countH1('<H1 class="x">a</H1>')).toBe(1);
  });

  it('signale 0 ou plusieurs h1', () => {
    expect(checkSingleH1('<h1>a</h1>')).toEqual([]);
    expect(checkSingleH1('<h2>a</h2>')).toHaveLength(1);
    expect(checkSingleH1('<h1>a</h1><h1>b</h1>')[0]).toContain('2 balise');
  });
});

describe('seoChecks — Product / Offer', () => {
  it('accepte la sortie réelle de productJsonLd', () => {
    expect(checkProductOffer(ldScript(product()))).toEqual([]);
  });

  it('accepte un Product dans un @graph', () => {
    expect(checkProductOffer(ldScript({ '@graph': [{ '@type': 'WebPage' }, product()] }))).toEqual([]);
  });

  it('signale un Product sans offre ou une offre incomplète', () => {
    expect(checkProductOffer(ldScript(productJsonLd({ name: 'x', url: 'u' })))).toEqual(['Product sans offers']);
    const broken = product();
    delete (broken.offers as Record<string, unknown>).hasMerchantReturnPolicy;
    expect(checkProductOffer(ldScript(broken))[0]).toContain('hasMerchantReturnPolicy');
  });

  it('signale une devise autre que XAF et un JSON-LD illisible', () => {
    const eur = product();
    (eur.offers as Record<string, unknown>).priceCurrency = 'EUR';
    expect(checkProductOffer(ldScript(eur))).toContain('priceCurrency EUR (attendu XAF)');
    expect(checkProductOffer('<script type="application/ld+json">{oops</script>')).toHaveLength(1);
  });
});

describe('llms.txt', () => {
  const text = buildLlmsTxt();

  it('passe le contrôle de build', () => {
    expect(checkLlmsTxt(text)).toEqual([]);
    expect(checkLlmsTxt('')).toEqual(['dist/llms.txt absent']);
  });

  it('liste chaque landing et chaque guide en URL absolue', () => {
    for (const l of LANDING_PAGES) expect(text).toContain(`https://www.xeptionetwork.shop/categorie/${l.slug})`);
    for (const g of GUIDES) expect(text).toContain(`https://www.xeptionetwork.shop/guides/${g.slug})`);
  });
});

describe('avis Google — URL configurée', () => {
  it('accepte les domaines Google en https', () => {
    expect(parseGoogleReviewUrl('https://g.page/r/abc/review')).toBe('https://g.page/r/abc/review');
    expect(parseGoogleReviewUrl(' https://search.google.com/local/writereview?placeid=x ')).toBe(
      'https://search.google.com/local/writereview?placeid=x',
    );
  });

  it('refuse vide, http, domaine tiers ou URL invalide', () => {
    for (const raw of [undefined, '', 'http://g.page/r/abc', 'https://evil.example/g.page', 'pas une url']) {
      expect(parseGoogleReviewUrl(raw)).toBeNull();
    }
  });
});

describe('tableau de prix des landings', () => {
  const p = (over: Partial<Product>) =>
    ({ id: over.name, name: 'x', brand: 'Apple', price: 0, stock: 1, condition: 'new', ...over }) as Product;

  it('ignore les prix nuls et trie du moins cher au plus cher', () => {
    const rows = buildPriceTableRows([
      p({ name: 'iPhone 14', price: 400000 }),
      p({ name: 'iPhone X', price: 0 }),
      p({ name: 'iPhone 12', price: 200000, condition: 'refurbished', stock: 0 }),
    ]);
    expect(rows.map((r) => r.price)).toEqual([200000, 400000]);
    expect(rows[0]).toMatchObject({ condition: 'Reconditionné', inStock: false });
    expect(rows[1]).toMatchObject({ condition: 'Neuf', inStock: true });
  });

  it('date le relevé au fuseau du Cameroun', () => {
    expect(formatPriceTableDate(new Date('2026-11-07T23:30:00Z'))).toBe('8 novembre 2026');
  });
});
