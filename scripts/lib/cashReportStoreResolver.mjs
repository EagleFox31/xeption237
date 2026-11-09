/**
 * Rattachement d'un rapport de caisse texte à une boutique et à ses vendeurs,
 * à partir des référentiels `stores` / `staff` (injectés, jamais codés en dur).
 *
 * Ordre de résolution : ligne « Boutique … » du rapport → opérateurs connus du
 * staff → correspondance auteur → boutique fournie en configuration.
 */
import { foldText } from './whatsappExport.mjs';

/** Longueur minimale d'un mot pour servir d'indice (évite « de », « la », initiales). */
export const MIN_TOKEN_LENGTH = 4;

/** Mots communs à toutes les boutiques, inutiles pour les distinguer. */
const GENERIC_STORE_WORDS = new Set(['boutique', 'xeption', 'siege', 'store', 'shop']);

function tokensOf(text) {
  return foldText(text).split(/[^a-z0-9]+/).filter((t) => t.length >= MIN_TOKEN_LENGTH);
}

/**
 * @param {{ stores: Array<{id: string, code: string, name: string}>,
 *           staff: Array<{id: string, name: string, store_id: string|null}>,
 *           authorStores?: Record<string, string> }} refs
 *   `authorStores` : auteur WhatsApp (tel qu'exporté) → code boutique, repli optionnel.
 */
export function createStoreResolver({ stores, staff, authorStores = {} }) {
  const storeByCode = new Map(stores.map((s) => [foldText(s.code), s]));
  const storeTokens = stores.map((s) => ({
    store: s,
    tokens: new Set([...tokensOf(s.code), ...tokensOf(s.name)].filter((t) => !GENERIC_STORE_WORDS.has(t))),
  }));
  const staffTokens = staff
    .filter((m) => m.name)
    .map((m) => ({ member: m, tokens: new Set(tokensOf(m.name)) }))
    .filter((m) => m.tokens.size > 0);

  /** Membre du staff dont un nom (≥ 4 lettres) apparaît dans `text`, sinon null. */
  function matchStaff(text) {
    const words = new Set(tokensOf(text));
    if (!words.size) return null;
    const hits = staffTokens.filter(({ tokens }) => [...tokens].some((t) => words.has(t)));
    return hits.length === 1 ? hits[0].member : null;
  }

  /** Nom affichable du vendeur reconnu dans `text`, sinon null. */
  function matchSeller(text) {
    return matchStaff(text)?.name ?? null;
  }

  /** Boutique dont un mot distinctif (code ou nom) apparaît dans l'indice texte. */
  function storeFromHint(hint) {
    if (!hint) return null;
    const words = new Set(tokensOf(hint));
    const hits = storeTokens.filter(({ tokens }) => [...tokens].some((t) => words.has(t)));
    return hits.length === 1 ? hits[0].store : null;
  }

  /** Boutique majoritaire parmi les opérateurs reconnus dans le staff. */
  function storeFromOperators(operators) {
    const votes = new Map();
    for (const op of operators ?? []) {
      const member = matchStaff(op);
      if (member?.store_id) votes.set(member.store_id, (votes.get(member.store_id) ?? 0) + 1);
    }
    if (!votes.size) return null;
    const [best, second] = [...votes.entries()].sort((a, b) => b[1] - a[1]);
    if (second && second[1] === best[1]) return null;
    return stores.find((s) => s.id === best[0]) ?? null;
  }

  /**
   * @returns {{ store: object|null, method: 'hint'|'operators'|'author'|null }}
   */
  function resolveStore({ store_hint, operators }, author) {
    const fromHint = storeFromHint(store_hint);
    if (fromHint) return { store: fromHint, method: 'hint' };
    const fromOps = storeFromOperators(operators);
    if (fromOps) return { store: fromOps, method: 'operators' };
    const code = authorStores[author];
    const fromAuthor = code ? storeByCode.get(foldText(code)) : null;
    if (fromAuthor) return { store: fromAuthor, method: 'author' };
    return { store: null, method: null };
  }

  return { resolveStore, matchSeller, matchStaff };
}
