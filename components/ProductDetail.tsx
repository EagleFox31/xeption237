
import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { ArrowLeft, ShoppingCart, Check, X, Cpu, Award, Play, Share2, Link as LinkIcon, CheckCircle2, Sparkles, ShieldCheck, Star, MapPin } from 'lucide-react';
import { optimizeImage } from '../utils/mediaOptimization';

interface ProductDetailProps {
    product: Product;
    onBack: () => void;
    onAddToCart: (product: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onBack, onAddToCart }) => {
    // Use main image as default, fallback to first in array if main is empty
    const [activeImage, setActiveImage] = useState(product.image);
    const [isPlaying, setIsPlaying] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Combine main image + extra images for gallery list
    const galleryImages = [product.image, ...(product.images || [])].filter(Boolean);

    // SEO: Dynamic Page Title & Structured Data (JSON-LD)
    useEffect(() => {
        // SEO KEYWORD INJECTION IN TITLE
        document.title = `${product.name} - Prix au Cameroun | Xeption`;

        // Create JSON-LD for Google Rich Snippets
        const structuredData = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name,
            "image": [product.image, ...(product.images || [])],
            "description": `Achetez ${product.name} au meilleur prix au Cameroun chez Xeption. ${product.description}`,
            "brand": {
                "@type": "Brand",
                "name": product.brand || "Xeption"
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": product.rating || 5,
                "reviewCount": product.reviews?.length || 1
            },
            "offers": {
                "@type": "Offer",
                "url": `${window.location.origin}/product/${product.id}`,
                "priceCurrency": "XAF",
                "price": product.price,
                "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": product.condition === 'new' ? "https://schema.org/NewCondition" : "https://schema.org/RefurbishedCondition",
                "areaServed": "Cameroun", // SEO Location
                "seller": {
                    "@type": "ElectronicsStore",
                    "name": "Xeption Network",
                    "address": "Mfoundi Mall, Yaoundé"
                }
            }
        };

        // Inject Script into Head
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(structuredData);
        script.id = 'product-json-ld';
        document.head.appendChild(script);

        return () => {
            const existingScript = document.getElementById('product-json-ld');
            if (existingScript) {
                document.head.removeChild(existingScript);
            }
        };
    }, [product]);

    const handlePlayVideo = () => {
        const videoSection = document.getElementById('video-section');
        videoSection?.scrollIntoView({ behavior: 'smooth' });
        if (videoRef.current) {
            videoRef.current.play();
        }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/product/${product.id}`;
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

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-black hover:bg-black hover:text-xeption-gold hover:border-black transition-all shadow-sm group w-fit"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold font-tech uppercase tracking-widest text-xs">Retour au Shop</span>
                </button>

                {/* 1. HERO SECTION */}
                <div className="relative min-h-[60vh] w-full flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-20">

                    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_49%,rgba(0,0,0,0.2)_50%,transparent_51%)] bg-[size:100%_40px] [transform:perspective(500px)_rotateX(60deg)_scale(2)] origin-bottom"></div>
                    </div>

                    <div className="w-full md:w-1/2 space-y-6 z-10 order-2 md:order-1 text-gray-900">
                        <div className="flex items-center justify-between">
                            {product.condition === 'new' ? (
                                <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                                    <Sparkles className="h-4 w-4 text-emerald-600" />
                                    <span className="text-emerald-700 text-xs font-bold uppercase tracking-[0.2em] font-tech">Produit Neuf Scellé</span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center space-x-2 bg-white/60 border border-xeption-gold/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                                    <Award className="h-4 w-4 text-xeption-gold" />
                                    <span className="text-xeption-goldDim text-xs font-bold uppercase tracking-[0.2em] font-tech">Xeption Certified</span>
                                </div>
                            )}

                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 transition-colors text-xs font-bold uppercase tracking-wider text-black"
                            >
                                {linkCopied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4 text-gray-700" />}
                                {linkCopied ? 'Lien Copié' : 'Partager'}
                            </button>
                        </div>

                        <div>
                            <h1 className="text-5xl md:text-7xl font-bold font-tech uppercase leading-none text-black drop-shadow-sm mix-blend-hard-light mb-2">
                                {product.name}
                            </h1>

                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i < Math.round(product.rating || 0) ? 'text-xeption-gold fill-xeption-gold' : 'text-gray-300 fill-gray-100'}`}
                                        />
                                    ))}
                                </div>
                                {product.reviews && product.reviews.length > 0 && (
                                    <span className="text-xs font-bold text-gray-500 tracking-wide">
                                        ({product.rating || 5}/5) &bull; <span className="underline cursor-pointer hover:text-black">Voir les {product.reviews.length} avis</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-xl text-gray-800 font-light max-w-lg drop-shadow-sm">
                            {product.description}
                        </p>

                        <div className="flex items-center space-x-6 pt-4">
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
                        </div>

                        {product.warrantyMonths && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-black/5 inline-flex px-3 py-2 rounded-lg">
                                <ShieldCheck className="w-4 h-4 text-green-600" />
                                <span className="uppercase font-bold tracking-wide">
                                    Garantie {product.warrantyMonths} Mois {product.condition === 'new' ? 'Constructeur' : 'Xeption'} inclus
                                </span>
                            </div>
                        )}

                        <div className="hidden md:flex space-x-4 pt-4">
                            <button
                                onClick={() => onAddToCart(product)}
                                className="bg-black text-white px-8 py-4 font-tech font-bold uppercase text-lg tracking-wider hover:bg-xeption-gold hover:text-black transition-colors shadow-xl flex items-center gap-2"
                            >
                                <ShoppingCart className="h-5 w-5" />
                                Ajouter au panier
                            </button>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 flex flex-col items-center justify-center order-1 md:order-2 z-10">
                        <div className="relative h-80 md:h-[500px] w-full flex items-center justify-center group mb-6">
                            <div className={`absolute w-64 h-64 md:w-96 md:h-96 rounded-full blur-[60px] group-hover:blur-[80px] transition-all duration-700 mix-blend-multiply ${product.condition === 'new'
                                ? 'bg-gradient-to-tr from-emerald-400/30 to-green-200/50'
                                : 'bg-gradient-to-tr from-xeption-gold/30 to-orange-200/50'
                                }`}></div>

                            <img
                                src={optimizeImage(activeImage, 1000)}
                                alt={`${product.name} pas cher Cameroun`} // Keyword injection in alt
                                className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform transition-transform duration-500 ease-out animate-in zoom-in-95"
                                key={activeImage}
                            />
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-4 w-full justify-start md:justify-center px-4 snap-x snap-mandatory scroll-smooth no-scrollbar">
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImage(img)}
                                    className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 overflow-hidden flex-shrink-0 transition-all snap-center ${activeImage === img ? 'border-xeption-gold shadow-lg scale-105' : 'border-gray-300 opacity-60 hover:opacity-100'}`}
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
                                    className="w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 border-gray-300 bg-black flex items-center justify-center flex-shrink-0 hover:border-xeption-gold transition-colors group snap-center"
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
                                    "{product.reviewShort || product.description}"
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
                    <button
                        onClick={() => onAddToCart(product)}
                        className="flex-1 bg-black text-white py-3 font-bold font-tech uppercase tracking-wider rounded-sm shadow-lg active:scale-95 transition-transform"
                    >
                        Ajouter
                    </button>
                </div>
            </div>

        </div>
    );
};

export default ProductDetail;
