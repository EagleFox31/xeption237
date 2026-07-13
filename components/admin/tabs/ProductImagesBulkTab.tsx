
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Check, ExternalLink, ImageOff, Loader2, Plus, Star, Upload } from 'lucide-react';
import type { Brand, Product, ProductRange } from '../../../types';
import { supabase } from '../../../services/supabaseClient';
import { DB_TABLES, DB_SCHEMA } from '../../../constants/dbSchema';
import { uploadImageToCloudinary } from '../../../services/uploadService';
import { optimizeImage } from '../../../utils/mediaOptimization';
import { resolveCatalogBrandId } from '../../../utils/catalogStructure';
import TableShell from '../shared/TableShell';
import { adminUi } from '../shared/adminUi';

const PRODUCT_THUMB_FALLBACK = '/icons/icon-192x192.png';

type ImageFilter = 'missing' | 'all' | 'has_image';
type UploadMode = 'main' | 'gallery';

const isPlaceholderImage = (url?: string) => {
  const raw = url?.trim() || '';
  if (!raw) return true;
  if (/placeholder/i.test(raw)) return true;
  if (raw === PRODUCT_THUMB_FALLBACK) return true;
  if (raw.endsWith('/icons/icon-192x192.png')) return true;
  return false;
};

const isMissingProductImage = (image?: string) => isPlaceholderImage(image);

/** URLs distinctes pour le compteur */
const countProductImages = (product: Product): number => {
  const seen = new Set<string>();
  const push = (url?: string) => {
    const raw = url?.trim() || '';
    if (!raw || isPlaceholderImage(raw) || seen.has(raw)) return;
    seen.add(raw);
  };
  push(product.image);
  (product.images || []).forEach(push);
  return seen.size;
};

/** Vignettes : galerie dans l’ordre DB ; principale en tête si absente de la galerie */
const getGalleryStripItems = (product: Product): { url: string; isMain: boolean }[] => {
  const main = product.image?.trim() || '';
  const gallery = (product.images || []).filter((u) => !isPlaceholderImage(u));
  const items: { url: string; isMain: boolean }[] = [];

  if (!isPlaceholderImage(main) && !gallery.includes(main)) {
    items.push({ url: main, isMain: true });
  }
  gallery.forEach((url) => {
    items.push({ url, isMain: url === main });
  });
  return items;
};

const labelBrand = (product: Product, brands: Brand[]) => {
  const id = resolveCatalogBrandId(product, brands);
  if (!id) return '';
  return brands.find((b) => b.id === id)?.name ?? '';
};

const labelRange = (rangeId?: string, ranges: ProductRange[] = []) => {
  if (!rangeId) return '';
  return ranges.find((r) => r.id === rangeId)?.name ?? '';
};

interface ProductImagesBulkTabProps {
  products: Product[];
  brands: Brand[];
  ranges: ProductRange[];
  onUpdateProducts: (products: Product[]) => void;
}

const ProductImagesBulkTab: React.FC<ProductImagesBulkTabProps> = ({
  products,
  brands,
  ranges,
  onUpdateProducts,
}) => {
  const [search, setSearch] = useState('');
  const [imageFilter, setImageFilter] = useState<ImageFilter>('missing');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadingMode, setUploadingMode] = useState<UploadMode | null>(null);
  const [recentSuccessId, setRecentSuccessId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadModeRef = useRef<UploadMode>('main');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (imageFilter === 'missing' && !isMissingProductImage(p.image)) return false;
        if (imageFilter === 'has_image' && isMissingProductImage(p.image)) return false;
        if (!q) return true;
        const brand = labelBrand(p, brands).toLowerCase();
        const range = labelRange(p.productRange, ranges).toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          brand.includes(q) ||
          range.includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [products, search, imageFilter, brands, ranges]);

  const missingCount = useMemo(
    () => products.filter((p) => isMissingProductImage(p.image)).length,
    [products],
  );

  const persistImages = useCallback(
    async (product: Product, image: string, images: string[]) => {
      const { error } = await supabase
        .from(DB_TABLES.PRODUCTS)
        .update({
          [DB_SCHEMA.PRODUCTS.IMAGE]: image,
          [DB_SCHEMA.PRODUCTS.IMAGES]: images,
        })
        .eq(DB_SCHEMA.PRODUCTS.ID, product.id);

      if (error) throw error;

      onUpdateProducts(
        products.map((p) =>
          p.id === product.id ? { ...p, image, images } : p,
        ),
      );
      setRecentSuccessId(product.id);
      setTimeout(() => setRecentSuccessId(null), 2000);
    },
    [products, onUpdateProducts],
  );

  const handleUpload = useCallback(
    async (product: Product, files: File[], mode: UploadMode) => {
      if (files.length === 0) return;
      setUploadingId(product.id);
      setUploadingMode(mode);
      setRecentSuccessId(null);
      try {
        const urls = await Promise.all(files.map((f) => uploadImageToCloudinary(f)));
        const gallery = [...(product.images || [])];
        let main = product.image?.trim() || '';

        if (mode === 'gallery') {
          gallery.push(...urls);
        } else if (isMissingProductImage(main)) {
          main = urls[0];
          gallery.push(...urls.slice(1));
        } else if (urls.length === 1) {
          main = urls[0];
        } else {
          main = urls[0];
          gallery.push(...urls.slice(1));
        }

        await persistImages(product, main, gallery);
      } catch (err) {
        console.error(err);
        alert(
          err instanceof Error
            ? err.message
            : 'Échec de l’upload — vérifiez la connexion et Cloudinary.',
        );
      } finally {
        setUploadingId(null);
        setUploadingMode(null);
      }
    },
    [persistImages],
  );

  const promoteToMain = useCallback(
    async (product: Product, url: string) => {
      const target = url.trim();
      if (!target || isPlaceholderImage(target)) return;

      const currentMain = product.image?.trim() || '';
      if (currentMain === target) return;

      setPromotingId(product.id);
      try {
        const gallery = [...(product.images || [])];
        // Ancienne principale conservée en galerie si elle n’y était pas encore
        if (
          !isPlaceholderImage(currentMain) &&
          !gallery.some((u) => u.trim() === currentMain)
        ) {
          gallery.push(currentMain);
        }
        await persistImages(product, target, gallery);
      } catch (err) {
        console.error(err);
        alert(
          err instanceof Error ? err.message : 'Impossible de définir l’image principale.',
        );
      } finally {
        setPromotingId(null);
      }
    },
    [persistImages],
  );

  const onFileChange = (product: Product, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const mode = uploadModeRef.current;
    if (files.length) handleUpload(product, files, mode);
    e.target.value = '';
  };

  const triggerUpload = (productId: string, mode: UploadMode) => {
    uploadModeRef.current = mode;
    fileInputRefs.current[productId]?.click();
  };

  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col">
      <div className={`mb-3 shrink-0 ${adminUi.hintCard}`}>
        <p className={`${adminUi.body} leading-snug`}>
          Multi-sélection à l’upload. Cliquez sur une vignette pour la définir comme photo principale
          (la galerie n’est ni effacée ni réordonnée). Les produits sans photo ({missingCount}) sont
          listés par défaut.
        </p>
      </div>

      <div className="flex-1 min-h-0 relative">
        <TableShell
          className="h-full border-t border-white/10"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Nom, marque, gamme…"
          resultCount={filteredProducts.length}
          resultLabel="produits"
          toolbarAddon={
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'missing' as ImageFilter, label: 'Sans photo' },
                  { id: 'has_image' as ImageFilter, label: 'Avec photo' },
                  { id: 'all' as ImageFilter, label: 'Tous' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setImageFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    imageFilter === opt.id
                      ? 'bg-xeption-gold text-black border-xeption-gold'
                      : 'border-white/25 text-white bg-black/50 hover:bg-white/15'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="divide-y divide-white/10">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-white/50 text-sm">
                Aucun produit correspondant.
              </div>
            ) : (
              filteredProducts.map((product) => {
                const stripItems = getGalleryStripItems(product);
                const imageCount = countProductImages(product);
                const missing = isMissingProductImage(product.image);
                const isUploading = uploadingId === product.id;
                const isPromoting = promotingId === product.id;
                const isBusy = isUploading || isPromoting;
                const justDone = recentSuccessId === product.id;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors min-h-[76px]"
                  >
                    <div
                      className={`w-14 h-14 rounded-sm border flex-shrink-0 overflow-hidden bg-black/40 ${
                        missing ? 'border-amber-500/40' : 'border-xeption-gold/50 ring-1 ring-xeption-gold/20'
                      }`}
                    >
                      {missing ? (
                        <div className="w-full h-full flex items-center justify-center text-amber-400/80">
                          <ImageOff className="w-5 h-5" />
                        </div>
                      ) : (
                        <img
                          src={optimizeImage(product.image, 112)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="w-[min(220px,28vw)] shrink-0 min-w-0">
                      <p className="font-bold text-white text-sm leading-tight line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-white/50 uppercase tracking-wider truncate mt-0.5">
                        {labelBrand(product, brands)}
                        {labelRange(product.productRange, ranges)
                          ? ` · ${labelRange(product.productRange, ranges)}`
                          : ''}
                      </p>
                      <p className="text-[10px] text-xeption-gold font-mono mt-0.5">
                        {product.price?.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                      {imageCount === 0 ? (
                        <span className="text-[10px] text-white/35 uppercase tracking-wider px-2">
                          Aucune photo
                        </span>
                      ) : (
                        <>
                          <span
                            className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/60 bg-white/5 border border-white/10 px-2 py-1 rounded-sm"
                            title="Nombre total de photos (principale + galerie)"
                          >
                            {imageCount} photo{imageCount > 1 ? 's' : ''}
                          </span>
                          <div
                            className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1 min-w-0 flex-1"
                          >
                            {stripItems.map(({ url, isMain }, idx) => (
                              <div
                                key={`${url}-${idx}`}
                                className="relative shrink-0 group/thumb"
                              >
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => promoteToMain(product, url)}
                                  className={`relative w-12 h-12 rounded-sm border overflow-hidden bg-black/40 transition-all disabled:opacity-50 ${
                                    isMain
                                      ? 'border-xeption-gold ring-2 ring-xeption-gold/40'
                                      : 'border-white/15 hover:border-xeption-gold/50 hover:ring-2 hover:ring-xeption-gold/30'
                                  }`}
                                  title={
                                    isMain
                                      ? 'Photo principale actuelle'
                                      : 'Cliquer pour définir comme photo principale'
                                  }
                                >
                                  <img
                                    src={optimizeImage(url, 96)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                  {isMain && (
                                    <span className="absolute bottom-0 left-0 right-0 bg-xeption-gold/90 text-black text-[8px] font-bold uppercase text-center py-0.5 flex items-center justify-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                    </span>
                                  )}
                                </button>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/80 border border-white/20 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-xeption-gold hover:text-black hover:border-xeption-gold"
                                  title="Ouvrir en grand"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <input
                      ref={(el) => {
                        fileInputRefs.current[product.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => onFileChange(product, e)}
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => triggerUpload(product.id, 'main')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider border border-xeption-gold/60 text-xeption-gold hover:bg-xeption-gold hover:text-black transition-all disabled:opacity-50 min-w-[108px] justify-center"
                      >
                        {isUploading && uploadingMode === 'main' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : justDone ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            OK
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            {missing ? 'Ajouter' : 'Remplacer'}
                          </>
                        )}
                      </button>
                      {!missing && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerUpload(product.id, 'gallery')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider border border-white/25 text-white/80 hover:bg-white/10 transition-all disabled:opacity-50 justify-center"
                          title="Ajouter à la galerie sans remplacer la principale"
                        >
                          {isUploading && uploadingMode === 'gallery' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Galerie
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TableShell>
      </div>
    </div>
  );
};

export default ProductImagesBulkTab;
