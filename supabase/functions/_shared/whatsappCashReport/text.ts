/**
 * Normalisation du texte WhatsApp (messages live via webhook ou export « Exporter la discussion »).
 * Module pur, sans import Deno / npm : partagé par l'Edge Function `whatsapp-cash-webhook`,
 * les scripts Node (`scripts/lib/*.mjs`) et la suite Vitest.
 */

/** Caractères invisibles ou de mise en forme que WhatsApp insère (NBSP, LRM/RLM, WJ, gras `*`, italique `_`). */
const NOISE_CHARS = /[\s‎‏⁠*_]+/g;
/** Marqueur ajouté par WhatsApp à la fin d'un message édité (export texte). */
const EDITED_MARKER = /<(?:ce message a [ée]t[ée] modifi[ée]|this message was edited)>/giu;
/** Diacritiques combinants (après décomposition NFD). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Normalise une ligne : espaces exotiques → espace simple, mise en forme et marqueur d'édition retirés, trim. */
export function normalizeLine(line: string | null | undefined): string {
  return (line ?? '').replace(EDITED_MARKER, ' ').replace(NOISE_CHARS, ' ').trim();
}

/** Texte sans accents, en minuscules — pour les comparaisons de noms / mots-clés. */
export function foldText(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/** Découpe le corps d'un message en lignes brutes (CRLF ou LF). */
export function splitMessageLines(body: string | null | undefined): string[] {
  return (body ?? '').split(/\r?\n/);
}
