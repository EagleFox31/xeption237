/**
 * Garde-fou anti-abus IA — quota par session + IP (fenêtre par buckets).
 * À appeler en tête de chaque Edge Function exposée anonymement.
 */

export type AiRateLimitScope =
  | 'ai-chat'
  | 'ai-product-details'
  | 'evaluate-device'
  | 'check-imei'
  | 'market-price-intel'
  | 'troc-voucher-lookup';

export interface AiRateLimitPolicy {
  /** Durée d'une fenêtre (ms). */
  windowMs: number;
  maxSession: number;
  maxIp: number;
}

const HOUR_MS = 60 * 60 * 1000;

/** Quotas conservateurs pré-lancement — ajustables via secrets env si besoin. */
const DEFAULT_POLICIES: Record<AiRateLimitScope, AiRateLimitPolicy> = {
  'ai-chat': { windowMs: HOUR_MS, maxSession: 40, maxIp: 120 },
  'ai-product-details': { windowMs: HOUR_MS, maxSession: 80, maxIp: 200 },
  'evaluate-device': { windowMs: HOUR_MS, maxSession: 30, maxIp: 90 },
  'check-imei': { windowMs: HOUR_MS, maxSession: 20, maxIp: 60 },
  'market-price-intel': { windowMs: HOUR_MS, maxSession: 25, maxIp: 75 },
  'troc-voucher-lookup': { windowMs: HOUR_MS, maxSession: 30, maxIp: 60 },
};

const parsePolicyOverride = (
  scope: AiRateLimitScope,
  supabaseUrl: string,
): AiRateLimitPolicy => {
  const base = DEFAULT_POLICIES[scope];
  const prefix = `AI_RL_${scope.toUpperCase().replace(/-/g, '_')}`;
  const maxSession = Number(Deno.env.get(`${prefix}_MAX_SESSION`));
  const maxIp = Number(Deno.env.get(`${prefix}_MAX_IP`));
  const windowMin = Number(Deno.env.get(`${prefix}_WINDOW_MIN`));
  void supabaseUrl;
  return {
    windowMs: Number.isFinite(windowMin) && windowMin > 0 ? windowMin * 60_000 : base.windowMs,
    maxSession: Number.isFinite(maxSession) && maxSession > 0 ? maxSession : base.maxSession,
    maxIp: Number.isFinite(maxIp) && maxIp > 0 ? maxIp : base.maxIp,
  };
};

export const extractClientIp = (req: Request): string => {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  const realIp = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
};

const bucketWindowStart = (nowMs: number, windowMs: number): string =>
  new Date(Math.floor(nowMs / windowMs) * windowMs).toISOString();

const consumeBucket = async (
  supabaseUrl: string,
  serviceKey: string,
  scope: AiRateLimitScope,
  dimension: 'session' | 'ip',
  identifier: string,
  windowStartIso: string,
): Promise<number | null> => {
  if (!supabaseUrl || !serviceKey || !identifier || identifier === 'unknown') return null;

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/ai_usage_quota_consume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      p_scope: scope,
      p_dimension: dimension,
      p_identifier: identifier.slice(0, 128),
      p_window_start: windowStartIso,
    }),
  });

  if (!res.ok) {
    console.warn('[rateLimit] rpc_failed', scope, dimension, res.status);
    return null;
  }

  const count = await res.json();
  return typeof count === 'number' ? count : null;
};

export type AiRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number; reason: string };

export const assertAiRateLimit = async (
  req: Request,
  scope: AiRateLimitScope,
  sessionKey: string | null | undefined,
): Promise<AiRateLimitResult> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return { allowed: true };

  const policy = parsePolicyOverride(scope, supabaseUrl);
  const nowMs = Date.now();
  const windowStartIso = bucketWindowStart(nowMs, policy.windowMs);
  const windowEndMs = Math.floor(nowMs / policy.windowMs) * policy.windowMs + policy.windowMs;
  const retryAfterSec = Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000));

  const clientIp = extractClientIp(req);
  const checks: Array<{ dimension: 'session' | 'ip'; identifier: string; max: number }> = [
    { dimension: 'ip', identifier: clientIp, max: policy.maxIp },
  ];

  const sk = typeof sessionKey === 'string' ? sessionKey.trim() : '';
  if (sk) {
    checks.unshift({ dimension: 'session', identifier: sk, max: policy.maxSession });
  }

  for (const check of checks) {
    const count = await consumeBucket(
      supabaseUrl,
      serviceKey,
      scope,
      check.dimension,
      check.identifier,
      windowStartIso,
    );
    if (count != null && count > check.max) {
      return {
        allowed: false,
        retryAfterSec,
        reason: `rate_limit_${check.dimension}`,
      };
    }
  }

  return { allowed: true };
};

export const rateLimitJsonResponse = (
  result: Extract<AiRateLimitResult, { allowed: false }>,
  corsHeaders: Record<string, string>,
): Response =>
  new Response(
    JSON.stringify({
      error: 'Trop de requêtes pour l’instant. Réessaie dans quelques minutes.',
      code: 'rate_limited',
      reason: result.reason,
      retryAfterSec: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSec),
      },
    },
  );
