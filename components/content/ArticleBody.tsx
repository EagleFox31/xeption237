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
        {section.table ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <caption className="text-left text-xs text-gray-400 pb-2">{section.table.caption}</caption>
              <thead className="text-xs uppercase text-gray-400 border-b border-white/10">
                <tr>
                  {section.table.head.map((h) => (
                    <th key={h} scope="col" className="py-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.table.rows.map(([criterion, ...cells]) => (
                  <tr key={criterion} className="border-b border-white/5 align-top">
                    <th scope="row" className="py-2 pr-3 font-semibold text-white">{criterion}</th>
                    {cells.map((c, i) => (
                      <td key={i} className="py-2 pr-3">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
