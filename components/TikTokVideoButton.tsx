import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlayCircle, X } from 'lucide-react';

export interface TikTokVideoButtonProps {
  videoId: string;
  label: string;
  /** Titre accessible de la fenêtre vidéo. */
  title: string;
  className?: string;
  /** Contenu visuel du déclencheur (ex. couverture) ; `label` devient alors l'étiquette accessible. */
  children?: React.ReactNode;
}

/** Lecteur officiel TikTok (https://developers.tiktok.com/doc/embed-player). */
/** Couverture hébergée localement (voir scripts/fetch-tiktok-covers.mjs). */
export const tiktokCoverPath = (videoId: string): string => `/media/tiktok/${videoId}.webp`;

export const buildTikTokPlayerUrl = (videoId: string): string =>
  `https://www.tiktok.com/player/v1/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;

/**
 * Bouton qui ouvre une vidéo TikTok dans une fenêtre modale.
 * L'iframe n'est créée qu'à l'ouverture : aucun script tiers au chargement de la page.
 */
export const TikTokVideoButton: React.FC<TikTokVideoButtonProps> = ({ videoId, label, title, className = '', children }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {children ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={label} className={className}>
          {children}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center justify-center gap-1.5 font-tech font-bold uppercase tracking-wider text-amber-300 hover:text-xeption-gold transition-colors ${className}`}
        >
          <PlayCircle className="w-4 h-4" />
          <span>{label}</span>
        </button>
      )}

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-[360px]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer la vidéo"
              className="absolute -top-11 right-0 w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full aspect-[9/16] max-h-[80dvh] rounded-2xl overflow-hidden border border-xeption-gold/30 bg-black">
              <iframe
                src={buildTikTokPlayerUrl(videoId)}
                title={title}
                className="w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default TikTokVideoButton;
