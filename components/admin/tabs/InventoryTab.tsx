
import React, { useMemo, useState } from 'react';
import { Edit, Trash2, Star } from 'lucide-react';
import type { Brand, Category, Product, ProductRange } from '../../../types';
import { resolveCatalogBrandId } from '../../../utils/catalogStructure';
import { optimizeImage } from '../../../utils/mediaOptimization';
import TableShell from '../shared/TableShell';
import { adminUi } from '../shared/adminUi';

const PRODUCT_THUMB_FALLBACK = '/icons/icon-192x192.png';

const productThumbSrc = (image?: string) => {
  const raw = image?.trim() || '';
  if (!raw || /placeholder/i.test(raw)) return PRODUCT_THUMB_FALLBACK;
  return optimizeImage(raw, 80);
};

const isIncompleteProduct = (product: Product) =>
  !product.name?.trim() || !product.price || product.price <= 0;

type StockFilter = 'all' | 'in_stock' | 'low' | 'out' | 'featured';

const STOCK_FILTER_OPTIONS: { id: StockFilter; label: string }[] = [
  { id: 'all', label: 'Tous stocks' },
  { id: 'in_stock', label: 'En stock' },
  { id: 'low', label: 'Stock faible' },
  { id: 'out', label: 'Rupture' },
  { id: 'featured', label: 'Pépites' },
];

const selectClass =
  'bg-black/60 border border-white/25 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-sm outline-none focus:border-xeption-gold cursor-pointer min-w-[130px] h-[38px]';

interface InventoryTabProps {
  products: Product[];
  categories?: Category[];
  brands?: Brand[];
  ranges?: ProductRange[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onToggleFeatured: (product: Product) => void;
}

const labelBrand = (product: Product, brands: Brand[]) => {
  const id = resolveCatalogBrandId(product, brands);
  if (!id) return '';
  const db = brands.find((b) => b.id === id);
  return db?.name ?? id.replace(/^name:/, '');
};

const labelRange = (rangeId?: string, ranges: ProductRange[] = []) => {
  if (!rangeId) return '';
  return ranges.find((r) => r.id === rangeId)?.name ?? rangeId;
};

const labelCategory = (slug: string, categories: Category[]) => {
  return categories.find((c) => c.slug === slug)?.name ?? slug;
};

const matchesStockFilter = (product: Product, filter: StockFilter) => {
  switch (filter) {
    case 'in_stock':
      return product.stock > 5;
    case 'low':
      return product.stock > 0 && product.stock <= 5;
    case 'out':
      return product.stock <= 0;
    case 'featured':
      return product.isFeatured === true;
    default:
      return true;
  }
};

const matchesProductSearch = (
  product: Product,
  query: string,
  categories: Category[],
  brands: Brand[],
  ranges: ProductRange[],
) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    product.name,
    product.category,
    labelCategory(product.category, categories),
    labelBrand(product, brands),
    labelRange(product.productRange, ranges),
    String(product.price),
    String(product.stock),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
};

const InventoryTab: React.FC<InventoryTabProps> = ({
  products,
  categories = [],
  brands = [],
  ranges = [],
  onEditProduct,
  onDeleteProduct,
  onToggleFeatured,
}) => {
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const displayedProducts = useMemo(() => {
    const list = products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!matchesStockFilter(p, stockFilter)) return false;
      return matchesProductSearch(p, search, categories, brands, ranges);
    });
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [products, categoryFilter, stockFilter, search, categories, brands, ranges]);

  return (
    <div className={`animate-in fade-in ${adminUi.tabViewportHWithActions} flex flex-col`}>
      <div className="flex-1 min-h-0 relative">
        <TableShell
          className="h-full border-t border-white/10"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un produit…"
          resultCount={displayedProducts.length}
          resultLabel="produit"
          toolbarAddon={
            <>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClass}
                aria-label="Filtrer par type"
              >
                <option value="all">Tous les types</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                className={selectClass}
                aria-label="Filtrer par stock"
              >
                {STOCK_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </>
          }
        >
          {/*
            MOBILE : une carte par produit, empilee.
            Le tableau fait min-w-[800px] : sur un ecran de 412 px il deborde, et
            un commercial debout devant un client perd la colonne de gauche des
            qu'il glisse vers la droite. Les deux rendus lisent le meme tableau
            d'objets, donc rien ne peut diverger entre eux.
          */}
          <div className="flex flex-col gap-2 md:hidden">
            {displayedProducts.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-white/50">
                Aucun produit pour ces filtres.
              </p>
            ) : (
              displayedProducts.map((product) => {
                const displayName = product.name?.trim() || 'Produit sans nom';
                const incomplete = isIncompleteProduct(product);
                return (
                  <div
                    key={product.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 rounded border border-white/10 bg-black p-1">
                        <img
                          src={productThumbSrc(product.image)}
                          className="h-full w-full object-contain"
                          alt={displayName}
                          onError={(e) => { e.currentTarget.src = PRODUCT_THUMB_FALLBACK; }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold leading-snug ${incomplete ? 'text-amber-300' : 'text-white'}`}>
                          {displayName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/55">
                          {labelCategory(product.category, categories)}
                          {labelBrand(product, brands) ? ` · ${labelBrand(product, brands)}` : ''}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm text-white">
                            {product.price.toLocaleString()}
                          </span>
                          {/* Le stock est l'information qu'on vient chercher en
                              boutique : il reste lisible d'un coup d'oeil. */}
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-bold ${
                              product.stock > 5
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : product.stock > 0
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-red-500/15 text-red-300'
                            }`}
                          >
                            {product.stock} en stock
                          </span>
                          {product.isFeatured && (
                            <span className="rounded bg-xeption-gold/15 px-2 py-0.5 text-xs font-bold text-xeption-gold">
                              A la une
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 border-t border-white/10 pt-2">
                      <button
                        type="button"
                        onClick={() => onToggleFeatured(product)}
                        className="flex-1 rounded-md border border-white/15 py-2 text-xs font-tech font-bold uppercase tracking-wider text-white/80"
                      >
                        {product.isFeatured ? 'Retirer de la une' : 'Mettre a la une'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditProduct(product)}
                        className="rounded-md border border-white/15 px-4 py-2 text-xs font-tech font-bold uppercase tracking-wider text-xeption-gold"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(product.id)}
                        aria-label="Supprimer le produit"
                        className="rounded-md border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300"
                      >
                        Suppr.
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <table className="hidden w-full text-left border-collapse min-w-[800px] md:table">
            <thead className={adminUi.tableHead}>
              <tr>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4 w-px whitespace-nowrap">Prix</th>
                <th className="px-6 py-4 w-px whitespace-nowrap">Stock</th>
                <th className="px-6 py-4 text-center w-px whitespace-nowrap">À la Une</th>
                <th className="px-6 py-4 text-right w-px whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={adminUi.tableBody}>
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/50 text-sm">
                    Aucun produit pour ces filtres.
                  </td>
                </tr>
              ) : (
                displayedProducts.map((product) => {
                  const brandLabel = labelBrand(product, brands);
                  const categoryLabel = labelCategory(product.category, categories);
                  const displayName = product.name?.trim() || 'Produit sans nom';
                  const incomplete = isIncompleteProduct(product);
                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-white/5 transition-colors ${
                        incomplete ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 shrink-0 bg-black rounded p-1 border border-white/10">
                          <img
                            src={productThumbSrc(product.image)}
                            className="w-full h-full object-contain"
                            alt={displayName}
                            onError={(e) => {
                              e.currentTarget.src = PRODUCT_THUMB_FALLBACK;
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`font-bold block line-clamp-1 ${
                              incomplete ? 'text-amber-300' : 'text-white'
                            }`}
                          >
                            {displayName}
                          </span>
                          <span className="text-xs text-white/55">
                            {categoryLabel}
                            {brandLabel ? ` · ${brandLabel}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-white">
                        {product.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            product.stock > 5
                              ? 'text-green-500 bg-green-500/10'
                              : product.stock > 0
                                ? 'text-amber-400 bg-amber-500/10'
                                : 'text-red-500 bg-red-500/10'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => onToggleFeatured(product)}
                          className={`p-2 rounded transition-all hover:bg-white/10 ${
                            product.isFeatured
                              ? 'text-xeption-gold'
                              : 'text-gray-600 hover:text-gray-400'
                          }`}
                          title={
                            product.isFeatured
                              ? 'Retirer des Pépites'
                              : 'Ajouter aux Pépites (Accueil)'
                          }
                        >
                          <Star
                            className={`w-4 h-4 ${product.isFeatured ? 'fill-xeption-gold' : ''}`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 w-px whitespace-nowrap">
                        {/* flex : deux boutons sur UNE ligne. En inline, ils
                            retournaient à la ligne dès que la colonne Produit
                            réclamait la largeur (table-layout auto). */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEditProduct(product)}
                            aria-label="Modifier le produit"
                            className="p-2 text-xeption-gold hover:bg-white/10 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(product.id)}
                            aria-label="Supprimer le produit"
                            className="p-2 text-red-500 hover:bg-white/10 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableShell>
      </div>
    </div>
  );
};

export default InventoryTab;
