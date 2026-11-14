/**
 * Compatibilité Node : le parseur de rapport de caisse vit désormais dans
 * `supabase/functions/_shared/whatsappCashReport/parser.ts` (partagé avec l'Edge Function
 * `whatsapp-cash-webhook`). Node ≥ 22.6 charge les `.ts` à syntaxe effaçable sans build.
 */
export {
  MIN_REPORT_LINES,
  isCashReportMessage,
  parseReportTitleDate,
  parseOperators,
  extractTrailingAmount,
  reconcileItemsWithDeclaredTotal,
  parseEntryLine,
  parseCashReportText,
  sumAmounts,
} from '../../supabase/functions/_shared/whatsappCashReport/parser.ts';
