import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ProductDetail from '../components/ProductDetail';
import MobileProductDetailView from '../components/mobile/MobileProductDetailView';
import { Product } from '../types';
import { parseProductIdFromSlug } from '../utils/slug';
import { getProductSlug } from '../utils/slug';
import { getProductDisplayName } from '../utils/productDisplay';
import { PageSEO, JsonLd, productJsonLd, breadcrumbJsonLd, faqJsonLd, toOgImage } from '../utils/seo';
import { buildProductFaq } from '../utils/productFaq';
import { buildShopReturnPath } from '../utils/shopFilterStorage';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { trackViewItem } from '../utils/analytics';

interface ProductPageProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
    cartCount?: number;
    onOpenCart?: () => void;
}

const ProductPage: React.FC<ProductPageProps> = ({
    products,
    onAddToCart,
    cartCount = 0,
    onOpenCart = () => {},
}) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [isPageLoading, setIsPageLoading] = useState(true);

    // Déclenche le Skeleton Loader lors de chaque clic / navigation vers un produit
    useEffect(() => {
        setIsPageLoading(true);
        const timer = setTimeout(() => {
            setIsPageLoading(false);
        }, 320);
        return () => clearTimeout(timer);
    }, [slug]);

    const productId = slug ? parseProductIdFromSlug(slug) : null;

    // Find product by ID
    const product = productId ? products.find(p => p.id === productId) : undefined;

    // Analytics : view_item une fois que le produit est résolu
    useEffect(() => {
        if (!product) return;
        trackViewItem({
            item_id: product.id,
            item_name: product.name,
            item_brand: (product as any).brand ?? undefined,
            item_category: product.category ?? undefined,
            price: product.price,
        });
    }, [product?.id]);

    // Pendant le chargement initial OU la transition visuelle au clic : afficher le Skeleton Loader
    if (isPageLoading || products.length === 0) {
        return <SkeletonLoader variant="product-detail" />;
    }

    if (!product) {
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
            {/* Expérience Mobile Native (Fidèle à la maquette utilisateur) */}
            <div className="block md:hidden">
                <MobileProductDetailView
                    product={product}
                    onBack={handleBack}
                    onAddToCart={onAddToCart}
                    cartCount={cartCount}
                    onOpenCart={onOpenCart}
                    relatedProducts={related}
                />
            </div>

            {/* Expérience Desktop (Préservée intacte, 0 régression) */}
            <div className="hidden md:block">
                <ProductDetail
                    product={product}
                    relatedProducts={related}
                    topProducts={topSales}
                    onBack={handleBack}
                    onAddToCart={onAddToCart}
                    onProductSelect={(p) => navigate(`/product/${getProductSlug(p)}`)}
                />
            </div>
        </>
    );
};

export default ProductPage;
