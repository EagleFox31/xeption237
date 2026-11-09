import { FREE_DELIVERY_THRESHOLD_XAF } from '../../constants/delivery';
import {
  SHOP_MAPS_URL,
  SHOP_OLEMBE_ADDRESS,
  SHOP_OLEMBE_PHONE_DISPLAY,
  SHOP_PHONE_DISPLAY,
} from '../../constants/contact';
import { GUIDES } from './guides';
import { HELP_TOPICS } from './helpTopics';
import { LANDING_PAGES } from './landingPages';

/** Doit rester égal à SITE_URL de utils/seo.tsx (non importé : ce module est chargé par vite.config.ts). */
export const LLMS_SITE_URL = 'https://www.xeptionetwork.shop';

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
const link = (path: string, label: string, note?: string) =>
  `- [${label}](${LLMS_SITE_URL}${path})${note ? `: ${note}` : ''}`;

/**
 * llms.txt (https://llmstxt.org) : fiche d'identité lisible par les moteurs de réponse.
 * Faits repris des constantes et des CGV ; listes générées depuis content/seo pour ne jamais dériver.
 * Pas de prix ni de stock : ils changent chaque jour et vivent sur les fiches produit.
 */
export const buildLlmsTxt = (): string =>
  [
    '# Xeption Network',
    '',
    '> Boutique high-tech à Yaoundé (Cameroun) : vente de smartphones, PC portables, tablettes, montres et accessoires, neufs ou reconditionnés, et reprise d’appareils (Smart Troc).',
    '',
    `- Boutique principale : Boutique 2063, Mfoundi Mall, Yaoundé, Cameroun. Tél. ${SHOP_PHONE_DISPLAY}. Plan : ${SHOP_MAPS_URL}`,
    `- Second point de vente : ${SHOP_OLEMBE_ADDRESS}. Tél. ${SHOP_OLEMBE_PHONE_DISPLAY}`,
    '- Horaires : tous les jours de 9 h à 22 h.',
    '- Paiement : Orange Money, MTN Mobile Money, espèces (à la livraison ou en boutique).',
    `- Livraison : Yaoundé en 24 à 48 h ouvrées, Douala en 48 à 72 h ouvrées, autres villes du Cameroun en 3 à 7 jours ouvrés. Offerte dès ${fcfa(FREE_DELIVERY_THRESHOLD_XAF)} d’achat ; retrait gratuit en boutique.`,
    '- Retours : 15 jours, retour en boutique au Mfoundi Mall (conditions dans les CGV).',
    '- Garantie : garanties légales sur tous les produits ; la garantie commerciale éventuelle est indiquée sur la fiche produit et la facture.',
    '- Smart Troc : estimation en ligne de l’ancien appareil, puis validation de la reprise au dépôt en boutique ; la valeur devient un bon d’achat.',
    '',
    '## Rayons',
    ...LANDING_PAGES.map((l) => link(`/categorie/${l.slug}`, l.navLabel)),
    link('/shop', 'Toute la boutique'),
    '',
    "## Guides d'achat",
    ...GUIDES.map((g) => link(`/guides/${g.slug}`, g.navLabel, g.summary)),
    '',
    '## Aide',
    ...HELP_TOPICS.map((h) => link(`/aide/${h.slug}`, h.navLabel, h.summary)),
    link('/troc', 'Smart Troc', 'estimer et revendre son appareil'),
    link('/contact', 'Contact et accès boutique'),
    link('/cgv', 'Conditions générales de vente'),
    '',
  ].join('\n');
