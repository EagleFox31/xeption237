
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductList from './components/ProductList';
import PackList from './components/PackList';
import TrustBar from './components/TrustBar'; 
import DeliveryEstimator from './components/DeliveryEstimator'; 
import SocialProof from './components/SocialProof'; 
import ProductDetail from './components/ProductDetail';
import AiConsultant from './components/AiConsultant';
import Checkout from './components/Checkout';
import TrocSection from './components/TrocSection';
import AdminPanel from './components/admin/AdminPanel'; 
import StaffLogin from './components/StaffLogin'; 
import RepairSection from './components/RepairSection'; 
import OrderTracking from './components/OrderTracking'; 
import { Product, CartItem, Pack } from './types';
import { supabase } from './services/supabaseClient';
import { optimizeVideo, optimizeImage } from './utils/mediaOptimization';
import { Lock, MapPin } from 'lucide-react';

const App: React.FC = () => {
  const [page, setPage] = useState('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]); 
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const savedPage = sessionStorage.getItem('xeption_last_page');
    if (savedPage) {
      setPage(savedPage);
    }

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

        const params = new URLSearchParams(window.location.search);
        const productId = params.get('product');
        if (productId && formattedProducts.length > 0) {
            const foundProduct = formattedProducts.find(p => p.id === productId);
            if (foundProduct) {
                setSelectedProduct(foundProduct);
                window.history.replaceState({}, '', window.location.pathname);
            }
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

  useEffect(() => {
    if (selectedProduct) return;
    const baseTitle = "Xeption | Le Ndamba du Digital";
    switch(page) {
        case 'shop': document.title = "Le Shop High-Tech Cameroun | Xeption"; break;
        case 'troc': document.title = "Troc Téléphone Douala & Yaoundé | Xeption"; break;
        case 'tracking': document.title = "Suivi de Commande | Xeption 237"; break;
        case 'sav': document.title = "SAV & Garantie | Xeption"; break;
        case 'admin': document.title = "Staff Portal | Xeption"; break;
        default: document.title = baseTitle;
    }
  }, [page, selectedProduct]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.35;
      if (page === 'admin') {
        videoRef.current.pause();
      } else {
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

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    document.title = "Xeption | Le Ndamba du Digital";
  };

  const handleNavigate = (newPage: string) => {
      setPage(newPage);
      setSelectedProduct(null);
      sessionStorage.setItem('xeption_last_page', newPage);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const bgVideoUrl = "https://res.cloudinary.com/dli0kdkg9/video/upload/v1768438828/xption7_zrgro4.mp4";
  const bgPosterUrl = "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=1280&auto=format&fit=crop";

  const pinnedProducts = products.filter(p => p.isFeatured);
  let displayFeatured = [...pinnedProducts];
  if (displayFeatured.length < 3) {
      const remainingSlots = 3 - displayFeatured.length;
      const fillers = products.filter(p => !p.isFeatured).slice(0, remainingSlots);
      displayFeatured = [...displayFeatured, ...fillers];
  }

  return (
    <div className="min-h-screen text-white font-sans selection:bg-xeption-gold selection:text-black relative overflow-x-hidden">
      
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
        onNavigate={handleNavigate}
        currentPage={page}
        products={products} 
        onProductSelect={handleProductClick} 
      />

      <main className="pt-20 pb-20 relative z-10">
        {page === 'home' && (
          <>
            <Hero onShopNow={() => setPage('shop')} />
            <TrustBar />
            <DeliveryEstimator />
            <div id="featured-products">
               <ProductList 
                  products={displayFeatured} 
                  onAddToCart={addToCart} 
                  onProductClick={handleProductClick} 
                  title="Nos Pépites"
               />
            </div>
            <PackList packs={packs} products={products} onAddPackToCart={addPackToCart} />
            <TrocSection onNavigate={handleNavigate} />
            <SocialProof />
          </>
        )}

        {page === 'shop' && (
          <div className="pt-8 min-h-screen">
            <div className="text-center mb-12">
               <h1 className="text-4xl font-bold text-white drop-shadow-lg">La Boutique <span className="text-xeption-gold">237</span></h1>
               <p className="text-gray-300 mt-2 font-medium bg-black/40 inline-block px-4 py-1 rounded-full backdrop-blur-md border border-white/10">Choisis ton matos, on livre au calme.</p>
            </div>
            <ProductList 
                products={products} 
                onAddToCart={addToCart} 
                onProductClick={handleProductClick} 
                title="Catalogue Complet" 
            />
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

        {page === 'tracking' && (
             <div className="pt-8 min-h-screen">
                 <OrderTracking />
             </div>
        )}

        {page === 'sav' && (
             <div className="pt-8 min-h-screen">
                 <RepairSection />
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

      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onBack={closeProductDetail} 
          onAddToCart={(p) => { addToCart(p); closeProductDetail(); }} 
        />
      )}

      {!selectedProduct && (
        <footer className="bg-black/80 backdrop-blur-xl border-t border-gray-800 py-12 relative z-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-8">
             <div className="mb-6 md:mb-0">
                <h3 className="text-xl font-bold text-white mb-2 font-tech uppercase">Xeption</h3>
                <div className="flex flex-col items-center md:items-start">
                    <p className="text-gray-400 text-sm flex items-center justify-center md:justify-start">
                    Made <span className="font-pinyon text-3xl text-xeption-gold italic mx-2 relative top-1">by</span> Trigenys Group
                    </p>
                    <button 
                        onClick={() => handleNavigate('admin')} 
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
        onNavigate={handleNavigate}
      />

      {page !== 'admin' && <AiConsultant />}
    </div>
  );
};

export default App;
