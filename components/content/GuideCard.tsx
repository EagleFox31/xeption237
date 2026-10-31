import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Play } from 'lucide-react';
import type { ArticleDef } from '../../content/seo/types';
import { Product } from '../../types';
import { estimateReadingMinutes } from '../../utils/contentMeta';
import { optimizeImage } from '../../utils/mediaOptimization';
import { guidePath } from '../../utils/routes';
import { TikTokVideoButton, tiktokCoverPath } from '../TikTokVideoButton';

interface GuideCardProps {
  guide: ArticleDef;
  /** Photo de repli quand le guide n'a pas de vidéo. */
  fallbackProduct?: Product;
}

const MEDIA_CLASS = 'relative block w-full aspect-square overflow-hidden';

/**
 * Carte de guide : la zone image lance la vidéo TikTok du guide (aperçu + bouton lecture),
 * le texte mène à l'article. Deux actions distinctes, jamais imbriquées.
 */
const GuideCard: React.FC<GuideCardProps> = ({ guide, fallbackProduct }) => {
  const video = guide.videos?.[0];
  const minutes = estimateReadingMinutes(guide);
  const tag = guide.tag && (
    <span className="absolute top-2 left-2 rounded-full bg-black/80 border border-xeption-gold/40 px-2 md:px-2.5 py-0.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-xeption-gold">
      {guide.tag}
    </span>
  );

  return (
    <article className="group flex flex-col h-full rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0c]/90 backdrop-blur-md hover:border-xeption-gold/50 transition-colors">
      {video ? (
        <TikTokVideoButton videoId={video.tiktokId} label={video.label} title={video.title} className={MEDIA_CLASS}>
          <img src={tiktokCoverPath(video.tiktokId)} alt="" loading="lazy" className="w-full h-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-xeption-gold/90 flex items-center justify-center shadow-[0_0_25px_rgba(255,215,0,0.45)] group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 md:w-6 md:h-6 text-black ml-0.5" fill="black" />
            </span>
          </span>
          <span className="absolute bottom-2 left-2 text-[10px] md:text-[11px] font-bold text-white" aria-hidden>Voir la vidéo</span>
          {tag}
        </TikTokVideoButton>
      ) : (
        <Link to={guidePath(guide.slug)} className={`${MEDIA_CLASS} bg-white`} tabIndex={-1} aria-hidden>
          {fallbackProduct?.image ? (
            <img src={optimizeImage(fallbackProduct.image, 400)} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a1f] to-black">
              <BookOpen className="w-12 h-12 text-xeption-gold/80" />
            </span>
          )}
          {tag}
        </Link>
      )}

      <Link to={guidePath(guide.slug)} className="flex flex-col flex-1 p-2.5 md:p-4">
        <span className="text-sm md:text-base font-bold text-white leading-snug line-clamp-3 md:line-clamp-none group-hover:text-xeption-gold transition-colors">{guide.navLabel}</span>
        <span className="max-md:hidden mt-1.5 text-sm text-gray-400 leading-relaxed line-clamp-3">{guide.summary}</span>
        <span className="mt-auto pt-3 md:pt-4 flex items-center justify-between gap-2 text-[10px] md:text-xs">
          <span className="max-sm:hidden inline-flex items-center gap-1.5 text-gray-500">
            <Clock className="w-3.5 h-3.5" aria-hidden /> {minutes} min
          </span>
          <span className="inline-flex items-center gap-1 font-tech font-bold uppercase tracking-wider text-xeption-gold">
            Lire le guide <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </span>
        </span>
      </Link>
    </article>
  );
};

export default GuideCard;
