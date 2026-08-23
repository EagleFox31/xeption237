import { Product } from '../types';
import { getProductDisplayName } from './productDisplay';
import type { FaqEntry } from './seo';

type Spec = { label: string; value: string };

/** Renvoie la valeur d'une spec dont le label matche le pattern (première trouvée, non vide). */
const findSpec = (specs: Spec[], re: RegExp): string | null => {
  const s = specs.find((x) => x?.label && re.test(x.label) && (x.value || '').trim());
  return s ? s.value.trim() : null;
};

/** Décimales à la française pour la lecture grand public : "14.5" → "14,5". */
const fr = (v: string): string => v.replace(/(\d)\.(\d)/g, '$1,$2');

/** Nombre max de questions dérivées des specs (au-delà, on sature la fiche). */
const MAX_SPEC_QUESTIONS = 5;

/**
 * Génère les questions/réponses d'une fiche produit — modèle Kimovil : questions
 * DÉRIVÉES DES SPECS, uniques par produit et CONDITIONNELLES à la présence de la donnée
 * (une question n'apparaît que si la spec existe). Toutes les réponses viennent des specs
 * réelles → zéro invention. Source unique partagée entre le rendu visible (ProductDetail)
 * et le FAQPage JSON-LD (ProductPage) : affichage == schéma (exigence policy Google).
 */
export const buildProductFaq = (product: Product): FaqEntry[] => {
  const name = getProductDisplayName(product);
  const specs = (product.specs || []).filter((s) => s?.label && s?.value);
  const faq: FaqEntry[] = [];

  // --- 1. Questions dérivées des specs (uniques par produit) ---
  const specQuestions: FaqEntry[] = [];

  const ecran = findSpec(specs, /écran|ecran|display|dalle/i);
  if (ecran) {
    specQuestions.push({
      q: `Quel écran a le ${name} ?`,
      a: `Ce modèle a un écran de ${fr(ecran)}.`,
    });
  }

  const reseau = findSpec(specs, /réseau|reseau|network|connectivit/i);
  if (reseau) {
    const is5g = /\b5\s?-?g\b/i.test(reseau);
    specQuestions.push({
      q: `Le ${name} est-il compatible ${is5g ? '5G' : '4G'} ?`,
      a: is5g
        ? `Oui, ce modèle est compatible 5G. Réseaux pris en charge : ${fr(reseau)}.`
        : `Ce modèle est compatible 4G. Réseaux pris en charge : ${fr(reseau)}.`,
    });
  }

  const proc = findSpec(specs, /processeur|puce|chipset|\bsoc\b|\bcpu\b/i);
  if (proc) {
    specQuestions.push({
      q: `Quel processeur équipe le ${name} ?`,
      a: `Ce modèle est équipé du processeur ${fr(proc)}.`,
    });
  }

  const batterie = findSpec(specs, /batterie|battery|autonomie/i);
  if (batterie) {
    specQuestions.push({
      q: `Quelle est l'autonomie du ${name} ?`,
      a: `Ce modèle embarque une batterie de ${fr(batterie)}.`,
    });
  }

  const photo = findSpec(specs, /photo|caméra|camera|capteur/i);
  if (photo) {
    specQuestions.push({
      q: `Quel appareil photo a le ${name} ?`,
      a: `Ce modèle est équipé d'un appareil photo ${fr(photo)}.`,
    });
  }

  const stockage = findSpec(specs, /stockage|storage|\brom\b/i);
  const ram = findSpec(specs, /\bram\b|mémoire vive|memoire vive/i);
  if (stockage || ram) {
    const parts = [
      stockage ? `${fr(stockage)} de stockage` : null,
      ram ? `${fr(ram)} de RAM` : null,
    ]
      .filter(Boolean)
      .join(' et ');
    specQuestions.push({
      q: `Combien de stockage et de RAM pour le ${name} ?`,
      a: `Ce modèle propose ${parts}.`,
    });
  }

  faq.push(...specQuestions.slice(0, MAX_SPEC_QUESTIONS));

  // --- 2. État (neuf / reconditionné) — donnée produit ---
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

  // --- 3. Garantie — donnée produit ---
  const warranty = Number(product.warrantyMonths || 0);
  if (warranty > 0) {
    const type = product.condition === 'new' ? 'constructeur' : 'Xeption';
    faq.push({
      q: `Quelle est la garantie du ${name} ?`,
      a: `Le ${name} est couvert par une garantie ${type} de ${warranty} mois, service après-vente inclus.`,
    });
  }

  // --- 4. UNE seule question de politique (livraison + paiement fusionnés) ---
  faq.push({
    q: `Comment se passent la livraison et le paiement du ${name} ?`,
    a: `Le ${name} est expédié sous 24h à Yaoundé et Douala, et livré partout au Cameroun. Paiement en espèces, par Orange Money ou par MTN Mobile Money selon les modalités de commande.`,
  });

  return faq;
};
