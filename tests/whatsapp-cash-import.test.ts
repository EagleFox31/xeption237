import { describe, it, expect } from 'vitest';
import { parseWhatsAppExport, normalizeLine } from '../scripts/lib/whatsappExport.mjs';
import {
  isCashReportMessage,
  parseReportTitleDate,
  parseOperators,
  extractTrailingAmount,
  parseEntryLine,
  parseCashReportText,
} from '../scripts/lib/cashReportText.mjs';
import { createStoreResolver } from '../scripts/lib/cashReportStoreResolver.mjs';
import { parseAmount } from '../supabase/functions/_shared/telegramCashReport.ts';

// Données synthétiques uniquement (aucun nom, téléphone ou montant réel).
const NBSP = ' ';
const EXPORT = [
  '21/05/2026, 09:12 - Alice Test: Bonjour à tous',
  '21/05/2026, 19:05 - Alice Test: 📊 *RAPPORT DU 21/05/2026*',
  "'''' Boutique de Testville '''",
  'Opérateurs : Alice Test / Bob Essai',
  `💰 Solde trouvé en caisse ce matin : 73${NBSP}000 FCFA`,
  '📥 Entrées du jour :',
  '• MacBook Pro 2012 90.000f',
  'Coque iPhone 11 (Essai) 5 000F',
  'Avance dette Client X= 5 000F (reste 12 000F)',
  'Total entrée 100.000f',
  '📤 Sorties du jour :',
  'Transport journalier= 2000F',
  'Dépôt fait au siège 15000F <Ce message a été modifié>',
  'Total sortie : 17 000F',
  '💵 Reste en caisse ce soir : 156,000FCFA',
  '📝 Observations :',
  'Journée calme.',
  'Cordialement',
  '22/05/2026, 08:00 - Alice Test a ajouté Carol',
  '22/05/2026, 19:10 - Carol Demo: 📊 RAPPORT DU 22/05/2026',
  'Boutique de Démoville',
  'Opérateurs : Carol Demo',
  '💰 Solde trouvé en caisse ce matin :',
  '0 FCFA',
  '📥 Entrées du jour :',
  "Pas d'entrée",
  '📤 Sorties du jour :',
  'transport 2.000f',
  '💵 Reste en caisse ce soir : 0 F',
  'DEBT LIST',
  'Mr Client Dell 5510 10.000f (690000001)',
  'Mme Cliente s24 60.000f + 150.000f',
  '(690000002)',
].join('\n');

const STORES = [
  { id: 's-test', code: 'TESTVILLE', name: 'Testville Mall' },
  { id: 's-demo', code: 'DEMOVILLE', name: 'Démoville' },
  { id: 's-hq', code: 'SIEGE', name: 'Xeption — Siège' },
  // Seconde caisse d'un même centre : reconnue par son numéro, sans partager le nom du centre.
  { id: 's-test2', code: 'TV1092', name: 'TV 1092' },
];
const STAFF = [
  { id: 'u1', name: 'Alice Test', store_id: 's-test' },
  { id: 'u2', name: 'Bob Essai', store_id: 's-test' },
  { id: 'u3', name: 'Carol Demo', store_id: 's-demo' },
];

describe('parseWhatsAppExport', () => {
  it('splits messages, keeps continuation lines and drops system lines', () => {
    const messages = parseWhatsAppExport(EXPORT);
    expect(messages).toHaveLength(3);
    expect(messages[1]).toMatchObject({ date: '2026-05-21', time: '19:05', author: 'Alice Test' });
    expect(messages[1].lines).toHaveLength(17);
    // La ligne système « a ajouté » ne rejoint ni le rapport précédent ni le suivant.
    expect(messages[1].lines.at(-1)).toBe('Cordialement');
    expect(messages[2].lines[0]).toContain('RAPPORT DU 22/05/2026');
  });

  it('normalizes NBSP, markdown and the edited marker', () => {
    expect(normalizeLine(`*Total*${NBSP}: 17${NBSP}000F <Ce message a été modifié>`)).toBe('Total : 17 000F');
  });
});

describe('parseAmount (shared with the bot)', () => {
  it('treats a comma before three digits as a thousands separator', () => {
    expect(parseAmount('243,000')).toBe(243000);
    expect(parseAmount('98,000f')).toBe(98000);
    expect(parseAmount('150.000')).toBe(150000);
    expect(parseAmount('2,5k')).toBe(2500);
  });
});

describe('extractTrailingAmount / parseEntryLine', () => {
  it('reads amounts with spaces, dots, currency variants and sums', () => {
    expect(extractTrailingAmount('MacBook Pro 2012 90.000f')).toEqual({ label: 'MacBook Pro 2012', amount: 90000 });
    expect(extractTrailingAmount('xr 23 000 CFA')).toEqual({ label: 'xr', amount: 23000 });
    expect(extractTrailingAmount('clavier 40.000frs')).toEqual({ label: 'clavier', amount: 40000 });
    expect(extractTrailingAmount('S24 167.500f + 500.000f')).toEqual({ label: 'S24', amount: 667500 });
    expect(extractTrailingAmount('Pas de montant')).toBeNull();
  });

  it('keeps notes, extracts the seller and ignores empty entries', () => {
    const matchSeller = (t: string) => (/bob|essai/i.test(t) ? 'Bob Essai' : null);
    expect(parseEntryLine('• glace 22+ (25/07) 2000f')).toEqual({ label: 'glace 22+ (25/07)', amount: 2000 });
    expect(parseEntryLine('Coque iPhone 11 (Essai) 5 000F', matchSeller)).toEqual({ label: 'Coque iPhone 11', amount: 5000, seller_name: 'Bob Essai' });
    expect(parseEntryLine('iPhone XR vendu par Bob 75 000F', matchSeller)).toEqual({ label: 'iPhone XR', amount: 75000, seller_name: 'Bob Essai' });
    expect(parseEntryLine("Pas d'entrée aujourd'hui")).toBeNull();
    expect(parseEntryLine('Entrée totale = 0 F')).toBeNull();
  });
});

describe('parseCashReportText', () => {
  const messages = parseWhatsAppExport(EXPORT);

  it('detects reports and their title date', () => {
    expect(isCashReportMessage(messages[0].lines)).toBe(false);
    expect(isCashReportMessage(messages[1].lines)).toBe(true);
    expect(parseReportTitleDate('📊 *RAPPORT DU 5/6/26*')).toBe('2026-06-05');
    expect(parseOperators('Alice Test / Bob Essai, Carol')).toEqual(['Alice Test', 'Bob Essai', 'Carol']);
  });

  it('parses a full report with sections, totals and observations', () => {
    const resolver = createStoreResolver({ stores: STORES, staff: STAFF });
    const report = parseCashReportText(messages[1].lines, { matchSeller: resolver.matchSeller });
    expect(report.report_date).toBe('2026-05-21');
    expect(report.store_hint).toBe('Boutique de Testville');
    expect(report.operators).toEqual(['Alice Test', 'Bob Essai']);
    expect(report.opening_cash).toBe(73000);
    expect(report.closing_cash).toBe(156000);
    expect(report.inflow_items).toEqual([
      { label: 'MacBook Pro 2012', amount: 90000 },
      { label: 'Coque iPhone 11', amount: 5000, seller_name: 'Bob Essai' },
      { label: 'Avance dette Client X (reste 12 000F)', amount: 5000 },
    ]);
    expect(report.outflow_items).toEqual([
      { label: 'Transport journalier', amount: 2000 },
      { label: 'Dépôt fait au siège', amount: 15000 },
    ]);
    expect(report.declared_total_inflow).toBe(100000);
    expect(report.declared_total_outflow).toBe(17000);
    expect(report.observations).toBe('Journée calme.');
    expect(report.warnings).toEqual([]);
  });

  it('handles amount on the next line, explicit zeros, empty entries and debts', () => {
    const report = parseCashReportText(messages[2].lines);
    expect(report.opening_cash).toBe(0);
    expect(report.closing_cash).toBe(0);
    expect(report.inflow_items).toEqual([]);
    expect(report.outflow_items).toEqual([{ label: 'transport', amount: 2000 }]);
    expect(report.debts).toHaveLength(2);
    expect(report.debts[0]).toMatchObject({ amount_due: 10000, phone: '690000001' });
    // Téléphone seul sur la ligne suivante → rattaché à la dette précédente ; somme a + b.
    expect(report.debts[1]).toMatchObject({ amount_due: 210000, phone: '690000002' });
    expect(report.warnings).toContain('balance_mismatch');
  });
});

describe('createStoreResolver', () => {
  const resolver = createStoreResolver({ stores: STORES, staff: STAFF, authorStores: { 'Dan Inconnu': 'DEMOVILLE' } });

  it('resolves from the store line, then operators, then the author map', () => {
    expect(resolver.resolveStore({ store_hint: "Boutique de Testville", operators: [] }, 'x')).toMatchObject({ method: 'hint', store: { code: 'TESTVILLE' } });
    expect(resolver.resolveStore({ store_hint: 'Boutique', operators: ['Carol Demo'] }, 'x')).toMatchObject({ method: 'operators', store: { code: 'DEMOVILLE' } });
    expect(resolver.resolveStore({ store_hint: null, operators: ['Inconnu'] }, 'Dan Inconnu')).toMatchObject({ method: 'author', store: { code: 'DEMOVILLE' } });
    expect(resolver.resolveStore({ store_hint: null, operators: [] }, 'x')).toEqual({ store: null, method: null });
  });

  it('tells two cash desks of the same centre apart by the number in the store line', () => {
    expect(resolver.resolveStore({ store_hint: 'Boutique TV 1092', operators: ['Alice Test'] }, 'x')).toMatchObject({ method: 'hint', store: { code: 'TV1092' } });
    expect(resolver.resolveStore({ store_hint: 'Boutique testville mall', operators: [] }, 'x')).toMatchObject({ method: 'hint', store: { code: 'TESTVILLE' } });
  });

  it('never matches the head office on generic words and needs a unique seller', () => {
    expect(resolver.resolveStore({ store_hint: 'Boutique Xeption Siège', operators: [] }, 'x').store).toBeNull();
    expect(resolver.matchSeller('vendu par Alice')).toBe('Alice Test');
    expect(resolver.matchSeller('Alice et Carol')).toBeNull();
    expect(resolver.matchSeller('Bob')).toBeNull();
  });
});
