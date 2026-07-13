import { Product } from '../types';
import { getProductDisplayName } from './productDisplay';
import type { FaqEntry } from './seo';

/**
 * Génère les questions/réponses d'une fiche produit à partir de données RÉELLES
 * (jamais de réponse inventée). Cette liste est la source unique utilisée à la fois
 * pour le rendu visible (ProductDetail) et pour le FAQPage JSON-LD (ProductPage),
 * afin qu'affichage et schéma restent strictement identiques (exigence policy Google).
 */
export const buildProductFaq = (product: Product): FaqEntry[] => {
  const name = getProductDisplayName(product);
  const faq: FaqEntry[] = [];

  // État (neuf / reconditionné) — basé sur product.condition
  if (product.condition === 'refurbished') {
    faq.push({
      q: `Le ${name} est-il neuf ou reconditionné ?`,
      a: `Le ${name} est un produit reconditionné, testé et certifié conforme par Xeption Network avant expédition.`,
    });
  } else if (product.condition === 'new') {
    faq.push({
      q: `Le ${name} est-il neuf et authentique ?`,
      a: `Oui, le ${name} est neuf, scellé ou certifié conforme. Xeption Network ne vend que des produits authentiques.`,
    });
  }

  // Garantie — basé sur warrantyMonths
  const warranty = Number(product.warrantyMonths || 0);
  if (warranty > 0) {
    const type = product.condition === 'new' ? 'constructeur' : 'Xeption';
    faq.push({
      q: `Quelle est la garantie du ${name} ?`,
      a: `Le ${name} est couvert par une garantie ${type} de ${warranty} mois, service après-vente inclus.`,
    });
  }

  // Livraison — politique réelle du site (affichée aussi dans la TrustBar)
  faq.push({
    q: `Livrez-vous le ${name} à Yaoundé et Douala ?`,
    a: `Oui. Le ${name} est expédié sous 24h à Yaoundé et Douala, et livré partout au Cameroun.`,
  });

  // Paiement — moyens réellement acceptés
  faq.push({
    q: `Quels moyens de paiement acceptez-vous pour le ${name} ?`,
    a: `Vous pouvez payer le ${name} en espèces, par Orange Money ou par MTN Mobile Money, selon les modalités de commande.`,
  });

  return faq;
};
