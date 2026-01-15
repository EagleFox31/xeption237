
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import AiConsultant from './components/AiConsultant';
import Checkout from './components/Checkout';
import TrocSection from './components/TrocSection';
import AdminPanel from './components/AdminPanel';
import StaffLogin from './components/StaffLogin'; // Import Login
import { Product, CartItem } from './types';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [page, setPage] = useState('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Video Ref for speed control
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch products from Supabase on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setProducts(data as Product[]);
        } else {
            setProducts([]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      }
    };

    fetchProducts();
  }, []);

  // Control video playback based on page
  useEffect(() => {
    if (videoRef.current) {
      // Always ensure speed is consistent
      videoRef.current.playbackRate = 0.35;

      if (page === 'admin') {
        videoRef.current.pause();
      } else {
        // Attempt to play if not in admin
        videoRef.current.play().catch(e => console.log("Video auto-play prevented:", e));
      }
    }
  }, [page]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen text-white font-sans selection:bg-xeption-gold selection:text-black relative overflow-x-hidden">
      
      {/* GLOBAL BACKGROUND - Z-INDEX 0 */}
      <div 
          className="fixed inset-0 z-0 w-full h-full bg-cover bg-center pointer-events-none"
          style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')"
          }}
      >
          <video 
            ref={videoRef}
            autoPlay 
            loop 
            muted 
            playsInline
            poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-90 md:opacity-100" 
          >
            {/* Added q_auto:best to force High Definition rendering without aggressive compression */}
            <source src="https://res.cloudinary.com/dli0kdkg9/video/upload/q_auto:best/v1768438828/xption7_zrgro4.mp4" type="video/mp4" />
          </video>
          
          {/* Reduced overlay opacity from bg-black/50 to bg-black/20 for brighter video */}
          <div className="absolute inset-0 bg-black/20"></div>
          
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.05)_1px,transparent_1px)] bg-[size:60px_60px] opacity-10"></div>
      </div>

      <Header 
        cartCount={cartCount} 
        onOpenCart={() => setIsCartOpen(true)}
        onNavigate={(p) => { setPage(p); setSelectedProduct(null); }}
        currentPage={page}
      />

      {/* Main content z-10 to float above video */}
      <main className="pt-20 pb-20 relative z-10">
        {page === 'home' && (
          <>
            <Hero onShopNow={() => setPage('shop')} />
            <div id="featured-products">
               <ProductList products={products.slice(0, 3)} onAddToCart={addToCart} onProductClick={handleProductClick} />
            </div>
            <TrocSection />
          </>
        )}

        {page === 'shop' && (
          <div className="pt-8 min-h-screen">
            <div className="text-center mb-12">
               <h1 className="text-4xl font-bold text-white drop-shadow-lg">La Boutique <span className="text-xeption-gold">237</span></h1>
               <p className="text-gray-300 mt-2 font-medium bg-black/40 inline-block px-4 py-1 rounded-full backdrop-blur-md border border-white/10">Choisis ton matos, on livre au calme.</p>
            </div>
            <ProductList products={products} onAddToCart={addToCart} onProductClick={handleProductClick} />
          </div>
        )}

        {page === 'troc' && (
            <div className="pt-8 min-h-screen">
                <TrocSection />
                <div className="max-w-4xl mx-auto px-4 text-center mt-12 bg-black/60 backdrop-blur-md p-8 rounded-2xl border border-white/10">
                    <h3 className="text-2xl font-bold mb-4">Comment ça marche ?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-6 bg-white/5 rounded-xl border border-white/5 hover:border-xeption-gold/30 transition-all">
                            <span className="text-4xl font-bold text-xeption-gold mb-2 block">1</span>
                            <p className="text-gray-300">Passe avec ton appareil à la boutique.</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-xl border border-white/5 hover:border-xeption-gold/30 transition-all">
                            <span className="text-4xl font-bold text-xeption-gold mb-2 block">2</span>
                            <p className="text-gray-300">On check l'état et on te donne un prix.</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-xl border border-white/5 hover:border-xeption-gold/30 transition-all">
                            <span className="text-4xl font-bold text-xeption-gold mb-2 block">3</span>
                            <p className="text-gray-300">Tu ajoutes la différence et tu prends le nouveau.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {page === 'admin' && (
            <>
                {isAuthenticated ? (
                    <AdminPanel 
                        products={products} 
                        onUpdateProducts={setProducts} 
                    />
                ) : (
                    <StaffLogin onLogin={() => setIsAuthenticated(true)} />
                )}
            </>
        )}
      </main>

      {/* Product Detail Overlay */}
      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onBack={closeProductDetail} 
          onAddToCart={(p) => { addToCart(p); closeProductDetail(); }} 
        />
      )}

      {/* Footer */}
      {!selectedProduct && (
        <footer className="bg-black/80 backdrop-blur-xl border-t border-gray-800 py-12 relative z-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
             <div className="mb-6 md:mb-0">
                <h3 className="text-xl font-bold text-white mb-2 font-tech uppercase">Xeption Network</h3>
                <p className="text-gray-400 text-sm flex items-center justify-center md:justify-start">
                  Made 
                  <span className="font-pinyon text-3xl text-xeption-gold italic mx-2 relative top-1">by</span> 
                  Trigenys Group
                </p>
             </div>
             <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">Facebook</a>
                <a href="#" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">Instagram</a>
                <a href="#" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">WhatsApp</a>
             </div>
          </div>
        </footer>
      )}

      <Checkout 
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onUpdateQuantity={updateQuantity}
      />

      <AiConsultant />
    </div>
  );
};

export default App;
