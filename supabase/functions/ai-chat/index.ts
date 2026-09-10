// @ts-ignore
const Deno = globalThis.Deno;

import { assertAiRateLimit, rateLimitJsonResponse } from '../_shared/rateLimit.ts';
import { geminiTextChat, type GeminiChatTurn } from '../_shared/geminiTextChat.ts';
import {
  buildSalesGuideInstruction,
  mapProductRow,
  type CatalogProduct,
} from '../_shared/personas/salesGuide.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_MESSAGE_LEN = 2000;
const MAX_HISTORY = 24;
const MAX_TURN_LEN = 4000;

const parseCaptchaAfter = (): number => {
  const raw = Number(Deno.env.get('AI_CHAT_CAPTCHA_AFTER'));
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 3;
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const parseHistory = (raw: unknown): GeminiChatTurn[] | null => {
  if (!Array.isArray(raw)) return [];
  if (raw.length > MAX_HISTORY) return null;

  const history: GeminiChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const role = (item as { role?: unknown }).role;
    const text = str((item as { text?: unknown }).text).trim();
    if ((role !== 'user' && role !== 'model') || !text) return null;
    if (text.length > MAX_TURN_LEN) return null;
    history.push({ role, text });
  }
  return history;
};

/** Session Auth Supabase — preuve que le captcha a passé via signInAnonymously (comme checkout). */
const hasValidAuthSession = async (req: Request): Promise<boolean> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !anonKey) return false;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
      },
    });
    return res.ok;
  } catch (error) {
    console.warn('[ai-chat] auth_check_failed', error);
    return false;
  }
};

const fetchCatalog = async (supabaseUrl: string, serviceKey: string): Promise<CatalogProduct[]> => {
  const params = new URLSearchParams({
    select: 'id,name,description,price,category,brand,product_range,condition,stock,is_promo,is_featured,review_short,specs,pros,cons',
    stock: 'gt.0',
    limit: '200',
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/products?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok) {
    console.warn('[ai-chat] catalog_fetch_failed', res.status);
    return [];
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => mapProductRow(row as Record<string, unknown>));
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    if (body?.healthCheck === true) {
      const hasKey = Boolean(Deno.env.get('GEMINI_API_KEY')?.trim() || Deno.env.get('GEMINI_API_KEY_FALLBACK')?.trim());
      return new Response(JSON.stringify({ ready: hasKey, authGateAfter: parseCaptchaAfter() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = str(body?.message).trim();
    if (!message) {
      return new Response(JSON.stringify({ error: 'message requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return new Response(JSON.stringify({ error: 'message trop long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const history = parseHistory(body?.history);
    if (history === null) {
      return new Response(JSON.stringify({ error: 'history invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionKey = str(body?.sessionKey).trim();
    if (!sessionKey || sessionKey.length > 128) {
      return new Response(JSON.stringify({ error: 'sessionKey requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rateLimit = await assertAiRateLimit(req, 'ai-chat', sessionKey);
    if (!rateLimit.allowed) {
      return rateLimitJsonResponse(rateLimit, corsHeaders);
    }

    const captchaAfter = parseCaptchaAfter();
    const priorUserTurns = history.filter((turn) => turn.role === 'user').length;
    const authRequired = captchaAfter > 0 && priorUserTurns >= captchaAfter;

    if (authRequired) {
      const authed = await hasValidAuthSession(req);
      if (!authed) {
        return new Response(
          JSON.stringify({
            code: 'captcha_required',
            error: 'Valide le captcha pour continuer la conversation.',
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const products = supabaseUrl && serviceKey ? await fetchCatalog(supabaseUrl, serviceKey) : [];

    const systemInstruction = buildSalesGuideInstruction(products, message);
    const gemini = await geminiTextChat({ systemInstruction, history, message });

    if (!gemini.ok) {
      console.warn('[ai-chat] gemini_failed', gemini.code, gemini.detail ?? '');
      return new Response(
        JSON.stringify({
          error: 'Wanda ! La connexion dérange un peu. On réessaie dans une seconde ?',
          code: gemini.code,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ text: gemini.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ai-chat] unhandled', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne. Réessaie dans un instant.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
