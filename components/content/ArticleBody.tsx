import React from 'react';
import { Link } from 'react-router-dom';
import type { ArticleSection } from '../../content/seo/types';

/** Rendu des sections d'un guide ou d'une page d'aide. */
const ArticleBody: React.FC<{ sections: ArticleSection[] }> = ({ sections }) => (
  <div className="space-y-10">
    {sections.map((section) => (
      <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
        <h2 id={`${section.id}-title`} className="text-xl md:text-2xl font-tech font-bold uppercase tracking-wide text-white mb-3">
          {section.heading}
        </h2>
        {section.paragraphs.map((text) => (
          <p key={text} className="text-gray-300 leading-relaxed mb-3">
            {text}
          </p>
        ))}
        {section.bullets?.length ? (
          <ul className="list-disc pl-5 space-y-1.5 text-gray-300">
            {section.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
        {section.links?.length ? (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {section.links.map((l) => (
              <Link key={l.to} to={l.to} className="text-xeption-gold underline underline-offset-4 hover:text-white">
                {l.label}
              </Link>
            ))}
          </p>
        ) : null}
      </section>
    ))}
  </div>
);

export default ArticleBody;
