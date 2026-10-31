import React, { Suspense, lazy, useState, useEffect, useRef, useMemo } from 'react';
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
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { Toaster } from 'sonner';
import { resolveSuperAdminAccess } from './utils/superAdmin';
import { ErrorBoundary } from './components/ErrorBoundary';
import { notifyError } from './utils/notify';
import { trackAddToCart } from './utils/analytics';
import { getProductSlug } from './utils/slug';
import { filterStorefrontProducts } from './utils/productVisibility';
import Footer from './components/Footer';
import { attachBrandNames, BrandRef } from './utils/productBrand';
import MobileBottomNav from './components/MobileBottomNav';
// Pages critiques (landing + commerce) : eager pour éviter un fallback au premier paint.
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';

// Pages secondaires : lazy pour alléger le main bundle (voir docs/engineering/PERF_AUDIT_TROC.md).
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const TrocPage = lazy(() => import('./pages/TrocPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const TrocVoucherPage = lazy(() => import('./pages/TrocVoucherPage'));
const SavPage = lazy(() => import('./pages/SavPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const GuidesIndexPage = lazy(() => import('./pages/GuidesIndexPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const MentionsLegalesPage = lazy(() => import('./pages/MentionsLegalesPage'));
const PolitiqueConfidentialitePage = lazy(() => import('./pages/PolitiqueConfidentialitePage'));
const PolitiqueCookiesPage = lazy(() => import('./pages/PolitiqueCookiesPage'));
const CGVPage = lazy(() => import('./pages/CGVPage'));
const CGVSmartTrocPage = lazy(() => import('./pages/CGVSmartTrocPage'));
const VerifyCertificatePage = lazy(() => import('./pages/VerifyCertificatePage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const MarketplaceBrowsePage = lazy(() => import('./pages/MarketplaceBrowsePage'));

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
  const storefrontProducts = useMemo(() => filterStorefrontProducts(products), [products]);
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
  const isHomePage = location.pathname === '/';
  const isImageOnlyBackgroundPage = isImageOnlyBackgroundRoute(location.pathname);
  const isLightBackgroundPage = isLightBackgroundRoute(location.pathname);
  const { isSlow: isSlowConnection, isVideoAllowed } = useBandwidthDetector();

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
        const [{ data: productData, error: productError }, { data: brandData, error: brandError }] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('brands').select('id,name,slug'),
        ]);
        if (productError) throw productError;
        if (brandError) console.warn('[catalogue] marques indisponibles, noms de marque non résolus', brandError);
        const brandRefs = (brandData || []) as BrandRef[];

        let formattedProducts: Product[] = [];
        if (productData) {
          formattedProducts = productData
            .filter((p: any) => !p.rejected_at)
            .map((p: any) => ({
            ...p,
            oldPrice: p.old_price || p.oldPrice || null,
            isPromo: p.is_promo || p.isPromo || false,
            warrantyMonths: p.warranty_months || p.warrantyMonths || 0,
            releaseYear: p.release_year ?? p.releaseYear ?? undefined,
            isFeatured: p.is_featured || p.isFeatured || false,
            isPublished: p.is_published ?? true,
            brand: p.brand || null,
            productRange: p.product_range || p.productRange || null
          }));
          setProducts(attachBrandNames(formattedProducts, brandRefs));
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

  // Haut de page sur nouvelle navigation, position restaurée sur retour arrière
  useScrollRestoration();

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
    trackAddToCart({
      item_id: product.id,
      item_name: product.name,
      item_brand: (product as any).brand ?? undefined,
      item_category: product.category ?? undefined,
      price: product.price,
      quantity: 1,
    });
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
    isAdminPage || isStudioPage || isImageOnlyBackgroundPage || isLightBackgroundPage || !isVideoAllowed;
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
        <div className={isProductPage ? 'hidden md:block' : 'block'}>
          <Header
            cartCount={cartCount}
            onOpenCart={() => setIsCartOpen(true)}
            products={storefrontProducts}
            onProductSelect={(p) => navigate(`/product/${getProductSlug(p)}`)}
          />
        </div>
      )}

      <ErrorBoundary>
      <main
        className={`relative z-10 flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-clip box-border ${
          isStaffPortal
            ? 'pt-0 pb-0'
            : isProductPage
              ? 'pt-0 md:pt-[132px] pb-0 md:pb-6'
              : `pt-[132px] ${isHomePage ? 'pb-8 md:pb-20' : 'pb-24 md:pb-20'}`
        }`}
      >
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={
            <HomePage
              products={storefrontProducts}
              packs={packs}
              onAddToCart={addToCart}
              onAddPackToCart={addPackToCart}
              cartCount={cartCount}
              onOpenCart={() => setIsCartOpen(true)}
            />
          } />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/shop" element={
            <ShopPage
              products={storefrontProducts}
              onAddToCart={addToCart}
            />
          } />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/product/:slug" element={
            <ProductPage
              products={storefrontProducts}
              onAddToCart={addToCart}
              cartCount={cartCount}
              onOpenCart={() => setIsCartOpen(true)}
            />
          } />
          <Route path="/troc" element={
            <TrocPage
              products={storefrontProducts}
              onAddToCart={addToCart}
            />
          } />
          <Route path="/marketplace" element={<MarketplaceBrowsePage />} />
          <Route path="/marketplace/lister" element={<MarketplacePage />} />
          <Route path="/tracking/*" element={<TrackingPage />} />
          <Route path="/bon" element={<TrocVoucherPage />} />
          <Route path="/sav" element={<SavPage />} />
          <Route path="/categorie/:slug" element={<LandingPage products={storefrontProducts} onAddToCart={addToCart} />} />
          <Route path="/guides" element={<GuidesIndexPage products={storefrontProducts} />} />
          <Route path="/guides/:slug" element={<GuidePage products={storefrontProducts} onAddToCart={addToCart} />} />
          <Route path="/aide" element={<HelpPage products={storefrontProducts} />} />
          <Route path="/aide/:slug" element={<HelpPage products={storefrontProducts} />} />
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
        </Suspense>
      </main>
      </ErrorBoundary>

      {!isProductPage && !isStaffPortal && !isTrocPage && <Footer />}

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

      {!isStaffPortal && !isCartOpen && (
        <ErrorBoundary fallback={null}>
          <MobileBottomNav isStaffAuthenticated={isStaffAuthenticated} />
        </ErrorBoundary>
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
