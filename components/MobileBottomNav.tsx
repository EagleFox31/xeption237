import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Camera,
  TrendingUp,
  User,
  Package,
  FileText,
  Lock,
  MessageCircle,
  X,
  MapPin,
  ChevronRight,
  ExternalLink,
  Tag,
} from 'lucide-react';

interface MobileBottomNavProps {
  isStaffAuthenticated?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  isStaffAuthenticated = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Verrouiller le défilement quand le menu profil est ouvert
  useEffect(() => {
    if (isAccountMenuOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isAccountMenuOpen]);

  // Fermer le menu compte automatiquement si l'utilisateur change de page
  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [location.pathname]);

  // Masquer sur les pages staff, studio, et détail produit sur mobile (barre d'action dédiée)
  const pathname = location.pathname;
  if (pathname.startsWith('/admin') || pathname.startsWith('/studio') || pathname.startsWith('/product/')) {
    return null;
  }

  // Masquer spécifiquement sur les étapes mobiles qui remplacent la bottom bar (ex: Résultat Smart Troc)
  const [isBottomNavHidden, setIsBottomNavHidden] = useState(false);
  useEffect(() => {
    const updateHidden = () => {
      setIsBottomNavHidden(document.body.classList.contains('hide-mobile-bottom-nav'));
    };
    updateHidden();
    const observer = new MutationObserver(updateHidden);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (isBottomNavHidden) {
    return null;
  }

  const isHome = pathname === '/';
  const isShop = pathname === '/shop' && !location.search.includes('promo=true');
  const isTroc = pathname === '/troc';
  const isMarketplace = pathname.startsWith('/marketplace');
  const isAccountActive =
    pathname.startsWith('/tracking') ||
    pathname === '/bon' ||
    pathname === '/contact' ||
    pathname.startsWith('/admin');

  const handleAccountClick = () => {
    setIsAccountMenuOpen((prev) => !prev);
  };

  return (
    <>
      {/* Menu / Drawer rapide "Mon compte & Services" quand on clique sur le profil (Portal z-[200]) */}
      {isAccountMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col justify-end md:hidden animate-fade-in"
            onClick={() => setIsAccountMenuOpen(false)}
          >
            <div
              className="bg-[#0f0f13] border-t border-white/20 rounded-t-3xl p-5 pb-12 space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <span className="font-tech font-bold text-sm uppercase text-white tracking-wider">
                    Mon Espace &amp; Services
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Services Clients Directs */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/tracking');
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left text-sm text-zinc-200 hover:border-amber-400/40 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-medium text-white text-xs font-tech uppercase tracking-wider">Suivi de commande</div>
                      <div className="text-[11px] text-zinc-400">Vérifier le statut d'une livraison</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/bon');
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left text-sm text-zinc-200 hover:border-amber-400/40 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-medium text-white text-xs font-tech uppercase tracking-wider">Consulter mon bon Troc</div>
                      <div className="text-[11px] text-zinc-400">Retrouver votre offre validée</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/troc', { state: { restart: Date.now(), intent: 'marketplace_only' } });
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left text-sm text-zinc-200 hover:border-amber-400/40 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-medium text-white text-xs font-tech uppercase tracking-wider">Vendre mon téléphone</div>
                      <div className="text-[11px] text-zinc-400">Publier sur la marketplace</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>

                <a
                  href="https://wa.me/237641891031"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-left text-sm text-zinc-200 hover:border-emerald-500/50 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-medium text-emerald-400 text-xs font-tech uppercase tracking-wider">Support WhatsApp direct</div>
                      <div className="text-[11px] text-zinc-400">+237 641 891 031 · Réponse rapide</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400/70" />
                </a>
              </div>

              {/* 2. Rassurance & Zones desservies au Cameroun */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold font-tech uppercase tracking-wider text-amber-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Zones desservies au Cameroun</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  <strong className="text-white">Yaoundé</strong> (Bastos, Omnisports, Biyem-Assi, Mendong, Odza), <strong className="text-white">Douala</strong> (Akwa, Bonapriso, Bonanjo, Bali), Bafoussam, Kribi, Garoua, Bamenda et tout le Cameroun.
                </p>
                <div className="text-[10px] text-zinc-400 pt-1.5 border-t border-white/5 flex items-center justify-between">
                  <span>📍 Retrait : Mfoundi Mall, Yaoundé</span>
                  <span className="text-emerald-400 font-medium">Garantie &amp; SAV</span>
                </div>
              </div>

              {/* 3. Liens utiles & Informations légales */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-tech block mb-1.5">
                  Informations &amp; Garanties
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/about');
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-left text-xs text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center justify-between"
                  >
                    <span>À propos</span>
                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/contact');
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-left text-xs text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center justify-between"
                  >
                    <span>Contact &amp; SAV</span>
                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/mentions-legales');
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-left text-xs text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center justify-between"
                  >
                    <span>Mentions légales</span>
                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/cgv');
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-left text-xs text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center justify-between"
                  >
                    <span>CGV &amp; Garanties</span>
                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/politique-confidentialite');
                    }}
                    className="col-span-2 p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-left text-xs text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center justify-between"
                  >
                    <span>Politique de confidentialité &amp; Cookies</span>
                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                  </button>
                </div>
              </div>

              {/* 4. Réseaux Sociaux */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-center gap-5 py-1">
                  <a href="https://web.facebook.com/xeptioon/" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-amber-400 font-tech uppercase tracking-wider">Facebook</a>
                  <span className="text-zinc-700">·</span>
                  <a href="https://www.instagram.com/xeption_corp/" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-amber-400 font-tech uppercase tracking-wider">Instagram</a>
                  <span className="text-zinc-700">·</span>
                  <a href="https://www.tiktok.com/@xeption237?_r=1&_t=ZM-939Ae3o3r2J" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-amber-400 font-tech uppercase tracking-wider">TikTok</a>
                </div>
              </div>

              {/* 5. Accès Staff & Signature */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/admin');
                  }}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 font-bold uppercase tracking-wider transition-colors"
                >
                  <Lock className="w-3 h-3" />
                  <span>{isStaffAuthenticated ? 'ERP Staff' : 'Accès Staff'}</span>
                </button>
                <span className="text-zinc-600 font-tech">Xeption © 2026</span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Barre de navigation basse (Mobile Only) - Conforme maquette originale */}
      <nav
        aria-label="Navigation mobile principale"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0a0a0c] shadow-[0_-8px_30px_rgba(0,0,0,0.95)] pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
        {/* Ligne de bordure supérieure avec dôme courbé au centre (cradle pour le bouton Troc) */}
        <div className="absolute top-0 left-0 right-0 h-0 pointer-events-none">
          {/* Ligne gauche */}
          <div className="absolute top-0 left-0 right-[calc(50%+46px)] border-t border-white/15" />

          {/* Dôme courbé central qui épouse le bouton */}
          <div className="absolute -top-[16px] left-1/2 -translate-x-1/2 w-[92px] h-[17px] overflow-visible">
            <svg
              viewBox="0 0 92 17"
              className="w-full h-full overflow-visible"
              fill="none"
            >
              {/* Fond noir du dôme */}
              <path
                d="M 0,17 C 20,17 26,0 46,0 C 66,0 72,17 92,17 Z"
                fill="#0a0a0c"
              />
              {/* Ligne de contour fine supérieure */}
              <path
                d="M 0,17 C 20,17 26,0 46,0 C 66,0 72,17 92,17"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          </div>

          {/* Ligne droite */}
          <div className="absolute top-0 left-[calc(50%+46px)] right-0 border-t border-white/15" />
        </div>

        <div className="max-w-md mx-auto px-3 flex items-center justify-between relative h-15 pt-1">
          {/* 1. Accueil */}
          <button
            type="button"
            onClick={() => {
              setIsAccountMenuOpen(false);
              navigate('/');
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
              isHome ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Home
              className={`w-5 h-5 transition-transform active:scale-90 ${
                isHome ? 'fill-current stroke-[2.2]' : 'stroke-[1.8]'
              }`}
            />
            <span
              className={`text-[10px] font-medium tracking-tight mt-1 ${
                isHome ? 'text-amber-400 font-bold' : 'text-zinc-400'
              }`}
            >
              Accueil
            </span>
          </button>

          {/* 2. Catégories (Icône 4 formes géométriques dont 1 diamant conforme maquette) */}
          <button
            type="button"
            onClick={() => {
              setIsAccountMenuOpen(false);
              navigate('/shop');
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
              isShop ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg
              className="w-5 h-5 transition-transform active:scale-90 stroke-[1.8]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14.5" y="3.5" width="6" height="6" rx="1.5" transform="rotate(45 17.5 6.5)" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>
            <span
              className={`text-[10px] font-medium tracking-tight mt-1 ${
                isShop ? 'text-amber-400 font-bold' : 'text-zinc-400'
              }`}
            >
              Catégories
            </span>
          </button>

          {/* 3. TROC (Bouton central or surélevé avec Camera + texte TROC à l'intérieur + halo) */}
          <div className="flex-1 flex flex-col items-center justify-center relative -top-3.5">
            {/* Halo lumineux doré doux en arrière-plan */}
            <div className="absolute -inset-1.5 rounded-full bg-amber-400/35 blur-xl pointer-events-none" />

            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                navigate('/troc', { state: { restart: Date.now() } });
              }}
              aria-label="Estimer et troquer mon téléphone"
              className="relative w-[54px] h-[54px] rounded-full bg-amber-400 hover:bg-amber-300 text-black shadow-[0_4px_25px_rgba(251,191,36,0.6)] active:scale-95 transition-all flex flex-col items-center justify-center border-[3px] border-[#0a0a0c]"
            >
              <Camera className="w-5 h-5 stroke-[2.4] text-black" />
              <span className="text-[8.5px] font-tech font-black uppercase tracking-wider text-black leading-none mt-0.5">
                TROC
              </span>
            </button>
          </div>

          {/* 4. Marketplace */}
          <button
            type="button"
            onClick={() => {
              setIsAccountMenuOpen(false);
              navigate('/marketplace');
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
              isMarketplace ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-5 h-5 transition-transform active:scale-90 stroke-[1.8]" />
            <span
              className={`text-[10px] font-medium tracking-tight mt-1 ${
                isMarketplace ? 'text-amber-400 font-bold' : 'text-zinc-400'
              }`}
            >
              Marketplace
            </span>
          </button>

          {/* 5. Mon compte (Silhouette utilisateur conforme maquette) */}
          <button
            type="button"
            onClick={handleAccountClick}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
              isAccountActive || isAccountMenuOpen
                ? 'text-amber-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-5 h-5 transition-transform active:scale-90 stroke-[1.8]" />
            <span
              className={`text-[10px] font-medium tracking-tight mt-1 ${
                isAccountActive || isAccountMenuOpen
                  ? 'text-amber-400 font-bold'
                  : 'text-zinc-400'
              }`}
            >
              Mon compte
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;

