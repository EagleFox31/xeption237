
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category } from '../types';
import { ShoppingCart, Search, RotateCcw, ChevronDown, Star, X, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { optimizeImage } from '../utils/mediaOptimization';
import { getProductDisplayName, normalizeSamsungGalaxySpelling } from '../utils/productDisplay';
import { ProductBadgeChips } from './product/ProductBadgeChips';
import ProductCardImage from './common/ProductCardImage';
import ProductCard from './product/ProductCard';
import {
  getBrandDisplayName,
  canonicalizeBrandKey,
  UNASSIGNED_BRAND_KEY,
  type BrandRef,
} from '../utils/productBrand';
import { supabase } from '../services/supabaseClient';
import ShopFiltersPanel from './shop/ShopFiltersPanel';
import ShopFixedFiltersSidebar from './shop/ShopFixedFiltersSidebar';
import ProductListRow from './shop/ProductListRow';
import {
  buildFacetedFacetGroups,
  applyShopFilters,
  buildBrandCounts,
  type ShopFilterCriteria,
} from '../utils/shopProductFilters';
import type { FacetKey } from '../utils/shopFacets';
import { getFacetKeysForCategory } from '../utils/shopFacets';
import {
  formatPriceFcfa,
  getProductPriceBounds,
  isPriceFilterActive,
} from '../utils/shopPriceFilter';
import {
  SHOP_PAGE_SIZE,
  clampPage,
  paginateItems,
  totalPages,
} from '../utils/shopPagination';
import ShopPagination from './shop/ShopPagination';

type ViewMode = 'grid' | 'list';

interface ProductListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  title?: string;
  filter?: string;
  onFilterChange?: (next: string) => void;
  brandFilter?: string;
  onBrandChange?: (next: string) => void;
  /** Réduit le padding supérieur (home, sous le chip livraison) */
  tightTop?: boolean;
  /** Bandeau boutique + filtres sticky (page /shop) */
  stickyToolbar?: boolean;
  /** Hero shop au-dessus — allège le bandeau sticky */
  hasShopHero?: boolean;
  searchQuery?: string;
  sort?: string;
  onSortChange?: (next: string) => void;
  promoOnly?: boolean;
  onPromoOnlyChange?: (enabled: boolean) => void;
  inStockOnly?: boolean;
  onInStockOnlyChange?: (enabled: boolean) => void;
  onClearSearch?: () => void;
  onResetFilters?: () => void;
  storageFilter?: string;
  ramFilter?: string;
  conditionFilter?: string;
  onStorageChange?: (value: string) => void;
  onRamChange?: (value: string) => void;
  onConditionChange?: (value: string) => void;
  priceMin?: number | null;
  priceMax?: number | null;
  onPriceRangeChange?: (min: number | null, max: number | null) => void;
  onResultCountChange?: (count: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  onAddToCart,
  onProductClick,
  title = "Nos Pépites",
  filter,
  onFilterChange,
  brandFilter,
  onBrandChange,
  tightTop = false,
  stickyToolbar = false,
  hasShopHero = false,
  searchQuery = '',
  sort = 'default',
  onSortChange,
  promoOnly = false,
  onPromoOnlyChange,
  inStockOnly = false,
  onInStockOnlyChange,
  onClearSearch,
  onResetFilters,
  storageFilter = 'all',
  ramFilter = 'all',
  conditionFilter = 'all',
  onStorageChange,
  onRamChange,
  onConditionChange,
  priceMin = null,
  priceMax = null,
  onPriceRangeChange,
  onResultCountChange,
  page = 1,
  onPageChange,
}) => {
  const [internalFilter, setInternalFilter] = useState<string>('all');
  const [internalBrandFilter, setInternalBrandFilter] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandRef[]>([]);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('shop_view_mode') === 'list') {
      return 'list';
    }
    return 'grid';
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const shopToolbarRef = React.useRef<HTMLDivElement>(null);
  const skipPageScrollRef = React.useRef(true);

  const isShopLayout = stickyToolbar && hasShopHero;

  const activeFilter = filter ?? internalFilter;
  const activeBrand = brandFilter ?? internalBrandFilter;
  // L'URL/filtre porte un SLUG (?brand=samsung, pro & SEO). On le résout ici vers l'ID
  // canonique de marque pour le matching/les compteurs (rétro-compat si un ID est passé).
  const resolvedBrand = useMemo(() => {
    if (!activeBrand || activeBrand === 'all' || activeBrand === UNASSIGNED_BRAND_KEY) return activeBrand;
    const bySlug = brands.find((b) => b.slug === activeBrand);
    return canonicalizeBrandKey(bySlug ? bySlug.id : activeBrand, brands);
  }, [activeBrand, brands]);
  const setFilter = (next: string) => {
    if (onFilterChange) onFilterChange(next);
    else setInternalFilter(next);
  };
  const setBrand = (next: string) => {
    if (onBrandChange) onBrandChange(next);
    else setInternalBrandFilter(next);
  };

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (data) setCategories(data as Category[]);
    };
    fetchCats();
  }, []);

  useEffect(() => {
    const fetchBrands = async () => {
      const { data } = await supabase.from('brands').select('id,name,slug').order('name', { ascending: true });
      if (data) setBrands(data as BrandRef[]);
      setBrandsLoaded(true);
    };
    void fetchBrands();
  }, []);

  const productsInCategory = useMemo(() => {
    if (activeFilter === 'all') return products;
    return products.filter(p => p.category === activeFilter);
  }, [products, activeFilter]);

  const filterCriteria = useMemo<ShopFilterCriteria>(
    () => ({
      activeBrand: resolvedBrand,
      searchQuery,
      promoOnly,
      inStockOnly,
      storageFilter,
      ramFilter,
      conditionFilter,
      priceMin,
      priceMax,
    }),
    [resolvedBrand, searchQuery, promoOnly, inStockOnly, storageFilter, ramFilter, conditionFilter, priceMin, priceMax],
  );

  const priceBoundsPool = useMemo(
    () => applyShopFilters(productsInCategory, filterCriteria, brands, 'price'),
    [productsInCategory, filterCriteria, brands],
  );

  const priceBounds = useMemo(
    () => getProductPriceBounds(priceBoundsPool),
    [priceBoundsPool],
  );

  const filteredProducts = useMemo(() => {
    let list = applyShopFilters(productsInCategory, filterCriteria, brands);

    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    return list;
  }, [productsInCategory, filterCriteria, brands, sort]);

  useEffect(() => {
    onResultCountChange?.(filteredProducts.length);
  }, [filteredProducts.length, onResultCountChange]);

  const shopPaging = isShopLayout && Boolean(onPageChange);
  const shopPageCount = totalPages(filteredProducts.length, SHOP_PAGE_SIZE);
  const pagedProducts = useMemo(
    () => (shopPaging ? paginateItems(filteredProducts, page, SHOP_PAGE_SIZE) : filteredProducts),
    [filteredProducts, page, shopPaging],
  );

  useEffect(() => {
    if (!shopPaging || !onPageChange) return;
    const safe = clampPage(page, filteredProducts.length, SHOP_PAGE_SIZE);
    if (safe !== page) onPageChange(safe);
  }, [filteredProducts.length, onPageChange, page, shopPaging]);

  useEffect(() => {
    if (!shopPaging) return;
    if (skipPageScrollRef.current) {
      skipPageScrollRef.current = false;
      return;
    }
    shopToolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page, shopPaging]);

  const facetGroups = useMemo(
    () =>
      isShopLayout && activeFilter !== 'all'
        ? buildFacetedFacetGroups(productsInCategory, activeFilter, filterCriteria, brands)
        : [],
    [isShopLayout, activeFilter, productsInCategory, filterCriteria, brands],
  );

  const activeFacets = useMemo(
    () => ({
      storage: storageFilter !== 'all' ? storageFilter : undefined,
      ram: ramFilter !== 'all' ? ramFilter : undefined,
      condition: conditionFilter !== 'all' ? conditionFilter : undefined,
    }),
    [storageFilter, ramFilter, conditionFilter],
  );

  const handleFacetChange = (key: FacetKey, value: string) => {
    if (key === 'storage') onStorageChange?.(value);
    else if (key === 'ram') onRamChange?.(value);
    else if (key === 'condition') onConditionChange?.(value);
  };

  const FACET_CHIP_LABELS: Record<string, Record<string, string>> = {
    storage: { '32': '32 Go', '64': '64 Go', '128': '128 Go', '256': '256 Go', '512': '512 Go', '1024': '1 To' },
    ram: { '2': '2 Go RAM', '3': '3 Go RAM', '4': '4 Go RAM', '6': '6 Go RAM', '8': '8 Go RAM', '12': '12 Go RAM', '16': '16 Go RAM' },
    condition: { new: 'Neuf', refurbished: 'Reconditionné' },
  };

  const hasActiveFilters =
    activeFilter !== 'all' ||
    activeBrand !== 'all' ||
    searchQuery.trim().length > 0 ||
    promoOnly ||
    inStockOnly ||
    sort !== 'default' ||
    storageFilter !== 'all' ||
    ramFilter !== 'all' ||
    conditionFilter !== 'all' ||
    isPriceFilterActive(priceMin, priceMax);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(p => {
      const key = p.category || 'uncategorized';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [products]);

  const brandPool = useMemo(
    () => applyShopFilters(productsInCategory, filterCriteria, brands, 'brand'),
    [productsInCategory, filterCriteria, brands],
  );

  const brandCategoryTotal = brandPool.length;

  const brandOptions = useMemo(() => {
    const { options, unassigned } = buildBrandCounts(brandPool, brands);

    const mapped = options
      .map(({ id, count }) => ({
        id,
        count,
        name: getBrandDisplayName(id, brands),
        brandRef: brands.find((b) => b.id === id),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));

    if (unassigned > 0) {
      mapped.push({
        id: UNASSIGNED_BRAND_KEY,
        count: unassigned,
        name: getBrandDisplayName(UNASSIGNED_BRAND_KEY, brands),
        brandRef: undefined,
      });
    }

    return mapped;
  }, [brandPool, brands]);

  useEffect(() => {
    // Ne pas reset tant que les options ne sont pas prêtes (produits en cours de
    // chargement) : sinon un ?brand=<slug> arrivant à froid serait vidé à tort.
    if (!brandsLoaded || activeBrand === 'all' || brandOptions.length === 0) return;
    const exists =
      resolvedBrand === UNASSIGNED_BRAND_KEY ||
      brandOptions.some((b) => b.id === resolvedBrand);
    if (!exists) setBrand('all');
  }, [activeBrand, resolvedBrand, brandOptions, brandsLoaded]);

  useEffect(() => {
    if (!brandsLoaded || activeFilter === 'all') return;
    const expectedFacetKeys = getFacetKeysForCategory(activeFilter);
    if (expectedFacetKeys.length > 0 && facetGroups.length === 0) return;

    const resetIfMissing = (
      value: string,
      key: FacetKey,
      reset: ((v: string) => void) | undefined,
    ) => {
      if (!reset || value === 'all') return;
      const group = facetGroups.find((g) => g.key === key);
      if (!group) return;
      const exists = group.options.some((o) => o.value === value);
      if (!exists) reset('all');
    };
    resetIfMissing(storageFilter, 'storage', onStorageChange);
    resetIfMissing(ramFilter, 'ram', onRamChange);
    resetIfMissing(conditionFilter, 'condition', onConditionChange);
  }, [
    brandsLoaded,
    activeFilter,
    facetGroups,
    storageFilter,
    ramFilter,
    conditionFilter,
    onStorageChange,
    onRamChange,
    onConditionChange,
  ]);

  useEffect(() => {
    if (isShopLayout) sessionStorage.setItem('shop_view_mode', viewMode);
  }, [viewMode, isShopLayout]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileFiltersOpen]);

  // --- CONTENU SEO DYNAMIQUE ---
  const getSeoText = () => {
      if (activeFilter === 'smartphones' || activeFilter === 'phones') {
          return (
              <>
                  <h3 className="text-lg font-bold text-white mb-2">Vente de Smartphones au Cameroun (Douala & Yaoundé)</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                      Vous cherchez le meilleur prix pour un <strong>iPhone 15 Pro Max</strong>, un <strong>Samsung Galaxy S24 Ultra</strong> ou un <strong>Google Pixel</strong> au Cameroun ? 
                      Xeption Network est votre leader High-Tech. Nous livrons des téléphones neufs et reconditionnés (Grade A) partout au 237. 
                      Profitez de nos offres sur les marques Apple, Samsung, Xiaomi, Tecno et Infinix. Paiement à la livraison disponible à <strong>Akwa</strong>, <strong>Bastos</strong>, et partout ailleurs.
                  </p>
              </>
          );
      }
      if (activeFilter === 'tablettes' || activeFilter === 'tablets') {
          return (
              <>
                  <h3 className="text-lg font-bold text-white mb-2">Tablettes Android & iPad au Cameroun</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                      Besoin d&apos;une <strong>tablette</strong> pour le travail, les études ou le divertissement ?
                      Retrouvez iPad, Galaxy Tab, Xiaomi Pad et tablettes robustes comme <strong>Blackview</strong> —
                      livraison Yaoundé & Douala, paiement à la livraison.
                  </p>
              </>
          );
      }
      if (activeFilter === 'laptops' || activeFilter === 'ordinateurs') {
          return (
              <>
                  <h3 className="text-lg font-bold text-white mb-2">PC Gamer et MacBook Pro au Prix du Mboa</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                      Besoin d'un ordinateur puissant pour le travail ou le gaming ? Découvrez notre stock de <strong>MacBook Pro M3</strong>, <strong>Dell XPS</strong>, et <strong>HP Omen</strong> à Yaoundé et Douala. 
                      Que vous soyez architecte, développeur ou gamer, nous avons le PC portable qu'il vous faut. Garantie locale Xeption incluse.
                  </p>
              </>
          );
      }
      return (
          <>
              <h3 className="text-lg font-bold text-white mb-2">Le Leader du E-commerce High-Tech au Cameroun</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                  Xeption Network n'est pas juste une boutique en ligne. C'est la référence pour l'achat de matériel informatique et téléphonique au Cameroun. 
                  Nous couvrons tout le territoire : <strong>Douala</strong>, <strong>Yaoundé</strong>, <strong>Bafoussam</strong>, <strong>Garoua</strong>, <strong>Kribi</strong>. 
                  Retrouvez nos <strong>Consoles PS5</strong>, <strong>Accessoires Gaming</strong>, et profitez de notre service de <strong>Troc (Échange)</strong> unique au pays.
              </p>
          </>
      );
  };

  // Logique pour insérer la pub au milieu (après le 5ème produit par ex)

  const SORT_LABELS: Record<string, string> = {
    'price-asc': 'Prix croissant',
    'price-desc': 'Prix décroissant',
    name: 'Nom A–Z',
  };

  const activeCategoryName =
    activeFilter === 'all'
      ? null
      : categories.find((c) => c.slug === activeFilter)?.name || activeFilter;

  const activeBrandName =
    activeBrand === 'all'
      ? null
      : getBrandDisplayName(resolvedBrand, brands);

  const activeFilterChipClass =
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-xeption-gold/40 bg-xeption-gold/15 text-xeption-gold text-[10px] md:text-xs font-tech font-bold uppercase tracking-wide hover:bg-xeption-gold/25 transition-colors';

  const activeFilterChips = hasActiveFilters ? (
    <div className={`flex flex-wrap items-center gap-2 ${isShopLayout ? '' : 'mb-3'}`}>
      {!isShopLayout ? (
        <span className="text-[10px] font-tech uppercase tracking-widest text-gray-500 shrink-0">
          Filtres actifs
        </span>
      ) : null}
      {activeFilter !== 'all' && activeCategoryName ? (
        <button type="button" onClick={() => setFilter('all')} className={activeFilterChipClass}>
          {activeCategoryName}
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {activeBrand !== 'all' && activeBrandName ? (
        <button type="button" onClick={() => setBrand('all')} className={activeFilterChipClass}>
          {activeBrandName}
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {searchQuery.trim() ? (
        <button type="button" onClick={onClearSearch} className={activeFilterChipClass}>
          « {searchQuery.trim()} »
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {promoOnly ? (
        <button type="button" onClick={() => onPromoOnlyChange?.(false)} className={activeFilterChipClass}>
          Promos
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {inStockOnly ? (
        <button type="button" onClick={() => onInStockOnlyChange?.(false)} className={activeFilterChipClass}>
          En stock
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {sort !== 'default' ? (
        <button type="button" onClick={() => onSortChange?.('default')} className={activeFilterChipClass}>
          {SORT_LABELS[sort] || sort}
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {storageFilter !== 'all' ? (
        <button type="button" onClick={() => onStorageChange?.('all')} className={activeFilterChipClass}>
          {FACET_CHIP_LABELS.storage[storageFilter] || `${storageFilter} Go`}
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {ramFilter !== 'all' ? (
        <button type="button" onClick={() => onRamChange?.('all')} className={activeFilterChipClass}>
          {FACET_CHIP_LABELS.ram[ramFilter] || `${ramFilter} Go RAM`}
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {conditionFilter !== 'all' ? (
        <button type="button" onClick={() => onConditionChange?.('all')} className={activeFilterChipClass}>
          {FACET_CHIP_LABELS.condition[conditionFilter] || conditionFilter}
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {isPriceFilterActive(priceMin, priceMax) ? (
        <button
          type="button"
          onClick={() => onPriceRangeChange?.(null, null)}
          className={activeFilterChipClass}
        >
          {formatPriceFcfa(priceMin!, true)} – {formatPriceFcfa(priceMax!, true)}
          <X className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
      {hasActiveFilters && onResetFilters && !isShopLayout ? (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs font-tech uppercase text-gray-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Tout effacer
        </button>
      ) : null}
    </div>
  ) : isShopLayout ? (
    <span className="text-xs font-tech uppercase tracking-widest text-white/80">
      Tous les produits
    </span>
  ) : null;

  const filterCardClass =
    'rounded-xl bg-[#09090b]/70 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.45)] border border-white/10 p-3 md:p-4';

  const filterLabelClass =
    'block text-[9px] md:text-[10px] font-tech uppercase tracking-widest text-gray-400 px-1';

  const categoryChipClass = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-md border font-tech font-bold uppercase tracking-wider text-[10px] md:text-xs transition-all ${
      active
        ? 'bg-xeption-gold text-black border-xeption-gold shadow-[0_0_12px_rgba(255,215,0,0.35)]'
        : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white'
    }`;

  const brandChipClass = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-md border font-tech font-bold uppercase tracking-wider text-[10px] md:text-xs transition-all ${
      active
        ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.35)]'
        : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white'
    }`;

  const toggleClass = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-sm border font-tech font-bold uppercase tracking-wider text-[10px] md:text-xs transition-all ${
      active
        ? 'bg-xeption-gold text-black border-xeption-gold'
        : 'bg-white/10 text-gray-200 border-white/25 hover:border-white hover:text-white hover:bg-white/15'
    }`;

  const filterSelectClass =
    'w-full min-w-0 bg-[#121212]/80 backdrop-blur-md border border-white/10 text-white text-[10px] sm:text-xs font-tech font-bold uppercase tracking-wide px-2 py-2 pr-7 rounded-md outline-none focus:border-xeption-gold focus:ring-1 focus:ring-xeption-gold/40 cursor-pointer appearance-none truncate';

  const categoryChips = (
    <>
      <button onClick={() => setFilter('all')} className={categoryChipClass(activeFilter === 'all')}>
        Tout ({products.length})
      </button>
      {categories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => setFilter(cat.slug)}
          className={categoryChipClass(activeFilter === cat.slug)}
        >
          {cat.name} ({categoryCounts.get(cat.slug) || 0})
        </button>
      ))}
    </>
  );

  const MobileFilterSelect: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
  }> = ({ id, label, value, onChange, children }) => (
    <div className="space-y-1 min-w-0">
      <label className={filterLabelClass} htmlFor={id}>{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={filterSelectClass}
          aria-label={label}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
          aria-hidden
        />
      </div>
    </div>
  );

  const showMobileBrandFilter = activeFilter !== 'all' && brandOptions.length > 0;

  const mobileFilters = (
    <div className="md:hidden">
      <div
        className={`grid gap-2 ${showMobileBrandFilter ? 'grid-cols-2' : 'grid-cols-1'}`}
      >
        <MobileFilterSelect
          id="shop-filter-category"
          label="Type"
          value={activeFilter}
          onChange={setFilter}
        >
          <option value="all">Tout ({products.length})</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name} ({categoryCounts.get(cat.slug) || 0})
            </option>
          ))}
        </MobileFilterSelect>

        {showMobileBrandFilter ? (
          <MobileFilterSelect
            id="shop-filter-brand"
            label="Marque"
            value={resolvedBrand}
            onChange={setBrand}
          >
            <option value="all">Toutes ({brandCategoryTotal})</option>
            {brandOptions.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name} ({brand.count})
              </option>
            ))}
          </MobileFilterSelect>
        ) : null}
      </div>
      {activeFilter !== 'all' && brandOptions.length === 0 ? (
        <p className="text-[10px] text-gray-500 mt-2 font-mono">
          Aucune marque pour cette catégorie.
        </p>
      ) : null}
    </div>
  );

  const categoryRowDesktop = (
    <div className="hidden md:block space-y-1.5">
      <span className={filterLabelClass}>Type de produit</span>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {categoryChips}
      </div>
    </div>
  );

  const brandFiltersDesktop =
    activeFilter !== 'all' ? (
      <div className="hidden md:block mt-3 pt-3 border-t border-white/10 space-y-1.5">
        <span className={filterLabelClass}>Marque</span>
        {brandOptions.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            <button
              onClick={() => setBrand('all')}
              className={brandChipClass(activeBrand === 'all')}
            >
              Toutes ({brandCategoryTotal})
            </button>
            {brandOptions.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setBrand(brand.id)}
                className={brandChipClass(resolvedBrand === brand.id)}
              >
                {brand.name} ({brand.count})
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-500 px-1 font-mono">
            Aucune marque détectée pour cette catégorie.
          </p>
        )}
      </div>
    ) : null;

  const filterPanel = !isShopLayout ? (
    <div className={filterCardClass}>
      {mobileFilters}
      {categoryRowDesktop}
      {brandFiltersDesktop}
    </div>
  ) : null;

  const shopFiltersPanel = (
    <ShopFiltersPanel
      categories={categories}
      categoryCounts={categoryCounts}
      brandOptions={brandOptions}
      facetGroups={facetGroups}
      productsTotal={products.length}
      brandCategoryTotal={brandCategoryTotal}
      activeFilter={activeFilter}
      activeBrand={resolvedBrand}
      activeFacets={activeFacets}
      promoOnly={promoOnly}
      inStockOnly={inStockOnly}
      sort={sort}
      priceBounds={priceBounds}
      priceMin={priceMin}
      priceMax={priceMax}
      onFilterChange={setFilter}
      onBrandChange={setBrand}
      onFacetChange={handleFacetChange}
      onPriceRangeChange={onPriceRangeChange}
      onPromoOnlyChange={onPromoOnlyChange}
      onInStockOnlyChange={onInStockOnlyChange}
      onSortChange={onSortChange}
    />
  );

  const viewToggle = isShopLayout ? (
    <div className="flex items-center border border-white/20 rounded-sm overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => setViewMode('grid')}
        className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-xeption-gold text-black' : 'text-white hover:bg-white/10'}`}
        aria-label="Vue grille"
        title="Vue grille"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode('list')}
        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-xeption-gold text-black' : 'text-white hover:bg-white/10'}`}
        aria-label="Vue liste"
        title="Vue liste"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  const productCountLabel = (
    <span className="text-xs md:text-sm text-white font-tech font-semibold shrink-0">
      {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
    </span>
  );

  const mobileFiltersButton = isShopLayout ? (
    <button
      type="button"
      onClick={() => setMobileFiltersOpen(true)}
      className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-tech uppercase text-white border border-white/25 hover:border-xeption-gold hover:text-xeption-gold transition-colors rounded-sm"
    >
      <SlidersHorizontal className="w-3 h-3 shrink-0" />
      <span className="truncate">Filtres</span>
      {hasActiveFilters ? (
        <span className="w-1.5 h-1.5 rounded-full bg-xeption-gold shrink-0" />
      ) : null}
    </button>
  ) : null;

  const resetFiltersButton = (compact = false) =>
    hasActiveFilters && onResetFilters ? (
      <button
        type="button"
        onClick={onResetFilters}
        className={
          compact
            ? 'flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-tech font-semibold uppercase text-white hover:text-xeption-gold border border-white/30 hover:border-xeption-gold/60 transition-colors rounded-sm'
            : 'shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs md:text-sm font-tech font-semibold uppercase text-white hover:text-xeption-gold border border-white/30 hover:border-xeption-gold/60 transition-colors'
        }
      >
        <RotateCcw className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3'} />
        <span className={compact ? 'truncate' : undefined}>
          {isShopLayout ? 'Réinitialiser' : 'Effacer'}
        </span>
      </button>
    ) : null;

  const shopMobileToolbar = isShopLayout ? (
    <div className="md:hidden flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {productCountLabel}
        {viewToggle}
      </div>
      <div className="flex items-center gap-2 min-w-0 w-full">
        {mobileFiltersButton}
        {resetFiltersButton(true)}
      </div>
    </div>
  ) : null;

  const toolbarControls = (
    <div className="flex flex-wrap items-center gap-2">
      {productCountLabel}
      {viewToggle}
      {isShopLayout ? (
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden hidden md:flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-tech uppercase text-white border border-white/25 hover:border-xeption-gold hover:text-xeption-gold transition-colors rounded-sm"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtres
          {hasActiveFilters ? (
            <span className="w-1.5 h-1.5 rounded-full bg-xeption-gold" />
          ) : null}
        </button>
      ) : null}
      {!isShopLayout ? (
        <>
          <select
            value={sort}
            onChange={(e) => onSortChange?.(e.target.value)}
            className="bg-black/60 border border-white/20 text-gray-200 text-[10px] md:text-xs font-tech uppercase px-2 py-1.5 outline-none focus:border-xeption-gold cursor-pointer"
            aria-label="Tri des produits"
          >
            <option value="default">Tri : catalogue</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="name">Nom A–Z</option>
          </select>
          <button
            type="button"
            onClick={() => onPromoOnlyChange?.(!promoOnly)}
            className={toggleClass(promoOnly)}
          >
            Promos
          </button>
          <button
            type="button"
            onClick={() => onInStockOnlyChange?.(!inStockOnly)}
            className={toggleClass(inStockOnly)}
          >
            En stock
          </button>
        </>
      ) : null}
      {hasActiveFilters && onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className={`${isShopLayout ? 'hidden md:flex' : 'flex'} shrink-0 items-center gap-1 px-2 py-1.5 text-xs md:text-sm font-tech font-semibold uppercase text-white hover:text-xeption-gold border border-white/30 hover:border-xeption-gold/60 transition-colors`}
        >
          <RotateCcw className="w-3 h-3" />
          {isShopLayout ? 'Réinitialiser' : 'Effacer'}
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-8 ${
        stickyToolbar
          ? isShopLayout
            ? 'pt-0 pb-10 md:pb-16 flex-1 flex flex-col min-h-0'
            : 'pt-0 pb-10 md:pb-16 flex flex-col gap-24 md:gap-32'
          : tightTop
            ? 'pt-2 pb-10 md:pt-4 md:pb-16'
            : 'py-10 md:py-20'
      }`}
    >
      {stickyToolbar ? (
        <div
          ref={isShopLayout ? shopToolbarRef : undefined}
          className={`sticky z-40 bg-black/95 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${
            isShopLayout ? 'top-[132px] scroll-mt-[132px]' : 'top-20'
          } ${
            isShopLayout
              ? 'mt-2 sm:mt-4 md:mt-6 rounded-lg border border-white/10 px-3 sm:px-5 md:px-6 py-3.5 md:py-3.5'
              : '-mx-2 sm:-mx-6 lg:-mx-8 px-2 sm:px-6 lg:px-8 border-b border-white/10 pt-3 pb-4 md:pb-5 before:pointer-events-none before:absolute before:left-0 before:right-0 before:-top-10 before:h-10 before:bg-black/90 before:backdrop-blur-xl'
          }`}
        >
          {!hasShopHero ? (
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-3">
              <div className="text-center md:text-left min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg font-tech uppercase">
                  La Boutique <span className="text-xeption-gold">237</span>
                </h1>
                <p className="text-[10px] md:text-xs text-gray-400 mt-1 font-medium">
                  Choisis ton matos, on livre au calme.
                </p>
                {searchQuery.trim() && (
                  <p className="text-[10px] md:text-xs text-xeption-gold/90 mt-1.5 font-mono">
                    Recherche « {searchQuery.trim()} » — barre du menu en haut
                  </p>
                )}
              </div>
              <div className="hidden md:block">{toolbarControls}</div>
            </div>
          ) : (
            <>
              <div className="hidden md:flex md:items-center md:justify-between md:gap-5">
                <div className="flex-1 min-w-0">{activeFilterChips}</div>
                <div className="shrink-0 flex items-center">{toolbarControls}</div>
              </div>
              <div className="md:hidden flex flex-col gap-4">
                <div className="min-w-0">{activeFilterChips}</div>
                {shopMobileToolbar}
              </div>
            </>
          )}

          {!hasShopHero ? (
            <div className="md:hidden mb-2">{toolbarControls}</div>
          ) : null}

          {!hasShopHero ? (
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-0.5 bg-xeption-gold shrink-0" />
              <span className="text-xeption-gold font-tech font-bold tracking-widest uppercase text-[10px] md:text-xs shrink-0">
                Catalogue
              </span>
              <h2 className="text-sm md:text-lg font-bold text-white font-tech uppercase truncate">
                {title}
              </h2>
            </div>
          ) : null}

          {!hasShopHero ? activeFilterChips : null}

          {filterPanel}
        </div>
      ) : null}

      {!stickyToolbar && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-6 md:mb-8 gap-4 md:gap-6 px-2">
            <div className="w-full md:w-auto text-center md:text-left">
              <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                <span className="w-6 h-0.5 bg-xeption-gold" />
                <span className="text-xeption-gold font-tech font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(255,215,0,0.5)] text-[10px] md:text-xs">
                  Catalogue
                </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-white font-tech uppercase drop-shadow-xl">
                {title === 'Nos Pépites' ? (
                  <>Nos <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Pépites</span></>
                ) : (
                  <span className="text-white">{title}</span>
                )}
              </h2>
            </div>
          </div>
          <div className="mb-6 px-2">{filterPanel}</div>
        </>
      )}

      {filteredProducts.length === 0 && !isShopLayout && (
        <div className="text-center py-16 px-4 border border-white/10 rounded-xl bg-black/40 backdrop-blur-md">
          <p className="text-white font-tech uppercase text-lg mb-2">Aucun produit trouvé</p>
          <p className="text-gray-400 text-sm mb-4">
            Essaie une autre catégorie ou modifie ta recherche dans le menu.
          </p>
          {onResetFilters && hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2 bg-xeption-gold text-black font-tech font-bold uppercase text-xs hover:bg-white transition-colors"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      <div
        className={
          isShopLayout
            ? 'flex flex-1 flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8 mt-3 md:mt-4 min-h-[40vh]'
            : ''
        }
      >
        {isShopLayout ? (
          <ShopFixedFiltersSidebar toolbarRef={shopToolbarRef}>
            {shopFiltersPanel}
          </ShopFixedFiltersSidebar>
        ) : null}

        <div className={isShopLayout ? 'flex-1 min-w-0' : ''}>
          {isShopLayout && filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4 border border-white/10 rounded-xl bg-black/40 backdrop-blur-md">
              <p className="text-white font-tech uppercase text-lg mb-2">Aucun produit trouvé</p>
              <p className="text-gray-400 text-sm mb-4">
                Essaie une autre catégorie ou modifie ta recherche dans le menu.
              </p>
              {onResetFilters && hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="px-4 py-2 bg-xeption-gold text-black font-tech font-bold uppercase text-xs hover:bg-white transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : null}
          {filteredProducts.length > 0 && viewMode === 'list' && isShopLayout ? (
            <div className="flex flex-col gap-2 md:gap-3">
              {pagedProducts.map((product) => (
                <ProductListRow
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onProductClick={onProductClick}
                />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className={`grid gap-2 md:gap-4 lg:gap-6 ${
              isShopLayout
                ? 'grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {pagedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onProductClick={onProductClick}
                />
              ))}
            </div>
          ) : null}
          {shopPaging && onPageChange ? (
            <ShopPagination
              page={clampPage(page, filteredProducts.length, SHOP_PAGE_SIZE)}
              totalPages={shopPageCount}
              totalItems={filteredProducts.length}
              onPageChange={onPageChange}
            />
          ) : null}
        </div>
      </div>

      {isShopLayout && mobileFiltersOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/75 z-[90] lg:hidden"
            aria-label="Fermer les filtres"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[95] lg:hidden max-h-[85vh] overflow-y-auto bg-[#0a0a0a] border-t border-white/25 rounded-t-2xl p-4 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#0a0a0a] pb-2 border-b border-white/10">
              <h3 className="text-sm font-tech font-bold uppercase text-white tracking-wider">Filtres</h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-md bg-[#0a0a0a] border border-white/15 p-4">
              {shopFiltersPanel}
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full mt-4 py-3 bg-xeption-gold text-black font-tech font-bold uppercase text-sm hover:bg-white transition-colors rounded-sm"
            >
              Voir {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
            </button>
          </div>
        </>
      ) : null}

      <div className="mt-16 pt-8 border-t border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-6 md:p-8">
          <div className="flex items-start gap-4">
              <div className="hidden md:block p-3 bg-white/5 rounded-full border border-white/10 text-xeption-gold">
                  <Search className="w-6 h-6" />
              </div>
              <div className="flex-1">
                  {getSeoText()}
              </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-gray-500 font-mono border-t border-white/5 pt-4">
              <span>Recherches fréquentes :</span>
              <span className="hover:text-white cursor-default">iPhone 14 Prix Cameroun</span> &bull;
              <span className="hover:text-white cursor-default">PC Gamer Douala</span> &bull;
              <span className="hover:text-white cursor-default">Samsung S23 Ultra Yaoundé</span> &bull;
              <span className="hover:text-white cursor-default">PS5 au Cameroun</span> &bull;
              <span className="hover:text-white cursor-default">Boutique Informatique Mfoundi Mall</span>
          </div>
      </div>

    </div>
  );
};

export default ProductList;
