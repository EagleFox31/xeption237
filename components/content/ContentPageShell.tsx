import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface ShellCrumb {
  name: string;
  path?: string;
}

/** Gabarit commun des pages de contenu : fil d'Ariane cliquable + H1 unique. */
const ContentPageShell: React.FC<{
  crumbs: ShellCrumb[];
  h1: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}> = ({ crumbs, h1, lead, children }) => (
  <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 text-white">
    <nav aria-label="Fil d'Ariane" className="mb-6 text-xs text-gray-400">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={c.name} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3" aria-hidden />}
            {c.path ? (
              <Link to={c.path} className="hover:text-xeption-gold">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-gray-200">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
    <header className="mb-8">
      <h1 className="text-3xl md:text-4xl font-tech font-bold uppercase tracking-wide">{h1}</h1>
      {lead}
    </header>
    {children}
  </article>
);

export default ContentPageShell;
