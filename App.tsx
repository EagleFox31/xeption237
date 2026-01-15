
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import AiConsultant from './components/AiConsultant';
import Checkout from './components/Checkout';
import TrocSection from './components/TrocSection';
import AdminPanel from './components/AdminPanel';
import StaffLogin from './components/StaffLogin';
import RepairSection from './components/RepairSection';
import OrderTracking from './components/OrderTracking';
import { Product, CartItem } from './types';
import { supabase } from './services/supabaseClient';
import { optimizeVideo, optimizeImage } from './utils/mediaOptimization';

const App: React.FC = () => {
  const [page, setPage] = useState('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // State pour le transfert d'ID vers le tracking
  const [activeTrackingId, setActiveTrackingId] = useState<string>('');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Video Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        if (data) setProducts(data as Product[]);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

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

  const bgVideoUrl = "https://res.cloudinary.com/dli0kdkg9/video/upload/v1768438828/xption7_zrgro4.mp4";
  const bgPosterUrl = "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=1280&auto=format&fit=crop";

  return (
    <div className="min-h-screen text-white font-sans selection:bg-xeption-gold selection:text-black relative overflow-x-hidden">
      
      <div 
          className="fixed inset-0 z-0 w-full h-full bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url('${optimizeImage(bgPosterUrl, 1280)}')` }}
      >
          <video 
            ref={videoRef}
            autoPlay 
            loop 
            muted 
            playsInline
            poster={optimizeImage(bgPosterUrl, 1280)}
            className="w-full h-full object-cover opacity-90 md:opacity-100" 
          >
            <source src={optimizeVideo(bgVideoUrl)} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.05)_1px,transparent_1px)] bg-[size:60px_60px] opacity-10"></div>
      </div>

      <Header 
        cartCount={cartCount} 
        onOpenCart={() => setIsCartOpen(true)}
        onNavigate={(p) => { setPage(p); setSelectedProduct(null); }}
        currentPage={page}
      />

      <main className="pt-20 pb-20 relative z-10">
        {page === 'home' && (
          <>
            <Hero onShopNow={() => setPage('shop')} />
            <ProductList products={products.slice(0, 3)} onAddToCart={addToCart} onProductClick={handleProductClick} />
            <TrocSection />
          </>
        )}

        {page === 'shop' && (
          <div className="pt-8 min-h-screen">
            <ProductList products={products} onAddToCart={addToCart} onProductClick={handleProductClick} />
          </div>
        )}

        {page === 'troc' && <div className="pt-8 min-h-screen"><TrocSection /></div>}

        {page === 'tracking' && (
             <div className="pt-8 min-h-screen">
                 <OrderTracking initialOrderId={activeTrackingId} />
             </div>
        )}

        {page === 'sav' && <div className="pt-8 min-h-screen"><RepairSection /></div>}

        {page === 'admin' && (
            <>
                {isAuthenticated ? (
                    <AdminPanel products={products} onUpdateProducts={setProducts} />
                ) : (
                    <StaffLogin onLogin={() => setIsAuthenticated(true)} />
                )}
            </>
        )}
      </main>

      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onBack={closeProductDetail} 
          onAddToCart={(p) => { addToCart(p); closeProductDetail(); }} 
        />
      )}

      <Checkout 
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onUpdateQuantity={updateQuantity}
        onGoToTracking={(id) => {
            setActiveTrackingId(id);
            setPage('tracking');
            setIsCartOpen(false);
        }}
      />

      <AiConsultant />
    </div>
  );
};

export default App;
