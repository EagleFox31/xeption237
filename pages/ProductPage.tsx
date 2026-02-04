import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ProductDetail from '../components/ProductDetail';
import { Product } from '../types';
import { parseProductIdFromSlug } from '../utils/slug';
import { getProductSlug } from '../utils/slug';

interface ProductPageProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
}

const ProductPage: React.FC<ProductPageProps> = ({ products, onAddToCart }) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activeFilter = searchParams.get('cat') || 'all';
    const activeBrand = searchParams.get('brand') || 'all';

    const productId = slug ? parseProductIdFromSlug(slug) : null;

    // Find product by ID
    const product = productId ? products.find(p => p.id === productId) : undefined;

    if (!product) {
        if (products.length === 0) {
            // Loading state
            return (
                <div className="min-h-screen pt-32 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-xeption-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }
        return (
            <div className="min-h-screen pt-32 text-center text-white">
                <h2 className="text-2xl font-bold mb-4">Produit Introuvable</h2>
                <button onClick={() => navigate('/shop')} className="text-xeption-gold underline">Retour au shop</button>
            </div>
        );
    }

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            const storedCat = sessionStorage.getItem('shop_filter_cat') || activeFilter;
            const storedBrand = sessionStorage.getItem('shop_filter_brand') || activeBrand;
            const params = new URLSearchParams();
            if (storedCat && storedCat !== 'all') params.set('cat', storedCat);
            if (storedBrand && storedBrand !== 'all') params.set('brand', storedBrand);
            const suffix = params.toString();
            navigate(`/shop${suffix ? `?${suffix}` : ''}`);
        }
    };

    const related = (() => {
        const sameCategory = products.filter(p => p.category === product.category && p.id !== product.id);
        const sameBrand = sameCategory.filter(p => p.brand && p.brand === product.brand);
        const otherBrand = sameCategory.filter(p => !p.brand || p.brand !== product.brand);
        return [...sameBrand, ...otherBrand].slice(0, 5);
    })();

    const topSales = (() => {
        const excluded = new Set([product.id, ...related.map(p => p.id)]);
        return products
            .filter(p => !excluded.has(p.id))
            .sort((a, b) => {
                const aFeatured = a.isFeatured ? 1 : 0;
                const bFeatured = b.isFeatured ? 1 : 0;
                if (bFeatured !== aFeatured) return bFeatured - aFeatured;
                const aRating = a.rating || 0;
                const bRating = b.rating || 0;
                if (bRating !== aRating) return bRating - aRating;
                return b.price - a.price;
            })
            .slice(0, 5);
    })();

    return (
        <ProductDetail
            product={product}
            relatedProducts={related}
            topProducts={topSales}
            onBack={handleBack}
            onAddToCart={onAddToCart}
            onProductSelect={(p) => navigate(`/product/${getProductSlug(p)}`)}
        />
    );
};

export default ProductPage;
