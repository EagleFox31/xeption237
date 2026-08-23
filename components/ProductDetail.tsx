
import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { ArrowLeft, ShoppingCart, Check, X, Cpu, Play, Share2, Link as LinkIcon, CheckCircle2, ShieldCheck, Star, MapPin, ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { buildProductFaq } from '../utils/productFaq';
import { optimizeImage } from '../utils/mediaOptimization';
import { getProductSlug } from '../utils/slug';
import { getProductDisplayName, normalizeSamsungGalaxySpelling } from '../utils/productDisplay';
import { ProductBadgeChips } from './product/ProductBadgeChips';
import ProductHighlightCards from './product/ProductHighlightCards';

interface ProductDetailProps {
    product: Product;
    relatedProducts?: Product[];
    topProducts?: Product[];
    onBack: () => void;
    onAddToCart: (product: Product) => void;
    onProductSelect?: (product: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({
    product,
    relatedProducts = [],
    topProducts = [],
    onBack,
    onAddToCart,
    onProductSelect
}) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const relatedRef = useRef<HTMLDivElement>(null);

    // Combine main image + extra images for gallery list
    const galleryImages = [product.image, ...(product.images || [])].filter(Boolean);
    const warrantyMonths = Number(product.warrantyMonths || 0);
    const activeImage = galleryImages[activeIndex] || product.image;

    useEffect(() => {
        setActiveIndex(0);
    }, [product.id]);

    // Carrousel lent (6 s par image)
    useEffect(() => {
        if (galleryImages.length < 2) return;
        const timer = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % galleryImages.length);
        }, 6000);
        return () => window.clearInterval(timer);
    }, [galleryImages.length, product.id]);

    const displayName = getProductDisplayName(product);
    // Source unique partagée avec le FAQPage JSON-LD (ProductPage) : affichage == schéma.
    const faq = buildProductFaq(product);

    // Le SEO de la page produit (title + JSON-LD Product/Offer/AggregateRating)
    // est géré par ProductPage via PageSEO + productJsonLd (source unique de vérité).
    // Voir utils/seo.tsx. Ne pas réinjecter de schéma ici (doublon + risque de
    // fausse note contraire à la policy Google).

    const handlePlayVideo = () => {
        const videoSection = document.getElementById('video-section');
        videoSection?.scrollIntoView({ behavior: 'smooth' });
        if (videoRef.current) {
            videoRef.current.play();
        }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/product/${getProductSlug(product)}`;
        try {
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy link", err);
        }
    };

    // Only use actual reviews
    const displayReviews = product.reviews || [];

    return (
        <div className="relative min-h-screen bg-[#F9F8F6] animate-in slide-in-from-right duration-500">

            {/* Background Particles Layer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none h-full z-0">
                <style>{`
                  @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
                    50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
                  }
                  .particle {
                    position: absolute;
                    border-radius: 50%;
                    background: #FFD700;
                    pointer-events: none;
                    animation: float 8s ease-in-out infinite;
                    mix-blend-mode: multiply;
                  }
                `}</style>
                <div className="particle w-3 h-3 top-[10%] left-[20%] blur-[2px]" style={{ animationDelay: '0s' }}></div>
                <div className="particle w-6 h-6 top-[30%] right-[15%] blur-[4px] bg-orange-300" style={{ animationDelay: '2s' }}></div>
                <div className="particle w-96 h-96 -top-20 -right-20 bg-xeption-gold/10 blur-[120px] animate-pulse"></div>
                <div className="particle w-96 h-96 bottom-0 left-0 bg-orange-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '3s' }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-3 md:pt-6">
                <button
                    onClick={onBack}
                    className="mb-3 md:mb-6 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-black hover:bg-black hover:text-xeption-gold hover:border-black transition-all shadow-sm group w-fit"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold font-tech uppercase tracking-widest text-xs">Retour au Shop</span>
                </button>

                {/* 1. HERO SECTION */}
                <div className="relative w-full flex flex-col md:flex-row items-start gap-4 md:gap-10 mb-10 md:mb-20 md:min-h-[60vh]">

                    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_49%,rgba(0,0,0,0.2)_50%,transparent_51%)] bg-[size:100%_40px] [transform:perspective(500px)_rotateX(60deg)_scale(2)] origin-bottom"></div>
                    </div>

                    <div className="w-full md:w-1/2 space-y-5 z-10 order-2 md:order-1 text-gray-900 md:pt-0">
                        <div className="hidden md:flex items-start justify-between gap-3">
                            <ProductBadgeChips product={product} size="md" className="flex-1" />

                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 transition-colors text-xs font-bold uppercase tracking-wider text-black"
                            >
                                {linkCopied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4 text-gray-700" />}
                                {linkCopied ? 'Lien Copié' : 'Partager'}
                            </button>
                        </div>

                        <div>
                            <h1 className="hidden md:block text-5xl md:text-7xl font-bold font-tech uppercase leading-none text-black drop-shadow-sm mix-blend-hard-light mb-2">
                                {displayName}
                            </h1>

                            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i < Math.round(product.rating || 5) ? 'text-xeption-gold fill-xeption-gold' : 'text-gray-500 fill-gray-300'}`}
                                        />
                                    ))}
                                </div>
                                {product.reviews && product.reviews.length > 0 ? (
                                    <span className="text-xs font-bold text-gray-700 tracking-wide">
                                        ({product.rating || 5}/5) &bull; <span className="underline cursor-pointer hover:text-black">Voir les {product.reviews.length} avis</span>
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-gray-600 tracking-wide">
                                        ({product.rating || 5}/5)
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-xl text-gray-800 font-light max-w-lg drop-shadow-sm">
                            {normalizeSamsungGalaxySpelling(product.description || '')}
                        </p>

                        <ProductHighlightCards product={product} className="pt-1" />

                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6 pt-4">
                            <div>
                                <span className="block text-sm text-gray-600 uppercase font-bold tracking-wider mb-1">Prix au Cameroun</span>

                                <div className="flex flex-col">
                                    {product.oldPrice && (
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded-sm tracking-wider shadow-sm">Promo</span>
                                            <span className="text-xl text-red-500 font-bold line-through font-mono decoration-red-500 decoration-2">
                                                {product.oldPrice.toLocaleString('fr-FR')} FCFA
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-baseline space-x-2">
                                        <span className="text-4xl font-bold text-black font-mono">{product.price.toLocaleString('fr-FR')}</span>
                                        <span className="text-xeption-goldDim font-bold">FCFA</span>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden md:flex flex-col sm:flex-row gap-3 self-start md:self-auto">
                                <a
                                    href={`https://wa.me/237641891031?text=${encodeURIComponent(`Bonjour, je suis intéressé par le produit ${displayName} à ${product.price.toLocaleString('fr-FR')} FCFA. Est-il disponible ?`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 bg-[#25D366] text-white px-6 py-4 font-tech font-bold uppercase text-sm tracking-wider hover:bg-[#128C7E] transition-colors shadow-xl flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    WhatsApp
                                </a>
                                <button
                                    type="button"
                                    onClick={() => onAddToCart(product)}
                                    className="shrink-0 bg-black text-white px-6 py-4 font-tech font-bold uppercase text-sm tracking-wider hover:bg-xeption-gold hover:text-black transition-colors shadow-xl flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart className="h-5 w-5" />
                                    Panier
                                </button>
                            </div>
                        </div>

                        {warrantyMonths > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-black/5 inline-flex px-3 py-2 rounded-lg">
                                <ShieldCheck className="w-4 h-4 text-green-600" />
                                <span className="uppercase font-bold tracking-wide">
                                    Garantie {warrantyMonths} Mois {product.condition === 'new' ? 'Constructeur' : 'Xeption'} inclus
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-1/2 flex flex-col order-1 md:order-2 z-10">
                        <div className="md:hidden space-y-2 mb-3">
                            <div className="flex items-start justify-between gap-2">
                                <ProductBadgeChips product={product} size="sm" className="flex-1" />
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 text-[10px] font-bold uppercase tracking-wider text-black shrink-0"
                                >
                                    {linkCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Share2 className="h-3.5 w-3.5 text-gray-700" />}
                                    {linkCopied ? 'Copié' : 'Partager'}
                                </button>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold font-tech uppercase leading-tight text-black">
                                {displayName}
                            </h1>
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-sm">
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-3.5 h-3.5 ${i < Math.round(product.rating || 5) ? 'text-xeption-gold fill-xeption-gold' : 'text-gray-500 fill-gray-300'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 tracking-wide">
                                    ({product.rating || 5}/5)
                                </span>
                            </div>
                        </div>

                        <div
                            className="relative w-full max-w-[400px] mx-auto aspect-square md:max-w-none md:aspect-auto md:h-[420px] flex items-center justify-center group overflow-hidden rounded-xl md:rounded-none bg-white md:bg-transparent shadow-sm md:shadow-none border border-gray-200/40 md:border-0"
                            onTouchStart={(e) => {
                                touchStartX.current = e.touches[0]?.clientX ?? null;
                                touchEndX.current = null;
                            }}
                            onTouchMove={(e) => {
                                touchEndX.current = e.touches[0]?.clientX ?? null;
                            }}
                            onTouchEnd={() => {
                                if (galleryImages.length < 2) return;
                                if (touchStartX.current === null || touchEndX.current === null) return;
                                const delta = touchStartX.current - touchEndX.current;
                                const threshold = 40;
                                if (Math.abs(delta) < threshold) return;
                                if (delta > 0) {
                                    setActiveIndex((prev) => (prev + 1) % galleryImages.length);
                                } else {
                                    setActiveIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
                                }
                            }}
                        >
                            <img
                                src={optimizeImage(activeImage, 1100)}
                                alt={`${displayName} — Xeption Cameroun`}
                                className="relative z-10 w-full h-full object-contain object-center transition-opacity duration-700 ease-in-out"
                                key={activeImage}
                            />

                            {galleryImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setActiveIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                                        className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 text-white border border-white/20 p-1.5 md:p-2 rounded-full hover:bg-black/75 transition-colors"
                                        aria-label="Image précédente"
                                    >
                                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveIndex((prev) => (prev + 1) % galleryImages.length)}
                                        className="absolute right-1 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 text-white border border-white/20 p-1.5 md:p-2 rounded-full hover:bg-black/75 transition-colors"
                                        aria-label="Image suivante"
                                    >
                                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 rotate-180" />
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2 overflow-x-auto pt-2 pb-1 w-full justify-start md:justify-center md:pt-3 md:pb-2 snap-x snap-mandatory scroll-smooth no-scrollbar">
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveIndex(idx)}
                                    className={`relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 md:w-20 md:h-20 rounded-lg border-2 overflow-hidden flex-shrink-0 transition-all snap-center ${activeIndex === idx ? 'border-xeption-gold shadow-lg scale-105' : 'border-gray-300 opacity-60 hover:opacity-100'}`}
                                >
                                    <img
                                        src={optimizeImage(img, 150)}
                                        className="w-full h-full object-cover"
                                        alt={`${product.name} vue ${idx}`}
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                            {product.video && (
                                <button
                                    onClick={handlePlayVideo}
                                    className="w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 md:w-20 md:h-20 rounded-lg border-2 border-gray-300 bg-black flex items-center justify-center flex-shrink-0 hover:border-xeption-gold transition-colors group snap-center"
                                >
                                    <Play className="text-white group-hover:text-xeption-gold" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {product.video && (
                    <div id="video-section" className="max-w-6xl mx-auto px-4 py-12">
                        <div className="bg-black rounded-xl overflow-hidden shadow-2xl relative aspect-video border border-gray-800 group">
                            <video
                                ref={videoRef}
                                src={product.video}
                                controls
                                className="w-full h-full object-cover"
                                poster={optimizeImage(product.image, 1200)}
                                playsInline
                                preload="metadata"
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => setIsPlaying(false)}
                            />
                            <div
                                className={`absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-opacity duration-300 ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                onClick={() => videoRef.current?.play()}
                            >
                                <div className="w-20 h-20 bg-xeption-gold/90 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse hover:scale-110 transition-transform">
                                    <Play className="h-8 w-8 text-black ml-1" fill="black" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="max-w-5xl mx-auto px-4 py-16 relative z-10">
                    <div className="bg-white/60 backdrop-blur-xl border border-white/50 p-8 md:p-12 relative overflow-hidden shadow-2xl rounded-sm">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-xeption-gold/20 rounded-full blur-2xl -mr-16 -mt-16 mix-blend-multiply"></div>

                        <div className="flex flex-col md:flex-row gap-12">
                            <div className="flex-1">
                                <h2 className="text-3xl font-bold text-black font-tech uppercase mb-6 flex items-center gap-3">
                                    <span className="w-2 h-8 bg-xeption-gold"></span>
                                    Le Verdict
                                </h2>
                                <p className="text-lg text-gray-800 leading-relaxed italic border-l-2 border-xeption-gold/30 pl-6 py-2 font-medium">
                                    "{normalizeSamsungGalaxySpelling(product.reviewShort || product.description || '')}"
                                </p>
                            </div>

                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {product.pros && (
                                    <div className="space-y-3">
                                        <h3 className="text-green-700 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                            <Check className="h-4 w-4" /> On Valide
                                        </h3>
                                        <ul className="space-y-2">
                                            {product.pros.map((pro, i) => (
                                                <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                                                    <span className="text-green-600 mt-1">•</span> {pro}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {product.cons && (
                                    <div className="space-y-3">
                                        <h3 className="text-red-600 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                            <X className="h-4 w-4" /> On Aime Moins
                                        </h3>
                                        <ul className="space-y-2">
                                            {product.cons.map((con, i) => (
                                                <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                                                    <span className="text-red-500 mt-1">•</span> {con}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {product.specs && (
                    <div className="max-w-5xl mx-auto px-4 pb-12 relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <Cpu className="h-8 w-8 text-gray-600" />
                            <h2 className="text-3xl font-bold text-black font-tech uppercase">Détails Techniques</h2>
                            <div className="h-[1px] flex-1 bg-gray-300/50"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {product.specs.map((spec, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-center p-4 border-b border-gray-200/50 hover:bg-white/50 hover:shadow-sm transition-all group bg-white/30 backdrop-blur-sm"
                                >
                                    <span className="text-gray-600 font-mono text-sm uppercase tracking-wider group-hover:text-xeption-goldDim transition-colors">{spec.label}</span>
                                    <span className="text-black font-bold text-right">{spec.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {faq.length > 0 && (
                    <div className="max-w-5xl mx-auto px-4 pb-16 relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <HelpCircle className="h-8 w-8 text-gray-600" />
                            <h2 className="text-3xl font-bold text-black font-tech uppercase">Questions fréquentes</h2>
                            <div className="h-[1px] flex-1 bg-gray-300/50"></div>
                        </div>

                        <div className="space-y-3">
                            {faq.map((item, i) => (
                                <details
                                    key={i}
                                    className="group bg-white/40 backdrop-blur-sm border border-gray-200/60 rounded-lg overflow-hidden"
                                >
                                    <summary className="flex justify-between items-center gap-3 cursor-pointer list-none p-4 font-bold text-black">
                                        <span>{item.q}</span>
                                        <ChevronDown className="h-5 w-5 text-gray-600 shrink-0 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <p className="px-4 pb-4 text-gray-800 leading-relaxed">{item.a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                )}

                {(relatedProducts.length > 0 || topProducts.length > 0) && (() => {
                    const used = new Set(relatedProducts.map(p => p.id));
                    const fill = topProducts.filter(p => !used.has(p.id)).slice(0, Math.max(0, 5 - relatedProducts.length));
                    const display = [...relatedProducts, ...fill];
                    const isTopOnly = relatedProducts.length === 0;
                    const title = isTopOnly ? 'Top ventes' : 'Voir aussi';
                    const sub = isTopOnly ? 'Produits populaires' : 'Même catégorie';

                    const scrollBy = (delta: number) => {
                        if (!relatedRef.current) return;
                        relatedRef.current.scrollBy({ left: delta, behavior: 'smooth' });
                    };

                    return (
                        <div className="max-w-6xl mx-auto px-4 pb-20 relative z-10">
                            <div className="flex items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="w-2 h-8 bg-xeption-gold"></span>
                                    <h3 className="text-2xl font-bold text-black font-tech uppercase">{title}</h3>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{sub}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => scrollBy(-320)}
                                        className="bg-white/80 border border-black/10 text-black p-2 rounded-full hover:bg-white transition-colors"
                                        aria-label="Défiler à gauche"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => scrollBy(320)}
                                        className="bg-white/80 border border-black/10 text-black p-2 rounded-full hover:bg-white transition-colors"
                                        aria-label="Défiler à droite"
                                    >
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>
                            </div>

                            <div
                                ref={relatedRef}
                                className="flex gap-3 md:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth no-scrollbar"
                            >
                                {display.map((p) => (
                                    <div
                                        key={p.id}
                                        className="group bg-white/70 border border-white/60 hover:border-xeption-gold/40 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer snap-start min-w-[160px] max-w-[200px] flex-shrink-0"
                                        onClick={() => onProductSelect && onProductSelect(p)}
                                    >
                                        <div className="aspect-square bg-white/80 p-3 flex items-center justify-center">
                                            <img
                                                src={optimizeImage(p.image, 240)}
                                                alt={p.name}
                                                loading="lazy"
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        <div className="p-2">
                                            <h4 className="text-[10px] md:text-xs font-bold uppercase text-gray-900 truncate">
                                                {p.name}
                                            </h4>
                                            <div className="flex items-baseline gap-1 mt-1">
                                                <span className="text-sm font-bold text-black font-tech">
                                                    {p.price.toLocaleString('fr-FR')}
                                                </span>
                                                <span className="text-[8px] text-xeption-gold font-bold uppercase">FCFA</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAddToCart(p); }}
                                                className="mt-2 w-full bg-black text-white text-[9px] uppercase font-bold tracking-widest py-1.5 hover:bg-xeption-gold hover:text-black transition-colors"
                                            >
                                                Ajouter
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* 5. LOCAL PRODUCT PROOF - Only show if there are reviews */}
                {displayReviews.length > 0 && (
                    <div className="max-w-5xl mx-auto px-4 pb-24 relative z-10">
                        <h3 className="text-lg font-bold uppercase text-gray-800 mb-6 font-tech flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-xeption-gold" /> Ils ont acheté ce modèle au Cameroun
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayReviews.map((review, i) => (
                                <div key={review.id || i} className="bg-white/70 border border-gray-200 p-4 rounded-lg flex gap-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold flex-shrink-0">
                                        {(review.author).charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-black">{review.author}</span>
                                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {review.location}</span>
                                        </div>
                                        <div className="flex mb-1">
                                            {[...Array(5)].map((_, idx) => (
                                                <Star key={idx} className={`w-3 h-3 ${idx < Math.round(review.rating) ? 'text-xeption-gold fill-xeption-gold' : 'text-gray-300 fill-gray-100'}`} />
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-600 italic">"{review.text}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 backdrop-blur-xl border-t border-white/50 md:hidden z-50 shadow-[0_-5px_30px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-col">
                        {product.oldPrice && (
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] bg-red-600 text-white px-1.5 rounded font-bold uppercase">Promo</span>
                                <span className="text-[10px] text-red-500 font-bold line-through decoration-red-500 decoration-2">
                                    {product.oldPrice.toLocaleString('fr-FR')}
                                </span>
                            </div>
                        )}
                        <span className="text-xl font-bold text-black">{product.price.toLocaleString('fr-FR')} <span className="text-xs text-xeption-goldDim">FCFA</span></span>
                    </div>
                    <div className="flex-1 flex gap-2">
                        <a
                            href={`https://wa.me/237641891031?text=${encodeURIComponent(`Bonjour, je suis intéressé par le produit ${displayName} à ${product.price.toLocaleString('fr-FR')} FCFA. Est-il disponible ?`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] text-white px-4 py-3 flex items-center justify-center rounded-sm shadow-lg active:scale-95 transition-transform"
                        >
                            <MessageCircle className="h-5 w-5" />
                        </a>
                        <button
                            onClick={() => onAddToCart(product)}
                            className="flex-1 bg-black text-white py-3 font-bold font-tech uppercase tracking-wider rounded-sm shadow-lg active:scale-95 transition-transform"
                        >
                            Ajouter
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ProductDetail;
