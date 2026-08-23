import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { PageSEO } from '../utils/seo';
import { FEEDBACK_KIND_LABELS } from '../utils/orderFeedback';
import {
  getPublicFeedbackInvite,
  submitPublicFeedback,
  type PublicFeedbackInvite,
} from '../services/orderFeedback';

type LoadState = 'loading' | 'ok' | 'too_early' | 'missing' | 'error';

const promptFor = (invite: PublicFeedbackInvite): string => {
  if (invite.kind === 'service') {
    return `${invite.firstName}, comment s’est passé l’accueil en boutique ?`;
  }
  if (invite.kind === 'sav') {
    return `${invite.firstName}, l’atelier a bien traité ${invite.headline || 'ton appareil'} ?`;
  }
  return `${invite.firstName}, ${invite.headline || 'ton appareil'} est comme prévu ?`;
};

const FeedbackPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [load, setLoad] = useState<LoadState>('loading');
  const [invite, setInvite] = useState<PublicFeedbackInvite | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setLoad('missing');
        return;
      }
      try {
        const data = await getPublicFeedbackInvite(token);
        if (cancelled) return;
        if (!data) {
          setLoad('missing');
          return;
        }
        if ('tooEarly' in data) {
          setLoad('too_early');
          return;
        }
        setInvite(data);
        setDone(data.already);
        setLoad('ok');
      } catch {
        if (!cancelled) setLoad('error');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || rating < 1) {
      setError('Choisis une note de 1 à 5.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await submitPublicFeedback({ token, rating, comment: comment.trim() || undefined });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible pour le moment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10 md:py-16">
      <PageSEO
        title="Ton avis Xeption"
        description="Note l’accueil, le produit ou le SAV Xeption."
        path={token ? `/avis/${token}` : '/avis'}
        noindex
      />
      <div className="rounded-xl border border-white/15 bg-[#0a0a0a] p-6 md:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        <p className="text-[10px] font-tech font-bold uppercase tracking-[0.2em] text-xeption-gold mb-2">
          Xeption · 237
        </p>
        {load === 'loading' && <p className="text-white">On prépare ta page…</p>}
        {load === 'missing' && (
          <p className="text-white">Ce lien d’avis n’existe pas ou a déjà expiré.</p>
        )}
        {load === 'too_early' && (
          <p className="text-white">
            Cet avis produit s’ouvre une semaine après la remise. Reviens un peu plus tard.
          </p>
        )}
        {load === 'error' && (
          <p className="text-white">Impossible de charger l’avis. Réessaie dans un instant.</p>
        )}
        {load === 'ok' && invite && done && (
          <div>
            <h1 className="text-2xl font-tech font-bold uppercase text-white mb-2">Merci</h1>
            <p className="text-white/80 text-sm leading-relaxed">
              Ton avis est enregistré. Ça nous aide à mieux recevoir les clients à Yaoundé.
            </p>
          </div>
        )}
        {load === 'ok' && invite && !done && (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
            <p className="text-xs font-tech font-bold uppercase tracking-wider text-white/70">
              {FEEDBACK_KIND_LABELS[invite.kind]}
            </p>
            <h1 className="text-xl md:text-2xl font-tech font-bold uppercase text-white leading-snug">
              {promptFor(invite)}
            </h1>
            <div className="flex items-center gap-1" role="group" aria-label="Note de 1 à 5">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1.5"
                    aria-label={`${n} sur 5`}
                  >
                    <Star
                      className={`w-9 h-9 ${active ? 'text-xeption-gold' : 'text-white/25'}`}
                      fill={active ? 'currentColor' : 'none'}
                    />
                  </button>
                );
              })}
            </div>
            <label className="block">
              <span className="text-xs font-tech uppercase text-white/70">Un mot, si tu veux</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1.5 w-full rounded-md bg-black/60 border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-xeption-gold"
                placeholder="Ce qui s’est bien passé, ou pas."
              />
            </label>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button
              type="submit"
              disabled={sending || rating < 1}
              className="w-full py-3 rounded-md bg-xeption-gold text-black font-tech font-bold uppercase text-sm hover:bg-white transition-colors disabled:opacity-40"
            >
              {sending ? 'Envoi…' : 'Envoyer mon avis'}
            </button>
          </form>
        )}
        <Link to="/" className="inline-block mt-6 text-xs font-tech uppercase text-white/60 hover:text-xeption-gold">
          Retour à la boutique
        </Link>
      </div>
    </div>
  );
};

export default FeedbackPage;
