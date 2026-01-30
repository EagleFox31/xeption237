import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Checkout from './components/Checkout';
import AiConsultant from './components/AiConsultant';
import { Product, CartItem, Pack } from './types';
import { supabase } from './services/supabaseClient';
import { optimizeVideo, optimizeImage } from './utils/mediaOptimization';
import { Lock, MapPin } from 'lucide-react';
//New
// Pages
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import TrocPage from './pages/TrocPage';
import TrackingPage from './pages/TrackingPage';
import SavPage from './pages/SavPage';
import AdminPage from './pages/AdminPage';
import ProductPage from './pages/ProductPage';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Helper to determine if we are on a product detail page (to hide footer/adjust layout)
  const isProductPage = location.pathname.startsWith('/product/');
  const isAdminPage = location.pathname === '/admin';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: productData, error: productError } = await supabase.from('products').select('*');
        if (productError) throw productError;

        let formattedProducts: Product[] = [];
        if (productData) {
          formattedProducts = productData.map((p: any) => ({
            ...p,
            oldPrice: p.old_price || p.oldPrice || null,
            isPromo: p.is_promo || p.isPromo || false,
            warrantyMonths: p.warranty_months || p.warrantyMonths || 0,
            isFeatured: p.is_featured || p.isFeatured || false,
            brand: p.brand || null,
            productRange: p.product_range || p.productRange || null
          }));
          setProducts(formattedProducts);
        }

        const { data: packData, error: packError } = await supabase.from('packs').select('*');
        if (!packError && packData) {
          const formattedPacks: Pack[] = packData.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            image: p.image,
            price: p.price,
            validUntil: p.valid_until,
            items: p.items || [],
            isFeatured: p.is_featured
          }));
          setPacks(formattedPacks);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    const productChannel = supabase.channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
      .subscribe();

    const packChannel = supabase.channel('public:packs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packs' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(packChannel);
    };
  }, []);

  // Background Video Management
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.35;
      if (isAdminPage) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log("Video auto-play prevented:", e));
      }
    }
  }, [isAdminPage]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

  const addPackToCart = (pack: Pack) => {
    const packAsProduct: Product = {
      id: `pack_${pack.id}`,
      name: `[PACK] ${pack.name}`,
      description: pack.description,
      price: pack.price,
      image: pack.image,
      category: 'packs',
      stock: 99,
      condition: 'new',
      specs: pack.items.map(i => {
        const p = products.find(prod => prod.id === i.productId);
        return { label: `${i.quantity}x`, value: p?.name || 'Item Inconnu' };
      })
    };
    addToCart(packAsProduct);
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

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const bgVideoUrl = "https://res.cloudinary.com/dli0kdkg9/video/upload/v1768438828/xption7_zrgro4.mp4";
  const bgPosterUrl = "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=1280&auto=format&fit=crop";

  return (
    <div className="min-h-screen text-white font-sans selection:bg-xeption-gold selection:text-black relative overflow-x-hidden">

      {/* Background Video */}
      <div
        className="fixed inset-0 z-0 w-full h-full bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url('${optimizeImage(bgPosterUrl, 1280)}')` }}
      >
        <video
          ref={videoRef}
          autoPlay loop muted playsInline
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
        products={products}
        onProductSelect={(p) => navigate(`/product/${p.id}`)}
      />

      <main className="pt-20 pb-20 relative z-10 w-full">
        <Routes>
          <Route path="/" element={
            <HomePage
              products={products}
              packs={packs}
              onAddToCart={addToCart}
              onAddPackToCart={addPackToCart}
            />
          } />
          <Route path="/shop" element={
            <ShopPage
              products={products}
              onAddToCart={addToCart}
            />
          } />
          <Route path="/product/:id" element={
            <ProductPage
              products={products}
              onAddToCart={addToCart}
            />
          } />
          <Route path="/troc" element={<TrocPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/sav" element={<SavPage />} />
          <Route path="/admin/*" element={
            <AdminPage
              isAuthenticated={isAuthenticated}
              setIsAuthenticated={setIsAuthenticated}
              products={products}
              onUpdateProducts={setProducts}
            />
          } />
        </Routes>
      </main>

      {!isProductPage && (
        <footer className="bg-black/80 backdrop-blur-xl border-t border-gray-800 py-12 relative z-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-8">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold text-white mb-2 font-tech uppercase">Xeption</h3>
              <div className="flex flex-col items-center md:items-start">
                <p className="text-gray-400 text-sm flex items-center justify-center md:justify-start">
                  Made <span className="font-pinyon text-3xl text-xeption-gold italic mx-2 relative top-1">by</span> Trigenys Group
                </p>
                <button
                  onClick={() => navigate('/admin')}
                  className="text-[10px] text-gray-700 hover:text-xeption-gold transition-colors uppercase font-bold tracking-widest mt-2 flex items-center gap-1 opacity-50 hover:opacity-100"
                >
                  <Lock className="w-3 h-3" /> Accès Staff
                </button>
              </div>
            </div>

            {/* ZONES DESSERVIES (SEO Local) */}
            <div className="text-xs text-gray-500 max-w-sm text-center md:text-left">
              <p className="font-bold uppercase text-gray-400 mb-1 flex items-center justify-center md:justify-start gap-1"><MapPin className="w-3 h-3" /> Zones desservies</p>
              <p className="leading-relaxed">
                Yaoundé (Bastos, Omnisports, Biyem-Assi, Mendong, Odza), Douala (Akwa, Bonapriso, Bonanjo, Bali), Bafoussam, Kribi, Garoua, Bamenda et tout le Cameroun.
              </p>
            </div>

            <div className="flex space-x-6 flex-wrap justify-center gap-y-4">
              <a href="https://web.facebook.com/xeptioon/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">Facebook</a>
              <a href="https://www.instagram.com/xeption_corp/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">Instagram</a>
              <a href="https://www.tiktok.com/@xeption237?_r=1&_t=ZM-939Ae3o3r2J" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">TikTok</a>
              <a href="https://wa.me/237699000000" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">WhatsApp</a>
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
        onNavigate={(page) => navigate(page === 'home' ? '/' : '/' + page)}
      />

      {!isAdminPage && <AiConsultant />}
    </div>
  );
};

export default App;
