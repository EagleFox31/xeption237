import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Layers, Plus, Tag, Trash2, ArrowLeft } from 'lucide-react';
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
  showAlert?: AdminAlertFn;
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
  const [mobileStep, setMobileStep] = useState<'types' | 'brands' | 'ranges'>('types');

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
    setMobileStep('brands');
  };

  const handleDeleteType = async (id: string, slug: string) => {
    await onDeleteCategory(id);
    if (selectedTypeSlug === slug) {
      setSelectedTypeSlug(null);
      setSelectedBrandId(null);
      setMobileStep('types');
    }
  };

  const handleDeleteBrand = async (id: string) => {
    await brandMgr.deleteBrand(id);
    if (selectedBrandId === id) {
      setSelectedBrandId(null);
      setMobileStep('brands');
    }
  };

  const handleAddRange = async () => {
    try {
      await brandMgr.addRange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de créer la gamme.';
      if (showAlert) {
        showAlert('Gamme non créée', msg, 'danger');
      } else {
        alert(`Gamme non créée : ${msg}`);
      }
    }
  };

  const handleSelectBrand = (brandId: string) => {
    setSelectedBrandId(normalizeCatalogBrandKey(brandId, brands));
    setMobileStep('ranges');
  };

  const handleAddBrand = async () => {
    const newId = await brandMgr.addBrand();
    if (newId) setSelectedBrandId(newId);
  };

  return (
    <div className={`animate-in fade-in flex flex-col gap-3 min-h-0 ${adminUi.tabViewportH}`}>
      {/* Sélecteur d'étapes Mobile (< lg) */}
      <div className="lg:hidden flex flex-col gap-2 shrink-0">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 border border-white/10 rounded-lg">
          <button
            type="button"
            onClick={() => setMobileStep('types')}
            className={`py-2 px-1 text-center text-xs font-bold uppercase rounded-md transition-colors flex items-center justify-center gap-1 ${
              mobileStep === 'types'
                ? 'bg-xeption-gold text-black shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">1. Types</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileStep('brands')}
            disabled={!selectedTypeSlug}
            className={`py-2 px-1 text-center text-xs font-bold uppercase rounded-md transition-colors flex items-center justify-center gap-1 ${
              mobileStep === 'brands'
                ? 'bg-xeption-gold text-black shadow-sm'
                : !selectedTypeSlug
                  ? 'text-white/25 cursor-not-allowed'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">2. Marques</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileStep('ranges')}
            disabled={!selectedBrandId}
            className={`py-2 px-1 text-center text-xs font-bold uppercase rounded-md transition-colors flex items-center justify-center gap-1 ${
              mobileStep === 'ranges'
                ? 'bg-xeption-gold text-black shadow-sm'
                : !selectedBrandId
                  ? 'text-white/25 cursor-not-allowed'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="truncate">3. Gammes</span>
          </button>
        </div>

        {/* Fil d'ariane contextuel sur mobile */}
        {mobileStep === 'brands' && selectedType && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs">
            <span className="text-white/70 truncate">
              Type actif : <strong className="text-xeption-gold">{selectedType.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setMobileStep('types')}
              className="text-xeption-gold hover:text-white text-[11px] font-bold uppercase shrink-0 ml-2 flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Changer
            </button>
          </div>
        )}

        {mobileStep === 'ranges' && selectedType && selectedBrand && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs">
            <span className="text-white/70 truncate">
              <strong className="text-white/80">{selectedType.name}</strong> &gt;{' '}
              <strong className="text-xeption-gold">{selectedBrand.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setMobileStep('brands')}
              className="text-xeption-gold hover:text-white text-[11px] font-bold uppercase shrink-0 ml-2 flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Changer
            </button>
          </div>
        )}
      </div>

      {/* Conteneur des 3 colonnes (1 colonne plein écran sur mobile, 3 colonnes côte à côte sur desktop) */}
      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-3 lg:gap-3 flex flex-col">
        {/* COLONNE 1 — TYPES */}
        <div
          className={`${panelClass} ${
            mobileStep === 'types' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddCategory();
                  }
                }}
                placeholder="Nouveau type…"
                className="flex-1 bg-black/50 border border-white/20 focus:border-xeption-gold px-3 py-2 text-sm text-white placeholder:text-white/40 rounded-sm outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => onAddCategory()}
                className="shrink-0 bg-xeption-gold text-black p-2.5 rounded-sm hover:bg-white transition-colors flex items-center justify-center"
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
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors ${
                          active
                            ? 'bg-xeption-gold/15 border-l-4 border-xeption-gold text-white'
                            : 'hover:bg-white/5 text-white/90'
                        }`}
                      >
                        <div className="min-w-0">
                          <span
                            className={`block text-sm font-bold truncate ${
                              active ? 'text-xeption-gold' : 'text-white'
                            }`}
                          >
                            {cat.name}
                          </span>
                          <span className="text-[11px] font-mono text-white/50">{cat.slug}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-white/60 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {marqueCount} marq.
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${
                              active ? 'text-xeption-gold translate-x-0.5' : 'text-white/30'
                            }`}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedType && (
            <div className="p-3 border-t border-white/10 bg-black/30 backdrop-blur-sm shrink-0 flex items-center justify-between gap-2">
              <span className="text-xs text-white/50 truncate">
                Type : <strong className="text-white">{selectedType.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleDeleteType(selectedType.id, selectedType.slug)}
                className="text-xs uppercase font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1.5 rounded-sm transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
            </div>
          )}
        </div>

        {/* COLONNE 2 — MARQUES */}
        <div
          className={`${panelClass} ${
            mobileStep === 'brands' ? 'flex flex-1' : 'hidden lg:flex'
          } ${!selectedTypeSlug ? 'opacity-60' : ''}`}
        >
          <div className="p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm shrink-0">
            <h2 className="text-xs font-bold uppercase text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-xeption-gold" />
              2. Marque
              {selectedType && (
                <span className="text-white/60 font-normal normal-case truncate max-w-[150px]">
                  — {selectedType.name}
                </span>
              )}
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={brandMgr.newBrandName}
                onChange={(e) => brandMgr.setNewBrandName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBrand();
                  }
                }}
                disabled={!selectedTypeSlug}
                placeholder="Nouvelle marque…"
                className="flex-1 bg-black/50 border border-white/20 focus:border-xeption-gold px-3 py-2 text-sm text-white placeholder:text-white/40 rounded-sm outline-none transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleAddBrand()}
                disabled={!selectedTypeSlug}
                className="shrink-0 bg-xeption-gold text-black p-2.5 rounded-sm hover:bg-white transition-colors flex items-center justify-center disabled:opacity-50"
                title="Ajouter la marque"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={listScrollClass}>
            {!selectedTypeSlug ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <Layers className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm text-white/60 mb-3">Choisis un type pour voir ses marques.</p>
                <button
                  type="button"
                  onClick={() => setMobileStep('types')}
                  className="px-4 py-2 bg-xeption-gold text-black rounded-sm text-xs font-bold uppercase hover:bg-white transition-colors"
                >
                  Voir les types
                </button>
              </div>
            ) : displayBrands.length === 0 ? (
              <div className="p-6 text-sm text-white/60 text-center">
                <p>Aucune marque pour ce type.</p>
                <p className="text-xs text-white/40 mt-1">
                  Crée une marque ci-dessus pour commencer.
                </p>
              </div>
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
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors ${
                          active
                            ? 'bg-xeption-gold/15 border-l-4 border-xeption-gold text-white'
                            : 'hover:bg-white/5 text-white/90'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span
                            className={`text-sm font-bold truncate ${
                              active ? 'text-xeption-gold' : 'text-white'
                            }`}
                          >
                            {brand.name}
                          </span>
                          {!brand.isDbBrand && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                              inv.
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-white/60 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {gammeCount > 0
                              ? `${gammeCount} gam.`
                              : productCount > 0
                                ? `${productCount} prod.`
                                : '0 gam.'}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${
                              active ? 'text-xeption-gold translate-x-0.5' : 'text-white/30'
                            }`}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedBrand?.isDbBrand && (
            <div className="p-3 border-t border-white/10 bg-black/30 backdrop-blur-sm shrink-0 flex items-center justify-between gap-2">
              <span className="text-xs text-white/50 truncate">
                Marque : <strong className="text-white">{selectedBrand.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleDeleteBrand(selectedBrand.id)}
                className="text-xs uppercase font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1.5 rounded-sm transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
            </div>
          )}
        </div>

        {/* COLONNE 3 — GAMMES */}
        <div
          className={`${panelClass} ${
            mobileStep === 'ranges' ? 'flex flex-1' : 'hidden lg:flex'
          } ${!selectedTypeSlug || !selectedBrandId ? 'opacity-60' : ''}`}
        >
          <div className="p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm shrink-0">
            <h2 className="text-xs font-bold uppercase text-white flex items-center justify-between gap-2">
              <span>3. Gammes</span>
              {selectedBrand && selectedType && (
                <span className="text-white/60 font-normal normal-case text-[11px] truncate">
                  {selectedBrand.name} · {selectedType.name}
                </span>
              )}
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={brandMgr.newRangeName}
                onChange={(e) => brandMgr.setNewRangeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRange();
                  }
                }}
                disabled={!selectedTypeSlug || !selectedBrandId}
                placeholder="Nom de la gamme…"
                className="flex-1 bg-black/50 border border-white/20 focus:border-xeption-gold px-3 py-2 text-sm text-white placeholder:text-white/40 rounded-sm outline-none transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleAddRange()}
                disabled={!selectedTypeSlug || !selectedBrandId}
                className="shrink-0 bg-xeption-gold text-black px-3.5 py-2 rounded-sm text-xs font-bold uppercase hover:bg-white transition-colors disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>

          <div className={listScrollClass}>
            {!selectedBrandId ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <Tag className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm text-white/60 mb-3">Choisis une marque pour voir ses gammes.</p>
                <button
                  type="button"
                  onClick={() => setMobileStep('brands')}
                  className="px-4 py-2 bg-xeption-gold text-black rounded-sm text-xs font-bold uppercase hover:bg-white transition-colors"
                >
                  Voir les marques
                </button>
              </div>
            ) : rangesForSelection.length === 0 && orphanProductsForSelection.length === 0 ? (
              <div className="p-6 text-sm text-white/60 text-center">
                <p>Aucune gamme pour cette marque.</p>
                <p className="text-xs text-white/40 mt-1">
                  Ajoute une gamme ci-dessus pour structurer les produits.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {rangesForSelection.map((range) => (
                  <li
                    key={range.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-xeption-gold/70 shrink-0" />
                      <span className="text-sm font-bold text-white truncate">{range.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => brandMgr.deleteRange(range.id)}
                      className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-colors"
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
