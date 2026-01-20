
import React from 'react';
import { Pack, Product } from '../types';
import { ShoppingBag, Timer, Gift, ArrowRight } from 'lucide-react';
import { optimizeImage } from '../utils/mediaOptimization';

interface PackListProps {
  packs: Pack[];
  products: Product[];
  onAddPackToCart: (pack: Pack) => void;
}

const PackList: React.FC<PackListProps> = ({ packs, products, onAddPackToCart }) => {
  if (packs.length === 0) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-xeption-gold/10 p-3 rounded-full border border-xeption-gold/20">
            <Gift className="w-6 h-6 text-xeption-gold animate-pulse" />
        </div>
        <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white font-tech uppercase drop-shadow-xl leading-none">
                Packs <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-yellow-200">Exclusifs</span>
            </h2>
            <p className="text-gray-400 text-sm mt-1">Le setup complet pour moins cher. Quantités limitées.</p>
        </div>
      </div>

      {/* Grid Packs - Même logique compacte que ProductList */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {packs.map((pack) => {
            // Calcul de la valeur réelle en additionnant les produits unitaires
            const realValue = pack.items.reduce((sum, item) => {
                const prod = products.find(p => p.id === item.productId);
                return sum + (prod ? prod.price * item.quantity : 0);
            }, 0);
            
            const discountPercent = realValue > 0 ? Math.round(((realValue - pack.price) / realValue) * 100) : 0;
            const savings = realValue - pack.price;

            // Récupération des images des produits inclus pour la prévisualisation
            const itemImages = pack.items.map(i => products.find(p => p.id === i.productId)?.image).filter(Boolean).slice(0, 3);

            return (
                <div 
                    key={pack.id}
                    className="group relative bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 hover:border-xeption-gold/50 transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] hover:-translate-y-1 rounded-lg"
                >
                    {/* Badge Économie */}
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-20 shadow-lg border-l border-b border-white/10">
                        Économisez {savings.toLocaleString()} FCFA
                    </div>

                    {/* Image Principale Pack */}
                    <div className="aspect-[16/9] relative overflow-hidden">
                        <img 
                            src={optimizeImage(pack.image, 600)} 
                            alt={pack.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent opacity-60"></div>
                        
                        {/* Composition Thumbs (Overlay) */}
                        <div className="absolute bottom-2 left-2 flex gap-1">
                            {itemImages.map((img, idx) => (
                                <div key={idx} className="w-8 h-8 rounded border border-white/20 bg-black/50 overflow-hidden backdrop-blur-sm">
                                    <img src={img} className="w-full h-full object-cover" />
                                </div>
                            ))}
                            {pack.items.length > 3 && (
                                <div className="w-8 h-8 rounded border border-white/20 bg-black/50 flex items-center justify-center text-[10px] text-white font-bold backdrop-blur-sm">
                                    +{pack.items.length - 3}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                        <div className="mb-3">
                            <h3 className="text-lg font-bold text-white font-tech uppercase leading-tight group-hover:text-xeption-gold transition-colors">
                                {pack.name}
                            </h3>
                            {pack.validUntil && (
                                <div className="flex items-center gap-1.5 text-xeption-goldDim text-[10px] mt-1 font-bold uppercase tracking-wider">
                                    <Timer className="w-3 h-3" />
                                    Offre valide jusqu'au {new Date(pack.validUntil).toLocaleDateString()}
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-gray-400 line-clamp-2 mb-4 font-light">
                            {pack.description}
                        </p>

                        <div className="mt-auto border-t border-white/10 pt-3 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 line-through decoration-red-500 font-mono">
                                    {realValue.toLocaleString()} FCFA
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-white font-tech shadow-black drop-shadow-md">
                                        {pack.price.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-xeption-gold font-bold uppercase">FCFA</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => onAddPackToCart(pack)}
                                className="bg-white/5 hover:bg-xeption-gold hover:text-black text-white border border-white/10 p-2.5 rounded-sm transition-all shadow-lg group/btn"
                                title="Ajouter le pack"
                            >
                                <ShoppingBag className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default PackList;
