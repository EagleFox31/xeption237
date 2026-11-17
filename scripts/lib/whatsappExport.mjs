/**
 * Lecture d'un export texte WhatsApp (« Exporter la discussion », sans médias).
 *
 * Format d'une ligne d'en-tête : `DD/MM/YYYY, HH:MM - Auteur: texte` ; les lignes
 * suivantes qui ne matchent pas l'en-tête sont la suite du même message.
 * Module pur (aucune dépendance), réutilisable pour tout export de groupe.
 */

const MESSAGE_HEADER = /^(\d{2})\/(\d{2})\/(\d{4}),? (\d{1,2}:\d{2}) - ([^:]+?): ?(.*)$/;
/** Ligne système (membre ajouté, sujet changé…) : même horodatage, pas d'auteur ni de `:`. */
const SYSTEM_HEADER = /^(\d{2})\/(\d{2})\/(\d{4}),? (\d{1,2}:\d{2}) - (.*)$/;

/** Normalisation et repli d'accents : implémentation partagée avec l'Edge Function (`_shared/whatsappCashReport/text.ts`). */
export { normalizeLine, foldText } from '../../supabase/functions/_shared/whatsappCashReport/text.ts';
import { normalizeLine } from '../../supabase/functions/_shared/whatsappCashReport/text.ts';

/**
 * Découpe l'export en messages.
 * @param {string} text contenu complet du fichier .txt
 * @returns {Array<{ date: string, time: string, author: string, lines: string[], index: number }>}
 *   `date` au format ISO (YYYY-MM-DD), `lines` brutes (première ligne = début du message).
 */
export function parseWhatsAppExport(text) {
  const messages = [];
  let current = null;
  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    const line = rawLine.replace(/^‎/, '');
    const match = line.match(MESSAGE_HEADER);
    if (match) {
      const [, day, month, year, time, author, body] = match;
      current = {
        date: `${year}-${month}-${day}`,
        time: time.padStart(5, '0'),
        author: author.trim(),
        lines: [body],
        index: messages.length,
      };
      messages.push(current);
    } else if (SYSTEM_HEADER.test(line)) {
      // Message système : coupe le message courant sans en démarrer un attribuable.
      current = null;
    } else if (current) {
      current.lines.push(line);
    }
  }
  return messages;
}
