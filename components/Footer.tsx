import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, MapPin, Store } from 'lucide-react';
import { SHOP_TIKTOK_URL } from '../constants/contact';
import FooterSeoLinks from './content/FooterSeoLinks';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from './icons/SocialIcons';

const SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://web.facebook.com/xeptioon/', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/xeption_corp/', Icon: InstagramIcon },
  { label: 'TikTok', href: SHOP_TIKTOK_URL, Icon: TikTokIcon },
  { label: 'WhatsApp VIP', href: 'https://wa.me/237641891031', Icon: WhatsAppIcon, highlight: true },
] as const;

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="mt-auto bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-white/10 pt-16 pb-12 relative z-10 shrink-0 hidden md:block text-gray-400">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        {/* Grille principale à 12 colonnes, alignée au sommet */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 items-start text-left">
          {/* Colonne 1 : Identité & Boutique physique (span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-white font-tech uppercase tracking-wider">Xeption</h3>
              <p className="text-xs text-gray-400 mt-1 font-tech tracking-wide">Le Ndamba du Digital au Cameroun</p>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Smartphones, ordinateurs & high-tech neufs et reconditionnés certifiés. Vente au comptoir, reprise Smart Troc et livraison express sécurisée.
            </p>

            <div className="pt-1 space-y-2 text-xs">
              <p className="flex items-center gap-2 text-gray-300 font-medium">
                <Store className="w-3.5 h-3.5 text-xeption-gold shrink-0" />
                <span>Boutique Mfoundi Mall, Yaoundé</span>
              </p>
              <p className="text-gray-400 flex items-center">
                Made <span className="font-pinyon text-2xl text-xeption-gold italic mx-2 relative top-0.5">by</span> Trigenys Group
              </p>
            </div>

            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-xeption-gold transition-colors uppercase font-bold tracking-widest pt-2 opacity-60 hover:opacity-100"
            >
              <Lock className="w-3 h-3" /> Accès Staff
            </button>
          </div>

          {/* Colonnes 2 & 3 : Rayons & Conseils SEO (span 5) */}
          <div className="lg:col-span-5">
            <FooterSeoLinks />
          </div>

          {/* Colonne 4 : Zones desservies & Communauté (span 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <p className="font-tech font-bold uppercase tracking-wider text-xs text-white mb-2.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-xeption-gold shrink-0" />
                <span>Zones desservies au Cameroun</span>
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-gray-200 font-medium">Yaoundé</strong> (Bastos, Omnisports, Biyem-Assi, Mendong, Odza...)<br />
                <strong className="text-gray-200 font-medium">Douala</strong> (Akwa, Bonapriso, Bonanjo, Bali...)<br />
                Bafoussam, Kribi, Garoua, Bamenda et expéditions sécurisées dans tout le Cameroun.
              </p>
            </div>

            <div className="pt-1">
              <p className="font-tech font-bold uppercase tracking-wider text-xs text-white mb-3">Rejoindre la communauté</p>
              <div className="flex flex-wrap gap-2.5">
                {SOCIAL_LINKS.map(({ label, href, Icon, highlight }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-colors font-tech uppercase tracking-wider flex items-center gap-2 ${
                      highlight
                        ? 'border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300'
                        : 'border-white/10 bg-white/5 hover:border-xeption-gold/50 hover:text-xeption-gold'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ligne inférieure : Copyright + Mentions légales */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-gray-500">
          <p>© {new Date().getFullYear()} Xeption Network · Tous droits réservés.</p>
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-gray-500">
            <Link to="/about" className="hover:text-xeption-gold transition-colors uppercase tracking-wider font-medium">À propos</Link>
            <span className="text-gray-700">·</span>
            <Link to="/contact" className="hover:text-xeption-gold transition-colors uppercase tracking-wider font-medium">Contact</Link>
            <span className="text-gray-700">·</span>
            <Link to="/mentions-legales" className="hover:text-xeption-gold transition-colors uppercase tracking-wider font-medium">Mentions légales</Link>
            <span className="text-gray-700">·</span>
            <Link to="/cgv" className="hover:text-xeption-gold transition-colors uppercase tracking-wider font-medium">CGV</Link>
            <span className="text-gray-700">·</span>
            <Link to="/politique-confidentialite" className="hover:text-xeption-gold transition-colors uppercase tracking-wider font-medium">Confidentialité</Link>
            <span className="text-gray-700">·</span>
            <Link to="/politique-cookies" className="hover:text-xeption-gold transition-colors uppercase tracking-wider font-medium">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
