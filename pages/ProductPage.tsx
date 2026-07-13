import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ProductDetail from '../components/ProductDetail';
import { Product } from '../types';
import { parseProductIdFromSlug } from '../utils/slug';
import { getProductSlug } from '../utils/slug';
import { getProductDisplayName } from '../utils/productDisplay';
import { PageSEO, JsonLd, productJsonLd, breadcrumbJsonLd, faqJsonLd, toOgImage } from '../utils/seo';
import { buildProductFaq } from '../utils/productFaq';
import { buildShopReturnPath } from '../utils/shopFilterStorage';

interface ProductPageProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
}

const ProductPage: React.FC<ProductPageProps> = ({ products, onAddToCart }) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();

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
            <>
                <PageSEO
                    title="Produit introuvable | Xeption"
                    description="Ce produit n'est pas disponible dans notre catalogue Xeption Network."
                    path={slug ? `/product/${slug}` : '/shop'}
                    noindex
                />
                <div className="min-h-screen pt-32 text-center text-white">
                    <h1 className="text-2xl font-bold mb-4">Produit Introuvable</h1>
                    <button onClick={() => navigate('/shop')} className="text-xeption-gold underline">Retour au shop</button>
                </div>
            </>
        );
    }

    const handleBack = () => {
        const shopReturnTo = (location.state as { shopReturnTo?: string } | null)?.shopReturnTo;
        if (shopReturnTo) {
            navigate(shopReturnTo);
            return;
        }
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
            return;
        }
        navigate(buildShopReturnPath());
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

    const displayName = getProductDisplayName(product);
    const productPath = `/product/${getProductSlug(product)}`;
    const productUrl = `https://www.xeptionetwork.shop${productPath}`;
    const productImages = [product.image, ...(product.images || [])].filter(Boolean);
    const ogImage = toOgImage(productImages[0]) ?? null;
    const seoTitle = `${displayName} — Acheter au Cameroun | Xeption`;
    const seoDescription = (product.description || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160) || `${displayName} disponible chez Xeption Network. Livraison Yaoundé & Douala, paiement Mobile Money.`;

    return (
        <>
            <PageSEO
                title={seoTitle}
                description={seoDescription}
                path={productPath}
                ogImage={ogImage}
                ogType="product"
            />
            <JsonLd
                data={[
                    productJsonLd({
                        name: displayName,
                        description: product.description,
                        images: productImages,
                        brand: product.brand,
                        price: product.price,
                        currency: 'XAF',
                        availability: product.stock > 0 ? 'InStock' : 'OutOfStock',
                        condition: product.condition === 'refurbished' ? 'refurbished' : 'new',
                        specs: product.specs,
                        url: productUrl,
                        rating: product.rating && product.reviews?.length
                            ? { value: product.rating, count: product.reviews.length }
                            : null,
                    }),
                    breadcrumbJsonLd([
                        { name: 'Accueil', path: '/' },
                        { name: 'Boutique', path: '/shop' },
                        { name: displayName },
                    ]),
                    // FAQPage : mêmes Q/R que le bloc FAQ visible de ProductDetail.
                    faqJsonLd(buildProductFaq(product)),
                ]}
            />
            <ProductDetail
                product={product}
                relatedProducts={related}
                topProducts={topSales}
                onBack={handleBack}
                onAddToCart={onAddToCart}
                onProductSelect={(p) => navigate(`/product/${getProductSlug(p)}`)}
            />
        </>
    );
};

export default ProductPage;
