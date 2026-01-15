
import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { ShoppingCart, Tag, Star } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, onAddToCart, onProductClick }) => {
  const [filter, setFilter] = useState<'all' | 'phone' | 'computer' | 'accessory'>('all');

  const filteredProducts = useMemo(() => {
    if (filter === 'all') return products;
    return products.filter(p => p.category === filter);
  }, [products, filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <span className="w-8 h-1 bg-xeption-gold"></span>
             <span className="text-xeption-gold font-tech font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(255,215,0,0.5)]">Catalogue</span>
           </div>
           <h2 className="text-4xl md:text-5xl font-bold text-white font-tech uppercase drop-shadow-xl">
            Nos <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Pépites</span>
          </h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {(['all', 'phone', 'computer', 'accessory'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-5 py-2 rounded-none border border-transparent font-tech font-bold uppercase tracking-wider text-sm transition-all clip-path-slant backdrop-blur-md ${
                filter === cat 
                  ? 'bg-xeption-gold text-black border-xeption-gold shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                  : 'bg-black/60 text-gray-300 border-white/20 hover:border-white hover:text-white hover:bg-black/80'
              }`}
            >
              {cat === 'all' ? 'Tout' : cat === 'phone' ? 'Phones' : cat === 'computer' ? 'Laptops' : 'Gear'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProducts.map((product) => (
          <div 
            key={product.id}
            className="group relative bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 hover:border-xeption-gold/50 transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] hover:-translate-y-2 cursor-pointer rounded-xl"
            onClick={() => onProductClick && onProductClick(product)}
          >
            {/* Promo Tag */}
            {product.isPromo && (
              <div className="absolute top-0 right-0 z-20">
                 <div className="bg-xeption-red text-white text-[10px] font-bold px-3 py-1 font-tech uppercase tracking-widest shadow-[0_0_10px_#ff0033] rounded-bl-xl">
                    Promo
                 </div>
              </div>
            )}
            
            {/* Image Container */}
            <div className="aspect-[4/3] bg-black/50 relative overflow-hidden border-b border-white/5">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover object-center group-hover:scale-105 group-hover:opacity-90 transition-all duration-500"
              />
              {/* Overlay Gradient for readability at bottom of image */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent opacity-40"></div>
              
              <div className="absolute bottom-4 right-4 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-30">
                 <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                  className="bg-xeption-gold text-black p-3 hover:bg-white transition-colors shadow-lg rounded-full"
                >
                   <ShoppingCart className="h-5 w-5" />
                 </button>
              </div>
            </div>

            {/* Content - Increased opacity of background for better text contrast */}
            <div className="p-6 flex-1 flex flex-col relative">
              <div className="mb-2">
                <h3 className="text-xl font-bold text-white font-tech uppercase tracking-wide group-hover:text-xeption-gold transition-colors truncate drop-shadow-md">
                  {product.name}
                </h3>
              </div>
              
              <p className="text-sm text-gray-300 mb-6 line-clamp-2 leading-relaxed font-light">
                {product.description}
              </p>
              
              <div className="flex items-end justify-between mt-auto border-t border-white/10 pt-4">
                <div className="flex flex-col">
                  {product.oldPrice && (
                    <span className="text-xs text-gray-500 line-through font-mono">
                      {product.oldPrice.toLocaleString('fr-FR')} FCFA
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white font-tech shadow-black drop-shadow-md">
                      {product.price.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-xs text-xeption-gold font-bold uppercase">FCFA</span>
                  </div>
                </div>
                
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors border border-white/10 px-2 py-1 rounded bg-white/5 hover:bg-white/10">
                    Voir détails
                </span>
              </div>
            </div>
            
            {/* Tech Decoration Lines - Enhanced Glow */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 box-shadow-[0_0_10px_#FFD700]"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;
