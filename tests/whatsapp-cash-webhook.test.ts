import { describe, it, expect } from 'vitest';
import {
  computeHmacSha512Hex,
  isWebhookAuthConfigured,
  timingSafeEqual,
  verifyWebhookRequest,
} from '../supabase/functions/_shared/whatsappCashReport/webhookAuth.ts';
import {
  ACCEPTED_EVENTS,
  WHATSAPP_LIVE_SOURCE,
  authorDigitsOf,
  buildCashReportRow,
  extractGroupMessage,
  parseAuthorStores,
  parseGroupIds,
  parseIncomingReport,
  planUpsert,
  sameContent,
  toReportDate,
  type CashReportContent,
  type ExistingCashReport,
  type IncomingGroupMessage,
} from '../supabase/functions/_shared/whatsappCashReport/ingest.ts';
import { createStoreResolver } from '../supabase/functions/_shared/whatsappCashReport/storeResolver.ts';
import { normalizeLine, foldText, splitMessageLines } from '../supabase/functions/_shared/whatsappCashReport/text.ts';

// Données synthétiques uniquement (aucun nom, numéro ou montant réel).
const KEY = 'k'.repeat(40);
const GROUP = '120363000000000000@g.us';
const AUTHOR = '237600000001@c.us';
const NBSP = ' ';

const REPORT_BODY = [
  '📊 *RAPPORT DU 21/05/2026*',
  'Boutique de Testville',
  'Opérateurs : Alice Test / Bob Essai',
  `💰 Solde trouvé en caisse ce matin : 73${NBSP}000 FCFA`,
  '📥 Entrées du jour :',
  '• MacBook Pro 2012 90.000f',
  'Coque iPhone 11 (Essai) 5 000F',
  'Total entrées : 95.000f',
  '📤 Sorties du jour :',
  'Transport 2 000F',
  'Total sorties : 2.000f',
  '💵 Reste en caisse : 166.000f',
  'Observations : RAS',
].join('\n');

const STORES = [
  { id: 'store-1', code: 'TESTVILLE', name: 'Boutique de Testville' },
  { id: 'store-2', code: 'AUTREVILLE', name: 'Boutique Autreville' },
];
const STAFF = [
  { id: 'staff-1', name: 'Alice Test', store_id: 'store-1' },
  { id: 'staff-2', name: 'Bob Essai', store_id: 'store-1' },
];

function wahaBody(overrides: Record<string, unknown> = {}, event = 'message') {
  return {
    event,
    session: 'default',
    payload: {
      id: 'true_120363@g.us_ABC123',
      timestamp: 1779443100, // 2026-05-22T09:45:00Z (10:45 à Douala)
      from: GROUP,
      fromMe: false,
      body: REPORT_BODY,
      participant: AUTHOR,
      ...overrides,
    },
  };
}

const headers = (map: Record<string, string>) => ({
  get: (name: string) => map[name.toLowerCase()] ?? null,
});

describe('webhookAuth', () => {
  it('refuse un webhook sans secret configuré', async () => {
    expect(isWebhookAuthConfigured({})).toBe(false);
    expect(isWebhookAuthConfigured({ hmacKey: 'court' })).toBe(false);
    const res = await verifyWebhookRequest('{}', headers({}), {});
    expect(res).toEqual({ ok: false, reason: 'not_configured' });
  });

  it('accepte une signature HMAC-SHA512 valide du corps brut', async () => {
    const body = JSON.stringify(wahaBody());
    const sig = await computeHmacSha512Hex(KEY, body);
    expect(sig).toMatch(/^[0-9a-f]{128}$/);
    const ok = await verifyWebhookRequest(body, headers({ 'x-webhook-hmac': sig.toUpperCase(), 'x-webhook-hmac-algorithm': 'sha512' }), { hmacKey: KEY });
    expect(ok).toEqual({ ok: true, method: 'hmac' });
  });

  it('refuse une signature altérée, absente ou d’un autre algorithme', async () => {
    const body = '{"a":1}';
    const sig = await computeHmacSha512Hex(KEY, body);
    expect(await verifyWebhookRequest(body, headers({ 'x-webhook-hmac': sig }), { hmacKey: 'x'.repeat(40) })).toEqual({ ok: false, reason: 'bad_signature' });
    expect(await verifyWebhookRequest(body, headers({}), { hmacKey: KEY })).toEqual({ ok: false, reason: 'missing_signature' });
    expect(await verifyWebhookRequest(body, headers({ 'x-webhook-hmac': sig, 'x-webhook-hmac-algorithm': 'sha256' }), { hmacKey: KEY })).toEqual({ ok: false, reason: 'unsupported_algorithm' });
  });

  it('HMAC configuré : pas de repli silencieux sur le secret partagé', async () => {
    const res = await verifyWebhookRequest('{}', headers({ 'x-webhook-secret': KEY }), { hmacKey: KEY, sharedSecret: KEY });
    expect(res).toEqual({ ok: false, reason: 'missing_signature' });
  });

  it('secret partagé seul : en-tête X-Webhook-Secret', async () => {
    expect(await verifyWebhookRequest('{}', headers({ 'x-webhook-secret': KEY }), { sharedSecret: KEY })).toEqual({ ok: true, method: 'shared_secret' });
    expect(await verifyWebhookRequest('{}', headers({ 'x-webhook-secret': 'nope' }), { sharedSecret: KEY })).toEqual({ ok: false, reason: 'bad_secret' });
  });

  it('timingSafeEqual compare aussi les longueurs', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('text', () => {
  it('normalise et replie le texte comme le script Node', () => {
    expect(normalizeLine(`*Solde*${NBSP}: 1‎000`)).toBe('Solde : 1 000');
    expect(foldText('Opérateurs Élève')).toBe('operateurs eleve');
    expect(splitMessageLines('a\r\nb\nc')).toEqual(['a', 'b', 'c']);
  });
});

describe('extractGroupMessage', () => {
  it('extrait un rapport posté dans un groupe', () => {
    const res = extractGroupMessage(wahaBody());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.message.groupId).toBe(GROUP);
    expect(res.message.authorDigits).toBe('237600000001');
    expect(res.message.messageId).toBe('true_120363@g.us_ABC123');
    expect(res.message.sentAt?.toISOString()).toBe('2026-05-22T09:45:00.000Z');
    expect(res.message.lines[0]).toContain('RAPPORT DU');
  });

  it('ignore les événements, conversations privées, groupes non listés et messages ordinaires', () => {
    expect(ACCEPTED_EVENTS).toContain('message');
    expect(extractGroupMessage(wahaBody({}, 'message.ack'))).toEqual({ ok: false, reason: 'unsupported_event' });
    expect(extractGroupMessage({ event: 'message' })).toEqual({ ok: false, reason: 'missing_payload' });
    expect(extractGroupMessage(wahaBody({ from: '237600000002@c.us' }))).toEqual({ ok: false, reason: 'not_a_group' });
    expect(extractGroupMessage(wahaBody(), ['999@g.us'])).toEqual({ ok: false, reason: 'group_not_allowed' });
    expect(extractGroupMessage(wahaBody(), [GROUP]).ok).toBe(true);
    expect(extractGroupMessage(wahaBody({ body: '   ' }))).toEqual({ ok: false, reason: 'empty_body' });
    expect(extractGroupMessage(wahaBody({ body: 'Bonjour à tous, rapport du jour à venir' }))).toEqual({ ok: false, reason: 'not_a_cash_report' });
  });

  it('accepte message.any et un payload sans id', () => {
    const res = extractGroupMessage(wahaBody({ id: undefined }, 'message.any'));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.message.messageId).toBe(`${GROUP}:1779443100`);
  });

  it('authorDigitsOf tolère @lid et les formats téléphone', () => {
    expect(authorDigitsOf('123456789012345@lid')).toBe('123456789012345');
    expect(authorDigitsOf('+237 6 00 00 00 01')).toBe('237600000001');
    expect(authorDigitsOf(undefined)).toBeNull();
  });
});

describe('configuration', () => {
  it('parseAuthorStores réduit les clés à leurs chiffres', () => {
    expect(parseAuthorStores('{"+237 600000001":"TESTVILLE","237600000002@c.us":" AUTREVILLE "}')).toEqual({
      '237600000001': 'TESTVILLE',
      '237600000002': 'AUTREVILLE',
    });
    expect(parseAuthorStores('')).toEqual({});
    expect(() => parseAuthorStores('[1]')).toThrow(/JSON object/);
    expect(() => parseAuthorStores('{oops')).toThrow(/JSON object/);
  });

  it('parseGroupIds accepte virgules et espaces', () => {
    expect(parseGroupIds(' a@g.us, b@g.us\nc@g.us ')).toEqual(['a@g.us', 'b@g.us', 'c@g.us']);
    expect(parseGroupIds(undefined)).toEqual([]);
  });
});

describe('toReportDate', () => {
  it('rend la date civile de Douala (UTC+1), y compris autour de minuit', () => {
    expect(toReportDate(new Date('2026-05-21T23:30:00Z'))).toBe('2026-05-22');
    expect(toReportDate(new Date('2026-05-21T22:30:00Z'))).toBe('2026-05-21');
  });
});

describe('buildCashReportRow', () => {
  const message = (): IncomingGroupMessage => {
    const res = extractGroupMessage(wahaBody());
    if (!res.ok) throw new Error('fixture');
    return res.message;
  };

  it('construit une ligne whatsapp_live avec les totaux recalculés et le vendeur rattaché', () => {
    const resolver = createStoreResolver({ stores: STORES, staff: STAFF });
    const msg = message();
    const parsed = parseIncomingReport({ lines: msg.lines, matchSeller: resolver.matchSeller });
    expect(resolver.resolveStore(parsed, msg.authorDigits)).toEqual({ store: STORES[0], method: 'hint' });
    const { row, dateOrigin, warnings } = buildCashReportRow({ parsed, storeId: 'store-1', message: msg });
    expect(dateOrigin).toBe('title');
    expect(row.source).toBe(WHATSAPP_LIVE_SOURCE);
    expect(row.source_ref).toBe('waha:true_120363@g.us_ABC123');
    expect(row.report_date).toBe('2026-05-21');
    expect(row.opening_cash).toBe(73000);
    expect(row.total_inflow).toBe(95000);
    expect(row.total_outflow).toBe(2000);
    expect(row.closing_cash).toBe(166000);
    expect(row.inflow_items).toEqual([
      { label: 'MacBook Pro 2012', amount: 90000 },
      { label: 'Coque iPhone 11', amount: 5000, seller_name: 'Bob Essai' },
    ]);
    expect(row.operators).toEqual(['Alice Test', 'Bob Essai']);
    expect(row.observations).toBe('RAS');
    // Le titre dit 21/05, le message est envoyé le 22/05 : signalé, la date du titre prime.
    expect(warnings).toContain('date_differs_from_message');
    expect(warnings).not.toContain('balance_mismatch');
    expect(JSON.stringify(row)).not.toContain('readings');
  });

  it('replie sur la date d’envoi quand le titre est illisible, puis sur l’horloge', () => {
    const msg = message();
    msg.lines[0] = 'RAPPORT DU JOUR';
    const parsed = parseIncomingReport({ lines: msg.lines, matchSeller: () => null });
    const built = buildCashReportRow({ parsed, storeId: 'store-1', message: msg });
    expect(built.dateOrigin).toBe('message');
    expect(built.row.report_date).toBe('2026-05-22');
    expect(built.warnings).toContain('date_from_message');
    const noClock = buildCashReportRow({ parsed, storeId: 'store-1', message: { ...msg, sentAt: null }, now: new Date('2026-06-01T12:00:00Z') });
    expect(noClock.dateOrigin).toBe('now');
    expect(noClock.row.report_date).toBe('2026-06-01');
  });

  it('se rabat sur la boutique de l’auteur quand le texte ne la nomme pas', () => {
    const resolver = createStoreResolver({ stores: STORES, staff: [], authorStores: { '237600000001': 'autreville' } });
    const msg = message();
    msg.lines = msg.lines.filter((l) => !/boutique/i.test(l));
    const parsed = parseIncomingReport({ lines: msg.lines, matchSeller: resolver.matchSeller });
    expect(resolver.resolveStore(parsed, msg.authorDigits)).toEqual({ store: STORES[1], method: 'author' });
    expect(resolver.resolveStore(parsed, '237600000009')).toEqual({ store: null, method: null });
  });
});

describe('planUpsert', () => {
  const content: CashReportContent = {
    opening_cash: 73000, closing_cash: 166000, total_inflow: 95000, total_outflow: 2000,
    inflow_items: [{ label: 'MacBook Pro 2012', amount: 90000 }], outflow_items: [], debts_snapshot: [],
    operators: ['Alice Test'], observations: null,
  };
  const existing = (over: Partial<ExistingCashReport> = {}): ExistingCashReport => ({ id: 'row-1', source: 'whatsapp_live', ...content, ...over });

  it('insert quand la ligne n’existe pas', () => {
    expect(planUpsert(null, content)).toEqual({ action: 'insert', existingId: null });
  });

  it('unchanged quand le contenu est identique (numeric renvoyé en texte par PostgREST compris)', () => {
    expect(planUpsert(existing(), content)).toEqual({ action: 'unchanged', existingId: 'row-1' });
    const asText = existing({ opening_cash: '73000' as unknown as number, closing_cash: '166000.00' as unknown as number });
    expect(sameContent(asText, content)).toBe(true);
    expect(planUpsert(existing({ source: 'whatsapp_backfill' }), content)).toEqual({ action: 'unchanged', existingId: 'row-1' });
  });

  it('update quand une source WhatsApp a un contenu différent', () => {
    expect(planUpsert(existing({ closing_cash: 1 }), content)).toEqual({ action: 'update', existingId: 'row-1' });
    expect(planUpsert(existing({ source: 'whatsapp_backfill', observations: 'x' }), content)).toEqual({ action: 'update', existingId: 'row-1' });
  });

  it('protected : une saisie bot n’est jamais réécrite', () => {
    expect(planUpsert(existing({ source: 'bot', closing_cash: 1 }), content)).toEqual({ action: 'protected', existingId: 'row-1' });
  });
});
