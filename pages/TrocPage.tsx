import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageSEO, JsonLd, breadcrumbJsonLd } from '../utils/seo';
import { 
  ArrowLeft, 
  ArrowRight, 
  Camera,
  CheckCircle2,
  Coins, 
  FileText,
  Gamepad2, 
  Gift,
  Headphones,
  Laptop, 
  Loader2, 
  Lock, 
  MapPin,
  Package, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Smartphone, 
  Sparkles, 
  Tablet, 
  Truck,
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
import MobileTrocView from '../components/mobile/MobileTrocView';
import MobileTrocStep1 from '../components/mobile/MobileTrocStep1';
import MobileTrocStep2 from '../components/mobile/MobileTrocStep2';
import MobileTrocStep3 from '../components/mobile/MobileTrocStep3';
import MobileTrocStepPayment from '../components/mobile/MobileTrocStepPayment';
import MobileTrocResult from '../components/mobile/MobileTrocResult';
import MobileTrocVoucher from '../components/mobile/MobileTrocVoucher';
import MobileVenteVoucher from '../components/mobile/MobileVenteVoucher';
import MobileMarketplacePass from '../components/mobile/MobileMarketplacePass';
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
import type { TrocCoachView } from '../utils/trocCoach';

const TROC_HOW_IT_WORKS = [
  { num: '01', text: 'Décris ton appareil et vérifie ton IMEI' },
  { num: '02', text: 'Contrôle IMEI puis photos nettes de l’appareil' },
  { num: '03', text: `Frais ${formatTrocFee(TROC_TIER_PRICES.express, { short: true })} puis rapport d'expertise` },
  { num: '04', text: 'Valide ton offre et récupère ton bon en boutique' },
] as const;

const howItWorksStepIndex = (step: string): number => {
  if (step === 'form' || step === 'imei') return 0;
  if (step === 'photos') return 1;
  if (step === 'payment') return 2;
  if (step === 'evaluating' || step === 'result') return 3;
  return 0;
};

const TrocFlowSidebar: React.FC<{ coachView: TrocCoachView; step: string }> = ({ coachView, step }) => {
  const activeIdx = howItWorksStepIndex(step);
  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-2 self-start">
      <div className="bg-[#0a0a0c]/60 backdrop-blur-xl border border-white/20 rounded-2xl p-5 flex flex-col items-center gap-3">
        <ChameleoMascot
          size="sm"
          pose={step === 'photos' ? 'inspector' : 'idle'}
          state={coachView.state}
          message={coachView.message}
        />
        <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold text-center">
          {coachView.title}
        </p>
      </div>
      <div className="bg-[#0a0a0c]/40 border border-white/20 rounded-2xl p-4">
        <p className="text-[10px] font-tech uppercase tracking-widest text-white/80 mb-3">Comment ça marche</p>
        <ol className="space-y-3">
          {TROC_HOW_IT_WORKS.map(({ num, text }, index) => (
            <li
              key={num}
              className={`flex gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                index === activeIdx ? 'bg-xeption-gold/10 border border-xeption-gold/25' : ''
              }`}
            >
              <span
                className={`text-sm font-tech font-bold shrink-0 ${
                  index === activeIdx ? 'text-xeption-gold' : 'text-xeption-gold/45'
                }`}
              >
                {num}
              </span>
              <p className={`text-[11px] leading-relaxed ${index === activeIdx ? 'text-white' : 'text-white/80'}`}>
                {text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
};

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
    <div className="relative text-sm text-white/80 font-sans leading-relaxed mb-6 bg-white/[0.08] border border-white/5 p-4 rounded-xl backdrop-blur-sm overflow-hidden">
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
  form: 0, photos: 1, imei: 1, diagnostic: 2, payment: 2, evaluating: 3, result: 3, voucher: 4,
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
        className="group relative text-left bg-[#0a0a0c]/60 backdrop-blur-xl border border-white/20 hover:border-xeption-gold hover:shadow-[0_0_35px_rgba(255,215,0,0.2)] hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 p-5 rounded-2xl overflow-hidden flex flex-col justify-between"
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
          <p className="text-[11px] text-white/70 font-sans leading-relaxed">{option.subtitle}</p>
        </div>

        <div className="relative mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px] font-tech text-xeption-gold font-bold uppercase tracking-wider">
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
          <div className="w-12 h-12 border border-white/20 bg-white/5 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-white/60" />
          </div>
          <span className="text-[10px] font-tech uppercase tracking-widest px-2 py-0.5 border border-white/20 bg-white/5 text-white/70 rounded-full">
            🔒 {option.badge}
          </span>
        </div>

        <p className="text-white/80 font-tech font-bold uppercase tracking-wider text-base mb-1">{option.label}</p>
        <p className="text-[11px] text-white/60 font-sans leading-relaxed">{option.subtitle}</p>
      </div>

      <div className="pointer-events-none absolute left-3 right-3 top-full mt-3 z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200">
        <div className="bg-black/95 border border-xeption-gold/30 rounded-xl shadow-2xl px-4 py-3 text-[11px] text-white/90 leading-relaxed backdrop-blur-xl">
          <span className="block text-xeption-gold font-tech uppercase tracking-widest text-[10px] mb-1 font-bold">Bientôt disponible</span>
          {option.tooltip}
        </div>
      </div>
    </div>
  );
};

const TrocPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const troc = useTradeIn();
  const visionHealth = useTrocVisionHealth(troc.step === 'photos');
  const [intent, setIntent] = useState<'troc' | 'certif' | null>(null);
  const [selectedDeviceType, setSelectedDeviceType] = useState<'phone' | null>(null);
  const [showSellVoucher, setShowSellVoucher] = useState(false);
  // "marketplace_only" : l'utilisateur est entré via "Vendre sur marketplace" (bottom nav → Mon compte)
  // → au step voucher, on skip bon de vente / bon de troc pour aller directement au pass marketplace.
  const [marketplaceOnly, setMarketplaceOnly] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

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

  const handleNewEvaluation = () => {
    troc.reset();
    setSelectedDeviceType(null);
    setIntent(null);
    setMarketplaceOnly(false);
    setShowSellVoucher(false);
  };

  // Repartir de zéro si l'utilisateur clique sur Troc dans la bottom nav
  // ALORS QU'IL est déjà au step voucher (choix fait : vendre / marketplace / troc).
  // Un troc en cours (form/photos/imei/payment/result) est conservé.
  // Applique aussi l'intent 'marketplace_only' venant du drawer "Mon compte → Vendre marketplace".
  useEffect(() => {
    const s = location.state as { restart?: number; intent?: string } | null;
    if (!s?.restart) return;

    const nextMarketplaceOnly = s.intent === 'marketplace_only';

    if (troc.step === 'voucher') {
      handleNewEvaluation();
    }
    setMarketplaceOnly(nextMarketplaceOnly);
    // Purge le state route pour éviter de redéclencher au prochain re-render
    navigate('/troc', { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (
      troc.step !== 'form' ||
      troc.paymentState !== 'idle' ||
      troc.photos.length > 0 ||
      troc.result ||
      troc.photoUrls.length > 0 ||
      Boolean(troc.form.deviceBrand)
    ) {
      setSelectedDeviceType('phone');
      setIntent('troc');
    }
  }, [troc.paymentState, troc.photos.length, troc.result, troc.step, troc.photoUrls.length, troc.form.deviceBrand]);

  const stepLabels = STEP_LABELS_QUICK;
  const stepIndex  = STEP_INDEX_QUICK[troc.step] ?? 0;
  // IMEI propre + modèle confirmé OU non identifiable (confirmé en boutique) → on laisse passer
  const canAutoEvaluate = troc.imeiStatus === 'valid' &&
    (troc.imeiMatchState === 'match' || troc.imeiMatchState === 'not_verified');
  const voucherRequest: TradeInRequest | null =
    troc.result && troc.savedRequest
      ? {
          id:               troc.savedRequest.id,
          created_at:       troc.savedRequest.created_at ?? new Date().toISOString(),
          customer_name:    troc.form.customerName,
          customer_phone:   troc.form.customerPhone,
          device_brand:     troc.form.deviceBrand,
          device_model:     troc.form.deviceModel,
          photo_urls:       troc.photoUrls,
          imei:             troc.form.imei,
          imei_status:      troc.imeiStatus,
          imei_blacklist_status: troc.imeiBlacklistStatus,
          imei_assurance_level: troc.imeiAssuranceLevel,
          ai_score:         troc.result.score,
          ai_score_color:   troc.result.scoreColor,
          ai_justification: troc.result.justification,
          trade_in_value:   troc.result.tradeInValue,
          trade_in_grade:   troc.result.tradeInGrade,
          status:           'pending',
          tier:             troc.selectedTier,
          voucher_reference: troc.savedRequest.voucher_reference,
          voucher_expires_at: troc.savedRequest.voucher_expires_at,
          target_product_id: troc.savedRequest.target_product_id,
          target_product_name: troc.savedRequest.target_product_name,
        }
      : null;

  // La barre latérale ne voit que 4 des 5 conditions : « l'appareil s'allume »
  // reste local au formulaire. On passe ce qu'on voit, la fonction s'adapte.
  const sidebarChecks = [
    { label: 'ton prénom',  done: troc.form.customerName.trim().length >= 2 },
    { label: 'ton numéro',  done: /^[62]\d{8}$/.test(troc.form.customerPhone.trim()) },
    { label: "l'IMEI",      done: troc.imeiStatus === 'valid' },
    { label: 'le modèle',   done: (troc.form.deviceModel ?? '').trim().length >= 2 },
  ];
  const sidebarDone = sidebarChecks.filter((c) => c.done).length;

  const coachView = resolveTrocCoach({
    step: troc.step,
    imeiStatus: troc.imeiStatus,
    imeiBlacklistStatus: troc.imeiBlacklistStatus,
    isCheckingImei: troc.isCheckingImei,
    photoCount: troc.photos.length,
    paymentState: troc.paymentState,
    hasError: Boolean(troc.error),
    formDone: sidebarDone,
    formTotal: sidebarChecks.length,
    formNext: sidebarChecks.find((c) => !c.done)?.label,
    firstName: troc.form.customerName,
    deviceLabel: [troc.form.deviceBrand, troc.form.deviceModel].filter(Boolean).join(' ') || undefined,
  });

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
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
      <PageSEO
        title="Smart Troc — Reprise d'Appareils Cameroun | Xeption"
        description="Choisissez le type d'appareil à faire reprendre. Reprise smartphone disponible maintenant, autres catégories en préparation dans l'univers Smart Troc de Xeption."
        path="/troc"
      />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', path: '/' },
        { name: 'Smart Troc' },
      ])} />

      <div
        ref={scrollContainerRef}
        onScroll={() => {
          if (scrollContainerRef.current) {
            setShowStickyCta(scrollContainerRef.current.scrollTop > 120);
          }
        }}
        className={`relative max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-1 sm:pt-4 ${
          intent === null || (intent === 'troc' && (troc.step === 'form' || troc.step === 'imei'))
            ? 'pb-0 md:pb-32 overflow-y-hidden md:overflow-y-auto'
            : 'pb-24 md:pb-32 overflow-y-auto'
        } flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
      >

        {/* Header global supprimé pour gagner de l'espace, intégré dans les cartes */}

        {/* ── Sélection d'intention : Landing Troc ─────────── */}
        {intent === null && (
          <>
            {/* Version Mobile Native Dédiée (Conforme à la maquette utilisateur) */}
            <div className="block md:hidden -mx-3 sm:-mx-6 -mt-1 sm:-mt-4 h-full flex flex-col flex-1">
              <MobileTrocView
                onStart={() => {
                  setSelectedDeviceType('phone');
                  setIntent('troc');
                }}
              />
            </div>

            {/* Version Desktop (Préservée intacte, 0 régression) */}
            <div className="hidden md:block space-y-5 sm:space-y-8 animate-fade-in-up relative max-w-2xl mx-auto pb-16">
              <ShootingXBackground />

            {/* HERO SECTION PRINCIPALE (SIDE-BY-SIDE SUR MOBILE COMME LA MAQUETTE) */}
            <div className="relative z-10 pt-1 sm:pt-2">
              {/* ROW 1: TEXTE À GAUCHE + SMARTPHONE VISUEL À DROITE */}
              <div className="flex items-center justify-between gap-2 sm:gap-6">
                {/* COLONNE GAUCHE : ACCROCHE & BULLETS */}
                <div className="flex-1 text-left min-w-0">
                  <span className="text-[9px] sm:text-xs font-tech font-bold uppercase tracking-[0.2em] text-white/70 block mb-0.5">
                    Vends ou échange
                  </span>
                  <h1 className="text-xl sm:text-4xl font-tech font-black uppercase text-white tracking-wider leading-none">
                    Ton téléphone <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-xeption-gold to-yellow-300">
                      vaut de l'or !
                    </span>
                  </h1>
                  <p className="text-[11px] sm:text-sm text-gray-300 font-sans mt-1 leading-snug">
                    Découvre sa valeur en moins de <strong className="text-white font-bold">2 min</strong> avec notre <span className="text-xeption-gold font-semibold">IA</span>.
                  </p>

                  {/* 3 Arguments Clés ultra-compacts */}
                  <div className="space-y-1 sm:space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-gray-200">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-xeption-gold/15 border border-xeption-gold/40 flex items-center justify-center text-xeption-gold shrink-0">
                        <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span>Évaluation à <strong className="text-white">100 F</strong> seulement</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-gray-200">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-xeption-gold/15 border border-xeption-gold/40 flex items-center justify-center text-xeption-gold shrink-0">
                        <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span>Analyse fiable par <strong className="text-white">IA</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-gray-200">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-xeption-gold/15 border border-xeption-gold/40 flex items-center justify-center text-xeption-gold shrink-0">
                        <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span>Cash ou crédit boutique (<strong className="text-xeption-gold">+18 %</strong>)</span>
                    </div>
                  </div>
                </div>

                {/* COLONNE DROITE : VISUEL SMARTPHONE AVEC AURA DORÉE & BADGE */}
                <div className="relative shrink-0 w-32 sm:w-44 flex justify-center items-center">
                  {/* Aura dorée radiale */}
                  <div className="absolute w-28 h-28 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-amber-500/20 via-xeption-gold/25 to-transparent blur-2xl pointer-events-none -z-10" />

                  {/* Badge flottant au-dessus */}
                  <div className="absolute -top-2 right-0 z-20 bg-black/90 backdrop-blur-md border border-xeption-gold/50 px-2 py-0.5 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.8)] pointer-events-none whitespace-nowrap">
                    <span className="text-[8px] sm:text-[10px] font-serif italic text-amber-200 tracking-wide flex items-center gap-1">
                      ✨ Même usé, il a de la valeur !
                    </span>
                  </div>

                  {/* Châssis smartphone compact */}
                  <div className="relative w-28 sm:w-36 h-36 sm:h-44 rounded-[22px] bg-gradient-to-b from-[#24242a] via-[#151518] to-[#0d0d10] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_15px_rgba(212,175,55,0.2)] border border-white/20">
                    <div className="w-full h-full rounded-[16px] bg-gradient-to-b from-[#09090b] via-[#121216] to-[#09090b] border border-white/10 p-1.5 flex flex-col justify-between overflow-hidden relative">
                      <div className="w-10 h-2.5 bg-black rounded-full mx-auto border border-white/15 flex items-center justify-end px-1">
                        <div className="w-1 h-1 rounded-full bg-[#1c1c24] border border-white/20" />
                      </div>

                      <div className="my-auto text-center p-0.5">
                        <div className="inline-block p-1 rounded-lg bg-white/5 border border-white/10 mb-0.5">
                          <Smartphone className="w-4 h-4 text-xeption-gold mx-auto" />
                        </div>
                        <p className="font-serif italic text-[9px] sm:text-[11px] text-amber-200 leading-tight">
                          « Ton ancien phone <br /> = <br /> Une nouvelle opportunité ! »
                        </p>
                      </div>

                      <div className="w-8 h-0.5 bg-white/30 rounded-full mx-auto" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 2: GROS BOUTON D'ACTION IMMÉDIAT (DIRECTEMENT VISIBLE SANS AUCUN SCROLL) */}
              <div className="mt-3 sm:mt-5">
                <button
                  type="button"
                  id="troc-hero-estimate-cta"
                  onClick={() => {
                    setSelectedDeviceType('phone');
                    setIntent('troc');
                  }}
                  className="w-full py-3.5 sm:py-4 px-5 sm:px-8 bg-gradient-to-r from-amber-400 via-xeption-gold to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black font-tech font-black uppercase tracking-wider text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-[0_4px_25px_rgba(212,175,55,0.45)] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] group cursor-pointer"
                >
                  <Camera className="w-5 h-5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                  <span>Estimer mon téléphone</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1.5 transition-transform" />
                </button>
              </div>

              {/* ROW 3: MINI-STEPPER 1-2-3 PÉDAGOGIQUE */}
              <div className="grid grid-cols-3 gap-1 max-w-lg mx-auto text-center mt-2.5 sm:mt-4 px-1">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-xeption-gold mb-0.5">
                    <Smartphone className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] sm:text-xs text-gray-300 leading-tight">
                    1. Je choisis la marque
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-xeption-gold mb-0.5">
                    <Camera className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] sm:text-xs text-gray-300 leading-tight">
                    2. J'ajoute des photos
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-xeption-gold mb-0.5">
                    <FileText className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] sm:text-xs text-gray-300 leading-tight">
                    3. Je reçois mon estimation
                  </span>
                </div>
              </div>
            </div>

            {/* BANDEAU BONUS COMBO (+18% CRÉDIT BOUTIQUE) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-xeption-gold/15 to-transparent border border-xeption-gold/35 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_4px_25px_rgba(212,175,55,0.12)]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-xeption-gold/20 border border-xeption-gold/40 flex items-center justify-center text-xeption-gold shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-sm sm:text-base font-tech font-extrabold uppercase tracking-wide text-xeption-gold">
                    +18 % en crédit boutique
                  </div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-tech">
                    Si tu choisis l'échange contre un nouvel appareil
                  </div>
                </div>
              </div>
              <div className="text-xs sm:text-sm font-serif italic text-amber-200/90 tracking-wide shrink-0">
                Simple, Rapide, Sécurisé !
              </div>
            </div>

            {/* GRILLE DE RÉASSURANCE (4 PINS) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-[#121214]/60 border border-white/10 rounded-xl p-2.5 flex items-center gap-2 text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-xeption-gold shrink-0" />
                <span className="text-[11px] font-medium leading-tight">Évaluation 100 F</span>
              </div>
              <div className="bg-[#121214]/60 border border-white/10 rounded-xl p-2.5 flex items-center gap-2 text-gray-300">
                <Lock className="w-4 h-4 text-xeption-gold shrink-0" />
                <span className="text-[11px] font-medium leading-tight">Sans engagement</span>
              </div>
              <div className="bg-[#121214]/60 border border-white/10 rounded-xl p-2.5 flex items-center gap-2 text-gray-300">
                <Zap className="w-4 h-4 text-xeption-gold shrink-0" />
                <span className="text-[11px] font-medium leading-tight">Réponse immédiate</span>
              </div>
              <div className="bg-[#121214]/60 border border-white/10 rounded-xl p-2.5 flex items-center gap-2 text-gray-300">
                <MapPin className="w-4 h-4 text-xeption-gold shrink-0" />
                <span className="text-[11px] font-medium leading-tight">À Mfoundi Mall</span>
              </div>
            </div>

            {/* SECTION DÉCOUVRE NOS UNIVERS */}
            <div className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-3.5 bg-xeption-gold rounded-full" />
                <h2 className="text-xs sm:text-sm font-tech font-bold uppercase tracking-wider text-white">
                  Découvre nos univers
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/shop?category=phones')}
                  className="group bg-[#121214]/80 border border-white/10 hover:border-xeption-gold/60 rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xeption-gold mb-2 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-tech font-bold uppercase tracking-wide text-white group-hover:text-xeption-gold transition-colors flex items-center gap-1">
                    Smartphones <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/shop?category=ordinateurs')}
                  className="group bg-[#121214]/80 border border-white/10 hover:border-xeption-gold/60 rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xeption-gold mb-2 group-hover:scale-110 transition-transform">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-tech font-bold uppercase tracking-wide text-white group-hover:text-xeption-gold transition-colors flex items-center gap-1">
                    PC Portables <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/shop?category=tablettes')}
                  className="group bg-[#121214]/80 border border-white/10 hover:border-xeption-gold/60 rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xeption-gold mb-2 group-hover:scale-110 transition-transform">
                    <Tablet className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-tech font-bold uppercase tracking-wide text-white group-hover:text-xeption-gold transition-colors flex items-center gap-1">
                    Tablettes <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/shop?category=accessories')}
                  className="group bg-[#121214]/80 border border-white/10 hover:border-xeption-gold/60 rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xeption-gold mb-2 group-hover:scale-110 transition-transform">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-tech font-bold uppercase tracking-wide text-white group-hover:text-xeption-gold transition-colors flex items-center gap-1">
                    Accessoires <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              </div>
            </div>

            {/* BANDEAU DE RÉASSURANCE LIVRAISON & GARANTIE */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs font-tech uppercase tracking-wider text-gray-400">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-xeption-gold" />
                <span>Livraison express partout au Cameroun</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-xeption-gold" />
                <span>Garantie jusqu'à 12 mois</span>
              </div>
            </div>

            {/* LIEN DISCRET VERS LE PASSEPORT OFFICIEL / CERTIFICAT */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIntent('certif')}
                className="text-[11px] font-tech text-gray-500 hover:text-xeption-gold transition-colors underline underline-offset-4 tracking-wider uppercase"
              >
                Tu souhaites uniquement certifier l'IMEI d'un appareil ? Clique ici ➔
              </button>
            </div>
          </div>
          </>
        )}

        {/* ── Flow Xeption Certif ────────────────────────────────────────── */}
        {intent === 'certif' && (
          <div className="max-w-3xl mx-auto w-full">
            <div className="mb-4 flex justify-start">
              <button type="button" onClick={() => setIntent(null)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-[#1c1c16]/90 border border-white/20 hover:border-xeption-gold/30 text-white/80 hover:text-white transition-all text-[10px] font-tech uppercase tracking-widest">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </button>
            </div>
            <div className="bg-[#0a0a0c]/40 backdrop-blur-2xl border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold/30 to-transparent"></div>
              <ImeiCertifFlow />
            </div>
          </div>
        )}

        {/* ── Flow Smart Troc : Sélection de Device ────────────────────── */}
        {intent === 'troc' && !selectedDeviceType && (
          <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-8 lg:items-start animate-fade-in-up">
            <div className="space-y-6 lg:sticky lg:top-2">
              <div className="w-full bg-[#0a0a0c]/60 backdrop-blur-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.6)] p-6 sm:p-8 lg:p-8 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent animate-pulse"></div>

                <div className="flex flex-col gap-6 w-full">
                  <div className="w-full text-left space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-xeption-gold/30 bg-xeption-gold/10 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)] shrink-0">
                        <RefreshCw className="w-5 h-5 text-xeption-gold" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-xl font-tech font-bold uppercase text-white tracking-wider leading-tight">Smart Troc</h1>
                        <p className="text-[10px] font-tech uppercase tracking-widest text-white/70">Reprise cadrée, estimation propre</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-tech font-bold uppercase text-white tracking-wider leading-tight">
                        Tu veux troquer <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-amber-300">quoi</span> ?
                      </h2>
                      <p className="text-sm text-white/80 font-sans leading-relaxed max-w-prose">
                        On ne balance pas des estimations au hasard. Chez Xeption, chaque catégorie ouvre quand
                        son moteur est vraiment prêt. Là, le Smart Troc tourne déjà sur les téléphones.
                      </p>
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-center relative pt-1">
                    <div className="absolute w-36 h-36 bg-xeption-gold/15 rounded-full blur-3xl pointer-events-none" />
                    <ChameleoMascot
                      size="md"
                      pose="pointing"
                      state="idle"
                      message="Sélectionne ton appareil à droite ! 👉✨"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-start">
                <button type="button" onClick={() => setIntent(null)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-[#1c1c16]/90 border border-white/20 hover:border-xeption-gold/30 text-white/80 hover:text-white transition-all text-[10px] font-tech uppercase tracking-widest">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-stretch content-start">
              {DEVICE_OPTIONS.map((option) => (
                <DeviceChoiceCard key={option.id} option={option}
                  onSelect={(id) => { if (id === 'phone') setSelectedDeviceType('phone'); }} />
              ))}
            </div>
          </div>
        )}

        {intent === 'troc' && selectedDeviceType === 'phone' && (
          <div className="max-w-7xl mx-auto w-full h-full flex flex-col flex-1">
            {/* Version Mobile Dédiée : Étape 1 (Conforme à la maquette utilisateur) */}
            {(troc.step === 'form' || troc.step === 'imei') && (
              <div className="block md:hidden -mx-3 sm:-mx-6 -mt-1 sm:-mt-4 h-full flex flex-col flex-1">
                <MobileTrocStep1
                  currentStep={1}
                  totalSteps={4}
                  imei={troc.form.imei}
                  imeiStatus={troc.imeiStatus}
                  imeiBlacklistStatus={troc.imeiBlacklistStatus}
                  imeiDeviceInfo={troc.imeiDeviceInfo}
                  isCheckingImei={troc.isCheckingImei}
                  selectedBrand={troc.form.deviceBrand}
                  selectedModel={troc.form.deviceModel}
                  error={troc.error}
                  onImeiChange={(imei) => troc.updateForm({ imei })}
                  onCheckImei={troc.doCheckImei}
                  onSelectModel={(brand, model) => {
                    troc.updateForm({ deviceBrand: brand, deviceModel: model });
                    void troc.goToPhotosQuick();
                  }}
                  onNext={troc.goToPhotosQuick}
                />
              </div>
            )}

            {/* Version Mobile Dédiée : Étape 2 Photos (Conforme à la maquette utilisateur) */}
            {troc.step === 'photos' && (
              <div className="block md:hidden -mx-3 sm:-mx-6 -mt-1 sm:-mt-4 h-full flex flex-col flex-1">
                <MobileTrocStep2
                  currentStep={2}
                  totalSteps={4}
                  photos={troc.photos}
                  onPhotosChange={troc.updatePhotos}
                  onNext={troc.continueFromPhotos}
                  onBack={() => troc.setStep('form')}
                  isUploading={troc.isUploading}
                  isCheckingPhotos={troc.isCheckingPhotos}
                  error={troc.error}
                  issueIndices={troc.photoIssueIndices}
                  visionReady={visionHealth.report?.ready ?? true}
                  visionLoading={visionHealth.loading}
                  existingPhotoUrls={troc.photoUrls}
                  onReset={handleNewEvaluation}
                />
              </div>
            )}

            {/* Version Mobile Dédiée : Étape 3 Diagnostic Express (Conforme à la maquette utilisateur) */}
            {troc.step === 'diagnostic' && (
              <div className="block md:hidden -mx-3 sm:-mx-6 -mt-1 sm:-mt-4 h-full flex flex-col flex-1">
                <MobileTrocStep3
                  currentStep={3}
                  totalSteps={4}
                  initialAnswers={{
                    powersOn: troc.form.powersOn,
                    touchOk: troc.form.screenCondition !== 'tactile_defectueux',
                    camerasBiometrics: troc.form.cameraCondition === 'défectueuse' ? 'non' : 'oui',
                  }}
                  onNext={troc.continueFromDiagnostic}
                  onBack={() => troc.setStep('photos')}
                />
              </div>
            )}

            {/* Version Mobile Dédiée : Étape 3 Paiement 100 FCFA (Conforme à la maquette 08_troc_etape3_paiement_100f.jpg) */}
            {troc.step === 'payment' && (
              <div className="block md:hidden -mx-3 sm:-mx-6 -mt-1 sm:-mt-4 h-full flex flex-col flex-1">
                <MobileTrocStepPayment
                  currentStep={3}
                  totalSteps={4}
                  initialPhone={troc.form.customerPhone}
                  paymentAmount={troc.paymentAmount || 100}
                  paymentState={troc.paymentState}
                  error={troc.error}
                  onInitiate={troc.initiatePayment}
                  onRetry={troc.retryPayment}
                  onBack={() => troc.setStep('photos')}
                />
              </div>
            )}

            {/* Version Mobile Dédiée : Résultat & Options (Conforme à la maquette utilisateur) */}
            {troc.step === 'result' && troc.result && (
              <div className="block md:hidden -mx-3 sm:-mx-6 -mt-1 sm:-mt-4 h-full flex flex-col flex-1">
                <MobileTrocResult
                  result={troc.result}
                  deviceLabel={`${troc.form.deviceBrand} ${troc.form.deviceModel}`}
                  deviceBrand={troc.form.deviceBrand}
                  deviceModel={troc.form.deviceModel}
                  customerName={troc.form.customerName}
                  customerPhone={troc.form.customerPhone}
                  onCustomerNameChange={(name) => troc.updateForm({ customerName: name })}
                  onCustomerPhoneChange={(phone) => troc.updateForm({ customerPhone: phone })}
                  onAcceptOffer={troc.acceptOffer}
                  onRefuse={troc.refuse}
                  onBack={() => troc.setStep('photos')}
                  isSubmitting={troc.isSubmitting}
                />
              </div>
            )}

            {/* Version Mobile Dédiée : Bon de Reprise / Vente / Pass Marketplace */}
            {troc.step === 'voucher' && voucherRequest && (
              <div className="block md:hidden -mx-3 sm:-mx-6 -mt-1 sm:-mt-4 h-full flex flex-col flex-1">
                {marketplaceOnly ? (
                  <MobileMarketplacePass
                    request={voucherRequest}
                    result={troc.result}
                    onBack={handleNewEvaluation}
                  />
                ) : showSellVoucher ? (
                  <MobileVenteVoucher
                    request={voucherRequest}
                    result={troc.result}
                    onBack={() => setShowSellVoucher(false)}
                  />
                ) : (
                  <MobileTrocVoucher
                    request={voucherRequest}
                    result={troc.result}
                    onNewEvaluation={handleNewEvaluation}
                    onSellInstead={() => setShowSellVoucher(true)}
                  />
                )}
              </div>
            )}

            <div className={`${(troc.step === 'form' || troc.step === 'imei' || troc.step === 'photos' || troc.step === 'diagnostic' || troc.step === 'payment' || troc.step === 'result' || troc.step === 'voucher') ? 'hidden md:block' : 'block'} ${troc.step === 'voucher' ? '' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start'}`}>
        <div className="min-w-0">

        {/* Stepper + Action Nouvelle estimation */}
        {troc.step !== 'voucher' && (
          <div className="bg-[#0a0a0c]/40 border border-white/20 px-3 py-1.5 mb-4 backdrop-blur-2xl rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <TrocStepper
                currentStep={stepIndex}
                totalSteps={stepLabels.length}
                labels={stepLabels}
              />
            </div>
            {(troc.step !== 'form' || troc.form.deviceBrand) && (
              <button
                type="button"
                onClick={handleNewEvaluation}
                className="shrink-0 text-[10px] font-tech font-bold uppercase tracking-wider text-white/50 hover:text-xeption-gold transition-colors px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 self-end sm:self-auto border border-white/10"
                title="Effacer le brouillon et recommencer à zéro"
              >
                Nouvelle estimation
              </button>
            )}
          </div>
        )}

        <div className="lg:hidden">
          <TrocCoachBar view={coachView} />
        </div>

        {/* Error banner */}
        {troc.error && (
          <div className="mb-4 px-4 py-3 bg-xeption-red/10 border border-xeption-red/30 text-white text-sm font-sans rounded-sm">
            {troc.error}
          </div>
        )}

        {/* Main card */}
        <div className="bg-[#0a0a0c]/40 backdrop-blur-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.6)] rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold/30 to-transparent"></div>

          {/* En-tête intégré */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 border border-xeption-gold/30 bg-xeption-gold/10 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)] shrink-0">
                <RefreshCw className="w-5 h-5 text-xeption-gold" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-tech font-bold uppercase text-white tracking-wider leading-tight">Smart Troc</h1>
                <p className="text-[10px] font-tech uppercase tracking-widest text-white/70">Reprise cadrée, estimation propre</p>
              </div>
            </div>

            {troc.step !== 'voucher' && (
              <button
                type="button"
                onClick={() => setSelectedDeviceType(null)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-xeption-gold/60 bg-xeption-gold/15 px-3 py-2 text-[10px] font-tech font-bold uppercase tracking-widest text-xeption-gold shadow-[0_0_15px_rgba(255,215,0,0.15)] transition-all hover:border-xeption-gold hover:bg-xeption-gold hover:text-black hover:shadow-[0_0_25px_rgba(255,215,0,0.35)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Changer d'appareil</span>
                <span className="sm:hidden">Appareil</span>
              </button>
            )}
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
                  <p className="text-xs text-white/60 mt-1 font-sans">Contrôle IA des photos puis estimation</p>
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
                onNewEvaluation={handleNewEvaluation}
              />
            )}
          </div>
        </div>

        {/* "Comment ça marche" — mobile / tablette uniquement */}
        {troc.step === 'form' && (
          <div className="mt-10 lg:hidden">
            <p className="text-[10px] font-tech uppercase tracking-widest text-white/90 mb-4 text-center">Comment ça marche</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TROC_HOW_IT_WORKS.map(({ num, text }) => (
                <div key={num} className="bg-[#1c1c16]/90 border border-white/20 p-4 hover:border-xeption-gold/20 transition-all">
                  <span className="text-lg font-tech font-bold text-xeption-gold/60 block mb-2">{num}</span>
                  <p className="text-white/90 text-[11px] font-sans leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        </div>

        {troc.step !== 'voucher' && (
          <TrocFlowSidebar coachView={coachView} step={troc.step} />
        )}

        </div>
          </div>
        )}
      </div>

      {/* BOUTON FLOTTANT STICKY (MOBILE SEULEMENT, QUAND ON DÉFILE POUR GARANTIR 0 FRICTION PARTOUT) */}
      {showStickyCta && intent === null && (
        <div className="fixed bottom-20 left-3 right-3 z-40 md:hidden animate-fade-in-up">
          <button
            type="button"
            onClick={() => {
              setSelectedDeviceType('phone');
              setIntent('troc');
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-xeption-gold to-yellow-300 text-black font-tech font-black uppercase tracking-wider text-xs rounded-xl shadow-[0_4px_25px_rgba(212,175,55,0.6)] flex items-center justify-between transition-transform active:scale-95 cursor-pointer border border-amber-300/50"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>Estimer mon téléphone (100 F)</span>
            </div>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

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
