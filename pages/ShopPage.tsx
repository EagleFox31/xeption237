import React, { useEffect, useMemo, useState } from 'react';
import { PageSEO, JsonLd, breadcrumbJsonLd, itemListJsonLd, absoluteUrl } from '../utils/seo';
import ProductList from '../components/ProductList';
import ShopHero from '../components/shop/ShopHero';
import { Product } from '../types';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getProductSlug } from '../utils/slug';
import { getProductDisplayName } from '../utils/productDisplay';
import { parsePriceParam } from '../utils/shopPriceFilter';
import { persistShopFilters } from '../utils/shopFilterStorage';
import { parsePageParam } from '../utils/shopPagination';

interface ShopPageProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
}

const SORT_VALUES = ['default', 'price-asc', 'price-desc', 'name'] as const;
type ShopSort = typeof SORT_VALUES[number];

const parseSort = (raw: string | null): ShopSort =>
    SORT_VALUES.includes(raw as ShopSort) ? (raw as ShopSort) : 'default';

const ShopPage: React.FC<ShopPageProps> = ({ products, onAddToCart }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeFilter = searchParams.get('cat') || 'all';
    const activeBrand = searchParams.get('brand') || 'all';
    const searchQuery = searchParams.get('q') || '';
    const sort = parseSort(searchParams.get('sort'));
    const promoOnly = searchParams.get('promo') === '1';
    const inStockOnly = searchParams.get('stock') === '1';
    const storageFilter = searchParams.get('storage') || 'all';
    const ramFilter = searchParams.get('ram') || 'all';
    const conditionFilter = searchParams.get('condition') || 'all';
    const priceMin = parsePriceParam(searchParams.get('price_min'));
    const priceMax = parsePriceParam(searchParams.get('price_max'));
    const page = parsePageParam(searchParams.get('page'));
    const [resultCount, setResultCount] = useState(products.length);

    const commitParams = (next: URLSearchParams, resetPage = true) => {
        if (resetPage) next.delete('page');
        setSearchParams(next, { replace: true });
    };

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
        commitParams(next);
    };

    const setBoolParam = (key: string, enabled: boolean) => {
        const next = new URLSearchParams(searchParams);
        if (enabled) next.set(key, '1');
        else next.delete(key);
        commitParams(next);
    };

    const setPriceRange = (min: number | null, max: number | null) => {
        const next = new URLSearchParams(searchParams);
        if (min === null) next.delete('price_min');
        else next.set('price_min', String(min));
        if (max === null) next.delete('price_max');
        else next.set('price_max', String(max));
        commitParams(next);
    };

    const setPage = (nextPage: number) => {
        const next = new URLSearchParams(searchParams);
        if (nextPage <= 1) next.delete('page');
        else next.set('page', String(nextPage));
        commitParams(next, false);
    };

    useEffect(() => {
        persistShopFilters(searchParams);
    }, [searchParams]);

    const catalogItemList = useMemo(
        () =>
            itemListJsonLd({
                name: 'Catalogue High-Tech Xeption Network',
                path: '/shop',
                items: products.map((p) => ({
                    name: getProductDisplayName(p),
                    url: absoluteUrl(`/product/${getProductSlug(p)}`),
                })),
            }),
        [products]
    );

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <PageSEO
                title={
                    page > 1
                        ? `Boutique High-Tech Cameroun — page ${page} | Xeption`
                        : 'Boutique High-Tech Cameroun — Smartphones, PC, Gaming | Xeption'
                }
                description="Découvrez notre catalogue complet : Smartphones iPhone & Samsung, Laptops, PC Gamer, Gadgets. Prix imbattables, livraison rapide Yaoundé & Douala."
                path="/shop"
            />
            <JsonLd data={[
                breadcrumbJsonLd([
                    { name: 'Accueil', path: '/' },
                    { name: 'Boutique' },
                ]),
                catalogItemList,
            ]} />

            <ShopHero
                products={products}
                activeFilter={activeFilter}
                searchQuery={searchQuery}
                productCount={resultCount}
            />

            <ProductList
                products={products}
                onAddToCart={onAddToCart}
                onResultCountChange={setResultCount}
                onProductClick={(p) => {
                    const shopReturnTo = `${location.pathname}${location.search}`;
                    navigate(`/product/${getProductSlug(p)}`, { state: { shopReturnTo } });
                }}
                title="Catalogue Complet"
                stickyToolbar
                hasShopHero
                searchQuery={searchQuery}
                sort={sort}
                promoOnly={promoOnly}
                inStockOnly={inStockOnly}
                filter={activeFilter}
                onFilterChange={(next) => {
                    const params = new URLSearchParams(searchParams);
                    if (!next || next === 'all') params.delete('cat');
                    else params.set('cat', next);
                    params.delete('brand');
                    params.delete('storage');
                    params.delete('ram');
                    params.delete('condition');
                    params.delete('price_min');
                    params.delete('price_max');
                    commitParams(params);
                }}
                page={page}
                onPageChange={setPage}
                brandFilter={activeBrand}
                onBrandChange={(next) => setParam('brand', next)}
                onSortChange={(next) => setParam('sort', next === 'default' ? '' : next)}
                onPromoOnlyChange={(v) => setBoolParam('promo', v)}
                onInStockOnlyChange={(v) => setBoolParam('stock', v)}
                onClearSearch={() => setParam('q', '')}
                onResetFilters={() => setSearchParams({}, { replace: true })}
                storageFilter={storageFilter}
                ramFilter={ramFilter}
                conditionFilter={conditionFilter}
                onStorageChange={(v) => setParam('storage', v)}
                onRamChange={(v) => setParam('ram', v)}
                onConditionChange={(v) => setParam('condition', v)}
                priceMin={priceMin}
                priceMax={priceMax}
                onPriceRangeChange={setPriceRange}
            />
        </div>
    );
};

export default ShopPage;
