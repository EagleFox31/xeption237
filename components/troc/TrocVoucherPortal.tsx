import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  ArrowRight,
  Smartphone,
  AlertCircle,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChameleoMascot } from './ChameleoMascot';
import BrandHeroLogo from './BrandHeroLogo';
import TrocUpgradeChoice from './TrocUpgradeChoice';
import {
  lookupTrocVoucher,
  toTradeInRequestView,
  targetSummaryFromPublic,
  updateTrocVoucherTarget,
  type PublicTrocVoucher,
} from '../../services/trocVoucherLookupService';
import { getProductDisplayName } from '../../utils/productDisplay';
import { normalizeVoucherLookupRef } from '../../utils/trocVoucherRef';
import type { Product } from '../../types';
import { notifyError, notifySuccess } from '../../utils/notify';

const TrocVoucher = lazy(() => import('./TrocVoucher').then((m) => ({ default: m.TrocVoucher })));

const STATUS_LABELS: Record<PublicTrocVoucher['status'], string> = {
  in_progress: 'En cours',
  pending: 'En attente de dépôt en boutique',
  accepted: 'Accepté',
  validated: 'Validé en boutique',
  completed: 'Échange terminé',
  refused: 'Refusé',
  cancelled: 'Annulé',
};

const bentoShell =
  'relative overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a0c]/70 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.45)]';

const bentoLaser =
  'pointer-events-none absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent';

const TrocVoucherPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [voucherRef, setVoucherRef] = useState(searchParams.get('ref') ?? '');
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voucher, setVoucher] = useState<PublicTrocVoucher | null>(null);
  const [changingTarget, setChangingTarget] = useState(false);
  const [updatingTarget, setUpdatingTarget] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setVoucherRef(normalizeVoucherLookupRef(ref));
  }, [searchParams]);

  const refFromUrl = searchParams.get('ref');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = normalizeVoucherLookupRef(voucherRef);
    const suffix = phoneSuffix.replace(/\D/g, '').slice(-4);
    if (!ref || suffix.length !== 4) {
      setError('Indique la référence du bon et les 4 derniers chiffres de ton téléphone.');
      return;
    }
    setLoading(true);
    setError('');
    setVoucher(null);
    try {
      const result = await lookupTrocVoucher(ref, suffix);
      setVoucher(result);
      setPhoneSuffix(suffix);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consultation impossible.');
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = async (product: Product) => {
    if (!voucher) return;
    setUpdatingTarget(true);
    try {
      const updated = await updateTrocVoucherTarget(
        voucher.voucher_reference ?? voucherRef.trim(),
        phoneSuffix,
        product.id,
        getProductDisplayName(product),
      );
      setVoucher(updated);
      setChangingTarget(false);
      notifySuccess('Appareil souhaité mis à jour', 'Le reste à payer a été recalculé.');
    } catch (err) {
      notifyError(
        'Modification impossible',
        err instanceof Error ? err.message : 'Réessaie ou contacte la boutique.',
      );
    } finally {
      setUpdatingTarget(false);
    }
  };

  const requestView = voucher ? toTradeInRequestView(voucher) : null;
  const targetSummary = voucher ? targetSummaryFromPublic(voucher) : null;

  return (
    <div className="pt-6 pb-20 px-4 sm:px-6 min-h-screen max-w-6xl mx-auto">
      {!voucher ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Gauche — hero + formulaire */}
          <div className={`${bentoShell} lg:col-span-7 p-6 sm:p-8`}>
            <div className={bentoLaser} />

            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 bg-emerald-500/10 text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] font-tech border border-emerald-500/30 rounded-full">
              <Sparkles className="w-3 h-3 shrink-0" />
              Bon Smart Troc · consultation sécurisée
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-tech font-bold uppercase text-white tracking-wide leading-tight">
              Mon bon{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-amber-300">
                Smart Troc
              </span>
            </h1>
            <p className="text-sm sm:text-base text-white/70 mt-3 max-w-lg leading-relaxed">
              Retrouve ton bon, vérifie le statut, modifie l&apos;appareil souhaité et retélécharge le PDF.
            </p>

            {refFromUrl && (
              <p className="mt-4 text-xs text-xeption-gold/90 bg-xeption-gold/10 border border-xeption-gold/25 rounded-xl px-4 py-3 leading-relaxed">
                Référence <span className="font-mono font-bold">{normalizeVoucherLookupRef(refFromUrl)}</span> détectée.
                Entre les 4 derniers chiffres de ton téléphone pour ouvrir le bon.
              </p>
            )}

            <form onSubmit={handleLookup} className="mt-6 sm:mt-8 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-tech uppercase tracking-widest text-white/60 mb-1.5 block">
                    Référence du bon
                  </label>
                  <input
                    type="text"
                    value={voucherRef}
                    onChange={(e) => setVoucherRef(e.target.value.toUpperCase())}
                    placeholder="TRC-1787741068"
                    className="w-full bg-black/50 border border-white/15 text-white px-4 py-3 rounded-xl focus:border-xeption-gold focus:ring-1 focus:ring-xeption-gold/40 outline-none font-mono tracking-wide transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-tech uppercase tracking-widest text-white/60 mb-1.5 block">
                    4 derniers chiffres du téléphone
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={phoneSuffix}
                    onChange={(e) => setPhoneSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full bg-black/50 border border-white/15 text-white px-4 py-3 rounded-xl focus:border-xeption-gold focus:ring-1 focus:ring-xeption-gold/40 outline-none font-mono tracking-[0.4em] text-center text-lg transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-xeption-gold text-black font-tech font-bold uppercase tracking-wider px-8 py-3.5 rounded-xl hover:bg-white hover:shadow-[0_0_24px_rgba(255,215,0,0.35)] transition-all disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Recherche…' : 'Voir mon bon'}
              </button>
            </form>

            {error && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm font-tech font-bold uppercase tracking-wide text-red-300">
                    Consultation impossible
                  </p>
                  <p className="text-sm text-red-200/90 mt-1 leading-relaxed">{error}</p>
                  <p className="text-xs text-white/50 mt-2 leading-relaxed">
                    Vérifie la référence sur ton bon (TRC-…) et les 4 derniers chiffres du numéro utilisé
                    lors de l&apos;évaluation. Les anciens PDF « TR-TRC-… » sont aussi acceptés.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Droite — mascotte */}
          <div
            className={`${bentoShell} lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 min-h-[280px] lg:min-h-0`}
          >
            <div className={bentoLaser} />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-xeption-gold/5 pointer-events-none" />
            <div className="relative flex flex-col items-center justify-center flex-1 py-4">
              <div className="absolute w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <ChameleoMascot
                size="lg"
                pose="inspector"
                state={loading ? 'scanning' : 'idle'}
                message={
                  loading
                    ? 'Je cherche ton bon Smart Troc…'
                    : 'Entre ta référence TROC-… et les 4 derniers chiffres de ton numéro.'
                }
              />
            </div>
          </div>

          {/* Bas — 3 tuiles aide */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`${bentoShell} p-4 sm:p-5`}>
              <div className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-lg border border-white/15 bg-white/5 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-xeption-gold" />
                </div>
                <div>
                  <p className="text-[11px] font-tech font-bold uppercase tracking-wide text-white">
                    Où est ma référence ?
                  </p>
                  <p className="text-xs text-white/55 mt-1 leading-relaxed">
                    En haut de ton PDF ou de ton bon reçu par SMS — format TRC- suivi de chiffres.
                  </p>
                </div>
              </div>
            </div>

            <div className={`${bentoShell} p-4 sm:p-5`}>
              <div className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-lg border border-white/15 bg-white/5 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] font-tech font-bold uppercase tracking-wide text-white">
                    Données protégées
                  </p>
                  <p className="text-xs text-white/55 mt-1 leading-relaxed">
                    Seuls la référence et les 4 derniers chiffres du téléphone permettent d&apos;ouvrir le dossier.
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/troc"
              className={`${bentoShell} p-4 sm:p-5 group transition-all hover:border-xeption-gold/40 hover:shadow-[0_0_24px_rgba(255,215,0,0.08)]`}
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-lg border border-xeption-gold/25 bg-xeption-gold/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <RefreshCw className="w-4 h-4 text-xeption-gold" />
                </div>
                <div>
                  <p className="text-[11px] font-tech font-bold uppercase tracking-wide text-white group-hover:text-xeption-gold transition-colors">
                    Pas encore de bon ?
                  </p>
                  <p className="text-xs text-white/55 mt-1 leading-relaxed">
                    Lance une estimation Smart Troc et reçois ton bon en quelques minutes.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-tech font-bold uppercase tracking-widest text-xeption-gold">
                    Aller au troc <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      ) : (
        voucher &&
        requestView && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className={`${bentoShell} lg:col-span-8 p-6 sm:p-7 overflow-hidden`}>
                <div className={bentoLaser} />
                <div className="flex items-center justify-between gap-4 sm:gap-6">
                  <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-[10px] font-tech uppercase tracking-[0.2em] text-emerald-400 mb-2">
                      Dossier trouvé
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-tech font-bold uppercase text-white tracking-wide">
                      Mon bon{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-amber-300">
                        Smart Troc
                      </span>
                    </h1>
                    <p className="text-sm text-white/65 mt-2">
                      {voucher.device_brand} {voucher.device_model} —{' '}
                      <span className="text-white font-medium">{STATUS_LABELS[voucher.status] ?? voucher.status}</span>
                    </p>
                  </div>
                  <BrandHeroLogo
                    brandName={voucher.device_brand}
                    className="hidden sm:flex shrink-0 self-center"
                  />
                </div>
              </div>

              <div className={`${bentoShell} lg:col-span-4 p-5 flex flex-col justify-between gap-4`}>
                <div>
                  <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold mb-1">
                    Statut
                  </p>
                  <p className="text-white font-tech font-bold text-lg leading-snug">
                    {STATUS_LABELS[voucher.status] ?? voucher.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVoucher(null);
                    setChangingTarget(false);
                    setError('');
                  }}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-tech uppercase tracking-wider text-white/70 hover:text-white hover:border-white/30 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Consulter un autre bon
                </button>
              </div>
            </div>

            <div className={`${bentoShell} overflow-hidden`}>
              <Suspense
                fallback={
                  <p className="p-8 text-center text-sm text-white/60 font-sans">
                    Chargement du bon…
                  </p>
                }
              >
                <TrocVoucher
                  request={requestView}
                  initialTarget={targetSummary}
                  hideNewEvaluation
                  onPrint={() => window.print()}
                  onNewEvaluation={() => navigate('/troc')}
                  topRight={
                    voucher.canChangeTarget && !changingTarget ? (
                      <div className="rounded-xl border border-xeption-gold/30 bg-[#1c1c16]/90 p-3 sm:p-3.5 h-full flex flex-col gap-2.5">
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 shrink-0 rounded-lg border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center">
                            <Smartphone className="w-4 h-4 text-xeption-gold" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-tech font-bold text-white uppercase tracking-wide leading-snug">
                              Changer l&apos;appareil souhaité
                            </p>
                            <p className="text-[10px] text-white/55 mt-1 leading-relaxed">
                              Le reste à payer se recalcule selon le nouveau prix boutique.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setChangingTarget(true)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-xeption-gold/40 bg-xeption-gold/10 text-xeption-gold text-[10px] font-tech font-bold uppercase hover:bg-xeption-gold/20 transition-all"
                        >
                          Modifier <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ) : undefined
                  }
                  changeTargetPanel={
                    voucher.canChangeTarget && changingTarget ? (
                      <div>
                        <p className="text-sm font-tech font-bold text-white uppercase mb-4">
                          Choisis un nouvel appareil cible
                        </p>
                        {updatingTarget ? (
                          <p className="text-sm text-white/70 text-center py-8">Mise à jour en cours…</p>
                        ) : (
                          <TrocUpgradeChoice
                            credit={voucher.trade_in_value}
                            deviceBrand={voucher.device_brand}
                            onSelect={handleTargetChange}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setChangingTarget(false)}
                          className="mt-4 text-xs text-white/50 hover:text-white font-tech uppercase"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              </Suspense>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default TrocVoucherPortal;
