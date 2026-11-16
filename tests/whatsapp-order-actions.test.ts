import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ORDER_CANCEL_REASONS } from '../utils/orderWorkflow';
import {
  handleNotifyStaffAction,
  parseNotifyActionRelay,
  whatsappIntent,
  WHATSAPP_CANCEL_REASONS,
  type NotifyActionRelayV1,
  type RpcCall,
} from '../supabase/functions/_shared/whatsappOrderActions';
import {
  computeWhatsAppActorFingerprint,
  isNotifyActionSecretUsable,
  signNotifyAction,
  verifyNotifyActionSignature,
} from '../supabase/functions/_shared/notifyActionAuth';

const SQL = readFileSync(resolve(__dirname, '../supabase/migrations/20261116_001_whatsapp_order_actions_core.sql'), 'utf-8')
  .replace(/\r\n/g, '\n');
const PREVIOUS = readFileSync(resolve(__dirname, '../supabase/migrations/20261114_003_telegram_order_actions.sql'), 'utf-8')
  .replace(/\r\n/g, '\n');
const PHONE_SQL = readFileSync(resolve(__dirname, '../supabase/migrations/20261116_002_whatsapp_link_by_phone.sql'), 'utf-8')
  .replace(/\r\n/g, '\n');
const FN = readFileSync(resolve(__dirname, '../supabase/functions/notify-staff-action/index.ts'), 'utf-8');

const body = (src: string, fn: string) => {
  const start = src.indexOf(`FUNCTION public.${fn}(`);
  return src.slice(start, src.indexOf('$$;', start));
};

const FP = 'a'.repeat(64);
const EVENT = '00000000-0000-4000-8000-000000000001';
const relay = (over: Partial<NotifyActionRelayV1> = {}): NotifyActionRelayV1 => ({
  version: 1,
  id: 'true_123@g.us_ABC_456@c.us',
  eventId: EVENT,
  groupKey: 'staff',
  actor: { fingerprint: FP },
  gesture: 'reaction',
  value: '✅',
  ...over,
});

const rpcReturning = (data: unknown, error: { code?: string; message?: string } | null = null) =>
  vi.fn<RpcCall>(async () => ({ data, error }));

describe('relais Notify v1', () => {
  it('accepte un relais valide, refuse le reste', () => {
    expect(parseNotifyActionRelay(relay())).toEqual(relay());
    expect(parseNotifyActionRelay({ ...relay(), version: 2 })).toBeNull();
    expect(parseNotifyActionRelay({ ...relay(), actor: { fingerprint: 'abc' } })).toBeNull();
    expect(parseNotifyActionRelay({ ...relay(), eventId: 'not-a-uuid' })).toBeNull();
    expect(parseNotifyActionRelay({ ...relay(), gesture: 'poll' })).toBeNull();
    expect(parseNotifyActionRelay({ ...relay(), value: 'x'.repeat(65) })).toBeNull();
    expect(parseNotifyActionRelay({ ...relay(), id: '' })).toBeNull();
    expect(parseNotifyActionRelay(null)).toBeNull();
  });

  it('un code de liaison peut arriver sans alerte (eventId vide)', () => {
    expect(parseNotifyActionRelay({ ...relay(), gesture: 'link', eventId: '', value: 'XL-ABCD-EF23' })).not.toBeNull();
  });
});

describe('gestes -> intentions', () => {
  it('réactions ✅ 💵 📵 ❌, avec ou sans sélecteur de variante', () => {
    expect(whatsappIntent({ gesture: 'reaction', value: '✅' })).toEqual({ kind: 'order', action: 'delivered' });
    expect(whatsappIntent({ gesture: 'reaction', value: '💵' })).toEqual({ kind: 'order', action: 'cash_delivered' });
    expect(whatsappIntent({ gesture: 'reaction', value: '📵' })).toEqual({ kind: 'order', action: 'unreachable' });
    expect(whatsappIntent({ gesture: 'reaction', value: '❌' })).toEqual({ kind: 'order', action: 'cancel_requested' });
    expect(whatsappIntent({ gesture: 'reaction', value: '✅️' })).toEqual({ kind: 'order', action: 'delivered' });
  });

  it('autre réaction, réaction retirée ou texte libre : ignorés', () => {
    for (const value of ['👍', '', '❤️']) expect(whatsappIntent({ gesture: 'reaction', value })).toEqual({ kind: 'ignore' });
    for (const value of ['0', '6', 'annulé', '1 doublon', '']) expect(whatsappIntent({ gesture: 'reply', value })).toEqual({ kind: 'ignore' });
  });

  it('réponse 1..5 = motif ORDER_CANCEL_REASONS, liste identique à Telegram', () => {
    expect([...WHATSAPP_CANCEL_REASONS]).toEqual([...ORDER_CANCEL_REASONS]);
    ORDER_CANCEL_REASONS.forEach((reason, i) => {
      expect(whatsappIntent({ gesture: 'reply', value: ` ${i + 1} ` })).toEqual({ kind: 'order', action: 'cancelled', reason });
    });
  });

  it('code de liaison normalisé en majuscules', () => {
    expect(whatsappIntent({ gesture: 'link', value: ' xl-abcd-ef23 ' })).toEqual({ kind: 'link', code: 'XL-ABCD-EF23' });
    expect(whatsappIntent({ gesture: 'link', value: 'bonjour' })).toEqual({ kind: 'ignore' });
  });
});

describe('handleNotifyStaffAction', () => {
  const NOW = new Date('2026-11-16T10:00:00Z');

  it('appelle la RPC WhatsApp avec l’alerte, jamais un id de commande fourni', async () => {
    const rpc = rpcReturning({ changed: true, outcome: 'delivered', status: 'delivered', actor: 'Awa Mbarga' });
    const res = await handleNotifyStaffAction(relay(), rpc, NOW);
    expect(rpc).toHaveBeenCalledWith('whatsapp_staff_order_action', {
      p_notification_id: EVENT, p_action: 'delivered', p_fingerprint: FP, p_reason: null, p_external_id: relay().id,
    });
    expect(res).toEqual({ status: 200, body: { ok: true, changed: true, outcome: 'delivered', action: 'delivered', actor: 'Awa', at: NOW.toISOString() } });
  });

  it('réponse sans donnée client : seulement issue, action, motif, tentative, prénom, heure', async () => {
    const rpc = rpcReturning({ changed: true, outcome: 'unreachable', status: 'pending', count: 2, actor: 'Awa' });
    const res = await handleNotifyStaffAction(relay({ value: '📵' }), rpc, NOW);
    expect(Object.keys(res.body).sort()).toEqual(['action', 'actor', 'at', 'attempt', 'changed', 'ok', 'outcome']);
    expect(res.body.attempt).toBe(2);
  });

  it('motif transmis pour une annulation', async () => {
    const rpc = rpcReturning({ changed: true, outcome: 'cancelled', status: 'cancelled' });
    const res = await handleNotifyStaffAction(relay({ gesture: 'reply', value: '4' }), rpc, NOW);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_action: 'cancelled', p_reason: 'Doublon' });
    expect(res.body.reason).toBe('Doublon');
  });

  it('geste ignoré : aucune RPC', async () => {
    const rpc = rpcReturning(null);
    const res = await handleNotifyStaffAction(relay({ value: '👍' }), rpc, NOW);
    expect(rpc).not.toHaveBeenCalled();
    expect(res.body.outcome).toBe('ignored');
  });

  it('erreurs RPC -> issue métier, message brut jamais renvoyé', async () => {
    const cases: [string, string, string][] = [
      ['42501', 'Staff link not found', 'not_linked'],
      ['42501', 'Cancellation requires responsable or higher', 'cancel_forbidden'],
      ['22023', 'Unsupported order action', 'invalid'],
      ['P0001', 'Stock insuffisant pour XP-1', 'refused'],
    ];
    for (const [code, message, outcome] of cases) {
      const res = await handleNotifyStaffAction(relay({ value: '❌' }), rpcReturning(null, { code, message }), NOW);
      expect(res.status).toBe(200);
      expect(res.body.outcome).toBe(outcome);
      expect(JSON.stringify(res.body)).not.toContain(message);
    }
    const down = await handleNotifyStaffAction(relay(), rpcReturning(null, { code: '08006', message: 'down' }), NOW);
    expect(down).toEqual({ status: 502, body: { ok: false, error: 'RPC_FAILED' } });
  });

  it('liaison : RPC link_whatsapp_staff avec l’empreinte', async () => {
    const rpc = rpcReturning({ linked: true, outcome: 'linked', actor: 'Awa Mbarga' });
    const res = await handleNotifyStaffAction(relay({ gesture: 'link', eventId: '', value: 'XL-ABCD-EF23' }), rpc, NOW);
    expect(rpc).toHaveBeenCalledWith('link_whatsapp_staff', { p_code: 'XL-ABCD-EF23', p_fingerprint: FP });
    expect(res.body).toMatchObject({ changed: true, outcome: 'linked', action: 'link', actor: 'Awa' });
  });
});

describe('signature Notify -> Xeption', () => {
  const SECRET = 's'.repeat(32);
  const RAW = JSON.stringify(relay());
  const NOW = 1_800_000_000_000;

  it('accepte la signature de `${ts}.${corps}`', async () => {
    const ts = String(NOW);
    const signature = await signNotifyAction(SECRET, ts, RAW);
    expect(signature).toMatch(/^[0-9a-f]{128}$/);
    expect(await verifyNotifyActionSignature({ secret: SECRET, timestamp: ts, signature, rawBody: RAW, nowMs: NOW })).toBe('ok');
  });

  it('refuse corps modifié, horodatage rejoué, en-têtes absents, hors délai', async () => {
    const ts = String(NOW);
    const signature = await signNotifyAction(SECRET, ts, RAW);
    const verify = (over: Partial<Parameters<typeof verifyNotifyActionSignature>[0]>) =>
      verifyNotifyActionSignature({ secret: SECRET, timestamp: ts, signature, rawBody: RAW, nowMs: NOW, ...over });
    expect(await verify({ rawBody: RAW.replace('✅', '❌') })).toBe('bad_signature');
    expect(await verify({ timestamp: String(NOW + 1000), nowMs: NOW + 1000 })).toBe('bad_signature');
    expect(await verify({ secret: 't'.repeat(32) })).toBe('bad_signature');
    expect(await verify({ signature: null })).toBe('missing');
    expect(await verify({ timestamp: 'abc' })).toBe('missing');
    expect(await verify({ nowMs: NOW + 5 * 60 * 1000 + 1 })).toBe('stale');
  });

  it('clé de 32 caractères minimum', () => {
    expect(isNotifyActionSecretUsable('x'.repeat(31))).toBe(false);
    expect(isNotifyActionSecretUsable(undefined)).toBe(false);
    expect(isNotifyActionSecretUsable('x'.repeat(32))).toBe(true);
  });
});

describe('fonction notify-staff-action', () => {
  it('signature vérifiée avant le drapeau, drapeau avant toute lecture du corps JSON', () => {
    const auth = FN.indexOf('verifyNotifyActionSignature({');
    const flag = FN.indexOf("WHATSAPP_ACTIONS_ENABLED') !== 'true'");
    const parse = FN.indexOf('JSON.parse(raw)');
    expect(auth).toBeGreaterThan(0);
    expect(flag).toBeGreaterThan(auth);
    expect(parse).toBeGreaterThan(flag);
  });

  it('ne journalise ni corps, ni empreinte, ni signature', () => {
    for (const line of FN.split('\n').filter((l) => l.includes('console.'))) {
      expect(line).not.toMatch(/raw|fingerprint|signature\b|secret|relay\b[^.]/);
    }
  });
});

describe('migration 20261116_001', () => {
  it('transactionnelle', () => {
    expect(SQL).toMatch(/^BEGIN;$/m);
    expect(SQL.trimEnd().endsWith('COMMIT;')).toBe(true);
  });

  it('motifs SQL = ORDER_CANCEL_REASONS', () => {
    expect(SQL).toContain(`ARRAY[${ORDER_CANCEL_REASONS.map((r) => `'${r}'`).join(', ')}]`);
  });

  it('RPC serveur réservées au service_role ; code de liaison aux comptes connectés', () => {
    for (const sig of [
      '_staff_order_action_core(text, text, uuid, text)',
      'telegram_staff_order_action(text, text, text, text)',
      'link_whatsapp_staff(text, text)',
      'whatsapp_staff_order_action(uuid, text, text, text, text)',
    ]) {
      const esc = sig.replace(/[()]/g, '\\$&');
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${esc}\\s+FROM PUBLIC, anon, authenticated;`));
      expect(SQL).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${esc}\\s+TO service_role;`));
    }
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.create_whatsapp_link_code\(\) FROM PUBLIC, anon;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.create_whatsapp_link_code\(\) TO authenticated;/);
  });

  it('tables privées : RLS activée, aucun droit client', () => {
    for (const table of ['whatsapp_link_codes', 'whatsapp_staff_links', 'staff_action_receipts']) {
      expect(SQL).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      expect(SQL).toContain(`REVOKE ALL ON TABLE public.${table} FROM PUBLIC, anon, authenticated;`);
    }
  });

  it('aucun numéro de téléphone stocké : liaison par empreinte hex 64', () => {
    const links = SQL.slice(SQL.indexOf('CREATE TABLE IF NOT EXISTS public.whatsapp_staff_links'));
    expect(links.slice(0, links.indexOf(');'))).not.toMatch(/phone|msisdn|jid/i);
    expect(SQL).toContain("fingerprint TEXT PRIMARY KEY CHECK (fingerprint ~ '^[0-9a-f]{64}$')");
  });

  it('le cœur reprend la règle Telegram mot pour mot (hors identification et audit)', () => {
    const norm = (s: string) => s
      .replace(/--[^\n]*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const prev = body(PREVIOUS, 'telegram_staff_order_action');
    const core = body(SQL, '_staff_order_action_core');
    // Règle métier : de la validation de l'action jusqu'au retour final.
    const rule = (s: string) => norm(s.slice(s.indexOf("IF p_action IS NULL OR p_action NOT IN ('delivered'"), s.indexOf('RETURN jsonb_build_object( \'changed\', true')));
    const strip = (s: string) => rule(s)
      .replace(/INSERT INTO public\.telegram_staff_action_audit[^;]*;/, '')
      .replace(/v_auth_user_id|p_auth_user_id/g, 'UID')
      .replace(/\s+/g, ' ');
    expect(strip(core).length).toBeGreaterThan(2000);
    expect(strip(core)).toContain('mark_order_cash_paid(p_order_id, v_email)');
    expect(strip(core)).toBe(strip(prev));
  });

  it('Telegram : même signature, même erreur sans lien, audit seulement si la commande a changé', () => {
    const tg = body(SQL, 'telegram_staff_order_action');
    expect(tg).toContain('p_telegram_user_id text');
    expect(tg).toContain("RAISE EXCEPTION 'Staff link not found' USING ERRCODE = '42501'");
    expect(tg).toContain('public._staff_order_action_core(p_order_id, p_action, v_auth_user_id, p_reason)');
    expect(tg).toMatch(/IF coalesce\(\(v_res->>'changed'\)::boolean, false\) THEN\s+INSERT INTO public\.telegram_staff_action_audit/);
    expect(tg).toContain("'order.' || p_action");
  });

  it('WhatsApp : commande tirée de l’alerte, reçu idempotent avant l’action, annulation en deux gestes', () => {
    const wa = body(SQL, 'whatsapp_staff_order_action');
    expect(wa).toContain('SELECT n.link_to_id INTO v_order_id');
    expect(wa).toContain("ARRAY['order_created', 'order_unreachable', 'order_stale']");
    expect(wa).toContain('ON CONFLICT (source, external_id) DO NOTHING');
    expect(wa.indexOf('ON CONFLICT (source, external_id)')).toBeLessThan(wa.indexOf('_staff_order_action_core('));
    expect(wa).toContain("r.action = 'order.cancel_requested'");
    expect(wa).toContain("interval '10 minutes'");
  });

  it('les RPC ne réactivent jamais un réglage de session au-delà de la transaction', () => {
    expect(SQL).not.toMatch(/set_config\([^)]*,\s*false\)/);
  });
});

describe('empreinte de l’auteur (partagée avec Notify)', () => {
  const KEY = 'k'.repeat(32);

  it('hex HMAC-SHA256(clé, "wa-actor:v1:" + E.164 sans +) : vecteur de référence', async () => {
    const expected = createHmac('sha256', KEY).update('wa-actor:v1:237600000001').digest('hex');
    expect(await computeWhatsAppActorFingerprint(KEY, '237600000001')).toBe(expected);
    expect(await computeWhatsAppActorFingerprint(` ${KEY} `, '237600000001')).toBe(expected);
  });

  it('refuse un numéro hors E.164 sans +', async () => {
    for (const bad of ['+237600000001', '0600000001', '600 00 00 01', '12', '']) {
      expect(await computeWhatsAppActorFingerprint(KEY, bad)).toBeNull();
    }
  });
});

describe('liaison automatique par numéro', () => {
  const NOW = new Date('2026-11-16T10:00:00Z');
  const AWA = '00000000-0000-4000-8000-0000000000a1';
  const BOB = '00000000-0000-4000-8000-0000000000b2';
  // Calcul factice : « 237600000001 » donne FP, tout autre numéro une autre empreinte.
  const fingerprintFor = async (e164: string) => (e164 === '237600000001' ? FP : 'b'.repeat(64));
  type Result = { data: unknown; error: { code: string; message: string } | null };

  /** 1er appel d'action : non lié ; puis candidats, liaison, 2e appel d'action. */
  const scripted = (opts: { candidates?: unknown; link?: unknown; retry?: Result } = {}) => {
    let actionCalls = 0;
    return vi.fn<RpcCall>(async (fn) => {
      if (fn === 'whatsapp_staff_order_action') {
        actionCalls += 1;
        if (actionCalls === 1) return { data: null, error: { code: '42501', message: 'Staff link not found' } };
        return opts.retry ?? { data: { changed: true, outcome: 'applied', actor: 'Awa Mbarga' }, error: null };
      }
      if (fn === 'whatsapp_staff_phone_candidates') {
        return {
          data: opts.candidates ?? [
            { staff_id: AWA, phone_e164: '237600000001' },
            { staff_id: BOB, phone_e164: '237600000002' },
          ],
          error: null,
        };
      }
      if (fn === 'link_whatsapp_staff_by_phone') {
        return { data: opts.link ?? { linked: true, changed: true, actor: 'Awa Mbarga', role: 'vendeur', store: 'Akwa' }, error: null };
      }
      return { data: null, error: { code: 'XX000', message: 'unexpected' } };
    });
  };
  const actionCalls = (rpc: ReturnType<typeof scripted>) =>
    rpc.mock.calls.filter(([fn]) => fn === 'whatsapp_staff_order_action');

  it('numéro unique : liaison, geste rejoué avec le même id, `linked` dans la réponse', async () => {
    const rpc = scripted();
    const res = await handleNotifyStaffAction(relay(), rpc, NOW, fingerprintFor);
    expect(rpc).toHaveBeenCalledWith('link_whatsapp_staff_by_phone', { p_fingerprint: FP, p_staff_id: AWA });
    expect(actionCalls(rpc)).toHaveLength(2);
    expect(actionCalls(rpc)[1][1]).toEqual(actionCalls(rpc)[0][1]);
    expect(res).toMatchObject({
      status: 200,
      body: { ok: true, changed: true, outcome: 'applied', actor: 'Awa', linked: { actor: 'Awa', role: 'vendeur', store: 'Akwa' } },
    });
    expect(JSON.stringify(res.body)).not.toContain('237600000001');
  });

  it('aucune fiche ou deux fiches pour le numéro : pas de liaison, raison renvoyée', async () => {
    const none = await handleNotifyStaffAction(relay(), scripted({ candidates: [{ staff_id: BOB, phone_e164: '237600000002' }] }), NOW, fingerprintFor);
    expect(none.body).toMatchObject({ outcome: 'not_linked', link: { reason: 'phone_not_found' } });

    const twice = scripted({
      candidates: [
        { staff_id: AWA, phone_e164: '237600000001' },
        { staff_id: BOB, phone_e164: '237600000001' },
      ],
    });
    const ambiguous = await handleNotifyStaffAction(relay(), twice, NOW, fingerprintFor);
    expect(ambiguous.body).toMatchObject({ outcome: 'not_linked', link: { reason: 'phone_ambiguous' } });
    expect(twice).not.toHaveBeenCalledWith('link_whatsapp_staff_by_phone', expect.anything());
  });

  it('refus de la base (direction, sans compte, déjà lié) : raison, geste non rejoué', async () => {
    for (const reason of ['use_erp_code', 'no_account', 'staff_already_linked', 'fingerprint_already_linked']) {
      const rpc = scripted({ link: { linked: false, reason } });
      const res = await handleNotifyStaffAction(relay(), rpc, NOW, fingerprintFor);
      expect(res.body).toMatchObject({ outcome: 'not_linked', link: { reason } });
      expect(actionCalls(rpc)).toHaveLength(1);
    }
  });

  it('liaison faite mais geste refusé (annulation par un vendeur) : issue + `linked`', async () => {
    const rpc = scripted({ retry: { data: null, error: { code: '42501', message: 'Cancellation requires responsable or higher' } } });
    const res = await handleNotifyStaffAction(relay({ value: '❌' }), rpc, NOW, fingerprintFor);
    expect(res.body).toMatchObject({ outcome: 'cancel_forbidden', linked: { actor: 'Awa' } });
  });

  it('base indisponible pendant la liaison : 502 (Notify réessaie)', async () => {
    const rpc = vi.fn<RpcCall>(async (fn) => (fn === 'whatsapp_staff_order_action'
      ? { data: null, error: { code: '42501', message: 'Staff link not found' } }
      : { data: null, error: { code: '08006', message: 'down' } }));
    expect(await handleNotifyStaffAction(relay(), rpc, NOW, fingerprintFor)).toEqual({ status: 502, body: { ok: false, error: 'RPC_FAILED' } });
  });

  it('sans calcul d’empreinte injecté : comportement inchangé (not_linked)', async () => {
    const rpc = scripted();
    const res = await handleNotifyStaffAction(relay(), rpc, NOW);
    expect(res.body).toEqual({ ok: true, changed: false, outcome: 'not_linked', action: 'delivered' });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('la fonction injecte le calcul d’empreinte avec la clé du relais', () => {
    expect(FN).toContain('computeWhatsAppActorFingerprint(secret, e164)');
  });
});

describe('migration 20261116_002', () => {
  it('transactionnelle', () => {
    expect(PHONE_SQL).toMatch(/^BEGIN;$/m);
    expect(PHONE_SQL.trimEnd().endsWith('COMMIT;')).toBe(true);
  });

  it('RPC réservées au service_role', () => {
    for (const sig of ['whatsapp_staff_phone_candidates()', 'link_whatsapp_staff_by_phone(text, uuid)']) {
      const esc = sig.replace(/[()]/g, '\\$&');
      expect(PHONE_SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${esc} FROM PUBLIC, anon, authenticated;`));
      expect(PHONE_SQL).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${esc} TO service_role;`));
    }
  });

  it('même règle que Telegram : staff boutique seulement, compte requis, jamais de déplacement silencieux', () => {
    const fn = body(PHONE_SQL, 'link_whatsapp_staff_by_phone');
    expect(fn).toContain(`('vendeur', 'editor', 'responsable', 'manager', 'manager_vente')`);
    for (const reason of ['use_erp_code', 'no_account', 'phone_ambiguous', 'staff_already_linked', 'fingerprint_already_linked']) {
      expect(fn).toContain(`'${reason}'`);
    }
    expect(fn).not.toMatch(/SET revoked_at = now\(\)/);
    expect(fn.indexOf("'staff_already_linked'")).toBeLessThan(fn.indexOf('INSERT INTO public.whatsapp_staff_links'));
  });

  it('audit avec un identifiant propre (le reçu du geste rejoué reste libre)', () => {
    expect(body(PHONE_SQL, 'link_whatsapp_staff_by_phone')).toContain("'link.phone:' || gen_random_uuid()::text");
  });

  it('la clé d’empreinte ne passe jamais par la base', () => {
    expect(PHONE_SQL).not.toMatch(/hmac\(/i);
    expect(FN).not.toMatch(/rpc\([^)]*secret/);
  });
});
