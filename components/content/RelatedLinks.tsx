import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ContentLink } from '../../content/seo/types';
import { INSTITUTIONAL_SECTION_CLASS } from '../../constants/institutionalPageStyles';

/** Liste de liens internes crawlables (maillage catégories / guides / aide). */
const RelatedLinks: React.FC<{ title: string; links: ContentLink[]; className?: string }> = ({
  title,
  links,
  className = `mt-6 ${INSTITUTIONAL_SECTION_CLASS}`,
}) => {
  if (!links.length) return null;
  return (
    <nav className={className} aria-label={title}>
      <h2 className="text-lg md:text-xl font-tech font-bold uppercase tracking-wide text-white mb-4">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group flex items-center justify-between gap-3 h-full p-4 rounded-lg border border-white/10 bg-[#0f0f0f]/80 text-sm text-gray-200 hover:border-xeption-gold/50 hover:text-xeption-gold transition-colors"
            >
              <span>{link.label}</span>
              <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default RelatedLinks;
