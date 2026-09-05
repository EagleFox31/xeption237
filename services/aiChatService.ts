import { supabase } from './supabaseClient';

export type AiChatHistoryItem = { role: 'user' | 'model'; text: string };

export type AiChatResult =
  | { ok: true; text: string }
  | {
      ok: false;
      code: 'rate_limited' | 'captcha_required' | 'error';
      message: string;
      retryAfterSec?: number;
    };

export type ChatAuthResult =
  | { ok: true }
  | { ok: false; needsCaptcha: true; message?: string }
  | { ok: false; needsCaptcha: false; message: string };

const FALLBACK_MESSAGE = 'Wanda ! La connexion dérange un peu. On réessaie dans une seconde ?';
const RATE_LIMIT_MESSAGE = 'Trop de messages pour l’instant. Réessaie dans quelques minutes.';
const CAPTCHA_MESSAGE = 'Valide le captcha pour continuer la conversation.';

const parseFunctionPayload = (data: unknown): Record<string, unknown> | null =>
  data && typeof data === 'object' ? (data as Record<string, unknown>) : null;

/**
 * Même flux que le checkout : Supabase Auth vérifie le captcha
 * (secret déjà configuré dans Authentication → Bot Protection).
 */
export async function ensureChatAuth(captchaToken?: string | null): Promise<ChatAuthResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return { ok: true };

  const { error } = captchaToken
    ? await supabase.auth.signInAnonymously({ options: { captchaToken } })
    : await supabase.auth.signInAnonymously();

  if (!error) return { ok: true };

  const msg = (error.message || '').toLowerCase();
  if (msg.includes('captcha')) {
    return { ok: false, needsCaptcha: true, message: CAPTCHA_MESSAGE };
  }

  return { ok: false, needsCaptcha: false, message: 'Erreur de sécurité session.' };
}

export async function sendAiChatMessage(params: {
  message: string;
  history: AiChatHistoryItem[];
  sessionKey: string;
}): Promise<AiChatResult> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      message: params.message,
      history: params.history,
      sessionKey: params.sessionKey,
    },
  });

  const payload = parseFunctionPayload(data);

  if (payload?.code === 'captcha_required') {
    return { ok: false, code: 'captcha_required', message: CAPTCHA_MESSAGE };
  }

  if (payload?.code === 'rate_limited') {
    const retryAfterSec = Number(payload.retryAfterSec);
    return {
      ok: false,
      code: 'rate_limited',
      message: RATE_LIMIT_MESSAGE,
      retryAfterSec: Number.isFinite(retryAfterSec) ? retryAfterSec : undefined,
    };
  }

  if (typeof payload?.text === 'string' && payload.text.trim()) {
    return { ok: true, text: payload.text.trim() };
  }

  if (error) {
    const context = parseFunctionPayload((error as { context?: unknown }).context);
    if (context?.code === 'captcha_required') {
      return { ok: false, code: 'captcha_required', message: CAPTCHA_MESSAGE };
    }
    if (context?.code === 'rate_limited') {
      return { ok: false, code: 'rate_limited', message: RATE_LIMIT_MESSAGE };
    }
    console.error('[aiChatService] invoke_failed', error);
  }

  const serverError = typeof payload?.error === 'string' ? payload.error : null;
  return {
    ok: false,
    code: 'error',
    message: serverError || FALLBACK_MESSAGE,
  };
}

/** Nombre de messages user avant captcha — aligné sur AI_CHAT_CAPTCHA_AFTER (défaut 3). */
export const AI_CHAT_CAPTCHA_AFTER = 3;
