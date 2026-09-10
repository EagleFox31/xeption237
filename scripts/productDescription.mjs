/** Helpers description (miroir de utils/productDescription.ts pour les scripts Node). */
export function isWeakProductDescription(desc, name) {
  const d = (desc || '').trim();
  if (!d) return true;
  if (/^import mfoundi mall/i.test(d)) return true;
  if (d.length < 50) return true;
  const words = d.split(/\s+/).filter(Boolean);
  if (words.length < 12) return true;
  const lower = d.toLowerCase();
  const nameLower = (name || '').toLowerCase().trim();
  if (nameLower && lower === nameLower) return true;
  return false;
}

/**
 * Détecte une description "fluff" : suffisamment longue mais sans faits extractibles
 * (aucune unité technique chiffrée). Ce sont les descriptions 100 % marketing
 * (adjectifs) que les LLM ne peuvent pas exploiter pour le GEO.
 * Ex. positif : "…design ultra-futuriste…dominer le game" (0 unité chiffrée).
 * Ex. négatif : "AMOLED 120 Hz 6,67", 5000 mAh, 67W, 108 MP" (nombreuses unités).
 * @param {string} desc
 * @param {{label:string,value:string}[]} [specs] réservé pour affinages futurs
 */
export function isFluffyDescription(desc, _specs) {
  const d = (desc || '').trim();
  if (!d) return false; // vide = "weak", pas "fluff" (géré séparément)
  if (d.length < 130) return false; // trop court pour juger
  // Unités techniques chiffrées : "120 Hz", "6,67 pouces", "5000 mAh", "67W", "108 MP"…
  const unitRe = /\d[\d.,]*\s?(go|gb|to|tb|mo|mb|mah|mp|mpx|hz|ghz|mhz|w|nits|"|pouces?|cm|mm|ips|amoled|oled|lcd|4g|5g|wifi|wi-fi|core|cœurs?|ram)\b/gi;
  const unitMatches = (d.match(unitRe) || []).length;
  return unitMatches < 2;
}

/** Nombre de specs réellement renseignées (label + value non vides). */
export function realSpecsCount(specs) {
  if (!Array.isArray(specs)) return 0;
  return specs.filter((s) => (s?.label || '').trim() && (s?.value || '').trim()).length;
}

/** Gate #2 : specs assez riches pour une réécriture "faits d'abord" sans invention. */
export function hasRichSpecs(specs, min = 3) {
  return realSpecsCount(specs) >= min;
}

/**
 * Garde-fou #1 (exactitude) : vérifie que chaque valeur chiffrée + unité technique de la
 * description ("108 MP", "5000 mAh", "6,67 pouces") apparaît bien dans les specs (ou le nom).
 * Empêche l'étape description d'INVENTER une spec absente de la base.
 * @returns {{ ok: boolean, offending: string[] }}
 */
const normNum = (s) =>
  (s || '').replace(/\s+/g, '').replace(/,/g, '.').replace(/\.+$/, '');

export function descriptionSpecsConsistent(desc, specs, name = '') {
  const d = (desc || '').trim();
  if (!d) return { ok: true, offending: [] };
  // Ensemble EXACT des nombres présents dans specs + nom (évite le faux négatif
  // par sous-chaîne, ex. "67" ⊄ "6.67"). Espaces retirés d'abord (ex. "5 000" → "5000").
  const refText =
    ((specs || []).map((s) => `${s?.label || ''} ${s?.value || ''}`).join(' ') + ' ' + name)
      .replace(/\s+/g, '')
      .replace(/,/g, '.');
  const refNums = new Set((refText.match(/\d[\d.]*/g) || []).map(normNum));
  // Unités "dures" seulement (chiffrées et vérifiables) — on exclut 4g/5g/wifi/ram (qualitatifs).
  const unitRe = /(\d[\d.,\s]*?)\s?(go|gb|to|tb|mo|mb|mah|mp|mpx|hz|ghz|mhz|nits|"|pouces?|w)\b/gi;
  const offending = [];
  let m;
  while ((m = unitRe.exec(d)) !== null) {
    const num = normNum(m[1]);
    if (!num) continue;
    if (!refNums.has(num)) offending.push(`${m[1].trim()} ${m[2]}`);
  }
  return { ok: offending.length === 0, offending };
}
