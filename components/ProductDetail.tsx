
import React from 'react';
import { Product } from '../types';
import { ArrowLeft, ShoppingCart, Check, X, Cpu, Award } from 'lucide-react';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onBack, onAddToCart }) => {
  return (
    <div className="min-h-screen bg-[#F9F8F6]/85 backdrop-blur-sm text-gray-900 pb-20 animate-in slide-in-from-right duration-500 z-50 absolute inset-0 overflow-y-auto overflow-x-hidden supports-[backdrop-filter]:bg-[#F9F8F6]/75">
      
      {/* CSS for Particles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
        .particle {
          position: absolute;
          border-radius: 50%;
          background: #FFD700;
          pointer-events: none;
          animation: float 8s ease-in-out infinite;
          mix-blend-mode: multiply;
        }
      `}</style>

      {/* BACKGROUND PARTICLES - Subtle overlay on video */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="particle w-3 h-3 top-[10%] left-[20%] blur-[2px]" style={{ animationDelay: '0s' }}></div>
          <div className="particle w-6 h-6 top-[30%] right-[15%] blur-[4px] bg-orange-300" style={{ animationDelay: '2s' }}></div>
          <div className="particle w-96 h-96 -top-20 -right-20 bg-xeption-gold/10 blur-[120px] animate-pulse"></div>
          <div className="particle w-96 h-96 bottom-0 left-0 bg-orange-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* 1. HERO SECTION */}
      <div className="relative h-[60vh] md:h-[70vh] w-full flex items-end md:items-center">
        
        {/* Subtle Grid Floor */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            {/* Horizontal Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_49%,rgba(0,0,0,0.2)_50%,transparent_51%)] bg-[size:100%_40px] [transform:perspective(500px)_rotateX(60deg)_scale(2)] origin-bottom"></div>
            {/* Vertical Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_49%,rgba(0,0,0,0.2)_50%,transparent_51%)] bg-[size:40px_100%] [transform:perspective(500px)_rotateX(60deg)_scale(2)] origin-bottom"></div>
        </div>

        {/* Back Button */}
        <button 
            onClick={onBack}
            className="absolute top-6 left-6 z-30 p-3 bg-white/60 backdrop-blur-md border border-white/50 rounded-full hover:bg-white hover:border-xeption-gold hover:text-xeption-gold text-black shadow-lg transition-all group"
        >
            <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
        </button>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center pb-12 md:pb-0">
            
            {/* Left: Text */}
            <div className="space-y-4 md:space-y-6 pt-20 md:pt-0">
                <div className="inline-flex items-center space-x-2 bg-white/60 border border-xeption-gold/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                    <Award className="h-4 w-4 text-xeption-gold" />
                    <span className="text-xeption-goldDim text-xs font-bold uppercase tracking-[0.2em] font-tech">Xeption Certified</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold font-tech uppercase leading-none text-black drop-shadow-sm mix-blend-hard-light">
                    {product.name}
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-800 font-light max-w-lg drop-shadow-sm">
                    {product.description}
                </p>

                <div className="flex items-center space-x-6 pt-4">
                    <div>
                        <span className="block text-sm text-gray-600 uppercase font-bold tracking-wider">Prix Actuel</span>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-4xl font-bold text-black font-mono">{product.price.toLocaleString('fr-FR')}</span>
                            <span className="text-xeption-goldDim font-bold">FCFA</span>
                        </div>
                    </div>
                    {product.rating && (
                        <div className="hidden md:block">
                             <div className="w-16 h-16 rounded-full border-2 border-xeption-gold flex items-center justify-center bg-white/80 backdrop-blur shadow-lg">
                                <span className="text-xl font-bold text-xeption-goldDim">{product.rating}</span>
                             </div>
                        </div>
                    )}
                </div>

                {/* Desktop Add to Cart */}
                <div className="hidden md:flex space-x-4 pt-4">
                    <button 
                        onClick={() => onAddToCart(product)}
                        className="bg-black text-white px-8 py-4 font-tech font-bold uppercase text-lg tracking-wider hover:bg-xeption-gold hover:text-black transition-colors shadow-xl flex items-center gap-2"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        Ajouter au panier
                    </button>
                </div>
            </div>

            {/* Right: Image Hero */}
            <div className="relative h-64 md:h-[500px] w-full flex items-center justify-center group">
                {/* Glowing Circle behind product */}
                <div className="absolute w-64 h-64 md:w-96 md:h-96 bg-gradient-to-tr from-xeption-gold/30 to-orange-200/50 rounded-full blur-[60px] group-hover:blur-[80px] transition-all duration-700 mix-blend-multiply"></div>
                
                <img 
                    src={product.image} 
                    alt={product.name} 
                    className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform group-hover:scale-105 group-hover:-translate-y-4 transition-transform duration-500 ease-out"
                />
            </div>
        </div>
      </div>

      {/* 2. SUMMARY (Pour les pressés) */}
      <div className="max-w-5xl mx-auto px-4 py-16 relative z-10">
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 p-8 md:p-12 relative overflow-hidden shadow-2xl rounded-sm">
             <div className="absolute top-0 right-0 w-32 h-32 bg-xeption-gold/20 rounded-full blur-2xl -mr-16 -mt-16 mix-blend-multiply"></div>
             
             <div className="flex flex-col md:flex-row gap-12">
                 <div className="flex-1">
                     <h2 className="text-3xl font-bold text-black font-tech uppercase mb-6 flex items-center gap-3">
                        <span className="w-2 h-8 bg-xeption-gold"></span>
                        Le Verdict
                     </h2>
                     <p className="text-lg text-gray-800 leading-relaxed italic border-l-2 border-xeption-gold/30 pl-6 py-2 font-medium">
                        "{product.reviewShort || product.description}"
                     </p>
                 </div>
                 
                 <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                     {/* Pros */}
                     {product.pros && (
                         <div className="space-y-3">
                             <h3 className="text-green-700 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                <Check className="h-4 w-4" /> On Valide
                             </h3>
                             <ul className="space-y-2">
                                 {product.pros.map((pro, i) => (
                                     <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                                         <span className="text-green-600 mt-1">•</span> {pro}
                                     </li>
                                 ))}
                             </ul>
                         </div>
                     )}
                     
                     {/* Cons */}
                     {product.cons && (
                         <div className="space-y-3">
                             <h3 className="text-red-600 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                <X className="h-4 w-4" /> On Aime Moins
                             </h3>
                             <ul className="space-y-2">
                                 {product.cons.map((con, i) => (
                                     <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                                         <span className="text-red-500 mt-1">•</span> {con}
                                     </li>
                                 ))}
                             </ul>
                         </div>
                     )}
                 </div>
             </div>
          </div>
      </div>

      {/* 3. GEEK ZONE (Specs Detail) */}
      {product.specs && (
          <div className="max-w-5xl mx-auto px-4 pb-24 relative z-10">
              <div className="flex items-center gap-4 mb-8">
                  <Cpu className="h-8 w-8 text-gray-600" />
                  <h2 className="text-3xl font-bold text-black font-tech uppercase">Détails Techniques</h2>
                  <div className="h-[1px] flex-1 bg-gray-300/50"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.specs.map((spec, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center p-4 border-b border-gray-200/50 hover:bg-white/50 hover:shadow-sm transition-all group bg-white/30 backdrop-blur-sm"
                      >
                          <span className="text-gray-600 font-mono text-sm uppercase tracking-wider group-hover:text-xeption-goldDim transition-colors">{spec.label}</span>
                          <span className="text-black font-bold text-right">{spec.value}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-xl border-t border-white/50 md:hidden z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase font-bold">Total</span>
                  <span className="text-xl font-bold text-black">{product.price.toLocaleString('fr-FR')} <span className="text-xs text-xeption-goldDim">FCFA</span></span>
              </div>
              <button 
                  onClick={() => onAddToCart(product)}
                  className="flex-1 bg-black text-white py-3 font-bold font-tech uppercase tracking-wider rounded-sm shadow-lg active:scale-95 transition-transform"
              >
                  Ajouter
              </button>
          </div>
      </div>

    </div>
  );
};

export default ProductDetail;
