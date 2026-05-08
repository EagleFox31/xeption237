import React, { useEffect } from 'react';
import { PageSEO, JsonLd, breadcrumbJsonLd } from '../utils/seo';
import ProductList from '../components/ProductList';
import { Product } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getProductSlug } from '../utils/slug';

interface ShopPageProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
}

const ShopPage: React.FC<ShopPageProps> = ({ products, onAddToCart }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeFilter = searchParams.get('cat') || 'all';
    const activeBrand = searchParams.get('brand') || 'all';

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
        setSearchParams(next, { replace: true });
    };

    useEffect(() => {
        sessionStorage.setItem('shop_filter_cat', activeFilter);
        sessionStorage.setItem('shop_filter_brand', activeBrand);
    }, [activeFilter, activeBrand]);

    return (
        <div className="pt-8 min-h-screen">
            <PageSEO
                title="Boutique High-Tech Cameroun — Smartphones, PC, Gaming | Xeption"
                description="Découvrez notre catalogue complet : Smartphones iPhone & Samsung, Laptops, PC Gamer, Gadgets. Prix imbattables, livraison rapide Yaoundé & Douala."
                path="/shop"
            />
            <JsonLd data={breadcrumbJsonLd([
                { name: 'Accueil', path: '/' },
                { name: 'Boutique' },
            ])} />

            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">La Boutique <span className="text-xeption-gold">237</span></h1>
                <p className="text-gray-300 mt-2 font-medium bg-black/40 inline-block px-4 py-1 rounded-full backdrop-blur-md border border-white/10">Choisis ton matos, on livre au calme.</p>
            </div>
            <ProductList
                products={products}
                onAddToCart={onAddToCart}
                onProductClick={(p) => {
                    navigate(`/product/${getProductSlug(p)}`);
                }}
                title="Catalogue Complet"
                filter={activeFilter}
                onFilterChange={(next) => {
                    const params = new URLSearchParams(searchParams);
                    if (!next || next === 'all') params.delete('cat');
                    else params.set('cat', next);
                    params.delete('brand');
                    setSearchParams(params, { replace: true });
                }}
                brandFilter={activeBrand}
                onBrandChange={(next) => setParam('brand', next)}
            />
        </div>
    );
};

export default ShopPage;
