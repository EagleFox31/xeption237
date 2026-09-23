import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  ShoppingCart,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Product } from '../../types';
import { getProductSlug } from '../../utils/slug';
import { getProductDisplayName } from '../../utils/productDisplay';
import { optimizeImage } from '../../utils/mediaOptimization';
import { ProductCardSkeleton } from '../common/SkeletonLoader';
import ProductCardImage from '../common/ProductCardImage';

export interface MobileShopViewProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
}

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name';

interface BrandChip {
  id: string;
  label: string;
}

// Marques spécifiques par univers / catégorie
const BRANDS_BY_CATEGORY: Record<string, BrandChip[]> = {
  phones: [
    { id: 'apple', label: 'Apple' },
    { id: 'samsung', label: 'Samsung' },
    { id: 'tecno', label: 'Tecno' },
    { id: 'xiaomi', label: 'Xiaomi' },
    { id: 'google', label: 'Google Pixel' },
    { id: 'infinix', label: 'Infinix' },
    { id: 'oppo', label: 'Oppo' },
  ],
  computer: [
    { id: 'hp', label: 'HP' },
    { id: 'dell', label: 'Dell' },
    { id: 'lenovo', label: 'Lenovo' },
    { id: 'asus', label: 'Asus' },
    { id: 'apple', label: 'Apple' },
    { id: 'microsoft', label: 'Microsoft' },
  ],
  tablettes: [
    { id: 'apple', label: 'Apple' },
    { id: 'samsung', label: 'Samsung' },
    { id: 'tecno', label: 'Tecno' },
    { id: 'blackview', label: 'Blackview' },
  ],
  accessories: [
    { id: 'samsung', label: 'Samsung' },
    { id: 'apple', label: 'Apple' },
    { id: 'jbl', label: 'JBL' },
    { id: 'oraimo', label: 'Oraimo' },
    { id: 'hp', label: 'HP' },
    { id: 'dell', label: 'Dell' },
    { id: 'lenovo', label: 'Lenovo' },
  ],
};

const DEFAULT_GLOBAL_BRANDS: BrandChip[] = [
  { id: 'apple', label: 'Apple' },
  { id: 'samsung', label: 'Samsung' },
  { id: 'tecno', label: 'Tecno' },
  { id: 'hp', label: 'HP' },
  { id: 'dell', label: 'Dell' },
  { id: 'lenovo', label: 'Lenovo' },
  { id: 'xiaomi', label: 'Xiaomi' },
  { id: 'google', label: 'Google Pixel' },
  { id: 'infinix', label: 'Infinix' },
];

export const MobileShopView: React.FC<MobileShopViewProps> = ({
  products,
  onAddToCart,
  onProductClick,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // État local synchronisé avec URL
  const initialCategory = searchParams.get('cat') || 'all';
  const initialBrand = searchParams.get('brand') || 'all';
  const initialQuery = searchParams.get('q') || '';
  const initialStock = searchParams.get('stock') === '1';
  const initialPromo = searchParams.get('promo') === '1' || searchParams.get('promo') === 'true';
  const initialCondition = searchParams.get('condition') || 'all';
  const initialSort = (searchParams.get('sort') as SortOption) || 'default';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [stockOnly, setStockOnly] = useState<boolean>(initialStock);
  const [promoOnly, setPromoOnly] = useState<boolean>(initialPromo);
  const [conditionFilter, setConditionFilter] = useState<string>(initialCondition);
  const [sortOption, setSortOption] = useState<SortOption>(initialSort);

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Verrouiller le défilement de l'arrière-plan quand le tiroir de filtres est ouvert
  useEffect(() => {
    if (isFilterDrawerOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isFilterDrawerOpen]);

  // Synchronisation avec les URL params externes (ex: clic sur PC, Tablettes, Accessoires dans la navbar)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('cat') || 'all';
    const brand = searchParams.get('brand') || 'all';
    const stock = searchParams.get('stock') === '1';
    const promo = searchParams.get('promo') === '1' || searchParams.get('promo') === 'true';
    const cond = searchParams.get('condition') || 'all';
    const s = (searchParams.get('sort') as SortOption) || 'default';

    setSearchQuery(q);
    setSelectedCategory(cat);
    setSelectedBrand(brand);
    setStockOnly(stock);
    setPromoOnly(promo);
    setConditionFilter(cond);
    setSortOption(s);
  }, [searchParams]);

  // Puces de marques adaptées dynamiquement à la catégorie en cours
  const activeBrandChips = useMemo(() => {
    const cat = selectedCategory?.toLowerCase();
    if (cat === 'computer' || cat === 'ordinateurs' || cat === 'pc') {
      return BRANDS_BY_CATEGORY.computer;
    }
    if (cat === 'tablettes' || cat === 'tablets') {
      return BRANDS_BY_CATEGORY.tablettes;
    }
    if (cat === 'accessories' || cat === 'accessoires') {
      return BRANDS_BY_CATEGORY.accessories;
    }
    if (cat === 'phones' || cat === 'smartphones') {
      return BRANDS_BY_CATEGORY.phones;
    }
    return DEFAULT_GLOBAL_BRANDS;
  }, [selectedCategory]);

  // Changement de catégorie : met à jour l'URL et bascule les puces vers les marques adaptées
  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    setSelectedBrand('all'); // Réinitialise la marque pour afficher toutes les puces de la nouvelle catégorie
    const nextParams = new URLSearchParams(searchParams);
    if (newCat === 'all') {
      nextParams.delete('cat');
    } else {
      nextParams.set('cat', newCat);
    }
    nextParams.delete('brand');
    setSearchParams(nextParams, { replace: true });
  };

  // Détecteur de marque universel et tolérant
  const matchBrand = (p: Product, brandKey: string): boolean => {
    const name = p.name.toLowerCase();
    const brand = (p.brand || '').toLowerCase();
    switch (brandKey) {
      case 'apple':
        return (
          brand === 'apple' ||
          name.includes('iphone') ||
          name.includes('apple') ||
          name.includes('ipad') ||
          name.includes('macbook')
        );
      case 'samsung':
        return brand === 'samsung' || name.includes('samsung') || name.includes('galaxy');
      case 'tecno':
        return brand === 'tecno' || name.includes('tecno') || name.includes('phantom');
      case 'google':
        return brand === 'google' || name.includes('pixel');
      case 'xiaomi':
        return brand === 'xiaomi' || name.includes('redmi') || name.includes('xiaomi');
      case 'infinix':
        return brand === 'infinix' || name.includes('infinix');
      case 'oppo':
        return brand === 'oppo' || name.includes('oppo');
      case 'hp':
        return (
          brand === 'hp' ||
          name.includes('hp ') ||
          name.startsWith('hp') ||
          name.includes('elitebook') ||
          name.includes('probook') ||
          name.includes('pavilion')
        );
      case 'dell':
        return (
          brand === 'dell' ||
          name.includes('dell') ||
          name.includes('latitude') ||
          name.includes('xps')
        );
      case 'lenovo':
        return (
          brand === 'lenovo' ||
          name.includes('lenovo') ||
          name.includes('thinkpad') ||
          name.includes('ideapad')
        );
      case 'asus':
        return (
          brand === 'asus' ||
          name.includes('asus') ||
          name.includes('expertbook') ||
          name.includes('zenbook')
        );
      case 'microsoft':
        return brand === 'microsoft' || name.includes('surface');
      case 'blackview':
        return brand === 'blackview' || name.includes('blackview');
      case 'jbl':
        return brand === 'jbl' || name.includes('jbl');
      case 'oraimo':
        return brand === 'oraimo' || name.includes('oraimo');
      default:
        return brand === brandKey || name.includes(brandKey);
    }
  };

  // Filtrage des produits
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Recherche textuelle
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q)
      );
    }

    // Filtre Catégorie
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Filtre Marque rapide
    if (selectedBrand !== 'all') {
      list = list.filter((p) => matchBrand(p, selectedBrand));
    }

    // Filtre En stock Mfoundi Mall
    if (stockOnly) {
      list = list.filter((p) => p.stock > 0);
    }

    // Filtre Promo
    if (promoOnly) {
      list = list.filter((p) => p.isPromo || (p.oldPrice && p.oldPrice > p.price));
    }

    // Filtre État
    if (conditionFilter !== 'all') {
      list = list.filter((p) => p.condition === conditionFilter);
    }

    // Tri
    if (sortOption === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedBrand,
    stockOnly,
    promoOnly,
    conditionFilter,
    sortOption,
  ]);

  const handleCardClick = (product: Product) => {
    if (onProductClick) {
      onProductClick(product);
    } else {
      navigate(`/product/${getProductSlug(product)}`);
    }
  };

  const handleChipClick = (brandKey: string) => {
    if (selectedBrand === brandKey) {
      setSelectedBrand('all');
    } else {
      setSelectedBrand(brandKey);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBrand('all');
    setSelectedCategory('all');
    setStockOnly(false);
    setPromoOnly(false);
    setConditionFilter('all');
    setSortOption('default');
    setIsFilterDrawerOpen(false);

    // Nettoyage URL
    setSearchParams({}, { replace: true });
  };

  const activeFiltersCount =
    (selectedBrand !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (stockOnly ? 1 : 0) +
    (promoOnly ? 1 : 0) +
    (conditionFilter !== 'all' ? 1 : 0) +
    (sortOption !== 'default' ? 1 : 0);

  const calculateDiscount = (product: Product): string | null => {
    if (product.oldPrice && product.oldPrice > product.price) {
      const discount = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
      return `-${discount}%`;
    }
    return null;
  };

  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case 'computer':
        return 'PC & Laptops';
      case 'phones':
        return 'Smartphones';
      case 'accessories':
        return 'Accessoires';
      case 'tablettes':
        return 'Tablettes';
      default:
        return 'Tout le catalogue';
    }
  };

  return (
    <div className="w-full min-h-screen bg-transparent text-white flex flex-col pb-32">
      {/* 1. BARRE DE RECHERCHE + BOUTON FILTRE (Conforme maquette 02_catalogue_filtres.jpg) */}
      <div className="px-3 pt-3 pb-2 sticky top-0 z-30 bg-[#0a0a0c]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          {/* Input de recherche avec icône loupe */}
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un smartphone, PC..."
              className="w-full bg-[#18181b] border border-zinc-800 text-white pl-9 pr-8 py-2.5 rounded-xl text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/80 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-zinc-400 hover:text-white"
                aria-label="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bouton filtre doré carré avec sliders (conforme maquette) */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="w-10 h-10 shrink-0 rounded-xl bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.35)] active:scale-95 transition-all relative"
            aria-label="Ouvrir les filtres avancés"
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[2.4]" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-tech font-black text-[9px] flex items-center justify-center leading-none border border-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* 2. PUCES DE MARQUES DYNAMIQUES (S'adaptent à la catégorie sélectionnée) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-2.5 pb-1">
          {/* Puce Tous */}
          <button
            type="button"
            onClick={() => setSelectedBrand('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-tech font-bold uppercase tracking-wider transition-all active:scale-95 ${
              selectedBrand === 'all'
                ? 'bg-white text-black font-black shadow-sm'
                : 'bg-[#18181b] border border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            Tous
          </button>

          {/* Marques de la catégorie sélectionnée */}
          {activeBrandChips.map((chip) => {
            const isSelected = selectedBrand === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-tech font-bold uppercase tracking-wider transition-all active:scale-95 border ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400 text-black font-black shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                    : 'border-zinc-800 bg-[#18181b] text-zinc-300 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. COMPTEUR DE RÉSULTATS & FILTRES ACTIFS (Optimisé pour fond clair / wallpaper) */}
      <div className="px-4 py-2 flex items-center justify-between text-[11px] text-zinc-700">
        <div className="flex items-center gap-1.5 truncate">
          {selectedCategory !== 'all' && (
            <span className="px-2 py-0.5 rounded-md bg-zinc-950 text-amber-400 border border-zinc-800 font-tech font-bold text-[10px] uppercase tracking-wider truncate shadow-sm">
              {getCategoryTitle(selectedCategory)}
            </span>
          )}
          <span className="text-zinc-800 font-semibold">
            <strong className="text-zinc-950 font-tech font-black text-xs">{filteredProducts.length}</strong>{' '}
            produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
          </span>
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-zinc-900 hover:text-amber-700 active:scale-95 flex items-center gap-1.5 font-tech font-bold uppercase tracking-wide text-[10px] shrink-0 bg-black/5 hover:bg-black/10 px-2.5 py-1 rounded-lg border border-black/10 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3 h-3 text-amber-600 stroke-[2.5]" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      {/* 4. GRILLE PRODUITS 2 COLONNES (Conforme maquette 02_catalogue_filtres.jpg) */}
      {products.length === 0 ? (
        <div className="grid grid-cols-2 gap-2.5 px-3 py-1">
          {[...Array(6)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 px-3 py-1">
          {filteredProducts.map((product) => {
            const discountLabel = calculateDiscount(product);
            const displayName = getProductDisplayName(product);
            const isRefurbished = product.condition === 'refurbished';

            return (
              <div
                key={product.id}
                onClick={() => handleCardClick(product)}
                className="bg-[#121215] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-2.5 flex flex-col justify-between shadow-lg relative cursor-pointer active:scale-[0.98] transition-all group"
              >
                {/* En-tête de carte : Badges d'état (Neuf / Occasion certifiée / Réduction) */}
                <div className="w-full flex items-center justify-between gap-1 mb-1 min-h-[20px]">
                  {/* Badge de réduction rouge si disponible */}
                  {discountLabel ? (
                    <span className="bg-red-500 text-white text-[9.5px] font-black px-1.5 py-0.5 rounded leading-none">
                      {discountLabel}
                    </span>
                  ) : (
                    <span />
                  )}

                  {/* Badge d'état (Reconditionné A+ ou Neuf) conforme maquette */}
                  {isRefurbished ? (
                    <span className="text-[9.5px] font-tech font-bold uppercase tracking-tight text-amber-300/90 border border-amber-400/40 bg-black/50 px-2 py-0.5 rounded-full leading-none">
                      Occasion A+
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-tech font-bold uppercase tracking-tight text-zinc-300 border border-zinc-700/80 bg-black/50 px-2 py-0.5 rounded-full leading-none">
                      Neuf
                    </span>
                  )}
                </div>

                {/* Photo du produit centrée avec fond propre et LQIP flou */}
                <div className="w-full aspect-square bg-[#18181c]/50 rounded-xl p-2 flex items-center justify-center overflow-hidden my-1 relative">
                  <ProductCardImage
                    src={optimizeImage(product.image, 320)}
                    alt={displayName}
                    width={320}
                    height={320}
                    sizes="(max-width: 640px) 50vw, 300px"
                    loading="lazy"
                    placeholderClassName="bg-white/[0.03]"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logos/apple.svg';
                    }}
                  />
                </div>

                {/* Nom du produit */}
                <h4 className="text-white font-tech font-medium text-xs truncate mt-1">
                  {displayName}
                </h4>

                {/* Ligne inférieure : Prix formaté en FCFA + Bouton panier carré doré */}
                <div className="mt-2 pt-1 flex items-center justify-between gap-1">
                  <span className="font-tech text-amber-400 text-xs sm:text-sm font-black tracking-tight truncate">
                    {formatPrice(product.price)}
                  </span>

                  {/* Bouton carré or avec icône caddie (conforme maquette) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(product);
                    }}
                    className="w-8 h-8 shrink-0 rounded-xl bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.35)] active:scale-90 transition-transform"
                    aria-label={`Ajouter ${displayName} au panier`}
                  >
                    <ShoppingCart className="w-4 h-4 stroke-[2.4]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* État vide si aucun produit ne correspond aux filtres (optimisé fond clair) */
        <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-black/5 border border-black/10 flex items-center justify-center mb-3 text-zinc-700 shadow-sm">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-zinc-950 font-tech font-bold text-sm uppercase mb-1">
            Aucun produit trouvé
          </h4>
          <p className="text-zinc-700 text-xs max-w-xs mb-4">
            Essayez de sélectionner une autre marque ou de réinitialiser vos filtres.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-tech font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform shadow-md"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* 5. TIROIR MODAL DE FILTRES AVANCÉS (Bottom Sheet via React Portal z-[200]) */}
      {isFilterDrawerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col justify-end animate-fade-in"
            onClick={() => setIsFilterDrawerOpen(false)}
          >
            <div
              className="bg-[#0f0f13] border-t border-white/20 rounded-t-3xl p-5 pb-12 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header du drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-400" />
                  <span className="font-tech font-bold text-sm uppercase text-white tracking-wider">
                    Filtres &amp; Tri
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section : Univers tech (Bascule la catégorie et adapte les puces) */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-tech">
                  Catégorie d'appareil
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'Toutes les catégories' },
                    { id: 'phones', label: 'Smartphones (160)' },
                    { id: 'computer', label: 'PC & Laptops (32)' },
                    { id: 'accessories', label: 'Accessoires (35)' },
                    { id: 'tablettes', label: 'Tablettes (2)' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-tech font-bold uppercase transition-all flex items-center justify-between border ${
                        selectedCategory === cat.id
                          ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                          : 'border-zinc-800 bg-zinc-900/90 text-zinc-300'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {selectedCategory === cat.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section : Tri */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-tech">
                  Trier par
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'default', label: 'Recommandés' },
                    { id: 'price-asc', label: 'Prix croissant' },
                    { id: 'price-desc', label: 'Prix décroissant' },
                    { id: 'name', label: 'Nom (A-Z)' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSortOption(opt.id as SortOption)}
                      className={`py-2 px-3 rounded-xl text-xs font-tech font-bold uppercase transition-all flex items-center justify-between border ${
                        sortOption === opt.id
                          ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                          : 'border-zinc-800 bg-zinc-900/90 text-zinc-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortOption === opt.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section : Disponibilité Mfoundi Mall */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-tech">
                  Disponibilité
                </label>
                <button
                  type="button"
                  onClick={() => setStockOnly((prev) => !prev)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-tech font-bold uppercase transition-all flex items-center justify-between border ${
                    stockOnly
                      ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                      : 'border-zinc-800 bg-zinc-900/90 text-zinc-300'
                  }`}
                >
                  <span>En stock physique à Mfoundi Mall</span>
                  {stockOnly && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Section : État du matériel */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-tech">
                  État
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Tous' },
                    { id: 'new', label: 'Neuf' },
                    { id: 'refurbished', label: 'Occasion' },
                  ].map((cond) => (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setConditionFilter(cond.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-tech font-bold uppercase transition-all flex items-center justify-center border ${
                        conditionFilter === cond.id
                          ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                          : 'border-zinc-800 bg-zinc-900/90 text-zinc-300'
                      }`}
                    >
                      <span>{cond.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions : Réinitialiser + Appliquer */}
              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex-1 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white text-xs font-tech font-bold uppercase tracking-wider active:scale-95 transition-all"
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-tech font-black uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                >
                  Voir les {filteredProducts.length} produits
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default MobileShopView;
