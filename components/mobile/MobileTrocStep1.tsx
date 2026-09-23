import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  Scan,
  Smartphone,
  ChevronRight,
  X,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Search,
  Check,
  CheckCircle2,
  Sparkles,
  Copy,
  Camera,
  CameraOff,
  PhoneCall,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { fetchArgusBrands, fetchArgusModels } from '../../services/trocEvaluationService';
import type { ImeiDeviceInfo } from '../../services/trocEvaluationService';
import { sanitizeImei, isValidImei, describeImeiInputError, luhnCheck } from '../../utils/imeiValidation';

export interface MobileTrocStep1Props {
  currentStep?: number;
  totalSteps?: number;
  imei: string;
  imeiStatus: string;
  imeiBlacklistStatus: string;
  imeiDeviceInfo: ImeiDeviceInfo | null;
  isCheckingImei: boolean;
  selectedBrand?: string;
  selectedModel?: string;
  error?: string | null;
  onImeiChange: (imei: string) => void;
  onCheckImei: () => void;
  onSelectModel: (brand: string, model: string) => void;
  onNext: () => void;
}

interface BrandVisualConfig {
  logo: string;
  fallbackLogo?: string;
  label: string;
  h?: number;
  maxW?: number;
  invertOnDark?: boolean;
}

const BRAND_VISUALS: Record<string, BrandVisualConfig> = {
  apple: { logo: '/logos/apple.svg', label: 'Apple', h: 16, maxW: 18 },
  samsung: { logo: '/logos/samsung.svg', label: 'Samsung', h: 13, maxW: 60 },
  xiaomi: { logo: '/logos/xiaomi.svg', label: 'Xiaomi', h: 16, maxW: 18 },
  tecno: { logo: '/logos/tecno.svg', fallbackLogo: '/logo_marques_africaines/tecno.png', label: 'Tecno', h: 12, maxW: 52 },
  infinix: { logo: '/logos/infinix.svg', fallbackLogo: '/logo_marques_africaines/infinix.png', label: 'Infinix', h: 12, maxW: 52 },
  google: { logo: '/logos/google.svg', label: 'Google', h: 16, maxW: 18 },
  huawei: { logo: '/logos/huawei.svg', label: 'Huawei', h: 15, maxW: 48 },
  honor: { logo: '/logos/honor.svg', label: 'Honor', h: 12, maxW: 45 },
  oppo: { logo: '/logos/oppo.svg', label: 'Oppo', h: 12, maxW: 45 },
  realme: { logo: '/logos/realme.svg', label: 'Realme', h: 12, maxW: 45 },
  vivo: { logo: '/logos/vivo.svg', label: 'Vivo', h: 12, maxW: 45 },
  oneplus: { logo: '/logos/oneplus.svg', label: 'OnePlus', h: 15, maxW: 45 },
  itel: { logo: '/logo_marques_africaines/itel.png', label: 'Itel', h: 14, maxW: 42, invertOnDark: true },
};

const getBrandVisual = (brandName?: string): BrandVisualConfig | null => {
  const clean = (brandName || '').toLowerCase().trim();
  if (!clean || clean === 'tous') return null;
  if (BRAND_VISUALS[clean]) return BRAND_VISUALS[clean];
  if (clean.includes('apple') || clean.includes('iphone')) return BRAND_VISUALS.apple;
  if (clean.includes('samsung') || clean.includes('galaxy')) return BRAND_VISUALS.samsung;
  if (clean.includes('xiaomi') || clean.includes('redmi') || clean.includes('poco')) return BRAND_VISUALS.xiaomi;
  if (clean.includes('tecno') || clean.includes('camon') || clean.includes('spark')) return BRAND_VISUALS.tecno;
  if (clean.includes('infinix')) return BRAND_VISUALS.infinix;
  if (clean.includes('google') || clean.includes('pixel')) return BRAND_VISUALS.google;
  if (clean.includes('huawei')) return BRAND_VISUALS.huawei;
  return null;
};

/** Logo SVG officiel affiché dans chaque ligne de smartphone */
const BrandRowBadge: React.FC<{ brand: string }> = ({ brand }) => {
  const visual = getBrandVisual(brand);
  const [failed, setFailed] = useState(false);

  if (!visual || failed) {
    return (
      <span className="text-[10px] font-tech font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-amber-300 shrink-0">
        {brand}
      </span>
    );
  }

  return (
    <div
      className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/15 flex items-center justify-center shrink-0 p-1.5 shadow-sm"
      title={brand}
    >
      <img
        src={visual.logo}
        alt={brand}
        loading="lazy"
        onError={(e) => {
          if (visual.fallbackLogo && (e.target as HTMLImageElement).src !== visual.fallbackLogo) {
            (e.target as HTMLImageElement).src = visual.fallbackLogo;
          } else {
            setFailed(true);
          }
        }}
        className="max-h-5 max-w-[24px] object-contain"
        style={visual.invertOnDark ? { filter: 'brightness(0) invert(1)' } : undefined}
      />
    </div>
  );
};

/** Onglet de filtre avec logo SVG officiel + libellé */
const BrandFilterTab: React.FC<{
  brand: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ brand, isActive, onClick }) => {
  const visual = getBrandVisual(brand);
  const [failed, setFailed] = useState(false);

  if (brand === 'Tous') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-3.5 py-1.5 rounded-full font-tech font-bold text-xs uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
          isActive
            ? 'bg-amber-400 text-black shadow-md'
            : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Tous</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full font-tech font-bold text-xs uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
        isActive
          ? 'bg-amber-400 text-black shadow-md'
          : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
      }`}
    >
      {visual && !failed && (
        <img
          src={visual.logo}
          alt={brand}
          loading="lazy"
          onError={(e) => {
            if (visual.fallbackLogo && (e.target as HTMLImageElement).src !== visual.fallbackLogo) {
              (e.target as HTMLImageElement).src = visual.fallbackLogo;
            } else {
              setFailed(true);
            }
          }}
          className="w-auto object-contain transition-all"
          style={{
            height: `${visual.h || 14}px`,
            maxWidth: `${visual.maxW || 52}px`,
            filter: isActive
              ? 'brightness(0)'
              : visual.invertOnDark
              ? 'brightness(0) invert(1)'
              : undefined,
          }}
        />
      )}
      <span>{brand}</span>
    </button>
  );
};

const POPULAR_SMARTPHONES = [
  // Apple
  { id: 'app-15pm', brand: 'Apple', model_name: 'iPhone 15 Pro Max' },
  { id: 'app-15p',  brand: 'Apple', model_name: 'iPhone 15 Pro' },
  { id: 'app-15',   brand: 'Apple', model_name: 'iPhone 15' },
  { id: 'app-14pm', brand: 'Apple', model_name: 'iPhone 14 Pro Max' },
  { id: 'app-14p',  brand: 'Apple', model_name: 'iPhone 14 Pro' },
  { id: 'app-14',   brand: 'Apple', model_name: 'iPhone 14' },
  { id: 'app-13pm', brand: 'Apple', model_name: 'iPhone 13 Pro Max' },
  { id: 'app-13p',  brand: 'Apple', model_name: 'iPhone 13 Pro' },
  { id: 'app-13',   brand: 'Apple', model_name: 'iPhone 13' },
  { id: 'app-12pm', brand: 'Apple', model_name: 'iPhone 12 Pro Max' },
  { id: 'app-12',   brand: 'Apple', model_name: 'iPhone 12' },
  { id: 'app-11',   brand: 'Apple', model_name: 'iPhone 11' },

  // Samsung
  { id: 'sam-s24u', brand: 'Samsung', model_name: 'Galaxy S24 Ultra' },
  { id: 'sam-s24',  brand: 'Samsung', model_name: 'Galaxy S24' },
  { id: 'sam-s23u', brand: 'Samsung', model_name: 'Galaxy S23 Ultra' },
  { id: 'sam-s23',  brand: 'Samsung', model_name: 'Galaxy S23' },
  { id: 'sam-s22u', brand: 'Samsung', model_name: 'Galaxy S22 Ultra' },
  { id: 'sam-s22',  brand: 'Samsung', model_name: 'Galaxy S22' },
  { id: 'sam-s21u', brand: 'Samsung', model_name: 'Galaxy S21 Ultra' },
  { id: 'sam-a55',  brand: 'Samsung', model_name: 'Galaxy A55' },
  { id: 'sam-a54',  brand: 'Samsung', model_name: 'Galaxy A54' },
  { id: 'sam-a35',  brand: 'Samsung', model_name: 'Galaxy A35' },
  { id: 'sam-a34',  brand: 'Samsung', model_name: 'Galaxy A34' },
  { id: 'sam-a15',  brand: 'Samsung', model_name: 'Galaxy A15' },
  { id: 'sam-a14',  brand: 'Samsung', model_name: 'Galaxy A14' },

  // Xiaomi
  { id: 'mi-14u',   brand: 'Xiaomi', model_name: 'Xiaomi 14 Ultra' },
  { id: 'mi-14p',   brand: 'Xiaomi', model_name: 'Xiaomi 14 Pro' },
  { id: 'mi-13p',   brand: 'Xiaomi', model_name: 'Xiaomi 13 Pro' },
  { id: 'mi-rn13p', brand: 'Xiaomi', model_name: 'Redmi Note 13 Pro+' },
  { id: 'mi-rn13',  brand: 'Xiaomi', model_name: 'Redmi Note 13' },
  { id: 'mi-rn12',  brand: 'Xiaomi', model_name: 'Redmi Note 12' },
  { id: 'mi-13c',   brand: 'Xiaomi', model_name: 'Redmi 13C' },

  // Tecno
  { id: 'tec-c30p', brand: 'Tecno', model_name: 'Camon 30 Premier' },
  { id: 'tec-c30',  brand: 'Tecno', model_name: 'Camon 30 Pro' },
  { id: 'tec-c20p', brand: 'Tecno', model_name: 'Camon 20 Pro' },
  { id: 'tec-px2',  brand: 'Tecno', model_name: 'Phantom X2 Pro' },
  { id: 'tec-sp20', brand: 'Tecno', model_name: 'Spark 20 Pro+' },
  { id: 'tec-sp10', brand: 'Tecno', model_name: 'Spark 10 Pro' },
  { id: 'tec-pop8', brand: 'Tecno', model_name: 'Pop 8' },

  // Infinix
  { id: 'inf-gt20', brand: 'Infinix', model_name: 'GT 20 Pro' },
  { id: 'inf-n40p', brand: 'Infinix', model_name: 'Note 40 Pro' },
  { id: 'inf-n30p', brand: 'Infinix', model_name: 'Note 30 Pro' },
  { id: 'inf-h40p', brand: 'Infinix', model_name: 'Hot 40 Pro' },
  { id: 'inf-h30',  brand: 'Infinix', model_name: 'Hot 30' },
  { id: 'inf-sm8',  brand: 'Infinix', model_name: 'Smart 8' },

  // Google Pixel
  { id: 'goo-p8p',  brand: 'Google', model_name: 'Pixel 8 Pro' },
  { id: 'goo-p8',   brand: 'Google', model_name: 'Pixel 8' },
  { id: 'goo-p7p',  brand: 'Google', model_name: 'Pixel 7 Pro' },
  { id: 'goo-p7',   brand: 'Google', model_name: 'Pixel 7' },

  // Huawei
  { id: 'hw-p60p',  brand: 'Huawei', model_name: 'P60 Pro' },
  { id: 'hw-m50p',  brand: 'Huawei', model_name: 'Mate 50 Pro' },
  { id: 'hw-p50p',  brand: 'Huawei', model_name: 'P50 Pro' },
  { id: 'hw-n11',   brand: 'Huawei', model_name: 'Nova 11' },
];

const SMARTPHONE_BRANDS = ['Tous', 'Apple', 'Samsung', 'Xiaomi', 'Tecno', 'Infinix', 'Google', 'Huawei'];
const EXCLUDED_PC_BRANDS = new Set(['dell', 'hp', 'lenovo', 'acer', 'asus', 'toshiba', 'msi']);

/** Formate l'IMEI avec des espaces pour faciliter la relecture : 3580 0411 1234 567 */
const formatImeiDisplay = (digits: string): string => {
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 12));
  if (digits.length > 12) parts.push(digits.slice(12, 15));
  return parts.join(' ');
};

export const MobileTrocStep1: React.FC<MobileTrocStep1Props> = ({
  currentStep = 1,
  totalSteps = 4,
  imei,
  imeiStatus,
  imeiBlacklistStatus,
  imeiDeviceInfo,
  isCheckingImei,
  selectedBrand,
  selectedModel,
  error,
  onImeiChange,
  onCheckImei,
  onSelectModel,
  onNext,
}) => {
  // Modale de scan caméra (optionnelle pour ceux qui ont la boîte du téléphone)
  const [showBoxScanModal, setShowBoxScanModal] = useState(false);
  const [localImei, setLocalImei] = useState(imei || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  // Scanner caméra
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Fallback tiroir modèles manuels (pour les téléphones cassés/éteints)
  const [showModelModal, setShowModelModal] = useState(false);
  const [allPhoneModels, setAllPhoneModels] = useState<Array<{ id: string; brand: string; model_name: string }>>(POPULAR_SMARTPHONES);
  const [activeBrand, setActiveBrand] = useState<string>(selectedBrand || 'Tous');
  const [modelSearch, setModelSearch] = useState('');

  // Sync prop imei
  useEffect(() => {
    setLocalImei(imei || '');
  }, [imei]);

  // Charger les modèles catalogue en arrière-plan pour le fallback
  useEffect(() => {
    let mounted = true;
    void fetchArgusModels().then((data) => {
      if (!mounted) return;
      if (data && data.length > 0) {
        const phoneDbModels = data.filter(
          (m) => !EXCLUDED_PC_BRANDS.has((m.brand || '').toLowerCase().trim())
        );
        const map = new Map<string, { id: string; brand: string; model_name: string }>();
        for (const m of POPULAR_SMARTPHONES) {
          map.set(`${m.brand.toLowerCase()}::${m.model_name.toLowerCase().trim()}`, m);
        }
        for (const m of phoneDbModels) {
          map.set(`${(m.brand || '').toLowerCase()}::${(m.model_name || '').toLowerCase().trim()}`, {
            id: String(m.id),
            brand: m.brand,
            model_name: m.model_name,
          });
        }
        setAllPhoneModels(Array.from(map.values()));
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Détection & validation
  const cleanDigits = sanitizeImei(localImei);
  const isComplete = cleanDigits.length === 15;
  const isLuhnValid = isComplete && luhnCheck(cleanDigits);
  const validationError = describeImeiInputError(cleanDigits);
  const isImeiValid = imeiStatus === 'valid' && imeiBlacklistStatus !== 'blacklisted';

  const identifiedBrand = imeiDeviceInfo?.brand || selectedBrand;
  const identifiedModel = imeiDeviceInfo?.model || selectedModel;
  const isIdentified = Boolean(isImeiValid && (identifiedModel || identifiedBrand));

  // Déclencher la vérification
  const triggerVerify = useCallback((imeiDigits: string) => {
    const clean = sanitizeImei(imeiDigits);
    onImeiChange(clean);
    setTimeout(() => {
      onCheckImei();
    }, 50);
  }, [onImeiChange, onCheckImei]);

  // Copie synchrone garantie 100% sur mobile (Chrome Android, iOS Safari, HTTP local)
  const copyTextUniversal = (text: string): boolean => {
    // 1. Tenter l'API moderne
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    // 2. Fallback synchrone robuste (SANS readonly, exécuté immédiatement dans le clic)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  };

  // Copier le code *#06#
  const handleCopyCode = () => {
    copyTextUniversal('*#06#');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Coller depuis le presse-papier avec fallback focus
  const handlePasteImei = async () => {
    let text = '';
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        text = await navigator.clipboard.readText();
      } catch {
        text = '';
      }
    }

    const digits = sanitizeImei(text).slice(0, 15);
    if (digits.length > 0) {
      setLocalImei(digits);
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 2000);
      if (digits.length === 15) {
        triggerVerify(digits);
      } else {
        onImeiChange(digits);
      }
    } else {
      // Si readText bloqué (ex: HTTP local), on donne le focus à l'input pour afficher la bulle Coller native
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  };

  // ── Gestion Caméra & Barcode Scanner ─────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("La caméra en continu n'est pas supportée. Utilisez l'option 'Prendre une photo' ci-dessous.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Si l'API BarcodeDetector est disponible (Android Chrome / Edge)
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const detector = new window.BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'qr_code'],
          });

          scanIntervalRef.current = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                for (const item of barcodes) {
                  const raw = sanitizeImei(item.rawValue);
                  if (raw.length === 15) {
                    stopCamera();
                    setShowBoxScanModal(false);
                    setLocalImei(raw);
                    triggerVerify(raw);
                    break;
                  }
                }
              }
            } catch {
              // Detection frame error ignored
            }
          }, 250);
        } catch {
          // BarcodeDetector initialization error
        }
      }
    } catch (err: any) {
      setCameraError("Accès caméra refusé ou non disponible. Vous pouvez autoriser la caméra dans les paramètres ou utiliser la saisie directe.");
      stopCamera();
    }
  }, [stopCamera, triggerVerify]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Si on ferme la modale de scan boîte, arrêter la caméra
  useEffect(() => {
    if (!showBoxScanModal) {
      stopCamera();
    }
  }, [showBoxScanModal, stopCamera]);

  // Filtrage tiroir manuel
  const query = modelSearch.toLowerCase().trim();
  const filteredModels = allPhoneModels.filter((m) => {
    if (query.length > 0) {
      const full = `${m.brand} ${m.model_name}`.toLowerCase();
      return (
        full.includes(query) ||
        m.brand.toLowerCase().includes(query) ||
        m.model_name.toLowerCase().includes(query)
      );
    }
    if (activeBrand === 'Tous') return true;
    return m.brand.toLowerCase() === activeBrand.toLowerCase();
  });

  return (
    <div className="w-full h-full min-h-[calc(100dvh-132px-96px)] flex flex-col justify-between px-4 pt-1 pb-3 relative select-none">
      {/* Halo et ambiance dorée */}
      <div className="absolute -top-16 -right-16 w-80 h-80 bg-gradient-to-bl from-amber-400/20 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── 1. STEPPER & TITRE ────────────────────────────────────────────── */}
      <div className="relative z-10 pt-1 shrink-0">
        <div className="flex items-center justify-between w-full max-w-[280px] mx-auto py-1">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum, idx) => {
            const isActive = stepNum === currentStep;
            const isDone = stepNum < currentStep;

            return (
              <React.Fragment key={stepNum}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-tech font-bold text-xs transition-all ${
                    isActive
                      ? 'border-2 border-amber-400 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105'
                      : isDone
                      ? 'border border-amber-400/60 bg-amber-400/20 text-amber-300'
                      : 'border border-zinc-700 bg-zinc-900/60 text-zinc-500'
                  }`}
                >
                  {stepNum}
                </div>
                {idx < totalSteps - 1 && (
                  <div
                    className={`flex-1 h-[1.5px] mx-2 transition-colors ${
                      stepNum < currentStep ? 'bg-amber-400/60' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Titre contextuel : change d'état une fois l'appareil identifié (Nielsen #1) */}
        <div className="mt-1.5 text-center">
          {isIdentified ? (
            <h1 className="text-base sm:text-lg font-tech font-bold uppercase tracking-wider flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-200">Téléphone identifié</span>
            </h1>
          ) : (
            <h1 className="text-base sm:text-lg font-tech font-bold uppercase tracking-wider text-white">
              Identifier le <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe072] via-[#e5b53b] to-[#b3861b]">téléphone</span>
            </h1>
          )}
        </div>
      </div>

      {/* ── 2. ZONE CENTRALE : INPUT (avant identification) ou RÉSULTAT (après) ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-start my-2">

        {/* ── CAS A : NON IDENTIFIÉ — Formulaire complet *#06# + IMEI ── */}
        {!isIdentified && (
          <div className="w-full rounded-[22px] bg-gradient-to-b from-[#15151a] via-[#101014] to-[#0b0b0e] border border-white/15 p-3.5 sm:p-4 flex flex-col gap-3 shadow-xl">

            {/* Étape 1 : Obtention immédiate du code *#06# */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-tech uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  1. Obtiens ton code en 1 clic :
                </span>
                <span className="font-mono text-xs text-white bg-white/10 px-1.5 py-0.5 rounded font-bold">
                  *#06#
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:*%2306%23"
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] hover:from-[#ffe033] hover:to-[#f59e0b] text-black font-tech font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Composer *#06#</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`py-2.5 px-3 rounded-xl border font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer ${
                    copiedCode
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Copier *#06#</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-zinc-400 font-sans leading-tight pt-0.5">
                💡 Dans ton clavier d'appel, tape <strong className="text-white font-mono">*#06#</strong> : l'IMEI apparaît dès le <strong className="text-amber-400">#</strong> sans appuyer sur Appel.
              </p>
            </div>

            {/* Ligne de liaison subtile */}
            <div className="w-full h-px bg-white/10 my-0.5" />

            {/* Étape 2 : Coller ou Saisir l'IMEI */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-tech uppercase tracking-wider text-zinc-300 font-bold">
                  2. Colle ton IMEI :
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  cleanDigits.length === 15 ? 'text-emerald-400' : 'text-zinc-500'
                }`}>
                  {cleanDigits.length}/15
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  value={localImei}
                  onChange={(e) => {
                    const clean = sanitizeImei(e.target.value).slice(0, 15);
                    setLocalImei(clean);
                    onImeiChange(clean);
                    if (clean.length === 15) {
                      triggerVerify(clean);
                    }
                  }}
                  placeholder="Ex: 3580 0411 1234 567"
                  className={`w-full bg-white/[0.06] border rounded-xl px-3.5 py-3 text-base sm:text-lg font-mono tracking-widest text-white placeholder-zinc-600 outline-none transition-all pr-24 ${
                    error && !isIdentified
                      ? 'border-red-500/70 focus:border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                      : validationError
                      ? 'border-amber-400/60 focus:border-amber-400'
                      : 'border-white/20 focus:border-amber-400'
                  }`}
                />

                <div className="absolute right-2 flex items-center gap-1.5">
                  {localImei && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalImei('');
                        onImeiChange('');
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/5"
                      title="Effacer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePasteImei}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-400/25 hover:bg-amber-400/35 border border-amber-400/50 text-amber-300 text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
                    title="Coller depuis le presse-papier"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{pasteSuccess ? 'Collé !' : 'Coller'}</span>
                  </button>
                </div>
              </div>

              {/* Statut de validité format IMEI */}
              {isComplete && isLuhnValid && !validationError && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-sans">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Format valide — appuie sur Identifier.</span>
                </div>
              )}

              {validationError && (
                <div className="flex items-start gap-1.5 text-xs text-amber-400/90 font-sans">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Message d'erreur affiché DIRECTEMENT EN HAUT sous le champ */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 flex items-start gap-2 text-xs text-red-200 animate-fade-in shadow-sm">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}
            </div>

            {/* Bouton d'action identification principal */}
            <button
              type="button"
              disabled={cleanDigits.length !== 15 || isCheckingImei}
              onClick={() => triggerVerify(cleanDigits)}
              className={`w-full py-3.5 rounded-xl font-tech font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                cleanDigits.length === 15 && !isCheckingImei
                  ? 'bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] hover:from-[#ffe033] hover:to-[#f59e0b] text-black shadow-amber-500/25 active:scale-[0.98]'
                  : 'bg-white/10 text-zinc-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {isCheckingImei ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span className="text-white">Interrogation base GSMA...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Identifier mon téléphone</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ── CAS B : IDENTIFIÉ — Confirmation compacte + Card résultat ── */}
        {isIdentified && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Pill IMEI confirmé + lien Modifier (remplace toute la card input) */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-mono text-emerald-200 truncate">
                  IMEI · {formatImeiDisplay(cleanDigits)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onImeiChange('');
                  setLocalImei('');
                }}
                className="text-[11px] font-tech font-bold uppercase tracking-wider text-zinc-400 hover:text-amber-300 transition-colors shrink-0 ml-2"
              >
                Modifier
              </button>
            </div>

            {/* Card appareil reconnu (occupe tout l'espace disponible) */}
            <div className="w-full rounded-[24px] bg-gradient-to-b from-[#141e15] to-[#0a120b] border border-emerald-500/40 p-4 sm:p-5 flex flex-col gap-3 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-tech uppercase tracking-widest text-emerald-300 font-bold">
                    Appareil Officiel Reconnu
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  TAC GSMA Vérifié
                </span>
              </div>

              <div className="flex items-center gap-3.5 py-1">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 p-2">
                  {identifiedBrand && getBrandVisual(identifiedBrand) ? (
                    <img
                      src={getBrandVisual(identifiedBrand)!.logo}
                      alt={identifiedBrand}
                      className="max-h-7 max-w-[32px] object-contain"
                      style={getBrandVisual(identifiedBrand)!.invertOnDark ? { filter: 'brightness(0) invert(1)' } : undefined}
                    />
                  ) : (
                    <Smartphone className="w-6 h-6 text-emerald-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-base sm:text-lg font-tech font-bold text-white tracking-wide truncate">
                    {(() => {
                      // Évite la duplication "Xiaomi Xiaomi 14T" quand le modèle contient déjà la marque
                      const brand = identifiedBrand || '';
                      const model = identifiedModel || '';
                      const modelAlreadyHasBrand = brand && model.toLowerCase().startsWith(brand.toLowerCase());
                      return modelAlreadyHasBrand ? model : `${brand}${brand ? ' ' : ''}${model}`;
                    })()}
                  </h4>
                  <p className="text-xs font-mono text-zinc-400 truncate mt-0.5">
                    Identifié via base GSMA officielle
                  </p>
                </div>
              </div>

              {/* Bouton Continuer vers Étape 2 */}
              <button
                type="button"
                onClick={onNext}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] hover:from-[#ffe033] hover:to-[#f59e0b] text-black font-tech font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(251,191,36,0.45)] active:scale-[0.98] transition-all cursor-pointer shrink-0 mt-1"
              >
                <span>Continuer vers les photos</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. LIENS SECONDAIRES — masqués une fois identifié (Progressive Disclosure) ── */}
      {!isIdentified && (
        <div className="relative z-10 mt-2 pt-2 border-t border-white/5 flex flex-col items-center gap-1.5 shrink-0 text-center">
          <button
            type="button"
            onClick={() => {
              setShowBoxScanModal(true);
              startCamera();
            }}
            className="text-xs text-amber-300/90 hover:text-amber-300 font-sans transition-colors inline-flex items-center gap-1.5 cursor-pointer py-0.5"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Tu as la boîte ? <u>Scanner le code-barres</u></span>
          </button>

          <button
            type="button"
            onClick={() => setShowModelModal(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 font-sans transition-colors inline-flex items-center gap-1.5 cursor-pointer py-0.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>Téléphone éteint ou cassé ? <u>Choisir le modèle manuellement</u></span>
          </button>
        </div>
      )}

      {/* ── 5. MODALE SCAN CODE-BARRES BOÎTE (CAMÉRA) ─────────────────────── */}
      {showBoxScanModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-t-[32px] sm:rounded-3xl bg-[#121216] border border-amber-400/30 p-5 text-white shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header modal */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-tech font-bold text-base uppercase tracking-wider text-white">
                  Scanner le code-barres de la boîte
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBoxScanModal(false);
                  stopCamera();
                }}
                className="p-1 rounded-full text-zinc-400 hover:text-white bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viseur caméra */}
            <div className="mt-3 relative w-full h-48 sm:h-56 rounded-xl overflow-hidden bg-black/90 border border-amber-400/30 flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viseur cible avec coins dorés */}
                  <div className="absolute inset-4 border border-amber-400/40 rounded-lg pointer-events-none">
                    <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400" />
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-bounce mt-8" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                  <div className="w-11 h-11 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <Scan className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-zinc-300 font-sans">
                    Alignez le code-barres IMEI de la boîte dans le cadre
                  </p>
                </div>
              )}
            </div>

            {/* Erreur caméra */}
            {cameraError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2 text-xs text-red-200">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="mt-3">
              {isCameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Arrêter la caméra</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] text-black font-tech font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98]"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activer la caméra</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. TIROIR MODÈLES MANUELS (FALLBACK SECOURS AVEC LOGOS SVG) ─────── */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-t-[32px] sm:rounded-3xl bg-[#121216] border border-amber-400/30 p-5 text-white shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header tiroir */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <h3 className="font-tech font-bold text-base uppercase tracking-wider text-white">
                  Choisir le modèle
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets de filtres par marque avec logos vectoriels SVG */}
            <div className="py-3 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              {SMARTPHONE_BRANDS.map((brand) => (
                <BrandFilterTab
                  key={brand}
                  brand={brand}
                  isActive={activeBrand.toLowerCase() === brand.toLowerCase()}
                  onClick={() => setActiveBrand(brand)}
                />
              ))}
            </div>

            {/* Barre de recherche instantanée */}
            <div className="relative my-1 shrink-0">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Rechercher (ex: Xiaomi, iPhone 13, S23, Camon...)"
                className="w-full bg-white/5 border border-white/15 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all"
              />
            </div>

            {/* Liste scrollable des téléphones */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-white/5">
              {filteredModels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(item.brand, item.model_name);
                    setShowModelModal(false);
                  }}
                  className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-amber-400/10 hover:border-amber-400/30 border border-transparent flex items-center justify-between transition-all cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BrandRowBadge brand={item.brand} />
                    <span className="text-sm font-sans font-medium text-white group-hover:text-amber-300 transition-colors truncate">
                      {item.model_name}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0 ml-2" />
                </button>
              ))}

              {filteredModels.length === 0 && (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  Aucun modèle trouvé pour "{modelSearch}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileTrocStep1;
