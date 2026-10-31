import React from 'react';
import { Play } from 'lucide-react';
import TikTokVideoButton, { tiktokCoverPath } from '../TikTokVideoButton';
import type { ArticleVideo } from '../../content/seo/types';

/** Les libellés commencent par « Vidéo : » pour les liens texte ; l'encart le dit déjà visuellement. */
const VIDEO_LABEL_PREFIX = /^vidéo\s*:\s*/i;
export const videoHeadline = (label: string): string => {
  const text = label.replace(VIDEO_LABEL_PREFIX, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Encart vidéo d'en-tête : miniature + gros bouton lecture, repérable d'un coup d'œil.
 * Pour le lecteur pressé, la vidéo est l'alternative à l'article : elle doit se voir avant le texte.
 */
const VideoTeaser: React.FC<{ video: ArticleVideo; eyebrow?: string; className?: string }> = ({
  video,
  eyebrow = 'En vidéo',
  className = '',
}) => (
  <TikTokVideoButton
    videoId={video.tiktokId}
    label={video.label}
    title={video.title}
    className={`group flex w-full max-w-md items-center gap-4 rounded-2xl border border-xeption-gold/40 bg-xeption-gold/[0.06] p-3 text-left hover:border-xeption-gold hover:bg-xeption-gold/10 transition-colors ${className}`}
  >
    <span className="relative w-20 sm:w-24 shrink-0 aspect-[9/16] overflow-hidden rounded-xl bg-black">
      <img src={tiktokCoverPath(video.tiktokId)} alt="" loading="lazy" className="w-full h-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/30" aria-hidden>
        <span className="w-11 h-11 rounded-full bg-xeption-gold flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.5)]">
          <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
        </span>
      </span>
    </span>
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{eyebrow}</span>
      <span className="font-bold text-white leading-snug">{videoHeadline(video.label)}</span>
      <span className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-xeption-gold px-4 py-2 text-xs font-tech font-bold uppercase tracking-wider text-black group-hover:brightness-110">
        <Play className="w-3.5 h-3.5" fill="black" aria-hidden /> Regarder la vidéo
      </span>
    </span>
  </TikTokVideoButton>
);

/** Encarts vidéo d'en-tête de page (guide, landing) ; rien si aucune vidéo. */
export const VideoTeaserList: React.FC<{ videos?: ArticleVideo[]; eyebrow?: string }> = ({ videos, eyebrow }) =>
  videos?.length ? (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 max-w-4xl">
      {videos.map((video) => (
        <VideoTeaser key={video.tiktokId} video={video} eyebrow={eyebrow} />
      ))}
    </div>
  ) : null;

export default VideoTeaser;
