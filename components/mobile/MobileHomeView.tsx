import React from 'react';
import { Product, Pack } from '../../types';
import MobileHeroBanner from './MobileHeroBanner';
import MobileFlashSales from './MobileFlashSales';
import MobileTrustBandeau from './MobileTrustBandeau';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, RefreshCw, ChevronRight } from 'lucide-react';
import SkeletonLoader from '../common/SkeletonLoader';

export interface MobileHomeViewProps {
  products: Product[];
  packs: Pack[];
  onAddToCart: (product: Product) => void;
  onAddPackToCart?: (pack: Pack) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const MobileHomeView: React.FC<MobileHomeViewProps> = ({
  products,
  onAddToCart,
  cartCount,
  onOpenCart,
}) => {
  const navigate = useNavigate();

  // Si les produits sont en cours de chargement initial, afficher un squelette haut de gamme
  if (products.length === 0) {
    return <SkeletonLoader variant="home" />;
  }

  // Produits répartis par univers pour refléter l'intégralité du catalogue (229 produits)
  const phones = products.filter((p) => p.category === 'phones');
  const computers = products.filter((p) => p.category === 'computer');
  const accessories = products.filter((p) => p.category === 'accessories');
  const refurbished = products.filter((p) => p.condition === 'refurbished');

  return (
    <div className="w-full min-h-screen bg-transparent text-white flex flex-col pb-6">
      {/* 1. Bannière Hero Carrousel (5 slides thématiques + support campagnes) */}
      <MobileHeroBanner />

      {/* 4. Carrousel Ventes Flash (Promotions réelles) */}
      <MobileFlashSales
        title="Ventes Flash"
        products={products}
        mode="promo"
        viewAllRoute="/shop?promo=true"
        viewAllLabel="Toutes les promos"
        onAddToCart={onAddToCart}
      />

      {/* 5. Bandeau de réassurance : Livraison Express + Garantie Boutique */}
      <MobileTrustBandeau />

      {/* 6. Smartphones Recommandés (160 modèles en stock) */}
      {phones.length > 0 && (
        <div className="mt-3">
          <MobileFlashSales
            title="Smartphones Recommandés"
            products={phones}
            mode="category"
            viewAllRoute="/shop?cat=phones"
            viewAllLabel={`Voir les ${phones.length}`}
            onAddToCart={onAddToCart}
          />
        </div>
      )}

      {/* 7. Bannière Express Troc (Service Signature Xeption) */}
      <div className="px-4 my-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#18150d] via-[#101014] to-[#0d0d10] border border-amber-400/30 p-4 shadow-xl">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-[10px] font-tech font-black text-amber-400 uppercase tracking-wider">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              TROC
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Yaoundé &amp; Douala
            </span>
          </div>

          <h3 className="text-white font-tech font-black text-base uppercase leading-snug mb-1">
            Ton ancien phone <span className="text-amber-400">vaut de l'or</span>
          </h3>
          <p className="text-zinc-300 text-xs leading-relaxed mb-3">
            Calcule son prix en 2 min. Échange contre un nouveau modèle ou reçois du cash en boutique à Mfoundi Mall.
          </p>

          <button
            type="button"
            onClick={() => navigate('/troc')}
            className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all"
          >
            <span>Voir le prix de mon téléphone</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 8. PC & Ordinateurs Portables (32 modèles : Dell XPS, HP, Lenovo, MacBook) */}
      {computers.length > 0 && (
        <div className="mt-2">
          <MobileFlashSales
            title="PC & Ordinateurs Portables"
            products={computers}
            mode="category"
            viewAllRoute="/shop?cat=computer"
            viewAllLabel={`Voir les ${computers.length} PC`}
            onAddToCart={onAddToCart}
          />
        </div>
      )}

      {/* 9. Occasion Comme Neuf & Reconditionnés certifiés */}
      {refurbished.length > 0 && (
        <div className="mt-3">
          <MobileFlashSales
            title="Occasion Comme Neuf"
            products={refurbished}
            mode="category"
            viewAllRoute="/shop?condition=refurbished"
            viewAllLabel="Garantie boutique"
            onAddToCart={onAddToCart}
          />
        </div>
      )}

      {/* 10. Accessoires & Gadgets Tech (35 références : AirPods, Smartwatches, Chargeurs) */}
      {accessories.length > 0 && (
        <div className="mt-3">
          <MobileFlashSales
            title="Accessoires & Objets Connectés"
            products={accessories}
            mode="category"
            viewAllRoute="/shop?cat=accessories"
            viewAllLabel={`Voir les ${accessories.length}`}
            onAddToCart={onAddToCart}
          />
        </div>
      )}

      {/* 11. Bouton d'exploration complet du catalogue */}
      <div className="px-4 mt-6 mb-4 flex justify-center">
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="w-full py-3.5 rounded-xl border border-amber-400/30 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 hover:border-amber-400/60 text-white font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Voir tout le catalogue ({products.length} produits)</span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>
    </div>
  );
};

export default MobileHomeView;
