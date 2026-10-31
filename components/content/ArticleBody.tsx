import React from 'react';
import { Link } from 'react-router-dom';
import type { ArticleSection } from '../../content/seo/types';
import { INSTITUTIONAL_SECTION_BODY_CLASS, INSTITUTIONAL_SECTION_CLASS, INSTITUTIONAL_SECTION_DIVIDER_CLASS, INSTITUTIONAL_SECTION_HEADING_CLASS } from '../../constants/institutionalPageStyles';

/** Rendu des sections d'un guide ou d'une page d'aide. */
const ArticleBody: React.FC<{ sections: ArticleSection[] }> = ({ sections }) => (
  <div className="space-y-6">
    {sections.map((section) => (
      <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className={INSTITUTIONAL_SECTION_CLASS}>
        <h2 id={`${section.id}-title`} className={`${INSTITUTIONAL_SECTION_HEADING_CLASS} mb-4 pb-4 ${INSTITUTIONAL_SECTION_DIVIDER_CLASS}`}>
          {section.heading}
        </h2>
        <div className={`${INSTITUTIONAL_SECTION_BODY_CLASS} max-w-3xl`}>
        {section.paragraphs.map((text, i) => (
          <p key={i}>
            {text}
          </p>
        ))}
        {section.bullets?.length ? (
          <ul className="list-disc pl-5 space-y-1.5">
            {section.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : null}
        {section.links?.length ? (
          <p className="pt-1 flex flex-wrap gap-x-5 gap-y-2">
            {section.links.map((l) => (
              <Link key={l.to} to={l.to} className="text-xeption-gold underline underline-offset-4 hover:text-white">
                {l.label}
              </Link>
            ))}
          </p>
        ) : null}
        </div>
      </section>
    ))}
  </div>
);

export default ArticleBody;
