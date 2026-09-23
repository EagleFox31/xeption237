import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  ShoppingCart,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  Award,
  Sparkles,
  HelpCircle,
  ChevronDown,
  Star,
  Cpu,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { Product } from '../../types';
import { optimizeImage } from '../../utils/mediaOptimization';
import { getProductSlug } from '../../utils/slug';
import { getProductDisplayName, normalizeSamsungGalaxySpelling } from '../../utils/productDisplay';
import { buildProductFaq } from '../../utils/productFaq';
import { isUuid } from '../../utils/productBrand';
import { SkeletonShimmer } from '../common/SkeletonLoader';
import ProductCardImage from '../common/ProductCardImage';

export interface MobileProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  cartCount: number;
  onOpenCart: () => void;
  relatedProducts?: Product[];
}

export const MobileProductDetailView: React.FC<MobileProductDetailViewProps> = ({
  product,
  onBack,
  onAddToCart,
  cartCount,
  onOpenCart,
  relatedProducts = [],
}) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const galleryImages = useMemo(() => {
    return [product.image, ...(product.images || [])].filter(Boolean);
  }, [product.image, product.images]);

  const activeImage = galleryImages[activeIndex] || product.image;
  const displayName = getProductDisplayName(product);

  // Défilement automatique des images (toutes les 4,5 secondes si non touché)
  useEffect(() => {
    if (galleryImages.length < 2 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % galleryImages.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [galleryImages.length, isPaused, product.id]);

  // Résolution propre de la marque pour le fil d'ariane (JAMAIS d'UUID brut)
  const brandLabel = useMemo(() => {
    const raw = product.brand?.trim();
    if (raw && !isUuid(raw)) {
      return raw;
    }
    // Si c'est un UUID de base de données, déduire le vrai nom depuis l'intitulé du produit
    const nameLower = product.name.toLowerCase();
    if (nameLower.includes('apple') || nameLower.includes('iphone') || nameLower.includes('macbook') || nameLower.includes('airpods') || nameLower.includes('ipad')) {
      return 'Apple';
    }
    if (nameLower.includes('samsung') || nameLower.includes('galaxy') || nameLower.includes('buds')) {
      return 'Samsung';
    }
    if (nameLower.includes('tecno') || nameLower.includes('phantom') || nameLower.includes('camon')) {
      return 'Tecno';
    }
    if (nameLower.includes('xiaomi') || nameLower.includes('redmi') || nameLower.includes('poco')) {
      return 'Xiaomi';
    }
    if (nameLower.includes('google') || nameLower.includes('pixel')) {
      return 'Google Pixel';
    }
    if (nameLower.includes('infinix')) return 'Infinix';
    if (nameLower.includes('hp') || nameLower.includes('elitebook') || nameLower.includes('probook')) return 'HP';
    if (nameLower.includes('dell') || nameLower.includes('latitude') || nameLower.includes('xps')) return 'Dell';
    if (nameLower.includes('lenovo') || nameLower.includes('thinkpad')) return 'Lenovo';
    if (nameLower.includes('asus')) return 'Asus';
    if (nameLower.includes('oraimo') || nameLower.includes('freepods')) return 'Oraimo';
    if (nameLower.includes('jbl')) return 'JBL';
    if (nameLower.includes('blackview')) return 'Blackview';
    return null; // Si non résolu, on omet plutôt que d'afficher un UUID moche
  }, [product.brand, product.name]);

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  // Gestion du swipe tactile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const distance = touchStartX.current - touchEndX.current;
      const minSwipeDistance = 35;

      if (distance > minSwipeDistance) {
        // Swipe vers la gauche -> image suivante
        setActiveIndex((prev) => (prev + 1) % galleryImages.length);
      } else if (distance < -minSwipeDistance) {
        // Swipe vers la droite -> image précédente
        setActiveIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
    setTimeout(() => setIsPaused(false), 3000);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: `Découvrez ${displayName} chez Xeption`,
          url,
        });
        return;
      } catch {
        // Fallback presse-papier
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2200);
    } catch {
      // Ignore
    }
  };

  const handleAcheterComptant = () => {
    onAddToCart(product);
    onOpenCart();
  };

  const handleSmartTroc = () => {
    navigate(`/troc?target=${product.id}`);
  };

  // Garantie issue de la base de données (colonne warranty_months)
  const dbWarranty = Number(product.warrantyMonths || 0);
  const warrantyDisplay =
    dbWarranty > 0
      ? `Garantie ${dbWarranty} Mois`
      : product.condition === 'refurbished'
      ? 'Garantie boutique 6 Mois'
      : 'Garantie constructeur 12 Mois';

  const oldPrice = product.oldPrice;
  const discountPercent =
    oldPrice && oldPrice > product.price
      ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
      : null;

  const categoryLabel =
    product.category === 'phones'
      ? 'Smartphones'
      : product.category === 'computer'
      ? 'Ordinateurs'
      : product.category === 'tablettes'
      ? 'Tablettes'
      : 'Accessoires';

  // Questions fréquentes issues de l'utilitaire expert partagé avec le bureau
  const faqList = useMemo(() => buildProductFaq(product), [product]);

  // Liste des caractéristiques techniques (supporte tableau ou objet)
  const formattedSpecs = useMemo(() => {
    if (!product.specs) return [];
    if (Array.isArray(product.specs)) {
      return product.specs.filter((s) => s && s.label && s.value);
    }
    if (typeof product.specs === 'object') {
      return Object.entries(product.specs).map(([label, value]) => ({
        label,
        value: String(value),
      }));
    }
    return [];
  }, [product.specs]);

  const hasReviews = product.reviews && product.reviews.length > 0;

  return (
    <div className="w-full min-h-screen bg-[#0a0a0c] text-white flex flex-col pb-36 selection:bg-amber-400 selection:text-black">
      {/* 1. TOP BAR STICKY (Conforme maquette : < Retour, Partage, Panier carré or) */}
      <header className="sticky top-0 z-40 bg-[#0a0a0c]/95 backdrop-blur-md px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-amber-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all"
          aria-label="Retour"
        >
          <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
        </button>

        <div className="flex items-center space-x-3">
          {/* Bouton Partage */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 active:scale-90 transition-all"
            aria-label="Partager ce produit"
          >
            <Share2 className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Bouton Panier carré doré avec badge circulaire conforme maquette */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.4)] active:scale-90 transition-transform"
            aria-label={`Panier (${cartCount})`}
          >
            <ShoppingCart className="w-5 h-5 stroke-[2.4]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-black text-white text-[10px] font-black border border-amber-400 flex items-center justify-center leading-none shadow-md">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Notification Toast Partage */}
      {shareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-amber-400/50 text-amber-400 text-xs font-tech font-bold uppercase tracking-wider shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          Lien du produit copié !
        </div>
      )}

      {/* 2. FIL D'ARIANE (Propre, SANS code UUID) */}
      <nav aria-label="Fil d'ariane" className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hover:text-white transition-colors"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <button
            type="button"
            onClick={() => navigate(`/shop?cat=${product.category}`)}
            className="hover:text-white transition-colors"
          >
            {categoryLabel}
          </button>
          {brandLabel && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <button
                type="button"
                onClick={() => navigate(`/shop?q=${encodeURIComponent(brandLabel)}`)}
                className="hover:text-white transition-colors capitalize font-medium text-zinc-300"
              >
                {brandLabel}
              </button>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span className="text-zinc-200 font-medium truncate max-w-[140px]">
            {displayName}
          </span>
        </div>
      </nav>

      {/* 3. HERO IMAGE CAROUSEL DYNAMIQUE */}
      <div className="px-4 mt-2">
        <div
          className="w-full aspect-[4/3] max-h-[340px] rounded-3xl bg-gradient-to-b from-[#18181d] via-[#121215] to-[#0c0c0e] border border-white/10 p-6 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden touch-pan-y group select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Badge condition (Neuf scellé ou Occasion certifiée A+) */}
          <div className="absolute top-4 left-4 z-10">
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-tech font-bold uppercase tracking-wider ${
                product.condition === 'new'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
              }`}
            >
              {product.condition === 'new' ? 'Neuf scellé' : 'Occasion certifiée A+'}
            </span>
          </div>

          {/* Flèches de navigation gauche / droite pour faire défiler */}
          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center active:scale-90 hover:bg-black/80 transition-all shadow-lg"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center active:scale-90 hover:bg-black/80 transition-all shadow-lg"
                aria-label="Photo suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Image active animée avec LQIP flou et fetchPriority="high" */}
          <div className="w-full h-full flex items-center justify-center relative">
            <ProductCardImage
              src={optimizeImage(activeImage, 700)}
              alt={displayName}
              width={700}
              height={525}
              priority={true}
              sizes="(max-width: 640px) 90vw, 600px"
              placeholderClassName="bg-transparent"
              className="max-h-full max-w-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] pointer-events-none"
              key={activeImage}
            />
          </div>

          {/* Indicateur de pagination à points cliquables */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 z-10">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`transition-all duration-300 ${
                    idx === activeIndex
                      ? 'w-6 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]'
                      : 'w-1.5 h-1.5 rounded-full bg-zinc-600 hover:bg-zinc-400'
                  }`}
                  aria-label={`Photo ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Galerie de miniatures cliquables (comme sur ordinateur) */}
        {galleryImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pt-2.5 pb-1 justify-center scrollbar-none">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`w-14 h-14 rounded-xl border-2 p-1 bg-[#131316] shrink-0 transition-all flex items-center justify-center ${
                  activeIndex === idx
                    ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)] scale-105'
                    : 'border-zinc-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={optimizeImage(img, 120)}
                  alt={`Aperçu ${idx + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. BADGE DISPONIBILITÉ */}
      <div className="px-4 mt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-tech font-bold uppercase tracking-wider">
          <Award className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {product.stock > 0
              ? 'En stock · Mfoundi Mall'
              : 'Sur commande · Yaoundé'}
          </span>
        </div>
      </div>

      {/* 5. TITRE DU PRODUIT */}
      <div className="px-4 mt-2">
        <h1 className="text-xl sm:text-2xl font-black text-white leading-tight font-tech tracking-tight">
          {displayName}
        </h1>
      </div>

      {/* 6. PRIX & PROMOTIONS (Grand doré + barré) */}
      <div className="px-4 mt-3 flex items-baseline gap-3 flex-wrap">
        <span className="text-3xl font-black text-amber-400 font-tech tracking-tight">
          {product.price.toLocaleString('fr-FR')} FCFA
        </span>

        {oldPrice && oldPrice > product.price && (
          <div className="flex flex-col">
            <span className="text-sm font-tech line-through text-zinc-400 font-bold">
              {oldPrice.toLocaleString('fr-FR')} FCFA
            </span>
            {discountPercent && (
              <span className="text-[11px] text-amber-400 font-medium">
                {discountPercent}% de réduction
              </span>
            )}
          </div>
        )}
      </div>

      {/* 7. BADGE GARANTIE (Issu de la Base de Données) */}
      <div className="px-4 mt-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-amber-400/40 text-amber-400 text-xs font-tech font-bold uppercase tracking-wider">
          <span>{warrantyDisplay}</span>
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        </div>
      </div>

      {/* 8. SECTION "LE VERDICT XEPTION" (Comme sur ordinateur) */}
      {(product.reviewShort || product.description || product.pros || product.cons) && (
        <div className="px-4 mt-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#18181d] via-[#131317] to-[#0d0d10] border border-amber-400/20 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-amber-400 rounded-full"></span>
              <h3 className="text-sm font-black text-white font-tech uppercase tracking-wider">
                Le Verdict Xeption
              </h3>
            </div>

            {(product.reviewShort || product.description) && (
              <p className="text-xs text-zinc-300 leading-relaxed italic border-l-2 border-amber-400/40 pl-3.5 py-1">
                "{normalizeSamsungGalaxySpelling(product.reviewShort || product.description || '')}"
              </p>
            )}

            {/* On Valide / On Aime Moins */}
            {(product.pros || product.cons) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                {product.pros && product.pros.length > 0 && (
                  <div className="space-y-1.5 bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase font-tech">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>On Valide</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-zinc-300">
                      {product.pros.map((pro, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {product.cons && product.cons.length > 0 && (
                  <div className="space-y-1.5 bg-red-950/20 p-3 rounded-xl border border-red-500/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase font-tech">
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>On Aime Moins</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-zinc-300">
                      {product.cons.map((con, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-red-400 font-bold">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 11. DÉTAILS TECHNIQUES COMPLETS (Toutes les specs de la base de données) */}
      {formattedSpecs.length > 0 && (
        <div className="px-4 mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-tech">
              Détails &amp; Caractéristiques
            </h3>
          </div>

          <div className="rounded-2xl bg-[#121215] border border-white/10 overflow-hidden divide-y divide-white/5">
            {formattedSpecs.map((spec, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 text-xs hover:bg-white/5 transition-colors"
              >
                <span className="text-zinc-400 font-mono uppercase tracking-wide text-[11px]">
                  {spec.label}
                </span>
                <span className="text-white font-bold text-right ml-4">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12. RASSURANCE SERVICE & LIVRAISON CAMEROUN */}
      <div className="px-4 mt-6">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-[#121217] border border-white/10 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold font-tech uppercase tracking-wider text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>Engagements &amp; Rassurance Xeption</span>
          </div>
          <div className="space-y-2 text-xs text-zinc-300">
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Livraison Express</strong> : Le jour même à Yaoundé (Bastos, Omnisports, Odza...) et en 24h à Douala (Akwa, Bonapriso...).
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Test &amp; Inspection</strong> : Matériel 100% authentique vérifié par nos techniciens avec certificat d'authenticité.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>Showroom</strong> : Retrait physique possible au Showroom Mfoundi Mall, Yaoundé.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 13. QUESTIONS FRÉQUENTES (FAQ ACCORDÉON) */}
      {faqList.length > 0 && (
        <div className="px-4 mt-8">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-tech">
              Questions Fréquentes
            </h3>
          </div>

          <div className="space-y-2">
            {faqList.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#121215] border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-white hover:text-amber-400 transition-colors"
                  >
                    <span className="pr-2">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 text-xs text-zinc-400 leading-relaxed border-t border-white/5 pt-2">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 14. AVIS CLIENTS (SI DISPONIBLES) */}
      {hasReviews && (
        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-tech">
              Avis Clients ({product.reviews?.length})
            </h3>
            {product.rating && (
              <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{product.rating}/5</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {product.reviews?.map((rev, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-[#121215] border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{rev.user || 'Client vérifié'}</span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < (rev.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-300">{rev.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 15. PRODUITS SIMILAIRES */}
      {relatedProducts.length > 0 && (
        <div className="mt-8 px-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-tech mb-3">
            Vous pourriez aussi aimer
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {relatedProducts.slice(0, 4).map((rel) => (
              <button
                key={rel.id}
                type="button"
                onClick={() => navigate(`/product/${getProductSlug(rel)}`)}
                className="w-36 shrink-0 p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left active:scale-95 transition-all"
              >
                <div className="w-full aspect-square rounded-xl bg-black/50 p-2 mb-2 flex items-center justify-center">
                  <img
                    src={optimizeImage(rel.image, 150)}
                    alt={rel.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <h4 className="text-[11px] font-bold text-white truncate">{rel.name}</h4>
                <p className="text-xs font-tech font-black text-amber-400 mt-0.5">
                  {rel.price.toLocaleString('fr-FR')} F
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 16. BARRE D'ACTIONS FIXE (Conforme maquette : [⇄ Échanger mon ancien phone] + [Acheter comptant]) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-white/10 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-10px_30px_rgba(0,0,0,0.95)]">
        <div className="max-w-md mx-auto flex items-stretch gap-2.5">
          {/* Bouton 1 : Échanger mon ancien phone (Smart Troc) */}
          <button
            type="button"
            onClick={handleSmartTroc}
            className="flex-[1.5] py-2.5 px-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black flex items-center gap-2.5 shadow-[0_0_15px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-all text-left group"
          >
            <RefreshCw
              className="w-5 h-5 shrink-0 stroke-[2.5]"
              style={{ animation: 'spin 4.5s linear infinite' }}
            />
            <div className="leading-tight">
              <div className="text-xs font-black font-tech uppercase tracking-wide">
                Échanger mon phone
              </div>
              <div className="text-[10px] font-medium text-zinc-900 leading-tight">
                Smart Troc · Paye la différence
              </div>
            </div>
          </button>

          {/* Bouton 2 : Acheter comptant */}
          <button
            type="button"
            onClick={handleAcheterComptant}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-amber-400/80 text-amber-400 flex flex-col items-center justify-center text-center active:scale-[0.98] transition-all shadow-lg"
          >
            <span className="text-xs font-black font-tech uppercase tracking-wider">
              Acheter comptant
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileProductDetailView;
