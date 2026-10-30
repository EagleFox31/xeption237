import React from 'react';
import type { FaqItem } from '../../content/seo/types';

/** FAQ visible (exigée pour publier un FAQPage JSON-LD). */
const FaqSection: React.FC<{ items: FaqItem[]; title?: string }> = ({ items, title = 'Questions fréquentes' }) => {
  if (!items.length) return null;
  return (
    <section className="mt-12" aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-xl md:text-2xl font-tech font-bold uppercase tracking-wide text-white mb-4">
        {title}
      </h2>
      <div className="divide-y divide-white/10 border border-white/10 rounded-lg bg-[#0f0f0f]/80">
        {items.map((item) => (
          <details key={item.q} className="group p-4">
            <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-semibold text-white">
              <span>{item.q}</span>
              <span className="text-xeption-gold transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-3 text-sm text-gray-300 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
};

export default FaqSection;
