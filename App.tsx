import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import { Product, CartItem, Pack } from './types';
import { supabase } from './services/supabaseClient';
import SiteBackground from './components/SiteBackground';
import {
  isLightBackgroundRoute,
  isImageOnlyBackgroundRoute,
  SITE_BACKGROUND_IMAGES,
  SITE_BACKGROUND_LIGHT_IMAGES,
} from './constants/backgroundImages';
import { useBandwidthDetector } from './hooks/useBandwidthDetector';
import { Lock, MapPin } from 'lucide-react';
import { Toaster } from 'sonner';
import { resolveSuperAdminAccess } from './utils/superAdmin';
import { ErrorBoundary } from './components/ErrorBoundary';
import { notifyError } from './utils/notify';
import { getProductSlug } from './utils/slug';
//Newlmlmpmmlm
// Pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ShopPage from './pages/ShopPage';
import ContactPage from './pages/ContactPage';
import TrocPage from './pages/TrocPage';
import TrackingPage from './pages/TrackingPage';
import TrocVoucherPage from './pages/TrocVoucherPage';
import SavPage from './pages/SavPage';
import ProductPage from './pages/ProductPage';
import MentionsLegalesPage from './pages/MentionsLegalesPage';
import PolitiqueConfidentialitePage from './pages/PolitiqueConfidentialitePage';
import PolitiqueCookiesPage from './pages/PolitiqueCookiesPage';
import CGVPage from './pages/CGVPage';
import CGVSmartTrocPage from './pages/CGVSmartTrocPage';
import VerifyCertificatePage from './pages/VerifyCertificatePage';
import FeedbackPage from './pages/FeedbackPage';

const Checkout = lazy(() => import('./components/Checkout'));
const AiConsultant = lazy(() => import('./components/AiConsultant'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const StudioPage = lazy(() => import('./pages/StudioPage'));

const PageFallback: React.FC = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-xeption-gold border-t-transparent rounded-full animate-spin" />
  </div>
);

const OverlayFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-xeption-gold border-t-transparent rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | undefined>();
  const [shouldRenderAiConsultant, setShouldRenderAiConsultant] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prerenderNotified = useRef(false);
  const isPrerender =
    typeof window !== 'undefined' &&
    (window as any).__PRERENDER__ === true;

  const location = useLocation();
  const navigate = useNavigate();

  // Helper to determine if we are on a product detail page (to hide footer/adjust layout)
  const isProductPage = location.pathname.startsWith('/product/');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isStudioPage = location.pathname.startsWith('/studio');
  const isStaffPortal = isAdminPage || isStudioPage;
  const isTrocPage = location.pathname === '/troc';
  const isImageOnlyBackgroundPage = isImageOnlyBackgroundRoute(location.pathname);
  const isLightBackgroundPage = isLightBackgroundRoute(location.pathname);
  const { isSlow: isSlowConnection } = useBandwidthDetector();

  useEffect(() => {
    let isMounted = true;
    const isRecoveryFlow = () => {
      if (typeof window === 'undefined') return false;
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      return searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
    };

    const syncAuth = async (session: any) => {
      if (!isMounted) return;
      if (isRecoveryFlow()) {
        setIsStaffAuthenticated(false);
        setIsSuperAdmin(false);
        setAuthEmail(undefined);
        return;
      }
      if (!session?.user?.email) {
        setIsStaffAuthenticated(false);
        setIsSuperAdmin(false);
        setAuthEmail(undefined);
        return;
      }

      const email = session.user.email;

      const { data, error } = await supabase
        .from('staff')
        .select('id, role')
        .eq('email', email)
        .maybeSingle();

      if (!isMounted) return;
      setAuthEmail(email);
      setIsStaffAuthenticated(!error && !!data);
      setIsSuperAdmin(await resolveSuperAdminAccess(email));
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncAuth(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncAuth(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const notifyPrerenderReady = () => {
        if (prerenderNotified.current) return;
        if (typeof window !== 'undefined') {
          (window as any).__PRERENDER_READY__ = true;
        }
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new Event('prerender-ready'));
          prerenderNotified.current = true;
        }
      };
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
            releaseYear: p.release_year ?? p.releaseYear ?? undefined,
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
        notifyError('Impossible de charger les produits', 'Vérifiez votre connexion et réessayez.');
        console.error('[App] fetch_failed', error);
      } finally {
        notifyPrerenderReady();
      }
    };

    fetchData();

    if (isPrerender) return;

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
      if (isAdminPage || isStudioPage || isImageOnlyBackgroundPage || isLightBackgroundPage || isSlowConnection) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log("Video auto-play prevented:", e));
      }
    }
  }, [isAdminPage, isStudioPage, isImageOnlyBackgroundPage, isLightBackgroundPage, isSlowConnection]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (isAdminPage || isStudioPage || isPrerender) {
      setShouldRenderAiConsultant(false);
      return;
    }

    const onIdle = () => setShouldRenderAiConsultant(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(onIdle, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(onIdle, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [isAdminPage, isStudioPage, isPrerender]);

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

  const bgVideoUrl =
    'https://res.cloudinary.com/dli0kdkg9/video/upload/v1768438828/xption7_zrgro4.mp4';
  const isBackgroundVideoPaused =
    isAdminPage || isStudioPage || isImageOnlyBackgroundPage || isLightBackgroundPage || isSlowConnection;
  const backgroundImagePool = isLightBackgroundPage
    ? SITE_BACKGROUND_LIGHT_IMAGES
    : SITE_BACKGROUND_IMAGES;

  return (
    <div className="min-h-screen flex flex-col text-white font-sans selection:bg-xeption-gold selection:text-black relative overflow-x-clip">

      <SiteBackground
        videoRef={videoRef}
        videoUrl={bgVideoUrl}
        isVideoPaused={isBackgroundVideoPaused}
        imagePool={backgroundImagePool}
        variant={isLightBackgroundPage ? 'light' : 'dark'}
      />

      {!isStaffPortal && (
        <Header
          cartCount={cartCount}
          onOpenCart={() => setIsCartOpen(true)}
          products={products}
          onProductSelect={(p) => navigate(`/product/${getProductSlug(p)}`)}
        />
      )}

      <ErrorBoundary>
      <main
        className={`relative z-10 flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-clip box-border ${
          isStaffPortal
            ? 'pt-0 pb-0'
            : `pt-[132px] ${isProductPage ? 'pb-24 md:pb-6' : 'pb-20'}`
        }`}
      >
        <Routes>
          <Route path="/" element={
            <HomePage
              products={products}
              packs={packs}
              onAddToCart={addToCart}
              onAddPackToCart={addPackToCart}
            />
          } />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/shop" element={
            <ShopPage
              products={products}
              onAddToCart={addToCart}
            />
          } />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/product/:slug" element={
            <ProductPage
              products={products}
              onAddToCart={addToCart}
            />
          } />
          <Route path="/troc" element={<TrocPage />} />
          <Route path="/tracking/*" element={<TrackingPage />} />
          <Route path="/bon" element={<TrocVoucherPage />} />
          <Route path="/sav" element={<SavPage />} />
          <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
          <Route path="/politique-confidentialite" element={<PolitiqueConfidentialitePage />} />
          <Route path="/politique-cookies" element={<PolitiqueCookiesPage />} />
          <Route path="/cgv" element={<CGVPage />} />
          <Route path="/cgv-smart-troc" element={<CGVSmartTrocPage />} />
          <Route path="/verify/:token" element={<VerifyCertificatePage />} />
          <Route path="/avis/:token" element={<FeedbackPage />} />
          <Route path="/admin/*" element={
            <Suspense fallback={<PageFallback />}>
              <AdminPage
                isAuthenticated={isStaffAuthenticated}
                setIsAuthenticated={setIsStaffAuthenticated}
                products={products}
                onUpdateProducts={setProducts}
              />
            </Suspense>
          } />
          <Route path="/studio/*" element={
            <Suspense fallback={<PageFallback />}>
              <StudioPage
                isSuperAdmin={isSuperAdmin}
                setIsSuperAdmin={setIsSuperAdmin}
                products={products}
                onUpdateProducts={setProducts}
                userEmail={authEmail}
              />
            </Suspense>
          } />
        </Routes>
      </main>
      </ErrorBoundary>

      {!isProductPage && !isStaffPortal && !isTrocPage && (
        <footer className="mt-auto bg-black/80 backdrop-blur-xl border-t border-gray-800 py-12 relative z-10 shrink-0">
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

            <div className="flex flex-col items-center md:items-end gap-4">
              <div className="flex space-x-6 flex-wrap justify-center gap-y-4">
                <a href="https://web.facebook.com/xeptioon/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">Facebook</a>
                <a href="https://www.instagram.com/xeption_corp/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">Instagram</a>
                <a href="https://www.tiktok.com/@xeption237?_r=1&_t=ZM-939Ae3o3r2J" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">TikTok</a>
                <a href="https://wa.me/237641891031" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-xeption-gold transition-colors font-tech uppercase tracking-wider">WhatsApp</a>
              </div>
              <div className="flex gap-4 text-[11px] text-gray-600">
                <button onClick={() => navigate('/about')} className="hover:text-xeption-gold transition-colors uppercase tracking-widest font-bold">À propos</button>
                <span className="text-gray-700">·</span>
                <button onClick={() => navigate('/contact')} className="hover:text-xeption-gold transition-colors uppercase tracking-widest font-bold">Contact</button>
                <span className="text-gray-700">·</span>
                <button onClick={() => navigate('/mentions-legales')} className="hover:text-xeption-gold transition-colors uppercase tracking-widest font-bold">Mentions légales</button>
                <span className="text-gray-700">·</span>
                <button onClick={() => navigate('/cgv')} className="hover:text-xeption-gold transition-colors uppercase tracking-widest font-bold">CGV</button>
                <span className="text-gray-700">·</span>
                <button onClick={() => navigate('/politique-confidentialite')} className="hover:text-xeption-gold transition-colors uppercase tracking-widest font-bold">Confidentialité</button>
                <span className="text-gray-700">·</span>
                <button onClick={() => navigate('/politique-cookies')} className="hover:text-xeption-gold transition-colors uppercase tracking-widest font-bold">Cookies</button>
              </div>
            </div>
          </div>
        </footer>
      )}

      {isCartOpen && (
        <Suspense fallback={<OverlayFallback />}>
          <Checkout
            cart={cart}
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onUpdateQuantity={updateQuantity}
            onNavigate={(page) => navigate(page === 'home' ? '/' : '/' + page)}
          />
        </Suspense>
      )}

      {!isStaffPortal && shouldRenderAiConsultant && (
        <Suspense fallback={null}>
          <AiConsultant />
        </Suspense>
      )}

      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(9,9,11,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#F3F4F6',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  );
};

export default App;
