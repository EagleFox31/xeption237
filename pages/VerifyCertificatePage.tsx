import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck, ShieldCheck, ShieldAlert, Smartphone, Award, ScanLine, AlertTriangle, ArrowLeft,
} from 'lucide-react';
import { PageSEO } from '../utils/seo';
import { getCertificateByToken, type CertificateVerifyResult } from '../services/trocEvaluationService';
import { CREDIT_BONUS_PERCENT } from '../utils/trocPricing';

type FetchState = 'loading' | 'ok' | 'not_found' | 'error';

const formatXaf = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `${Number(n).toLocaleString('fr-FR')} XAF`;
};

const formatDateFr = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const tierLabel = (tier: string | null): string => {
  if (tier === 'safety')  return 'Sûreté (1 000 F)';
  if (tier === 'premium') return 'Premium (500 F)';
  return 'Express';
};

const gradeLabel = (g: string | null): string => {
  if (g === 'excellent') return 'Excellent état';
  if (g === 'bon')       return 'Bon état';
  if (g === 'pieces')    return 'Pour pièces';
  if (g === 'refuse')    return 'Refusé';
  return '—';
};

const VerifyCertificatePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState]   = useState<FetchState>('loading');
  const [cert, setCert]     = useState<CertificateVerifyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setState('not_found');
        return;
      }
      try {
        const data = await getCertificateByToken(token);
        if (cancelled) return;
        if (!data) {
          setState('not_found');
          return;
        }
        setCert(data);
        setState('ok');
      } catch {
        if (!cancelled) setState('error');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen bg-black text-white py-10 px-4">
      <PageSEO
        title="Vérification de certificat Smart Troc"
        description="Vérifiez l'authenticité d'un rapport d'expertise Smart Troc Xeption."
        path={token ? `/verify/${token}` : '/verify'}
        noindex
      />

      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-xeption-gold text-sm font-tech uppercase tracking-wider mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        {state === 'loading' && (
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-10 text-center">
            <div className="w-10 h-10 border-4 border-xeption-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-6 text-gray-400 text-sm">Vérification du certificat…</p>
          </div>
        )}

        {state === 'not_found' && (
          <div className="bg-black/40 backdrop-blur-xl border border-red-900/50 rounded-xl p-10 text-center">
            <div className="w-16 h-16 mx-auto bg-red-950/50 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-tech font-bold uppercase tracking-wider text-red-300 mb-3">
              Certificat introuvable
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Le lien que vous avez scanné ne correspond à aucun certificat dans notre base.
              Vérifiez le QR code ou contactez la boutique.
            </p>
            <Link
              to="/troc"
              className="inline-block mt-6 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest text-xs px-6 py-3 transition-colors"
            >
              Estimer mon prix
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-black/40 backdrop-blur-xl border border-orange-900/50 rounded-xl p-10 text-center">
            <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-4" />
            <h1 className="text-xl font-tech font-bold uppercase tracking-wider text-orange-300 mb-3">
              Vérification indisponible
            </h1>
            <p className="text-gray-400 text-sm">
              Une erreur est survenue. Réessayez dans quelques instants ou contactez la boutique.
            </p>
          </div>
        )}

        {state === 'ok' && cert && (
          <>
            {/* En-tête authentifié */}
            <div className="bg-gradient-to-br from-xeption-gold/15 to-transparent border border-xeption-gold/30 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-xeption-gold rounded-full flex items-center justify-center">
                  <BadgeCheck className="w-6 h-6 text-black" />
                </div>
                <div>
                  <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold">
                    Certificat authentique
                  </p>
                  <p className="text-white font-tech font-bold text-lg">{cert.reference}</p>
                </div>
              </div>
              <p className="text-gray-300 text-xs">
                Émis le <span className="text-white">{formatDateFr(cert.created_at)}</span> · {cert.verified_count} vérification{cert.verified_count > 1 ? 's' : ''} enregistrée{cert.verified_count > 1 ? 's' : ''}
              </p>
            </div>

            {/* Appareil */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-xeption-gold" />
                <h2 className="text-sm font-tech font-bold uppercase tracking-wider text-gray-400">Appareil évalué</h2>
              </div>
              <p className="text-white font-bold text-xl">
                {cert.device_brand} {cert.device_model}
              </p>
              {cert.device_storage && (
                <p className="text-gray-400 text-sm mt-1">{cert.device_storage}</p>
              )}
              {cert.imei_last4 && (
                <p className="text-gray-500 text-xs mt-2 font-mono">IMEI {cert.imei_last4}</p>
              )}
            </div>

            {/* Diagnostic */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <ScanLine className="w-5 h-5 text-xeption-gold" />
                <h2 className="text-sm font-tech font-bold uppercase tracking-wider text-gray-400">Diagnostic</h2>
              </div>
              <div className="space-y-3">
                <Row label="Score d'état"   value={`${cert.ai_score ?? '—'} / 100`} />
                <Row label="Grade"          value={gradeLabel(cert.trade_in_grade)} />
                <Row
                  label="Vérification IMEI"
                  value={
                    cert.imei_assurance_level === 'premium'
                      ? (cert.imei_blacklist_status === 'clear'
                          ? 'Premium — blacklist mondiale ✓'
                          : 'Premium')
                      : 'Standard'
                  }
                />
              </div>
            </div>

            {/* Valeur de reprise */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-xeption-gold" />
                <h2 className="text-sm font-tech font-bold uppercase tracking-wider text-gray-400">Offre de reprise</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-xeption-gold/10 border border-xeption-gold/30 rounded-lg p-4">
                  <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold mb-1">Crédit boutique</p>
                  <p className="text-2xl font-bold text-white">{formatXaf(cert.trade_in_value)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">+{CREDIT_BONUS_PERCENT} % bonus inclus</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-[10px] font-tech uppercase tracking-widest text-gray-500 mb-1">Cash immédiat</p>
                  <p className="text-2xl font-bold text-gray-200">{formatXaf(cert.trade_in_value_cash)}</p>
                </div>
              </div>
            </div>

            {/* Formule */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-xeption-gold" />
                <h2 className="text-sm font-tech font-bold uppercase tracking-wider text-gray-400">Formule de service</h2>
              </div>
              <p className="text-white text-lg font-tech font-bold">{tierLabel(cert.tier)}</p>
            </div>

            {/* Mentions légales */}
            <p className="text-[10px] text-gray-600 text-center leading-relaxed">
              Ce certificat atteste d'une évaluation Smart Troc effectuée via l'IA Xeption.
              La validation définitive est faite en boutique sur présentation de l'appareil.
              Xeption Network 237 · Mfoundi Mall · Olembé, Yaoundé · xeptionetwork.shop
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-400">{label}</span>
    <span className="text-white font-bold">{value}</span>
  </div>
);

export default VerifyCertificatePage;
