import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sun,
  Crosshair,
  CheckCircle2,
  X,
  AlertTriangle,
  Check,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export interface MobileTrocStep2Props {
  currentStep?: number;
  totalSteps?: number;
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  onNext: () => void;
  onBack?: () => void;
  isUploading?: boolean;
  isCheckingPhotos?: boolean;
  error?: string | null;
  issueIndices?: number[];
  visionReady?: boolean;
  visionLoading?: boolean;
  existingPhotoUrls?: string[];
  onReset?: () => void;
}

interface AngleConfig {
  id: string;
  num: number;
  label: string;
  title: string;
  description: string;
  tip: string;
}

const ANGLES: AngleConfig[] = [
  {
    id: 'screen',
    num: 1,
    label: 'Écran',
    title: 'Écran allumé',
    description: "Montre l'écran allumé sans verrouillage masquant l'affichage.",
    tip: "Vérifie que l'écran est net, sans reflet direct et affiche l'heure.",
  },
  {
    id: 'back',
    num: 2,
    label: 'Dos',
    title: "Dos de l'appareil",
    description: 'Capture la face arrière complète avec le bloc photo visible.',
    tip: 'Retire la coque de protection pour que le châssis soit visible.',
  },
  {
    id: 'sides',
    num: 3,
    label: 'Tranche',
    title: 'Tranche & contour',
    description: 'Montre les bordures, boutons de volume et connecteur de charge.',
    tip: "L'éclairage rasant met en valeur l'état des tranches métalliques.",
  },
  {
    id: 'corners',
    num: 4,
    label: 'Angle',
    title: 'Angles & coins',
    description: 'Capture les 4 coins pour détecter les chocs éventuels.',
    tip: 'Les coins permettent à notre IA de certifier le grade esthétique.',
  },
];

const EMPTY_ISSUES: number[] = [];
const EMPTY_URLS: string[] = [];

export const MobileTrocStep2: React.FC<MobileTrocStep2Props> = ({
  currentStep = 2,
  totalSteps = 4,
  photos,
  onPhotosChange,
  onNext,
  onBack,
  isUploading = false,
  isCheckingPhotos = false,
  error = null,
  issueIndices = EMPTY_ISSUES,
  visionReady = true,
  visionLoading = false,
  existingPhotoUrls = EMPTY_URLS,
  onReset,
}) => {
  const [activeAngleIndex, setActiveAngleIndex] = useState<number>(0);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);

  // Stockage par angle (slot 0: écran, 1: dos, 2: tranche, 3: angle)
  const [angleSlots, setAngleSlots] = useState<Array<File | null>>([null, null, null, null]);
  const [savedUrls, setSavedUrls] = useState<Array<string | null>>([null, null, null, null]);

  // Ref stable vers activeAngleIndex pour éviter les stale closures dans les handlers d'input
  const activeAngleIndexRef = useRef(activeAngleIndex);
  useEffect(() => { activeAngleIndexRef.current = activeAngleIndex; }, [activeAngleIndex]);

  // Ref stable vers onPhotosChange pour éviter les stale closures
  const onPhotosChangeRef = useRef(onPhotosChange);
  useEffect(() => { onPhotosChangeRef.current = onPhotosChange; }, [onPhotosChange]);

  // Initialisation à partir des photos déjà fournies (si retour arrière)
  useEffect(() => {
    if (photos.length > 0) {
      setAngleSlots((prev) => {
        let changed = false;
        const next = [...prev];
        photos.slice(0, 4).forEach((p, idx) => {
          if (next[idx] !== p) {
            next[idx] = p;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    } else {
      setAngleSlots((prev) => (prev.some(Boolean) ? [null, null, null, null] : prev));
    }
  }, [photos]);

  // Initialisation à partir des URLs déjà uploadées (draft / session précédente)
  useEffect(() => {
    if (existingPhotoUrls && existingPhotoUrls.length > 0) {
      setSavedUrls((prev) => {
        const next = [...prev];
        let changed = false;
        existingPhotoUrls.slice(0, 4).forEach((url, idx) => {
          if (url && next[idx] !== url) {
            next[idx] = url;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [existingPhotoUrls]);

  // Deux inputs dédiés : un pour la caméra (capture), un pour la galerie (multiple)
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const activeAngle = ANGLES[activeAngleIndex] || ANGLES[0];

  // Gestion propre des Blob URLs pour les 4 slots
  const [slotPreviewUrls, setSlotPreviewUrls] = useState<Array<string | null>>([null, null, null, null]);
  const blobUrlsRef = useRef<Array<string | null>>([null, null, null, null]);

  useEffect(() => {
    const nextUrls = angleSlots.map((file, idx) => {
      const oldBlob = blobUrlsRef.current[idx];
      if (file) {
        const url = URL.createObjectURL(file);
        if (oldBlob) URL.revokeObjectURL(oldBlob);
        blobUrlsRef.current[idx] = url;
        return url;
      }
      if (oldBlob) {
        URL.revokeObjectURL(oldBlob);
        blobUrlsRef.current[idx] = null;
      }
      return savedUrls[idx] || null;
    });

    setSlotPreviewUrls(nextUrls);
  }, [angleSlots, savedUrls]);

  // Révocation de toutes les URLs résiduelles à l'unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  /**
   * Assigne un fichier au slot de l'angle courant.
   */
  const handleAssignPhotoToCurrentSlot = useCallback((file: File) => {
    const currentIdx = activeAngleIndexRef.current;
    setAngleSlots((prev) => {
      const next = [...prev];
      next[currentIdx] = file;
      onPhotosChangeRef.current(next.filter((f): f is File => Boolean(f)));
      return next;
    });
    setSavedUrls((prev) => {
      const next = [...prev];
      next[currentIdx] = null;
      return next;
    });

    // Auto-avance vers l'angle suivant non complété
    setTimeout(() => {
      setActiveAngleIndex((curr) => {
        const next = [0, 1, 2, 3].findIndex((i) => i > curr && !angleSlots[i] && !savedUrls[i]);
        return next !== -1 ? next : curr;
      });
    }, 280);
  }, [angleSlots, savedUrls]);

  // Gestion de la capture caméra
  const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAssignPhotoToCurrentSlot(file);
    e.target.value = '';
  }, [handleAssignPhotoToCurrentSlot]);

  // Gestion de l'import galerie (1 ou plusieurs photos)
  const handleGalleryUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentIdx = activeAngleIndexRef.current;
    const incoming = Array.from(files);

    setAngleSlots((prev) => {
      const next = [...prev];
      if (incoming.length === 1) {
        next[currentIdx] = incoming[0];
      } else {
        let incIdx = 0;
        if (!next[currentIdx] && !savedUrls[currentIdx]) {
          next[currentIdx] = incoming[incIdx++];
        }
        for (let i = 0; i < 4 && incIdx < incoming.length; i++) {
          if (!next[i] && !savedUrls[i]) {
            next[i] = incoming[incIdx++];
          }
        }
        for (let i = 0; i < 4 && incIdx < incoming.length; i++) {
          next[i] = incoming[incIdx++];
        }
      }
      onPhotosChangeRef.current(next.filter((f): f is File => Boolean(f)));
      return next;
    });

    setSavedUrls((prev) => {
      const next = [...prev];
      if (incoming.length === 1) {
        next[currentIdx] = null;
      } else {
        // Effacer savedUrls pour les slots remplacés
        for (let i = 0; i < 4 && i < incoming.length; i++) {
          next[i] = null;
        }
      }
      return next;
    });

    e.target.value = '';
  }, [savedUrls]);

  // Supprimer une photo précise via son index
  const handleRemovePhotoAt = useCallback((idxToRemove: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setAngleSlots((prev) => {
      const next = [...prev];
      next[idxToRemove] = null;
      onPhotosChangeRef.current(next.filter((f): f is File => Boolean(f)));
      return next;
    });
    setSavedUrls((prev) => {
      const next = [...prev];
      next[idxToRemove] = null;
      return next;
    });
    setActiveAngleIndex(idxToRemove);
  }, []);

  const openCamera = useCallback(() => {
    const input = cameraInputRef.current;
    if (!input) return;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      input.removeAttribute('capture');
    } else {
      input.setAttribute('capture', 'environment');
    }
    input.click();
  }, []);

  const openGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  // Détection unifiée : un slot est plein s'il a un fichier local OU une URL sauvegardée
  const isSlotFilled = useCallback((idx: number) => Boolean(angleSlots[idx] || savedUrls[idx]), [angleSlots, savedUrls]);
  const totalFilled = [0, 1, 2, 3].filter(isSlotFilled).length;
  const isBusy = isUploading || isCheckingPhotos;
  const canProceed = totalFilled >= 3; // L'estimation IA exige 3 photos nettes minimum
  const activeFile = angleSlots[activeAngleIndex];
  const activeHasPhoto = isSlotFilled(activeAngleIndex);
  const firstEmptyIdx = [0, 1, 2, 3].findIndex((i) => !isSlotFilled(i));

  return (
    <div className="w-full h-full min-h-[calc(100dvh-132px-96px)] flex flex-col justify-start gap-1 px-4 pt-1 pb-24 relative overflow-hidden select-none">
      {/* Halo lumineux d'ambiance en arrière-plan */}
      <div className="absolute -top-16 -right-16 w-80 h-80 bg-gradient-to-bl from-amber-400/20 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── 1. STEPPER 4 ÉTAPES NUMÉROTÉES ─────────── */}
      <div className="relative z-10 pt-1 shrink-0">
        <div className="flex items-center justify-between w-full max-w-[280px] mx-auto py-1">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum, idx) => {
            const isActive = stepNum === currentStep;
            const isDone = stepNum < currentStep;

            return (
              <React.Fragment key={stepNum}>
                <button
                  type="button"
                  disabled={!isDone}
                  onClick={() => {
                    if (isDone && onBack) onBack();
                  }}
                  title={isDone ? "Revenir à l'étape 1" : undefined}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-tech font-bold text-xs transition-all ${
                    isDone ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                  } ${
                    isActive
                      ? 'border-2 border-amber-400 bg-amber-400 text-black font-black shadow-[0_0_18px_rgba(251,191,36,0.6)] scale-110'
                      : isDone
                      ? 'border border-amber-400/80 bg-black/40 text-amber-300 font-bold'
                      : 'border border-zinc-700 bg-zinc-900/60 text-zinc-500'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
                </button>
                {idx < totalSteps - 1 && (
                  <div
                    className={`flex-1 h-[1.5px] mx-2 transition-colors ${
                      stepNum < currentStep ? 'bg-amber-400/70' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── 2. TITRE ───────────── */}
      <div className="relative z-10 pt-0.5 shrink-0 flex items-center justify-between">
        <h1 className="text-[22px] sm:text-[26px] font-tech font-black tracking-tight leading-none text-white">
          Prends{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200">
            4 photos
          </span>
        </h1>
        <span className="text-xs font-tech font-bold text-amber-400/80 uppercase tracking-wider">
          {totalFilled}/4 prises
        </span>
      </div>

      {/* ── 3. GRILLE DE 4 CASES VISIBLES (2x2) ──────────────────────── */}
      <div className="relative z-10 grid grid-cols-2 gap-2 my-1 shrink-0">
        {ANGLES.map((angle, idx) => {
          const isSelected = activeAngleIndex === idx;
          const photoFile = angleSlots[idx];
          const previewUrl = slotPreviewUrls[idx];
          const hasPhoto = Boolean(photoFile || previewUrl);
          const isFlaggedIssue = issueIndices.includes(idx + 1);

          return (
            <div
              key={angle.id}
              onClick={() => setActiveAngleIndex(idx)}
              className={`relative h-[112px] sm:h-[120px] rounded-2xl overflow-hidden cursor-pointer transition-all border-2 ${
                isSelected
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
                  : isFlaggedIssue
                  ? 'border-red-500 bg-red-950/30 animate-pulse'
                  : hasPhoto
                  ? 'border-emerald-500/60 bg-zinc-900'
                  : 'border-dashed border-zinc-700/80 bg-zinc-900/60 hover:border-zinc-500'
              }`}
            >
              {hasPhoto && previewUrl ? (
                <>
                  {/* Photo en aperçu naturel */}
                  <img
                    src={previewUrl}
                    alt={`Photo ${angle.label}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Dégradé doux pour lisibilité */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/75 pointer-events-none" />

                  {/* En-tête : Badge Nom + BOUTON SUPPRIMER (Croix rouge toujours visible) */}
                  <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between z-10">
                    <span className="px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-tech font-bold text-white uppercase tracking-wider border border-white/10">
                      {angle.num}. {angle.label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemovePhotoAt(idx, e)}
                      className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 text-white flex items-center justify-center shadow-lg transition-transform cursor-pointer border border-white/20"
                      title={`Supprimer la photo ${angle.label}`}
                      aria-label={`Supprimer la photo ${angle.label}`}
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Statut Validée en bas */}
                  <div className="absolute bottom-1.5 left-1.5 z-10">
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/95 text-black text-[9px] font-tech font-black uppercase tracking-wider flex items-center gap-1 shadow">
                      <Check className="w-2.5 h-2.5 stroke-[3]" /> Validée
                    </span>
                  </div>
                </>
              ) : (
                /* Case vide */
                <div className="w-full h-full p-2 flex flex-col justify-between items-center text-center">
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={`text-[10px] font-tech font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {angle.num}. {angle.label}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1 py-0.5">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-amber-400/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <span
                    className={`text-[9.5px] font-medium leading-tight line-clamp-1 ${
                      isSelected ? 'text-amber-300' : 'text-zinc-500'
                    }`}
                  >
                    {angle.description}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Repères qualité compacts */}
      <div className="relative z-10 flex items-center justify-center gap-3 py-0.5 text-[10px] font-tech font-bold uppercase tracking-wider text-zinc-400 shrink-0">
        <div className="flex items-center gap-1 text-amber-400/90">
          <Sun className="w-3 h-3" /><span>Lumière</span>
        </div>
        <span className="text-zinc-700">|</span>
        <div className="flex items-center gap-1 text-amber-400/90">
          <Crosshair className="w-3 h-3" /><span>Centré</span>
        </div>
        <span className="text-zinc-700">|</span>
        <div className="flex items-center gap-1 text-amber-400/90">
          <CheckCircle2 className="w-3 h-3" /><span>Net</span>
        </div>
        <button
          type="button"
          onClick={() => setIsExampleModalOpen(true)}
          className="ml-2 text-[10px] font-tech text-amber-400 hover:text-amber-300 underline underline-offset-2 tracking-wider uppercase transition-colors"
        >
          Exemple
        </button>
      </div>

      {/* ── Bannières d'état & Alertes IA ── */}
      {!visionLoading && !visionReady && (
        <div className="relative z-10 my-1 px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-100/90 leading-snug">Service temporairement très sollicité. Réessaie dans 3 minutes.</p>
        </div>
      )}

      {issueIndices && issueIndices.length > 0 && !error && (
        <div className="relative z-10 my-1 px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-100/90 leading-snug">
            {issueIndices.length === 1
              ? `La photo ${issueIndices[0]} ne montre pas clairement votre téléphone. Remplacez-la par une photo nette.`
              : `${issueIndices.length} photos ne montrent pas clairement votre téléphone. Remplacez celles signalées en rouge.`}
          </p>
        </div>
      )}

      {error && (
        <div className="relative z-10 my-1 px-3 py-2 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="leading-snug text-[11px]">{error}</span>
        </div>
      )}

      {isBusy && (
        <div role="status" className="relative z-10 my-1 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs flex items-center justify-center gap-2 font-tech">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
          <span className="tracking-wide">
            {isCheckingPhotos ? 'Contrôle IA en cours…' : 'Envoi des photos en cours…'}
          </span>
        </div>
      )}

      {/* ── 4. BOUTONS D'ACTION (Caméra / Galerie / Suivant) ─────────── */}
      <div className="relative z-10 mt-1 space-y-1.5 shrink-0">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, width: '1px', height: '1px' }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryUpload}
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, width: '1px', height: '1px' }}
        />

        {/* Actions photos */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={openCamera}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-tech font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(251,191,36,0.3)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>{activeHasPhoto ? `Reprendre (${activeAngle.label})` : `Prendre (${activeAngle.label})`}</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={openGallery}
            className="w-full py-2.5 px-3 rounded-xl bg-[#141418] hover:bg-[#1a1a20] text-white border border-zinc-700 hover:border-zinc-500 font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            <ImageIcon className="w-3.5 h-3.5 stroke-[2]" />
            <span>Galerie (1-4)</span>
          </button>
        </div>

        {/* Bouton CONTINUER TOUJOURS VISIBLE */}
        <div>
          {canProceed ? (
            <button
              type="button"
              disabled={isBusy || !visionReady || visionLoading}
              onClick={onNext}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 hover:from-emerald-300 text-black font-tech font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isCheckingPhotos ? 'Contrôle IA…' : 'Envoi en cours…'}</span>
                </>
              ) : visionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Préparation…</span>
                </>
              ) : (
                <>
                  <span>Valider mes {totalFilled} photos & Continuer</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (firstEmptyIdx !== -1) setActiveAngleIndex(firstEmptyIdx);
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-900/90 border border-amber-400/50 text-amber-300 font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:border-amber-400 active:scale-95 transition-all cursor-pointer"
            >
              <span>
                {totalFilled}/3 photos requises — Ajouter photo{' '}
                {ANGLES[firstEmptyIdx !== -1 ? firstEmptyIdx : 0]?.label}
              </span>
              <ArrowRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* ── 6. MODAL D'EXEMPLE ET CONSEILS PHOTO (Voir exemple) ─────────── */}
      {isExampleModalOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setIsExampleModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-[#0f0f13] border-t sm:border border-amber-400/40 rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-tech font-bold text-sm uppercase text-white tracking-wider">
                  Comment réussir tes photos
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsExampleModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-3">
                <Sun className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-tech font-bold uppercase text-white mb-0.5">1. Bonne lumière</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Privilégie la lumière naturelle du jour ou une pièce bien éclairée. Évite le flash direct qui crée des reflets aveuglants.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-3">
                <Crosshair className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-tech font-bold uppercase text-white mb-0.5">2. Appareil allumé &amp; propre</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Laisse l'écran allumé pour prouver que la dalle tactile fonctionne. Nettoie les traces de doigts avec un chiffon doux.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-tech font-bold uppercase text-white mb-0.5">3. 3 photos minimum requises</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    L'IA Xeption requiert l'écran allumé, le dos et les tranches pour estimer la cote maximale exacte sans refus.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExampleModalOpen(false)}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-tech font-bold uppercase tracking-wider text-xs active:scale-95 transition-transform"
            >
              J'ai compris, prendre mes photos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileTrocStep2;
