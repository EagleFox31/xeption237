import React, { useState, useEffect, useRef } from 'react';
import {
  Banknote,
  ChevronRight,
  Info,
  RefreshCw,
  ArrowRight,
  X,
} from 'lucide-react';
import type { Product, TrocEvaluationResult } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { getProductDisplayName } from '../../utils/productDisplay';

export interface MobileTrocResultProps {
  result: TrocEvaluationResult;
  deviceLabel: string;
  deviceBrand?: string;
  deviceModel?: string;
  customerName?: string;
  customerPhone?: string;
  onCustomerNameChange?: (name: string) => void;
  onCustomerPhoneChange?: (phone: string) => void;
  onAcceptOffer: (target?: Product) => void;
  onRefuse?: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

interface RecommendedPhone {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  baseAdded: number;
}

const DEFAULT_RECOMMENDED: RecommendedPhone[] = [
  {
    id: 'rec-iphone-15',
    name: 'iPhone 15',
    brand: 'Apple',
    image: '/troc-rec-iphone15.png',
    price: 450000,
    baseAdded: 180000,
  },
  {
    id: 'rec-galaxy-s23',
    name: 'Galaxy S23',
    brand: 'Samsung',
    image: '/troc-rec-galaxys23.png',
    price: 380000,
    baseAdded: 110000,
  },
  {
    id: 'rec-tecno-phantom-v',
    name: 'Tecno Phantom V',
    brand: 'Tecno',
    image: '/troc-rec-tecnophantom.png',
    price: 340000,
    baseAdded: 70000,
  },
  {
    id: 'rec-iphone-14-pro',
    name: 'iPhone 14 Pro',
    brand: 'Apple',
    image: '/troc-rec-iphone14pro.png',
    price: 410000,
    baseAdded: 140000,
  },
  {
    id: 'rec-galaxy-s24',
    name: 'Galaxy S24',
    brand: 'Samsung',
    image: '/troc-rec-galaxys23.png',
    price: 490000,
    baseAdded: 220000,
  },
];

const getBrandFallbackImage = (brandOrName: string): string => {
  const b = (brandOrName || '').toLowerCase();
  if (b.includes('apple') || b.includes('iphone')) return '/troc-rec-iphone15.png';
  if (b.includes('samsung') || b.includes('galaxy')) return '/troc-rec-galaxys23.png';
  if (b.includes('tecno') || b.includes('phantom')) return '/troc-rec-tecnophantom.png';
  if (b.includes('xiaomi') || b.includes('redmi'))
    return 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1778755031/xeption/f0ttv0zvegqwxbfmrti2.jpg';
  return '/troc-rec-galaxys23.png';
};

const formatF = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(amount)));

export const MobileTrocResult: React.FC<MobileTrocResultProps> = ({
  result,
  deviceLabel,
  deviceBrand,
  deviceModel,
  customerName = '',
  customerPhone = '',
  onCustomerNameChange,
  onCustomerPhoneChange,
  onAcceptOffer,
  onRefuse,
  onBack,
  isSubmitting = false,
}) => {
  const [selectedOption, setSelectedOption] = useState<'exchange' | 'cash' | null>(null);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('rec-iphone-15');
  const [dbPhones, setDbPhones] = useState<RecommendedPhone[]>([]);
  const [showNameSheet, setShowNameSheet] = useState(false);
  const [showPhoneSheet, setShowPhoneSheet] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [pendingTarget, setPendingTarget] = useState<Product | undefined>(undefined);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const actionSectionRef = React.useRef<HTMLDivElement>(null);

  // Calcul dynamique des montants
  const creditValue = result.tradeInValueCredit || result.tradeInValue || 270000;
  const cashValue =
    result.tradeInValueCash || Math.round((creditValue * 0.85) / 5000) * 5000;

  const minVal = Math.min(creditValue, cashValue);
  const maxVal = Math.max(creditValue, cashValue);

  const displayMin = minVal < maxVal ? minVal : Math.round((maxVal * 0.85) / 5000) * 5000;
  const displayMax = maxVal;

  // Masquer la barre de navigation mobile standard pour la remplacer par le bouton fixe
  useEffect(() => {
    document.body.classList.add('hide-mobile-bottom-nav');
    return () => {
      document.body.classList.remove('hide-mobile-bottom-nav');
    };
  }, []);

  // Défilement fluide vers la section révélée pour action immédiate
  const handleSelectOption = (opt: 'exchange' | 'cash') => {
    setSelectedOption(opt);
    setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  };

  // ── Recommandations dynamiques depuis le catalogue réel Supabase ──
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .gt('stock', 0);

        if (error || !data || data.length === 0) return;

        // Filtrer UNIQUEMENT les smartphones ayant une VRAIE photo produit (Cloudinary / URL valide)
        const allPhones = (data as any[])
          .filter((p) => {
            const cat = (p.category || '').toLowerCase();
            const name = (p.name || '').toLowerCase();
            const hasRealPhoto =
              p.image &&
              typeof p.image === 'string' &&
              p.image.startsWith('http') &&
              !p.image.includes('icon-192x192');

            const isPhone =
              cat.includes('phone') ||
              name.includes('iphone') ||
              name.includes('galaxy') ||
              name.includes('redmi') ||
              name.includes('pixel') ||
              name.includes('tecno') ||
              name.includes('infinix') ||
              name.includes('xiaomi');

            return isPhone && hasRealPhoto;
          })
          .map((p) => ({
            id: p.id,
            name: getProductDisplayName(p) || p.name,
            brand: p.brand || '',
            image: p.image,
            price: p.price,
            baseAdded: Math.max(0, p.price - displayMin),
          }));

        if (allPhones.length === 0) return;

        const userBrand = (deviceBrand || '').toLowerCase().trim();

        // 1. Appareils de la même marque avec prix supérieur au crédit (upgrade naturel)
        const sameBrand = allPhones.filter(
          (p) =>
            userBrand &&
            (p.brand.toLowerCase().includes(userBrand) ||
              p.name.toLowerCase().includes(userBrand)) &&
            p.price > displayMin,
        );

        // 2. Autres flagships / best-sellers avec effort marginal réaliste (> creditValue)
        const otherBrands = allPhones.filter(
          (p) =>
            (!userBrand ||
              (!p.brand.toLowerCase().includes(userBrand) &&
                !p.name.toLowerCase().includes(userBrand))) &&
            p.price > displayMin,
        );

        sameBrand.sort((a, b) => (a.price - displayMin) - (b.price - displayMin));
        otherBrands.sort((a, b) => (a.price - displayMin) - (b.price - displayMin));

        const combined: RecommendedPhone[] = [];
        if (sameBrand.length > 0) {
          combined.push(...sameBrand.slice(0, 3));
        }
        combined.push(...otherBrands.slice(0, 4));

        // Si moins de 3 téléphones avec price > displayMin, on prend les plus proches du crédit
        if (combined.length < 3) {
          const fallbackSorted = [...allPhones].sort(
            (a, b) => Math.abs(a.price - displayMin) - Math.abs(b.price - displayMin),
          );
          combined.push(...fallbackSorted.slice(0, 4));
        }

        const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());

        if (isMounted && unique.length > 0) {
          setDbPhones(unique.slice(0, 6));
          setSelectedPhoneId(unique[0].id);
        }
      } catch (err) {
        console.warn('Erreur chargement catalogue troc:', err);
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [deviceBrand, displayMin]);

  const recommendedList = dbPhones.length > 0 ? dbPhones : DEFAULT_RECOMMENDED;
  const selectedTargetPhone = recommendedList.find((p) => p.id === selectedPhoneId) || recommendedList[0];

  useEffect(() => {
    if (showNameSheet) setTimeout(() => nameInputRef.current?.focus(), 120);
  }, [showNameSheet]);

  useEffect(() => {
    if (showPhoneSheet) setTimeout(() => phoneInputRef.current?.focus(), 120);
  }, [showPhoneSheet]);

  const isPhoneValid = (p: string) => /^[62]\d{8}$/.test(p.replace(/\s/g, ''));

  const buildTarget = (): Product | undefined => {
    if (!selectedTargetPhone) return undefined;
    return {
      id: selectedTargetPhone.id,
      name: selectedTargetPhone.name,
      brand: selectedTargetPhone.brand,
      price: selectedTargetPhone.price,
      image: selectedTargetPhone.image,
      category: 'phones',
      stock: 5,
    } as Product;
  };

  const commitOffer = (target?: Product) => {
    if (selectedOption === 'cash') {
      onAcceptOffer();
    } else {
      onAcceptOffer(target ?? buildTarget());
    }
  };

  // Étape 1 : vérifier nom → Étape 2 : vérifier téléphone → commit
  const handleCta = () => {
    if (!selectedOption) return;
    const target = buildTarget();
    setPendingTarget(target);
    if (customerName.trim().length < 2) {
      setNameInput('');
      setShowNameSheet(true);
      return;
    }
    if (!isPhoneValid(customerPhone)) {
      setPhoneInput('');
      setShowPhoneSheet(true);
      return;
    }
    commitOffer(target);
  };

  const handleNameConfirm = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) return;
    onCustomerNameChange?.(trimmed);
    setShowNameSheet(false);
    // Passer au téléphone si manquant
    if (!isPhoneValid(customerPhone)) {
      setPhoneInput('');
      setShowPhoneSheet(true);
      return;
    }
    commitOffer(selectedOption === 'exchange' ? pendingTarget : undefined);
  };

  const handlePhoneConfirm = () => {
    const digits = phoneInput.replace(/\s/g, '');
    if (!isPhoneValid(digits)) return;
    onCustomerPhoneChange?.(digits);
    setShowPhoneSheet(false);
    commitOffer(selectedOption === 'exchange' ? pendingTarget : undefined);
  };

  return (
    <div className="w-full h-full min-h-[calc(100dvh-132px)] flex flex-col justify-start px-4 pt-1 pb-28 relative select-none overflow-y-auto">
      {/* ── 1. Ambiance lueur dorée haut droite ── */}
      <div className="absolute -top-16 -right-16 w-80 h-80 bg-gradient-to-bl from-amber-400/20 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 overflow-hidden pointer-events-none">
        <svg className="w-full h-full opacity-30" viewBox="0 0 280 280" fill="none">
          <path
            d="M280 0C280 154.64 154.64 280 0 280"
            stroke="url(#goldStreakResult)"
            strokeWidth="1.5"
          />
          <defs>
            <linearGradient
              id="goldStreakResult"
              x1="280"
              y1="0"
              x2="0"
              y2="280"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="0.6" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="1" stopColor="#000000" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── 2. Stepper 4 Étapes avec libellés texte ── */}
      <div className="relative z-10 pt-2 shrink-0">
        <div className="flex items-start justify-between w-full max-w-[340px] mx-auto px-1">
          {/* Étape 1 : Téléphone */}
          <div className="flex flex-col items-center flex-1 relative">
            <div className="w-7 h-7 rounded-full border border-white/30 bg-[#141418] text-white flex items-center justify-center font-tech font-bold text-xs shadow-sm">
              1
            </div>
            <span className="text-[10px] text-zinc-400 font-sans mt-0.5">Téléphone</span>
            <div className="absolute top-3.5 left-[calc(50%+14px)] right-[calc(-50%+14px)] h-[1px] bg-white/20" />
          </div>

          {/* Étape 2 : État */}
          <div className="flex flex-col items-center flex-1 relative">
            <div className="w-7 h-7 rounded-full border border-white/30 bg-[#141418] text-white flex items-center justify-center font-tech font-bold text-xs shadow-sm">
              2
            </div>
            <span className="text-[10px] text-zinc-400 font-sans mt-0.5">État</span>
            <div className="absolute top-3.5 left-[calc(50%+14px)] right-[calc(-50%+14px)] h-[1px] bg-white/20" />
          </div>

          {/* Étape 3 : Photos */}
          <div className="flex flex-col items-center flex-1 relative">
            <div className="w-7 h-7 rounded-full border border-white/30 bg-[#141418] text-white flex items-center justify-center font-tech font-bold text-xs shadow-sm">
              3
            </div>
            <span className="text-[10px] text-zinc-400 font-sans mt-0.5">Photos</span>
            <div className="absolute top-3.5 left-[calc(50%+14px)] right-[calc(-50%+14px)] h-[1px] bg-amber-400/40" />
          </div>

          {/* Étape 4 : Estimation (Active) */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] text-black flex items-center justify-center font-tech font-black text-xs shadow-[0_0_12px_rgba(251,191,36,0.6)]">
              4
            </div>
            <span className="text-[10px] font-tech font-bold text-amber-400 mt-0.5">Estimation</span>
          </div>
        </div>
      </div>

      {/* ── 3. Titre Principal "Valeur estimée" ── */}
      <div className="relative z-10 pt-3 shrink-0">
        <h1 className="text-[28px] sm:text-[32px] font-tech font-black text-white tracking-tight leading-none">
          Valeur{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe072] via-[#e5b53b] to-[#b3861b]">
            estimée
          </span>
        </h1>
      </div>

      {/* ── 4. Carte Prix Dorée "270 000 – 320 000 FCFA" ── */}
      <div className="relative z-10 mt-2.5 rounded-2xl bg-gradient-to-b from-[#16161b] via-[#101014] to-[#0a0a0d] border border-amber-400/80 p-3 sm:p-4 text-center shadow-[0_0_25px_rgba(251,191,36,0.15)] overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-[23px] sm:text-[27px] font-tech font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ffe680] via-[#facc15] to-[#eab308] leading-tight">
          {formatF(displayMin)} – {formatF(displayMax)} FCFA
        </div>
        <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-[10px] font-sans mt-1">
          <Info className="w-3 h-3 text-zinc-400 shrink-0" />
          <span>Sous réserve de vérification physique.</span>
        </div>
      </div>

      {/* ── 5. Deux Options en 2 colonnes côte à côte (Parfaitement alignées) ── */}
      <div className="relative z-10 mt-3 shrink-0">
        <div className="grid grid-cols-2 gap-2.5 items-stretch">
          {/* OPTION 1 : VENDRE À XEPTION */}
          <div
            onClick={() => handleSelectOption('cash')}
            className={`rounded-2xl p-3 flex flex-col h-full transition-all cursor-pointer border-2 select-none active:scale-[0.98] ${
              selectedOption === 'cash'
                ? 'border-amber-400 bg-gradient-to-b from-[#181820] via-[#121216] to-[#0d0d11] shadow-[0_0_22px_rgba(251,191,36,0.22)] ring-1 ring-amber-400/30'
                : 'border-white/10 bg-[#121216]/90 hover:border-white/20'
            }`}
          >
            {/* 1. Icône */}
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Banknote className="w-5 h-5 stroke-[2.2]" />
            </div>

            {/* 2. Titre rigoureusement aligné */}
            <div className="text-white font-tech font-black text-xs tracking-wide uppercase mt-2.5 leading-tight">
              VENDRE À XEPTION
            </div>

            {/* 3. Contenu inférieur ancré en bas */}
            <div className="flex-1 flex flex-col justify-end mt-1">
              <div className="text-zinc-400 text-[10px] font-medium leading-none">
                Jusqu'à
              </div>
              <div className="flex items-center justify-between mt-0.5 min-h-[22px]">
                <span className="text-amber-400 font-tech font-black text-base sm:text-lg leading-tight">
                  {formatF(displayMax)} F
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
              </div>
              <div className="text-zinc-400 text-[9.5px] font-tech uppercase tracking-wider mt-0.5 leading-none">
                CASH
              </div>
            </div>
          </div>

          {/* OPTION 2 : ÉCHANGER */}
          <div
            onClick={() => handleSelectOption('exchange')}
            className={`rounded-2xl p-3 flex flex-col h-full transition-all cursor-pointer border-2 select-none active:scale-[0.98] ${
              selectedOption === 'exchange'
                ? 'border-amber-400 bg-gradient-to-b from-[#181820] via-[#121216] to-[#0d0d11] shadow-[0_0_22px_rgba(251,191,36,0.22)] ring-1 ring-amber-400/30'
                : 'border-white/10 bg-[#121216]/90 hover:border-white/20'
            }`}
          >
            {/* 1. Icône */}
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <RefreshCw className="w-5 h-5 stroke-[2.2]" />
            </div>

            {/* 2. Titre rigoureusement aligné */}
            <div className="text-white font-tech font-black text-xs tracking-wide uppercase mt-2.5 leading-tight">
              ÉCHANGER
            </div>

            {/* 3. Contenu inférieur ancré en bas (Parfaitement aligné avec la colonne VENDRE) */}
            <div className="flex-1 flex flex-col justify-end mt-1">
              <div className="text-[10px] font-medium leading-none invisible select-none" aria-hidden="true">
                Jusqu'à
              </div>
              <div className="flex items-center justify-between mt-0.5 min-h-[22px]">
                <span className="text-zinc-300 font-sans font-normal text-[11px] sm:text-xs leading-tight">
                  Valeur reprise +
                </span>
                <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
              </div>
              <div className="text-zinc-400 text-[9.5px] font-sans leading-none mt-0.5">
                bonus XEPTION
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Section Déclenchée par l'Action Utilisateur ── */}

      {/* A. Si aucune option sélectionnée encore : Indication incitative */}
      {!selectedOption && (
        <div className="relative z-10 mt-3 text-center py-2.5 px-3 rounded-2xl bg-white/[0.02] border border-dashed border-amber-400/30 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[11px] text-zinc-300 font-sans">
            Touche <strong className="text-amber-400 font-tech uppercase">Vendre</strong> ou <strong className="text-amber-400 font-tech uppercase">Échanger</strong> ci-dessus
          </span>
        </div>
      )}

      {/* B. Si VENDRE sélectionné : Détail Rachat Cash Immédiat */}
      {selectedOption === 'cash' && (
        <div
          ref={actionSectionRef}
          className="relative z-10 mt-3.5 shrink-0 rounded-2xl bg-gradient-to-b from-[#181820] via-[#131318] to-[#0e0e12] border border-amber-400/70 p-3.5 shadow-[0_0_22px_rgba(251,191,36,0.15)] animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-tech font-bold text-xs uppercase tracking-wide">
                  Rachat Cash Immédiat
                </div>
                <div className="text-[10px] text-zinc-400">
                  Sans obligation d'acheter un autre téléphone
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-amber-400 font-tech font-black text-sm">
                {formatF(displayMax)} F
              </div>
              <div className="text-[9px] text-emerald-400 font-medium">
                Paiement direct
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10.5px] text-zinc-300 font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span>Orange Money / MoMo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span>Espèces en agence</span>
            </div>
          </div>
        </div>
      )}

      {/* C. Si ÉCHANGER sélectionné : Carrousel des téléphones */}
      {selectedOption === 'exchange' && (
        <div
          ref={actionSectionRef}
          className="relative z-10 mt-3.5 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-tech font-bold text-xs sm:text-sm tracking-wide">
              Avec ton crédit, voici ce que <span className="text-amber-400">tu peux obtenir</span>
            </h2>
            <span className="text-[10px] text-zinc-500 font-sans tracking-wide">
              Glisse ➔
            </span>
          </div>

          {/* Carousel horizontal fluide avec snap au défilement */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 -mx-4 px-4 snap-x snap-mandatory scrollbar-none touch-pan-x">
            {recommendedList.map((phone) => {
              const addedAmount =
                phone.baseAdded !== undefined && displayMin === 270000 && phone.id.startsWith('rec-')
                  ? phone.baseAdded
                  : Math.max(0, phone.price - displayMin);
              const isSelected = selectedPhoneId === phone.id;

              return (
                <div
                  key={phone.id}
                  onClick={() => {
                    setSelectedPhoneId(phone.id);
                  }}
                  className={`w-[124px] sm:w-[136px] shrink-0 snap-start rounded-2xl p-2.5 bg-[#121216] border-2 flex flex-col items-center justify-between text-center transition-all cursor-pointer select-none active:scale-[0.98] ${
                    isSelected
                      ? 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)] bg-[#171720]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="w-full h-20 sm:h-22 flex items-center justify-center overflow-hidden">
                    <img
                      src={phone.image}
                      alt={phone.name}
                      className="max-h-full max-w-full object-contain drop-shadow-md pointer-events-none"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = getBrandFallbackImage(phone.name);
                      }}
                    />
                  </div>
                  <div className="w-full text-white font-tech font-bold text-[10.5px] sm:text-[11px] mt-1.5 truncate">
                    {phone.name}
                  </div>
                  <div className="w-full mt-1.5 bg-[#1c1c22] border border-white/5 rounded-xl py-1 px-1 flex flex-col items-center">
                    <span className="text-[8px] text-zinc-400 leading-tight">À ajouter:</span>
                    <span className="text-[11px] font-tech font-black text-amber-400 leading-tight">
                      {formatF(addedAmount)} F
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sous réserve de vérification physique */}
      <div className="text-center mt-3 mb-2">
        <span className="text-[10px] text-zinc-400 font-sans underline underline-offset-2">
          Sous réserve de vérification physique.
        </span>
      </div>

      {/* ── 7bis. BOTTOM SHEET : SAISIE DU PRÉNOM ── */}
      {showNameSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowNameSheet(false)}
          />
          {/* Sheet */}
          <div className="relative bg-[#0e0e13] border-t border-white/10 rounded-t-3xl px-5 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_-12px_48px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

            {/* Bouton fermer */}
            <button
              type="button"
              onClick={() => setShowNameSheet(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="text-white font-tech font-black text-base uppercase tracking-wide mb-1">
              Une dernière chose
            </p>
            <p className="text-zinc-400 text-[13px] font-sans leading-snug mb-5">
              Ton prénom pour personnaliser ton bon de reprise officiel.
            </p>

            <input
              ref={nameInputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameConfirm()}
              placeholder="Ex : Kamga, Sophie, Paul..."
              autoComplete="given-name"
              maxLength={40}
              className="w-full bg-[#1a1a22] border border-white/20 focus:border-amber-400/70 rounded-2xl px-4 py-3.5 text-white text-sm font-sans outline-none placeholder:text-zinc-500 transition-colors mb-4"
            />

            <button
              type="button"
              onClick={handleNameConfirm}
              disabled={nameInput.trim().length < 2}
              className="w-full py-3.5 rounded-2xl font-tech font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] text-black shadow-[0_4px_25px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continuer
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* ── 7ter. BOTTOM SHEET : SAISIE DU NUMÉRO ── */}
      {showPhoneSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPhoneSheet(false)}
          />
          <div className="relative bg-[#0e0e13] border-t border-white/10 rounded-t-3xl px-5 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_-12px_48px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

            <button
              type="button"
              onClick={() => setShowPhoneSheet(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="text-white font-tech font-black text-base uppercase tracking-wide mb-1">
              Ton numéro de contact
            </p>
            <p className="text-zinc-400 text-[13px] font-sans leading-snug mb-5">
              Pour recevoir ton bon de reprise et te contacter en boutique.
            </p>

            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm pointer-events-none select-none">
                +237
              </span>
              <input
                ref={phoneInputRef}
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePhoneConfirm()}
                placeholder="6XX XXX XXX"
                autoComplete="tel-national"
                maxLength={13}
                className="w-full bg-[#1a1a22] border border-white/20 focus:border-amber-400/70 rounded-2xl pl-14 pr-4 py-3.5 text-white text-sm font-mono tracking-wider outline-none placeholder:text-zinc-500 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={handlePhoneConfirm}
              disabled={!isPhoneValid(phoneInput)}
              className="w-full py-3.5 rounded-2xl font-tech font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] text-black shadow-[0_4px_25px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Valider
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* ── 7. BOUTON FIXÉ EN BAS (Remplace la barre de navigation mobile) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0d]/95 backdrop-blur-xl border-t border-white/10 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.9)]">
        <button
          type="button"
          onClick={handleCta}
          disabled={!selectedOption || isSubmitting}
          className={`w-full py-3.5 rounded-2xl font-tech font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all select-none ${
            !selectedOption
              ? 'bg-[#181820] text-zinc-500 border border-white/10 cursor-not-allowed opacity-80'
              : 'bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] hover:from-[#ffe033] hover:to-[#f59e0b] text-black shadow-[0_4px_25px_rgba(251,191,36,0.35)] active:scale-[0.98] cursor-pointer'
          } disabled:opacity-50`}
        >
          <span>
            {!selectedOption
              ? 'CHOISIS UNE OPTION CI-DESSUS'
              : selectedOption === 'cash'
              ? `VENDRE MON TÉLÉPHONE (${formatF(displayMax)} F CASH)`
              : selectedTargetPhone
              ? `ÉCHANGER CONTRE ${selectedTargetPhone.name.toUpperCase()}`
              : 'CHOISIR MON NOUVEAU TÉLÉPHONE'}
          </span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};

export default MobileTrocResult;

