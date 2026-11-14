/**
 * Edge Function `whatsapp-cash-webhook` — réception des webhooks WAHA du groupe
 * WhatsApp « caisse » et ingestion des rapports journaliers dans `store_cash_reports`.
 *
 * Rôle limité au routage : authentification (HMAC WAHA ou secret partagé), chargement des
 * référentiels, exécution du plan d'écriture. Toute la logique (filtrage, parsing,
 * rattachement boutique, idempotence) vit dans `_shared/whatsappCashReport/*` (testé par Vitest).
 *
 * Secrets : WHATSAPP_CASH_WEBHOOK_HMAC_KEY (prioritaire) ou WHATSAPP_CASH_WEBHOOK_SECRET ;
 * optionnels : WHATSAPP_CASH_GROUP_IDS (liste `xxx@g.us`), WHATSAPP_CASH_AUTHOR_STORES (JSON
 * numéro → code boutique). Déploiement : voir docs/engineering/NOTIFICATIONS.md.
 *
 * Codes de réponse : 200 traité ou ignoré (WAHA ne rejoue pas) ; 401 signature invalide ;
 * 405 méthode ; 503 secret non configuré ; 500 erreur base (WAHA rejoue : l'écriture est idempotente).
 * Les réponses et logs ne contiennent ni texte de message ni donnée nominative.
 */
/// <reference lib="deno.ns" />
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhookRequest } from '../_shared/whatsappCashReport/webhookAuth.ts';
import { createStoreResolver, type StaffRef, type StoreRef } from '../_shared/whatsappCashReport/storeResolver.ts';
import {
  buildCashReportRow,
  extractGroupMessage,
  parseAuthorStores,
  parseGroupIds,
  parseIncomingReport,
  planUpsert,
  type CashReportRow,
  type ExistingCashReport,
  type UpsertPlan,
  type WahaWebhookBody,
} from '../_shared/whatsappCashReport/ingest.ts';

const env = (name: string) => Deno.env.get(name);
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TABLE = 'store_cash_reports';
const EXISTING_COLUMNS =
  'id, source, opening_cash, closing_cash, total_inflow, total_outflow, inflow_items, outflow_items, debts_snapshot, operators, observations';
/** Violation d'unicité Postgres (insert concurrent sur (store_id, report_date)). */
const UNIQUE_VIOLATION = '23505';

async function loadRefs(supabase: SupabaseClient): Promise<{ stores: StoreRef[]; staff: StaffRef[] }> {
  const [stores, staff] = await Promise.all([
    supabase.from('stores').select('id, code, name'),
    supabase.from('staff').select('id, name, store_id'),
  ]);
  if (stores.error) throw stores.error;
  if (staff.error) throw staff.error;
  return { stores: (stores.data ?? []) as StoreRef[], staff: (staff.data ?? []) as StaffRef[] };
}

async function findExisting(supabase: SupabaseClient, storeId: string, reportDate: string): Promise<ExistingCashReport | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(EXISTING_COLUMNS)
    .eq('store_id', storeId)
    .eq('report_date', reportDate)
    .maybeSingle();
  if (error) throw error;
  return (data as ExistingCashReport | null) ?? null;
}

async function updateRow(supabase: SupabaseClient, id: string, row: CashReportRow): Promise<UpsertPlan> {
  const { store_id: _storeId, report_date: _reportDate, ...content } = row;
  const { error } = await supabase.from(TABLE).update({ ...content, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  return { action: 'update', existingId: id };
}

/** Lecture → plan → écriture minimale. Une erreur base remonte (500) pour que WAHA rejoue. */
async function applyRow(supabase: SupabaseClient, row: CashReportRow): Promise<UpsertPlan> {
  const plan = planUpsert(await findExisting(supabase, row.store_id, row.report_date), row);
  if (plan.action === 'update') return updateRow(supabase, plan.existingId as string, row);
  if (plan.action !== 'insert') return plan;
  const { error } = await supabase.from(TABLE).insert(row);
  if (!error) return plan;
  if (error.code !== UNIQUE_VIOLATION) throw error;
  // Livraison concurrente (retry WAHA) : la ligne vient d'être créée, on la réconcilie.
  const retry = planUpsert(await findExisting(supabase, row.store_id, row.report_date), row);
  return retry.action === 'update' ? updateRow(supabase, retry.existingId as string, row) : retry;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const rawBody = await req.text();
  const auth = await verifyWebhookRequest(rawBody, req.headers, {
    hmacKey: env('WHATSAPP_CASH_WEBHOOK_HMAC_KEY'),
    sharedSecret: env('WHATSAPP_CASH_WEBHOOK_SECRET'),
  });
  if (!auth.ok) {
    if (auth.reason === 'not_configured') {
      console.error('[whatsapp-cash-webhook] no webhook secret configured');
      return json(503, { error: 'webhook_not_configured' });
    }
    return json(401, { error: 'unauthorized', reason: auth.reason });
  }

  let body: WahaWebhookBody;
  try {
    body = JSON.parse(rawBody) as WahaWebhookBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const extracted = extractGroupMessage(body, parseGroupIds(env('WHATSAPP_CASH_GROUP_IDS')));
  if (!extracted.ok) return json(200, { status: 'ignored', reason: extracted.reason });
  const { message } = extracted;

  const supabaseUrl = env('SUPABASE_URL') ?? '';
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'supabase_not_configured' });
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const refs = await loadRefs(supabase);
    const resolver = createStoreResolver({ ...refs, authorStores: parseAuthorStores(env('WHATSAPP_CASH_AUTHOR_STORES')) });
    const parsed = parseIncomingReport({ lines: message.lines, matchSeller: resolver.matchSeller });
    const { store, method } = resolver.resolveStore(parsed, message.authorDigits);
    if (!store) {
      console.warn('[whatsapp-cash-webhook] store unresolved', { messageId: message.messageId, warnings: parsed.warnings });
      return json(200, { status: 'skipped', reason: 'store_unresolved', messageId: message.messageId });
    }
    const built = buildCashReportRow({ parsed, storeId: store.id, message });
    const result = await applyRow(supabase, built.row);
    const summary = {
      action: result.action,
      store: store.code,
      report_date: built.row.report_date,
      store_method: method,
      date_origin: built.dateOrigin,
      warnings: built.warnings,
      messageId: message.messageId,
    };
    console.log('[whatsapp-cash-webhook]', summary);
    return json(200, { status: result.action, ...summary });
  } catch (error) {
    console.error('[whatsapp-cash-webhook] ingest failed', { messageId: message.messageId, error });
    return json(500, { error: 'ingest_failed', messageId: message.messageId });
  }
});
