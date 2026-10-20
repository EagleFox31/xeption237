/**
 * notify-staff — relaie les notifications staff (admin_notifications) vers chaque canal configuré.
 *
 * Appelée chaque minute par pg_cron (job notify-staff-every-minute, header x-cron-secret).
 * Pour chaque canal : claim_notification_deliveries réclame les envois en attente (atomique,
 * 5 essais max), l'adaptateur envoie, puis notification_deliveries.sent_at est posé.
 * Un rejeu n'envoie donc jamais deux fois le même message sur un même canal.
 *
 * Secrets : CRON_SECRET (obligatoire), SITE_URL (optionnel) + ceux de chaque adaptateur.
 * Un canal sans ses secrets est ignoré.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { StaffNotification, StaffNotifyChannel, StaffNotifyContext } from '../_shared/staffNotify.ts';
import { createTelegramChannel } from '../_shared/staffNotifyChannels/telegram.ts';
import { createWahaChannel } from '../_shared/staffNotifyChannels/waha.ts';

const CLAIM_BATCH_SIZE = 20;

const env = (name: string) => Deno.env.get(name);

/** Registre opt-in : WhatsApp n'est activé que lorsque WAHA_ENABLED=true et les secrets sont complets. */
const buildChannels = (): StaffNotifyChannel[] =>
  [createTelegramChannel(env), createWahaChannel(env)]
    .filter((c): c is StaffNotifyChannel => c !== null);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const relayChannel = async (
  supabase: SupabaseClient,
  channel: StaffNotifyChannel,
  ctx: StaffNotifyContext,
) => {
  const { data, error } = await supabase.rpc('claim_notification_deliveries', {
    p_channel: channel.id,
    p_event_types: channel.eventTypes,
    p_limit: CLAIM_BATCH_SIZE,
  });
  if (error) {
    console.error('notify-staff: claim failed', { channel: channel.id, error });
    return { claimed: 0, sent: 0, failed: 0, error: 'claim_failed' };
  }

  const rows = (data ?? []) as StaffNotification[];
  let sent = 0;
  let failed = 0;
  // Séquentiel : garde l'ordre chronologique et reste sous les limites de débit des API.
  for (const row of rows) {
    const sendError = await channel
      .send(row, ctx)
      .catch((e: unknown) => `exception: ${e instanceof Error ? e.message : String(e)}`);
    const patch = sendError
      ? { last_error: sendError, claimed_at: null }
      : { sent_at: new Date().toISOString(), last_error: null };
    const { error: updateError } = await supabase
      .from('notification_deliveries')
      .update(patch)
      .eq('notification_id', row.notification_id)
      .eq('channel', channel.id);
    if (updateError) console.error('notify-staff: update failed', { channel: channel.id, id: row.notification_id, updateError });
    if (sendError) {
      failed += 1;
      console.error('notify-staff: send failed', { channel: channel.id, id: row.notification_id, sendError });
    } else {
      sent += 1;
    }
  }
  return { claimed: rows.length, sent, failed };
};

Deno.serve(async (req: Request): Promise<Response> => {
  const expected = env('CRON_SECRET') ?? '';
  if (!expected || req.headers.get('x-cron-secret') !== expected) {
    return json(401, { error: 'unauthorized' });
  }

  const supabaseUrl = env('SUPABASE_URL') ?? '';
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'missing_supabase_env' });

  const channels = buildChannels();
  if (!channels.length) return json(200, { channels: {}, note: 'no_channel_configured' });

  const siteUrl = (env('SITE_URL') ?? 'https://www.xeptionetwork.shop').replace(/\/$/, '');
  const ctx: StaffNotifyContext = { siteUrl };
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const results: Record<string, unknown> = {};
  for (const channel of channels) {
    results[channel.id] = await relayChannel(supabase, channel, ctx);
  }
  return json(200, { channels: results });
});
