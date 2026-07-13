import React from 'react';
import {
  formatTrocFee,
  TROC_TIER_LABELS,
  TROC_TIER_PRICES,
  TROC_TUNNEL_TIER,
} from '../../utils/trocPricing';

const SERVICES = [
  {
    key: 'troc',
    title: 'Troquer mon appareil',
    tier: TROC_TUNNEL_TIER,
    includes:
      'estimation IA du prix de reprise, rapport d’expertise, vérification IMEI, bon de reprise indicatif',
  },
  {
    key: 'certif',
    title: 'Certifier mon appareil',
    tier: 'certif' as const,
    includes:
      'vérification IMEI, certificat officiel téléchargeable pour rassurer un acheteur (sans reprise en boutique)',
  },
] as const;

/** Bloc juridique partagé CGV / CGV Smart Troc — montants depuis `trocPricing.ts`. */
export const TrocServiceFeesLegal: React.FC = () => (
  <>
    <p>
      L’accès à chaque service est soumis au paiement d’un{' '}
      <strong className="text-white">frais de service forfaitaire</strong>, affiché sur le site{' '}
      <strong className="text-white">avant le début du parcours</strong> et confirmé à l’étape de
      paiement Mobile Money. Le Client choisit l’un des deux services proposés en entrée de la page{' '}
      <strong className="text-white">Smart Troc</strong> ; le montant ne varie pas en cours de
      parcours.
    </p>
    <ul className="space-y-3 pl-0 list-none">
      {SERVICES.map(({ key, title, tier, includes }) => (
        <li
          key={key}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-gray-300"
        >
          <p className="text-white font-semibold text-sm mb-1">
            {title} — {formatTrocFee(TROC_TIER_PRICES[tier])}
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            Inclut : {includes}.
          </p>
        </li>
      ))}
    </ul>
    <p>
      Le service de reprise ({TROC_TIER_LABELS[TROC_TUNNEL_TIER]}) et le service de certification (
      {TROC_TIER_LABELS.certif}) sont <strong className="text-white">distincts</strong> : le
      certificat de reprise ne remplace pas le certificat IMEI, et inversement.
    </p>
    <p>
      Ces frais sont <strong className="text-white">non remboursables</strong>, y compris en cas de refus
      ultérieur de l’offre par le Client ou de non-présentation de l’appareil en boutique (service
      reprise uniquement).
    </p>
    <p>
      En cas de reprise effective de l’appareil, le montant payé pour le service « Troquer mon
      appareil » est <strong className="text-white">déduit de la valeur du bon d&apos;achat</strong>{' '}
      accordé au Client.
    </p>
    <p className="text-gray-500 text-xs italic">
      Le paiement s’effectue par Mobile Money (Orange Money ou MTN MoMo) via le prestataire intégré au
      site.
    </p>
  </>
);
