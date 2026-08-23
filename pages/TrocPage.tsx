import React, { useEffect, useState } from 'react';
import { PageSEO, JsonLd, breadcrumbJsonLd } from '../utils/seo';
import { 
  ArrowLeft, 
  ArrowRight, 
  Coins, 
  Gamepad2, 
  Laptop, 
  Loader2, 
  Lock, 
  Package, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Smartphone, 
  Sparkles, 
  Tablet, 
  Zap 
} from 'lucide-react';
import { useTradeIn } from '../hooks/useTradeIn';
import { useTrocVisionHealth } from '../hooks/useTrocVisionHealth';
import { TrocStepper } from '../components/troc/TrocStepper';
import { TrocCoachBar } from '../components/troc/TrocCoachBar';
import { ChameleoMascot } from '../components/troc/ChameleoMascot';
import { TrocQuickForm } from '../components/troc/TrocQuickForm';
import { ImeiCertifFlow } from '../components/certif/ImeiCertifFlow';
import { PhotoUploader } from '../components/troc/PhotoUploader';
import { ImeiChecker } from '../components/troc/ImeiChecker';
import { TierSelector } from '../components/troc/TierSelector';
import { TrocPayment } from '../components/troc/TrocPayment';
import { EvaluationResult } from '../components/troc/EvaluationResult';
import { TrocVoucher } from '../components/troc/TrocVoucher';
import { generateTradeInVoucherHTML } from '../utils/tradeInVoucherGenerator';
import { getPaymentStatus } from '../services/trocEvaluationService';
import { resolveTrocCoach } from '../utils/trocCoach';
import type { TradeInRequest } from '../types';
import {
  formatTrocFee,
  TROC_TIER_PRICES,
  TROC_TIER_SELECTOR_ENABLED,
  TROC_TUNNEL_TIER,
} from '../utils/trocPricing';

/** Effet de fond avec des "X" filants dorés */
const ShootingXBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Ligne filante 1 */}
      <div className="absolute top-[-20%] left-[20%] w-[300px] h-[1px] bg-gradient-to-r from-transparent via-xeption-gold/40 to-transparent rotate-[35deg] animate-[shooting_6s_ease-in-out_infinite]" />
      {/* X Filant 1 */}
      <div className="absolute top-[10%] left-[65%] text-xeption-gold/30 font-tech font-bold text-xs select-none animate-[floatX_7s_ease-in-out_infinite]">
        ✕
      </div>
      {/* Ligne filante 2 */}
      <div className="absolute top-[40%] right-[-10%] w-[400px] h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent rotate-[35deg] animate-[shooting_8s_ease-in-out_2s_infinite]" />
      {/* X Filant 2 */}
      <div className="absolute top-[45%] left-[25%] text-xeption-gold/25 font-tech font-bold text-sm select-none animate-[floatX_9s_ease-in-out_3s_infinite]">
        ✕
      </div>
      {/* X Filant 3 */}
      <div className="absolute top-[75%] right-[20%] text-xeption-gold/30 font-tech font-bold text-xs select-none animate-[floatX_6s_ease-in-out_1s_infinite]">
        ✕
      </div>
    </div>
  );
};

/** Message avec Typing interactif et Loupe dorée sur CASH et NOUVEL APPAREIL */
const TypingLoupeScanner: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative text-sm text-gray-300 font-sans leading-relaxed mb-6 bg-white/[0.02] border border-white/5 p-4 rounded-xl backdrop-blur-sm overflow-hidden">
      {/* Faisceau laser scanner doux */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold/30 to-transparent" />

      <p className="flex flex-wrap items-center gap-1.5 leading-relaxed">
        <span>Échange ton ancien téléphone contre du</span>
        
        {/* Mot CASH avec Loupe */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-tech font-bold tracking-wider transition-all duration-500 ${
          activeStep === 1 
            ? 'bg-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.5)] scale-105' 
            : 'bg-xeption-gold/15 text-xeption-gold border border-xeption-gold/30'
        }`}>
          {activeStep === 1 && <Search className="w-3.5 h-3.5 animate-spin text-black" />}
          CASH
        </span>

        <span>ou un</span>

        {/* Mot NOUVEL APPAREIL avec Loupe */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-tech font-bold tracking-wider transition-all duration-500 ${
          activeStep === 2 
            ? 'bg-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.5)] scale-105' 
            : 'bg-xeption-gold/15 text-xeption-gold border border-xeption-gold/30'
        }`}>
          {activeStep === 2 && <Search className="w-3.5 h-3.5 animate-bounce text-black" />}
          NOUVEL APPAREIL
        </span>

        <span>, ou certifie son authenticité officielle en 30 secondes.</span>
      </p>
    </div>
  );
};

// QuickForm : l'IMEI est intégré au 1er écran, pas d'étape IMEI séparée.
const STEP_LABELS_QUICK = ['Appareil', 'Photos', 'Paiement', 'Résultat', 'Bon'];

const STEP_INDEX_QUICK: Record<string, number> = {
  form: 0, photos: 1, imei: 1, payment: 2, evaluating: 3, result: 3, voucher: 4,
};

type DeviceTradeOption = {
  id: 'phone' | 'tablet' | 'laptop' | 'console' | 'other';
  label: string;
  subtitle: string;
  badge: string;
  available: boolean;
  tooltip?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DEVICE_OPTIONS: DeviceTradeOption[] = [
  {
    id: 'phone',
    label: 'Téléphone',
    subtitle: 'Estimation IA active maintenant',
    badge: 'Ouvert',
    available: true,
    icon: Smartphone,
  },
  {
    id: 'tablet',
    label: 'Tablette',
    subtitle: 'Flow dédié en préparation',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "On prépare une vraie cote tablette. Pas du faux automatique bricolé.",
    icon: Tablet,
  },
  {
    id: 'laptop',
    label: 'PC portable / MacBook',
    subtitle: 'Argus en cours de calibrage',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "Les laptops arrivent quand le moteur sera propre : RAM, SSD, batterie, écran, pas juste du blabla.",
    icon: Laptop,
  },
  {
    id: 'console',
    label: 'Console',
    subtitle: 'PlayStation, Xbox, Switch et dérivés',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "Les consoles auront leur propre logique de reprise. On ne va pas les faire passer dans un moteur téléphone.",
    icon: Gamepad2,
  },
  {
    id: 'other',
    label: 'Montre, écouteurs, accessoires',
    subtitle: 'Autres appareils tech hors catégories principales',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "On ouvrira les autres catégories quand la reprise sera sérieuse, pas à la loterie.",
    icon: Package,
  },
];

const DeviceChoiceCard: React.FC<{
  option: DeviceTradeOption;
  onSelect: (id: DeviceTradeOption['id']) => void;
}> = ({ option, onSelect }) => {
  const Icon = option.icon;

  if (option.available) {
    return (
      <button
        type="button"
        onClick={() => onSelect(option.id)}
        className="group relative text-left bg-[#0a0a0c]/60 backdrop-blur-xl border border-white/10 hover:border-xeption-gold hover:shadow-[0_0_35px_rgba(255,215,0,0.2)] hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 p-5 rounded-2xl overflow-hidden flex flex-col justify-between"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-br from-xeption-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 border border-xeption-gold/40 bg-xeption-gold/10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)] group-hover:bg-xeption-gold/20 group-hover:scale-110 transition-all">
              <Icon className="w-6 h-6 text-xeption-gold" />
            </div>
            <span className="text-[10px] font-tech font-bold uppercase tracking-widest px-2 py-0.5 border border-xeption-gold/40 bg-xeption-gold/15 text-xeption-gold rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-xeption-gold animate-ping" />
              {option.badge}
            </span>
          </div>

          <p className="text-white font-tech font-bold uppercase tracking-wider text-base mb-1 group-hover:text-xeption-gold transition-colors">{option.label}</p>
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed">{option.subtitle}</p>
        </div>

        <div className="relative mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-tech text-xeption-gold font-bold uppercase tracking-wider">
          <span>Scanner maintenant</span>
          <span className="group-hover:translate-x-1 transition-transform">➔</span>
        </div>
      </button>
    );
  }

  return (
    <div
      className="group relative bg-[#0a0a0c]/30 backdrop-blur-md border border-white/5 p-5 rounded-2xl opacity-60 cursor-not-allowed overflow-visible flex flex-col justify-between"
      aria-disabled="true"
      tabIndex={0}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 border border-white/10 bg-white/5 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-gray-500" />
          </div>
          <span className="text-[10px] font-tech uppercase tracking-widest px-2 py-0.5 border border-white/10 bg-white/5 text-gray-400 rounded-full">
            🔒 {option.badge}
          </span>
        </div>

        <p className="text-gray-300 font-tech font-bold uppercase tracking-wider text-base mb-1">{option.label}</p>
        <p className="text-[11px] text-gray-500 font-sans leading-relaxed">{option.subtitle}</p>
      </div>

      <div className="pointer-events-none absolute left-3 right-3 top-full mt-3 z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200">
        <div className="bg-black/95 border border-xeption-gold/30 rounded-xl shadow-2xl px-4 py-3 text-[11px] text-gray-200 leading-relaxed backdrop-blur-xl">
          <span className="block text-xeption-gold font-tech uppercase tracking-widest text-[10px] mb-1 font-bold">Bientôt disponible</span>
          {option.tooltip}
        </div>
      </div>
    </div>
  );
};

const TrocPage: React.FC = () => {
  const troc = useTradeIn();
  const visionHealth = useTrocVisionHealth(troc.step === 'photos');
  const [intent, setIntent] = useState<'troc' | 'certif' | null>(null);
  const [selectedDeviceType, setSelectedDeviceType] = useState<'phone' | null>(null);

  useEffect(() => {
    // On verrouille le scroll du body pour créer un effet "App" pleine page
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // ── Retour callback CamPay : vérification serveur ──────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setSelectedDeviceType('phone');
    if (!ref || troc.step !== 'form') return; // uniquement si on revient depuis CamPay

    // Nettoyer l'URL sans recharger la page
    window.history.replaceState({}, '', window.location.pathname);

    const sessionKey = sessionStorage.getItem('troc_session_key') ?? '';
    if (!sessionKey) return;

    getPaymentStatus(sessionKey, ref).then((status) => {
      if (status?.status === 'paid') {
        troc.onCallbackPaid(ref);
      }
    }).catch(() => {/* silencieux — l'utilisateur peut recommencer */});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (troc.step !== 'form' || troc.paymentState !== 'idle' || troc.photos.length > 0 || troc.result) {
      setSelectedDeviceType('phone');
    }
  }, [troc.paymentState, troc.photos.length, troc.result, troc.step]);

  const stepLabels = STEP_LABELS_QUICK;
  const stepIndex  = STEP_INDEX_QUICK[troc.step] ?? 0;
  // IMEI propre + modèle confirmé OU non identifiable (confirmé en boutique) → on laisse passer
  const canAutoEvaluate = troc.imeiStatus === 'valid' &&
    (troc.imeiMatchState === 'match' || troc.imeiMatchState === 'not_verified');
  const voucherRequest: TradeInRequest | null =
    troc.result && troc.savedRequest
      ? {
          id:               troc.savedRequest.id,
          created_at:       new Date().toISOString(),
          customer_name:    troc.form.customerName,
          customer_phone:   troc.form.customerPhone,
          device_brand:     troc.form.deviceBrand,
          device_model:     troc.form.deviceModel,
          photo_urls:       troc.photoUrls,
          imei_status:      troc.imeiStatus,
          imei_blacklist_status: troc.imeiBlacklistStatus,
          imei_assurance_level: troc.imeiAssuranceLevel,
          ai_score:         troc.result.score,
          ai_score_color:   troc.result.scoreColor,
          ai_justification: troc.result.justification,
          trade_in_value:   troc.result.tradeInValue,
          trade_in_grade:   troc.result.tradeInGrade,
          status:           'accepted',
          voucher_reference: troc.savedRequest.voucher_reference,
        }
      : null;

  const printVoucher = () => {
    if (!voucherRequest) return;
    const html = generateTradeInVoucherHTML(voucherRequest);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 450);
  };

  return (
    <div className="h-[calc(100dvh-132px)] flex flex-col overflow-hidden">
      <PageSEO
        title="Smart Troc — Reprise d'Appareils Cameroun | Xeption"
        description="Choisissez le type d'appareil à faire reprendre. Reprise smartphone disponible maintenant, autres catégories en préparation dans l'univers Smart Troc de Xeption."
        path="/troc"
      />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', path: '/' },
        { name: 'Smart Troc' },
      ])} />

      <div className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* Header global supprimé pour gagner de l'espace, intégré dans les cartes */}

        {/* ── Sélection d'intention (Mode Quêtes Interactives) ─────────── */}
        {intent === null && (
          <div className="space-y-6 animate-fade-in-up relative">
            {/* Arrière-plan "X" filants dorés */}
            <ShootingXBackground />

            {/* Header Hero Banner avec Xepti & Typing Scanner */}
            <div className="w-full bg-[#0a0a0c]/70 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)] p-6 sm:p-8 lg:p-10 rounded-2xl relative overflow-hidden group z-10">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent animate-pulse"></div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 max-w-xl">
                  {/* Badge Mode Hub */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-xeption-gold/10 text-xeption-gold text-xs font-bold uppercase tracking-[0.2em] font-tech mb-4 border border-xeption-gold/30 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-xeption-gold animate-ping" />
                    Xeption Smart Troc · Hub de Reprise
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-tech font-bold uppercase text-white tracking-wider mb-3 leading-tight">
                    Choisis ta <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-amber-300">Mission</span>
                  </h2>

                  {/* Typing Scanner avec Loupe sur CASH et NOUVEL APPAREIL */}
                  <TypingLoupeScanner />

                  {/* 3 Pilules de Statut avec Icônes Lucide (Zéro Emoji) */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] font-tech text-gray-200">
                      <Zap className="w-3.5 h-3.5 text-xeption-gold" />
                      <span>Scan IA Express (30s)</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-xeption-gold/10 border border-xeption-gold/30 rounded-lg text-[11px] font-tech text-xeption-gold font-bold">
                      <Coins className="w-3.5 h-3.5 text-xeption-gold" />
                      <span>Bonus Combo +18%</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-[11px] font-tech text-green-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                      <span>Anti-Vol CAMCIS</span>
                    </div>
                  </div>
                </div>

                {/* Mascotte Xepti Dansante */}
                <div className="shrink-0 flex items-center justify-center relative">
                  <div className="absolute w-40 h-40 bg-xeption-gold/15 rounded-full blur-3xl pointer-events-none" />
                  <ChameleoMascot 
                    size="md"
                    state="idle"
                    message="Prêt pour l'estimation ? Choisis ta mission ! ✨"
                  />
                </div>
              </div>
            </div>

            {/* 2 Cartes de Choix Interactives & Harmonieuses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10 relative">
              {/* CARTE 1 : Troquer mon appareil */}
              <button 
                type="button" 
                onClick={() => setIntent('troc')}
                className="group relative text-left bg-[#0a0a0c]/60 backdrop-blur-xl border border-white/10 hover:border-xeption-gold transition-all duration-300 p-6 sm:p-7 rounded-2xl overflow-hidden hover:shadow-[0_0_40px_rgba(255,215,0,0.2)] hover:-translate-y-1"
              >
                {/* Ligne Laser Dorée au survol */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-gradient-to-br from-xeption-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                  <div>
                    {/* En-tête : Icône + Titre à gauche, Prix à droite */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 border border-xeption-gold/40 bg-xeption-gold/10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.2)] shrink-0 group-hover:scale-110 group-hover:bg-xeption-gold/20 transition-all">
                          <RefreshCw className="w-6 h-6 text-xeption-gold group-hover:rotate-180 transition-transform duration-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="w-3 h-3 text-xeption-gold" />
                            <span className="text-[10px] font-tech font-bold uppercase tracking-widest text-xeption-gold">Option 1 · Reprise Directe</span>
                          </div>
                          <h3 className="text-white font-tech font-bold uppercase tracking-wider text-lg sm:text-xl group-hover:text-xeption-gold transition-colors leading-tight">
                            Troquer mon appareil
                          </h3>
                        </div>
                      </div>

                      {/* Prix 100 FCFA Mis en Exergue */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] font-tech uppercase tracking-widest text-gray-400 mb-0.5">Frais de service</span>
                        <div className="inline-flex items-baseline gap-1 px-3 py-1 bg-xeption-gold/15 border border-xeption-gold/40 rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.2)] group-hover:scale-105 group-hover:bg-xeption-gold/25 transition-all">
                          <span className="text-xl font-tech font-extrabold text-xeption-gold leading-none">100</span>
                          <span className="text-[10px] font-tech font-bold text-xeption-gold uppercase">FCFA</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 font-sans leading-relaxed">
                      Estimation IA instantanée de ton smartphone. Repars avec du cash direct ou un bon d'achat avec <strong className="text-white font-semibold">bonus combo +18%</strong>.
                    </p>
                  </div>

                  {/* Bouton Action */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-tech font-bold uppercase tracking-widest text-xeption-gold flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                      Lancer la reprise
                      <ArrowRight className="w-4 h-4 text-xeption-gold" />
                    </span>
                    <span className="text-[11px] font-tech text-gray-400 group-hover:text-white transition-colors">
                      Estimation en 1 min
                    </span>
                  </div>
                </div>
              </button>

              {/* CARTE 2 : Certifier mon appareil */}
              <button 
                type="button" 
                onClick={() => setIntent('certif')}
                className="group relative text-left bg-[#0a0a0c]/60 backdrop-blur-xl border border-white/10 hover:border-green-400 transition-all duration-300 p-6 sm:p-7 rounded-2xl overflow-hidden hover:shadow-[0_0_40px_rgba(34,197,94,0.2)] hover:-translate-y-1"
              >
                {/* Ligne Laser Verte au survol */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                  <div>
                    {/* En-tête : Icône + Titre à gauche, Prix à droite */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 border border-green-500/40 bg-green-500/10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)] shrink-0 group-hover:scale-110 group-hover:bg-green-500/20 transition-all">
                          <Smartphone className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <ShieldCheck className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] font-tech font-bold uppercase tracking-widest text-green-400">Option 2 · Passeport Officiel</span>
                          </div>
                          <h3 className="text-white font-tech font-bold uppercase tracking-wider text-lg sm:text-xl group-hover:text-green-400 transition-colors leading-tight">
                            Certifier mon appareil
                          </h3>
                        </div>
                      </div>

                      {/* Prix 300 FCFA Mis en Exergue */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] font-tech uppercase tracking-widest text-gray-400 mb-0.5">Frais d'audit</span>
                        <div className="inline-flex items-baseline gap-1 px-3 py-1 bg-green-500/15 border border-green-500/40 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.2)] group-hover:scale-105 group-hover:bg-green-500/25 transition-all">
                          <span className="text-xl font-tech font-extrabold text-green-400 leading-none">300</span>
                          <span className="text-[10px] font-tech font-bold text-green-400 uppercase">FCFA</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 font-sans leading-relaxed">
                      Vérification IMEI anti-vol en temps réel et délivrance d'un <strong className="text-white font-semibold">certificat officiel Xeption</strong> pour rassurer tout acheteur.
                    </p>
                  </div>

                  {/* Bouton Action */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-tech font-bold uppercase tracking-widest text-green-400 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                      Générer le certificat
                      <ArrowRight className="w-4 h-4 text-green-400" />
                    </span>
                    <span className="text-[11px] font-tech text-gray-400 group-hover:text-white transition-colors">
                      Audit en 30 secondes
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Flow Xeption Certif ────────────────────────────────────────── */}
        {intent === 'certif' && (
          <div className="max-w-3xl mx-auto w-full">
            <div className="mb-4 flex justify-start">
              <button type="button" onClick={() => setIntent(null)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 hover:border-xeption-gold/30 text-gray-300 hover:text-white transition-all text-[10px] font-tech uppercase tracking-widest">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </button>
            </div>
            <div className="bg-[#0a0a0c]/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold/30 to-transparent"></div>
              <ImeiCertifFlow />
            </div>
          </div>
        )}

        {/* ── Flow Smart Troc : Sélection de Device ────────────────────── */}
        {intent === 'troc' && !selectedDeviceType && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="w-full bg-[#0a0a0c]/60 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)] p-6 sm:p-8 lg:p-10 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent animate-pulse"></div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 max-w-xl">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 border border-xeption-gold/30 bg-xeption-gold/10 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)]">
                      <RefreshCw className="w-5 h-5 text-xeption-gold" />
                    </div>
                    <div>
                      <h1 className="text-xl font-tech font-bold uppercase text-white tracking-wider leading-tight">Smart Troc</h1>
                      <p className="text-[10px] font-tech uppercase tracking-widest text-gray-400">Reprise cadrée, estimation propre</p>
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-tech font-bold uppercase text-white tracking-wider mb-3">
                    Tu veux troquer <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-amber-300">quoi</span> ?
                  </h2>
                  <p className="text-sm text-gray-300 font-sans leading-relaxed">
                    On ne balance pas des estimations au hasard. Chez Xeption, chaque catégorie ouvre quand
                    son moteur est vraiment prêt. Là, le Smart Troc tourne déjà sur les téléphones.
                  </p>
                </div>

                {/* Mascotte Xepti en pose Pointing & Regard Interactif vers la souris */}
                <div className="shrink-0 flex items-center justify-center relative">
                  <div className="absolute w-36 h-36 bg-xeption-gold/15 rounded-full blur-3xl pointer-events-none" />
                  <ChameleoMascot 
                    size="md"
                    pose="pointing"
                    state="idle"
                    message="Sélectionne ton appareil juste en bas ! 👇✨"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-5 items-stretch">
              {DEVICE_OPTIONS.map((option) => (
                <DeviceChoiceCard key={option.id} option={option}
                  onSelect={(id) => { if (id === 'phone') setSelectedDeviceType('phone'); }} />
              ))}
            </div>
            <div className="mb-4 flex justify-start">
              <button type="button" onClick={() => setIntent(null)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 hover:border-xeption-gold/30 text-gray-300 hover:text-white transition-all text-[10px] font-tech uppercase tracking-widest">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </button>
            </div>
          </div>
        )}

        {intent === 'troc' && selectedDeviceType === 'phone' && (
          <div className="max-w-3xl mx-auto w-full">
        {troc.step === 'form' && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedDeviceType(null)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 hover:border-xeption-gold/30 text-gray-300 hover:text-white transition-all text-[10px] font-tech uppercase tracking-widest"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Changer d'appareil
            </button>
          </div>
        )}

        {/* Stepper */}
        {troc.step !== 'voucher' && (
          <div className="bg-[#0a0a0c]/40 border border-white/10 px-3 mb-4 backdrop-blur-2xl rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.4)]">
            <TrocStepper
              currentStep={stepIndex}
              totalSteps={stepLabels.length}
              labels={stepLabels}
            />
          </div>
        )}

        <TrocCoachBar
          view={resolveTrocCoach({
            step: troc.step,
            imeiStatus: troc.imeiStatus,
            imeiBlacklistStatus: troc.imeiBlacklistStatus,
            isCheckingImei: troc.isCheckingImei,
            photoCount: troc.photos.length,
            paymentState: troc.paymentState,
            hasError: Boolean(troc.error),
          })}
        />

        {/* Error banner */}
        {troc.error && (
          <div className="mb-4 px-4 py-3 bg-xeption-red/10 border border-xeption-red/30 text-white text-sm font-sans rounded-sm">
            {troc.error}
          </div>
        )}

        {/* Main card */}
        <div className="bg-[#0a0a0c]/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)] rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold/30 to-transparent"></div>

          {/* En-tête intégré */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 border border-xeption-gold/30 bg-xeption-gold/10 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)]">
              <RefreshCw className="w-5 h-5 text-xeption-gold" />
            </div>
            <div>
              <h1 className="text-xl font-tech font-bold uppercase text-white tracking-wider leading-tight">Smart Troc</h1>
              <p className="text-[10px] font-tech uppercase tracking-widest text-gray-400">Reprise cadrée, estimation propre</p>
            </div>
          </div>

          {/* Conteneur animé pour les étapes */}
          <div key={troc.step} className="animate-fade-in-up">
            {troc.step === 'form' && (
              <TrocQuickForm
                form={troc.form}
                onChange={troc.updateForm}
                onNext={troc.goToPhotosQuick}
                imeiStatus={troc.imeiStatus}
                imeiBlacklistStatus={troc.imeiBlacklistStatus}
                imeiDeviceInfo={troc.imeiDeviceInfo}
                isCheckingImei={troc.isCheckingImei}
                onCheckImei={troc.doCheckImei}
              />
            )}

            {troc.step === 'imei' && (
              <div>
                <ImeiChecker
                  imei={troc.form.imei}
                  onChange={imei => troc.updateForm({ imei })}
                  imeiStatus={troc.imeiStatus}
                  blacklistStatus={troc.imeiBlacklistStatus}
                  imeiMatchState={troc.imeiMatchState}
                  imeiDeviceInfo={troc.imeiDeviceInfo}
                  imeiDeviceSource={troc.imeiDeviceSource}
                  imeiEvidenceCount={troc.imeiEvidenceCount}
                  expectedBrand={troc.form.deviceBrand}
                  expectedModel={troc.form.deviceModel}
                  onCheck={troc.doCheckImei}
                  isChecking={troc.isCheckingImei}
                  onSkip={troc.skipImei}
                />
                {troc.imeiBlacklistStatus !== 'blacklisted' && (
                  <div className="px-6 pb-6">
                    {!canAutoEvaluate && (
                      <p className="mb-3 text-xs text-yellow-300 font-sans">
                        La vérification IMEI est requise avant de continuer.
                      </p>
                    )}
                    <button
                      onClick={troc.goToPhotos}
                      disabled={!canAutoEvaluate}
                      className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Continuer — Ajouter mes photos
                    </button>
                  </div>
                )}
              </div>
            )}

            {troc.step === 'photos' && (
              <PhotoUploader
                photos={troc.photos}
                onPhotosChange={troc.updatePhotos}
                onNext={troc.continueFromPhotos}
                isUploading={troc.isUploading}
                isCheckingPhotos={troc.isCheckingPhotos}
                issueIndices={troc.photoIssueIndices}
                visionReady={visionHealth.report?.ready ?? true}
                visionLoading={visionHealth.loading}
                visionSetupHint={visionHealth.setupHint}
              />
            )}

            {troc.step === 'payment' && (
              <div className="p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-white font-tech font-bold uppercase tracking-wider text-sm mb-1">Frais d&apos;estimation</h2>
                  <p className="text-neutral-500 text-xs font-sans">Paiement requis pour accéder au résultat</p>
                </div>
                {TROC_TIER_SELECTOR_ENABLED &&
                  (troc.paymentState === 'idle' ||
                    troc.paymentState === 'initiating' ||
                    troc.paymentState === 'failed' ||
                    troc.paymentState === 'expired' ||
                    troc.paymentState === 'timeout') && (
                    <TierSelector
                      value={troc.selectedTier}
                      onChange={troc.setSelectedTier}
                      disabled={troc.paymentState === 'initiating'}
                    />
                  )}
                <TrocPayment
                  selectedTier={TROC_TUNNEL_TIER}
                  paymentAmount={troc.paymentAmount}
                  initialPhone={troc.form.customerPhone}
                  paymentState={troc.paymentState}
                  error={troc.error}
                  onInitiate={troc.initiatePayment}
                  onRetry={troc.retryPayment}
                />
              </div>
            )}

            {troc.step === 'evaluating' && (
              <div className="flex flex-col items-center justify-center p-16 gap-5">
                <div className="w-16 h-16 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                  <Loader2 className="w-7 h-7 text-xeption-gold animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-tech font-bold uppercase tracking-wider text-white">Évaluation en cours</p>
                  <p className="text-xs text-gray-500 mt-1 font-sans">Contrôle IA des photos puis estimation</p>
                </div>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-xeption-gold rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {troc.step === 'result' && troc.result && (
              <EvaluationResult
                result={troc.result}
                deviceLabel={`${troc.form.deviceBrand} ${troc.form.deviceModel}`}
                deviceBrand={troc.form.deviceBrand}
                deviceModel={troc.form.deviceModel}
                deviceForm={troc.form}
                serviceTier={TROC_TUNNEL_TIER}
                imeiAssuranceLevel={troc.imeiAssuranceLevel}
                onAcceptOffer={troc.acceptOffer}
                onRefuse={troc.refuse}
                isSubmitting={troc.isSubmitting}
              />
            )}

            {troc.step === 'voucher' && voucherRequest && (
              <TrocVoucher
                request={voucherRequest}
                onPrint={printVoucher}
                onNewEvaluation={troc.reset}
              />
            )}
          </div>
        </div>

        {/* "Comment ça marche" — uniquement sur le formulaire */}
        {troc.step === 'form' && (
          <div className="mt-10">
            <p className="text-[10px] font-tech uppercase tracking-widest text-gray-200 mb-4 text-center">Comment ça marche</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { num: '01', text: 'Décris ton appareil et vérifie ton IMEI' },
                { num: '02', text: 'Contrôle IMEI puis photos nettes de l’appareil' },
                { num: '03', text: `Frais ${formatTrocFee(TROC_TIER_PRICES.express, { short: true })} puis rapport d'expertise` },
                { num: '04', text: 'Valide ton offre et récupère ton bon en boutique' },
              ].map(({ num, text }) => (
                <div key={num} className="bg-black/40 border border-white/10 p-4 hover:border-xeption-gold/20 transition-all">
                  <span className="text-lg font-tech font-bold text-xeption-gold/60 block mb-2">{num}</span>
                  <p className="text-gray-200 text-[11px] font-sans leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Styles keyframes pour les X filants */}
      <style>{`
        @keyframes shooting {
          0% {
            transform: translateX(-100px) translateY(-50px) rotate(35deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          30% {
            transform: translateX(400px) translateY(200px) rotate(35deg);
            opacity: 0;
          }
          100% {
            transform: translateX(400px) translateY(200px) rotate(35deg);
            opacity: 0;
          }
        }
        @keyframes floatX {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-12px) rotate(15deg);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default TrocPage;
