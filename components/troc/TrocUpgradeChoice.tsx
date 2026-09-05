import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus, RefreshCw } from 'lucide-react';
import { Product } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { optimizeImage } from '../../utils/mediaOptimization';
import { getProductDisplayName } from '../../utils/productDisplay';
import { productSpecSummary } from '../../utils/productSpecSummary';
import ProductCardImage from '../common/ProductCardImage';

interface TrocUpgradeChoiceProps {
  /** Crédit plafond de reprise (`tradeInValue`). Le reste à payer réel sera ≥. */
  credit: number;
  /** Marque de l'appareil repris → alimente la suggestion « même marque, plus récent ». */
  deviceBrand?: string;
  /** L'utilisateur choisit un appareil cible (→ voucher + précommande, tranche suivante). */
  onSelect: (product: Product) => void;
}

const MAX_COMPARE = 5;
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(n)));
/** Reste minimum (le crédit est un plafond → reste réel ≥). */
const resteAPartirDe = (price: number, credit: number) => Math.max(0, price - credit);

/** Mappe une ligne DB brute vers la forme Product utile ici (camelCase). */
const mapRow = (p: any): Product => ({
  ...p,
  oldPrice: p.old_price ?? p.oldPrice ?? undefined,
  isPromo: p.is_promo ?? p.isPromo ?? false,
  releaseYear: p.release_year ?? p.releaseYear ?? undefined,
});

const TrocUpgradeChoice: React.FC<TrocUpgradeChoiceProps> = ({ credit, deviceBrand, onSelect }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .gt('stock', 0)
      .then(({ data }) => {
        if (data) setProducts((data as any[]).map(mapRow));
        setLoading(false);
      });
  }, []);

  // Suggestions (pré-remplissage) : 1 ancré crédit + 1 même marque plus récent. 3 slots libres.
  const suggestions = useMemo(() => {
    if (!products.length) return [] as Product[];
    // #1 ancré crédit : le device dont le prix est le plus proche du crédit (meilleur upgrade « couvert »).
    const anchor = [...products].sort(
      (a, b) => Math.abs(a.price - credit) - Math.abs(b.price - credit),
    )[0];
    // #2 même marque, plus récent : match sur le NOM affiché (p.brand = ID en base, pas le nom).
    const brand = (deviceBrand || '').trim().toLowerCase();
    const sameBrandNewer = brand
      ? [...products]
          .filter((p) => p.id !== anchor?.id && getProductDisplayName(p).toLowerCase().includes(brand))
          .sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0))[0]
      : undefined;
    return [anchor, sameBrandNewer].filter(Boolean) as Product[];
  }, [products, credit, deviceBrand]);

  useEffect(() => {
    if (!seeded.current && suggestions.length) {
      setSelected(suggestions.slice(0, MAX_COMPARE));
      seeded.current = true;
    }
  }, [suggestions]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          !selected.some((s) => s.id === p.id) &&
          (getProductDisplayName(p).toLowerCase().includes(q) ||
            (p.brand || '').toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [query, products, selected]);

  const add = (p: Product) => {
    if (selected.length >= MAX_COMPARE || selected.some((s) => s.id === p.id)) return;
    setSelected((prev) => [...prev, p]);
    setQuery('');
    setSearchOpen(false);
  };
  const remove = (id: string) => setSelected((prev) => prev.filter((p) => p.id !== id));

  const sortedSelected = useMemo(
    () => [...selected].sort((a, b) => resteAPartirDe(a.price, credit) - resteAPartirDe(b.price, credit)),
    [selected, credit],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Rappel crédit */}
      <div className="rounded-lg border border-xeption-gold/30 bg-xeption-gold/5 px-4 py-3">
        <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold">Ton crédit de reprise</p>
        <p className="text-2xl font-tech font-bold text-white">jusqu'à {fmt(credit)} FCFA</p>
        <p className="text-[11px] text-white/70 font-sans mt-0.5">
          Applique-le sur un appareil — compare jusqu'à {MAX_COMPARE}.
          <span className="text-white/60"> Montant final confirmé en boutique.</span>
        </p>
      </div>

      {/* Recherche pour ajouter au comparateur */}
      {selected.length < MAX_COMPARE && (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-md border border-white/15 bg-[#050505] px-3 py-2">
            <Search className="w-4 h-4 text-white/60 shrink-0" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Ajouter un appareil à comparer…"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/50 outline-none font-sans"
            />
          </div>
          {searchOpen && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-white/15 bg-[#0a0a0c] shadow-[0_16px_48px_rgba(0,0,0,0.9)] overflow-hidden">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                >
                  <img src={optimizeImage(p.image, 80)} alt="" className="w-8 h-8 object-contain shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-sm text-white font-sans">{getProductDisplayName(p)}</span>
                  <span className="text-xs text-xeption-gold font-tech shrink-0">{fmt(p.price)} F</span>
                  <Plus className="w-4 h-4 text-white/60 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparateur */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-white/60 text-xs font-sans">
          <RefreshCw className="w-4 h-4 animate-spin" /> Chargement du catalogue…
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {sortedSelected.map((p) => {
            const reste = resteAPartirDe(p.price, credit);
            const covered = reste === 0;
            return (
              <div
                key={p.id}
                className="relative flex flex-col rounded-lg border border-white/20 bg-[#0f0f0f]/80 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label="Retirer"
                  className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:bg-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="aspect-square bg-[#1c1c16]/90 p-2 flex items-center justify-center border-b border-white/15">
                  <ProductCardImage
                    src={optimizeImage(p.image, 300)}
                    alt={getProductDisplayName(p)}
                    width={300}
                    height={300}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col flex-1 p-2 gap-1">
                  <h4 className="text-xs font-tech font-bold uppercase text-white leading-tight line-clamp-2">
                    {getProductDisplayName(p)}
                  </h4>
                  <p className="text-[10px] text-white/70 font-sans line-clamp-2 leading-snug">
                    {productSpecSummary(p)}
                  </p>
                  <div className="mt-auto pt-1.5 border-t border-white/20">
                    <p className="text-[10px] text-white/60 font-sans">Prix : {fmt(p.price)} F</p>
                    {covered ? (
                      <p className="text-sm font-tech font-bold text-emerald-400">Couvert par ton crédit ✓</p>
                    ) : (
                      <>
                        <p className="text-[10px] text-white/60 font-sans">Reste à payer</p>
                        <p className="text-lg font-tech font-bold text-white leading-none">
                          {fmt(reste)} <span className="text-[10px] text-xeption-gold">FCFA</span>
                        </p>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelect(p)}
                      className="mt-2 w-full bg-xeption-gold text-black font-tech font-bold uppercase text-[10px] tracking-wider py-2 rounded hover:bg-white transition-colors"
                    >
                      Troquer contre celui-ci
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!sortedSelected.length && (
            <p className="col-span-full text-center text-xs text-white/60 font-sans py-6">
              Ajoute des appareils à comparer via la recherche.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TrocUpgradeChoice;
