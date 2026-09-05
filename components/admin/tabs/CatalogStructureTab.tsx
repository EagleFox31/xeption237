import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Layers, Plus, Tag, Trash2 } from 'lucide-react';
import type { Brand, Category, Product, ProductRange } from '../../../types';
import { adminUi } from '../shared/adminUi';
import {
  brandsForCategory,
  catalogBrandFromId,
  gammeCountForBrand,
  normalizeCatalogBrandKey,
  productsForBrand,
  productsWithoutRangeForBrand,
  resolveCatalogBrandId,
} from '../../../utils/catalogStructure';
import type { AdminAlertFn } from '../shared/adminAlert';

interface CatalogStructureTabProps {
  categories: Category[];
  newCatName: string;
  setNewCatName: (name: string) => void;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
  brands: Brand[];
  ranges: ProductRange[];
  products: Product[];
  brandMgr: {
    newBrandName: string;
    setNewBrandName: (v: string) => void;
    addBrand: () => void | Promise<string | null>;
    deleteBrand: (id: string) => void | Promise<void>;
    newRangeName: string;
    setNewRangeName: (v: string) => void;
    selectedCategoryForRange: string;
    setSelectedCategoryForRange: (v: string) => void;
    selectedBrandForRange: string;
    setSelectedBrandForRange: (v: string) => void;
    addRange: () => void | Promise<void>;
    deleteRange: (id: string) => void | Promise<void>;
  };
  showAlert: AdminAlertFn;
}

const panelClass = `${adminUi.surface} overflow-hidden flex flex-col min-h-0 h-full max-h-full`;

const listScrollClass = 'flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain';

const CatalogStructureTab: React.FC<CatalogStructureTabProps> = ({
  categories,
  newCatName,
  setNewCatName,
  onAddCategory,
  onDeleteCategory,
  brands,
  ranges,
  products,
  brandMgr,
  showAlert,
}) => {
  const [selectedTypeSlug, setSelectedTypeSlug] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTypeSlug && categories.length > 0) {
      setSelectedTypeSlug(categories[0].slug);
    }
  }, [categories, selectedTypeSlug]);

  useEffect(() => {
    if (selectedTypeSlug) brandMgr.setSelectedCategoryForRange(selectedTypeSlug);
  }, [selectedTypeSlug]);

  useEffect(() => {
    if (selectedBrandId) {
      brandMgr.setSelectedBrandForRange(normalizeCatalogBrandKey(selectedBrandId, brands));
    }
  }, [selectedBrandId, brands]);

  const selectedType = categories.find((c) => c.slug === selectedTypeSlug);
  const canonicalBrandId = selectedBrandId
    ? normalizeCatalogBrandKey(selectedBrandId, brands)
    : null;
  const selectedBrand = canonicalBrandId
    ? catalogBrandFromId(canonicalBrandId, brands)
    : undefined;

  const brandCountByType = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const add = (category: string, brandId: string) => {
      if (!map.has(category)) map.set(category, new Set());
      map.get(category)!.add(normalizeCatalogBrandKey(brandId, brands));
    };
    for (const r of ranges) {
      if (r.category && r.brand_id) add(r.category, r.brand_id);
    }
    for (const p of products) {
      const brandId = resolveCatalogBrandId(p, brands);
      if (p.category && brandId) add(p.category, brandId);
    }
    return map;
  }, [ranges, products, brands]);

  const displayBrands = useMemo(() => {
    if (!selectedTypeSlug) return [];
    const inType = brandsForCategory(selectedTypeSlug, brands, ranges, products);
    if (
      canonicalBrandId &&
      !inType.some((b) => normalizeCatalogBrandKey(b.id, brands) === canonicalBrandId)
    ) {
      return [...inType, catalogBrandFromId(canonicalBrandId, brands)];
    }
    return inType;
  }, [brands, ranges, products, selectedTypeSlug, canonicalBrandId]);

  const rangesForSelection = useMemo(() => {
    if (!selectedTypeSlug || !canonicalBrandId) return [];
    return ranges.filter((r) => {
      if (r.category !== selectedTypeSlug) return false;
      return normalizeCatalogBrandKey(r.brand_id, brands) === canonicalBrandId;
    });
  }, [ranges, selectedTypeSlug, canonicalBrandId, brands]);

  const orphanProductsForSelection = useMemo(() => {
    if (!selectedTypeSlug || !canonicalBrandId) return [];
    return productsWithoutRangeForBrand(
      selectedTypeSlug,
      canonicalBrandId,
      brands,
      products,
    );
  }, [selectedTypeSlug, canonicalBrandId, brands, products]);

  const handleSelectType = (slug: string) => {
    setSelectedTypeSlug(slug);
    setSelectedBrandId(null);
  };

  const handleDeleteType = async (id: string, slug: string) => {
    await onDeleteCategory(id);
    if (selectedTypeSlug === slug) {
      setSelectedTypeSlug(null);
      setSelectedBrandId(null);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    await brandMgr.deleteBrand(id);
    if (selectedBrandId === id) setSelectedBrandId(null);
  };

  const handleAddRange = async () => {
    try {
      await brandMgr.addRange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de créer la gamme.';
      showAlert('Gamme non créée', msg, 'danger');
    }
  };

  const handleSelectBrand = (brandId: string) => {
    setSelectedBrandId(normalizeCatalogBrandKey(brandId, brands));
  };

  const handleAddBrand = async () => {
    const newId = await brandMgr.addBrand();
    if (newId) setSelectedBrandId(newId);
  };

  return (
    <div
      className="animate-in fade-in flex flex-col gap-3 min-h-0 h-[calc(100dvh-10rem)] md:h-[calc(100dvh-8rem)] overflow-hidden"
    >
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0 flex-1 grid-rows-3 lg:grid-rows-1 auto-rows-[minmax(0,1fr)]"
      >
        {/* COL 1 — TYPES */}
        <div className={panelClass}>
          <div className="p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm shrink-0">
            <h2 className="text-xs font-bold uppercase text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-xeption-gold" />
              1. Type
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nouveau type…"
                className="flex-1 bg-black/50 border border-white/25 px-3 py-2 text-sm text-white placeholder:text-white/70 rounded-sm outline-none focus:border-xeption-gold"
              />
              <button
                type="button"
                onClick={() => onAddCategory()}
                className="shrink-0 bg-xeption-gold text-black p-2 rounded-sm hover:bg-white transition-colors"
                title="Ajouter le type"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className={listScrollClass}>
            {categories.length === 0 ? (
              <p className="p-6 text-sm text-white/60 text-center">Aucun type. Ajoute le premier.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {categories.map((cat) => {
                  const active = cat.slug === selectedTypeSlug;
                  const marqueCount = brandCountByType.get(cat.slug)?.size ?? 0;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectType(cat.slug)}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors ${
                          active ? 'bg-xeption-gold/15 border-l-2 border-xeption-gold' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block text-sm font-bold text-white truncate">{cat.name}</span>
                          <span className="text-[10px] font-mono text-white/65">{cat.slug}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-white/70 font-mono">{marqueCount} marq.</span>
                          {active && <ChevronRight className="w-4 h-4 text-xeption-gold" />}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {selectedType && (
            <div className="p-3 border-t border-white/10 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => handleDeleteType(selectedType.id, selectedType.slug)}
                className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Supprimer ce type
              </button>
            </div>
          )}
        </div>

        {/* COL 2 — MARQUES */}
        <div className={`${panelClass} ${!selectedTypeSlug ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm shrink-0">
            <h2 className="text-xs font-bold uppercase text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-xeption-gold" />
              2. Marque
              {selectedType && (
                <span className="text-white/60 font-normal normal-case">— {selectedType.name}</span>
              )}
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={brandMgr.newBrandName}
                onChange={(e) => brandMgr.setNewBrandName(e.target.value)}
                placeholder="Nouvelle marque…"
                className="flex-1 bg-black/50 border border-white/25 px-3 py-2 text-sm text-white placeholder:text-white/70 rounded-sm outline-none focus:border-xeption-gold"
              />
              <button
                type="button"
                onClick={() => handleAddBrand()}
                className="shrink-0 bg-xeption-gold text-black p-2 rounded-sm hover:bg-white transition-colors"
                title="Ajouter la marque"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className={listScrollClass}>
            {!selectedTypeSlug ? (
              <p className="p-6 text-sm text-white/60 text-center">Choisis un type à gauche.</p>
            ) : displayBrands.length === 0 ? (
              <p className="p-6 text-sm text-white/60 text-center">
                Aucune marque pour ce type. Crée une marque ci-dessus, puis ajoute ses gammes à droite.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {displayBrands.map((brand) => {
                  const brandKey = normalizeCatalogBrandKey(brand.id, brands);
                  const active = brandKey === canonicalBrandId;
                  const gammeCount = gammeCountForBrand(
                    selectedTypeSlug,
                    brandKey,
                    ranges,
                    brands,
                  );
                  const productCount = productsForBrand(
                    selectedTypeSlug,
                    brandKey,
                    brands,
                    products,
                  ).length;
                  return (
                    <li key={brandKey}>
                      <button
                        type="button"
                        onClick={() => handleSelectBrand(brand.id)}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors ${
                          active ? 'bg-xeption-gold/15 border-l-2 border-xeption-gold' : 'hover:bg-white/5'
                        }`}
                      >
                        <span className="text-sm font-bold text-white truncate">
                          {brand.name}
                          {!brand.isDbBrand && (
                            <span className="ml-1.5 text-[9px] font-normal uppercase text-amber-300/90">
                              inventaire
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-white/70 font-mono">
                            {gammeCount > 0
                              ? `${gammeCount} gam.`
                              : productCount > 0
                                ? `${productCount} prod.`
                                : '0 gam.'}
                          </span>
                          {active && <ChevronRight className="w-4 h-4 text-xeption-gold" />}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {selectedBrand?.isDbBrand && (
            <div className="p-3 border-t border-white/10 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => handleDeleteBrand(selectedBrand.id)}
                className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Supprimer la marque
              </button>
            </div>
          )}
        </div>

        {/* COL 3 — GAMMES */}
        <div
          className={`${panelClass} ${!selectedTypeSlug || !selectedBrandId ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <div className="p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm shrink-0">
            <h2 className="text-xs font-bold uppercase text-white">
              3. Gammes
              {selectedBrand && selectedType && (
                <span className="text-white/60 font-normal normal-case block mt-1 text-[11px]">
                  {selectedBrand.name} · {selectedType.name}
                </span>
              )}
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={brandMgr.newRangeName}
                onChange={(e) => brandMgr.setNewRangeName(e.target.value)}
                placeholder="Nom de la gamme…"
                className="flex-1 bg-black/50 border border-white/25 px-3 py-2 text-sm text-white placeholder:text-white/70 rounded-sm outline-none focus:border-xeption-gold"
              />
              <button
                type="button"
                onClick={() => handleAddRange()}
                className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-sm text-[10px] font-bold uppercase hover:bg-blue-500 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
          <div className={listScrollClass}>
            {!selectedBrandId ? (
              <p className="p-6 text-sm text-white/60 text-center">Choisis une marque.</p>
            ) : rangesForSelection.length === 0 && orphanProductsForSelection.length === 0 ? (
              <p className="p-6 text-sm text-white/60 text-center">
                Aucune gamme pour cette marque dans ce type. Ajoute une ci-dessus.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {rangesForSelection.map((range) => (
                  <li
                    key={range.id}
                    className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/5"
                  >
                    <span className="text-sm font-bold text-white">{range.name}</span>
                    <button
                      type="button"
                      onClick={() => brandMgr.deleteRange(range.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-sm"
                      title="Supprimer la gamme"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                {orphanProductsForSelection.length > 0 && (
                  <>
                    <li className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/50 bg-white/5">
                      Produits en inventaire (sans gamme)
                    </li>
                    {orphanProductsForSelection.map((product) => (
                      <li
                        key={product.id}
                        className="flex items-center gap-2 px-4 py-3 text-white/80"
                      >
                        <span className="text-sm truncate">{product.name}</span>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogStructureTab;
