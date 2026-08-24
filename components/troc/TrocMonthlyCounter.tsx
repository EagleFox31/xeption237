import React from 'react';
import { useTrocMonthlyCounter } from '../../hooks/useTrocMonthlyCounter';

interface TrocMonthlyCounterProps {
  /**
   * Optionnel — si fourni, court-circuite le hook (utile pour les tests / stories).
   * Règles : null/<50 = masqué, 50-499 = message soft, 500-999 = "temps réel", ≥1000 = chiffre réel.
   */
  count?: number | null;
  className?: string;
}

/**
 * Preuve sociale sous le CTA landing — pas de chiffre fictif.
 * Auto-fetch via Supabase (cache 5 min) si `count` n'est pas fourni en prop.
 *
 * Évaluations en ligne (Cameroun entier) → pas de ville mentionnée pour rester
 * inclusif (Douala, Bafoussam, etc.).
 */
export const TrocMonthlyCounter: React.FC<TrocMonthlyCounterProps> = ({
  count: countProp,
  className = '',
}) => {
  const fromHook = useTrocMonthlyCounter();
  const loading = countProp !== undefined ? false : fromHook.loading;
  const count = countProp !== undefined ? countProp : fromHook.count;

  if (loading || count == null || count < 50) return null;

  const text =
    count >= 1000
      ? `Déjà +${count.toLocaleString('fr-FR')} appareils évalués ce mois au Cameroun`
      : count >= 500
      ? 'Évaluations Smart Troc en temps réel ce mois'
      : 'Premières évaluations Smart Troc de ce mois';

  return (
    <p
      className={`text-[11px] font-sans text-white/70 text-center md:text-left ${className}`}
      aria-live="polite"
    >
      {text}
    </p>
  );
};
