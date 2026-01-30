
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category } from '../types';
import { ShoppingCart, Sparkles, MapPin, Search } from 'lucide-react';
import { optimizeImage } from '../utils/mediaOptimization';
import { supabase } from '../services/supabaseClient';

interface ProductListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  title?: string;
}

const ProductList: React.FC<ProductListProps> = ({ products, onAddToCart, onProductClick, title = "Nos Pépites" }) => {
  const [filter, setFilter] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (data) setCategories(data as Category[]);
    };
    fetchCats();
  }, []);

  const filteredProducts = useMemo(() => {
    if (filter === 'all') return products;
    return products.filter(p => p.category === filter);
  }, [products, filter]);

  // --- CONTENU SEO DYNAMIQUE ---
  // C'est ici qu'on intègre les mots-clés "cachés" dans du texte utile
  const getSeoText = () => {
      if (filter === 'smartphones' || filter === 'phones') {
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
      if (filter === 'laptops' || filter === 'ordinateurs') {
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

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-8 py-10 md:py-20">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 md:mb-8 gap-4 md:gap-6 px-2">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <span className="w-6 h-0.5 bg-xeption-gold"></span>
             <span className="text-xeption-gold font-tech font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(255,215,0,0.5)] text-[10px] md:text-xs">Catalogue</span>
           </div>
           <h2 className="text-2xl md:text-4xl font-bold text-white font-tech uppercase drop-shadow-xl">
            {title === "Nos Pépites" ? (
                <>Nos <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Pépites</span></>
            ) : (
                <span className="text-white">{title}</span>
            )}
          </h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-none border border-transparent font-tech font-bold uppercase tracking-wider text-[10px] md:text-xs transition-all clip-path-slant backdrop-blur-md ${
                filter === 'all' 
                  ? 'bg-xeption-gold text-black border-xeption-gold shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                  : 'bg-black/60 text-gray-300 border-white/20 hover:border-white hover:text-white hover:bg-black/80'
              }`}
            >
              Tout
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setFilter(cat.slug)}
              className={`px-3 py-1.5 rounded-none border border-transparent font-tech font-bold uppercase tracking-wider text-[10px] md:text-xs transition-all clip-path-slant backdrop-blur-md ${
                filter === cat.slug 
                  ? 'bg-xeption-gold text-black border-xeption-gold shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                  : 'bg-black/60 text-gray-300 border-white/20 hover:border-white hover:text-white hover:bg-black/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Densifiée */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
        {filteredProducts.map((product) => (
          <div 
            key={product.id}
            className="group relative bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 hover:border-xeption-gold/50 transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] hover:-translate-y-1 cursor-pointer rounded-lg"
            onClick={() => onProductClick && onProductClick(product)}
          >
            {/* ... (Code produit identique, je le garde compact pour la réponse XML) ... */}
            {product.isPromo && (
              <div className="absolute top-2 right-2 z-20 animate-pulse-slow">
                 <div className="bg-red-600 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 font-tech uppercase tracking-widest shadow-[0_0_15px_rgba(255,0,0,0.6)] rounded-sm border border-red-400">
                    Promo
                 </div>
              </div>
            )}
            {product.condition === 'new' && (
              <div className="absolute top-2 left-2 z-20">
                 <div className="bg-emerald-500 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 font-tech uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.4)] rounded-sm border border-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-2 h-2 md:w-2.5 md:h-2.5" /> Neuf
                 </div>
              </div>
            )}
            
            <div className="aspect-square bg-black/50 relative overflow-hidden border-b border-white/5 p-4 flex items-center justify-center">
              <img 
                src={optimizeImage(product.image, 400)} 
                alt={`${product.name} Cameroun`} // SEO: Alt text optimisé
                loading="lazy"
                width="400"
                height="400"
                className="w-full h-full object-contain object-center group-hover:scale-105 group-hover:opacity-90 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)] opacity-50 pointer-events-none"></div>
              
              <div className="absolute bottom-2 right-2 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-30">
                 <button 
                  onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                  className="bg-xeption-gold text-black p-2 hover:bg-white transition-colors shadow-lg rounded-full"
                >
                   <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </div>
            </div>

            <div className="p-2 md:p-3 flex-1 flex flex-col relative">
              <div className="mb-1">
                <h3 className="text-xs md:text-sm font-bold text-white font-tech uppercase tracking-wide group-hover:text-xeption-gold transition-colors truncate drop-shadow-md">
                  {product.name}
                </h3>
              </div>
              <p className="text-[10px] text-gray-400 mb-2 line-clamp-1 font-light leading-snug">
                {product.description}
              </p>
              <div className="flex items-end justify-between mt-auto border-t border-white/10 pt-2">
                <div className="flex flex-col">
                  {product.oldPrice && (
                    <span className="text-[9px] text-red-500 font-bold line-through font-mono decoration-red-500 decoration-2">
                      {product.oldPrice.toLocaleString('fr-FR')}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm md:text-lg font-bold text-white font-tech shadow-black drop-shadow-md">
                      {product.price.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-[8px] md:text-[10px] text-xeption-gold font-bold uppercase">FCFA</span>
                  </div>
                </div>
                <span className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors border border-white/10 px-1.5 py-0.5 md:px-2 md:py-1 rounded bg-white/5 hover:bg-white/10">
                    + Info
                </span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        ))}
      </div>

      {/* --- SEO FOOTER BLOCK (Nouveau) --- */}
      {/* Ce bloc est crucial : il contient les mots-clés en texte brut pour Google */}
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
