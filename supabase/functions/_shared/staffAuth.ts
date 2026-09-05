/**
 * Vérifie qu'un appel Edge Function provient d'un compte staff authentifié.
 */

const getSuperAdminEmails = (): string[] => {
  const raw =
    Deno.env.get('SUPER_ADMIN_EMAILS')?.trim() ||
    Deno.env.get('VITE_SUPER_ADMIN_EMAILS')?.trim() ||
    '';
  return raw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
};

export type StaffAuthResult =
  | { ok: true; email: string; userId: string }
  | { ok: false; status: number; body: Record<string, unknown> };

export const assertAuthenticatedStaff = async (req: Request): Promise<StaffAuthResult> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, body: { error: 'Non authentifié — reconnectez-vous.' } };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { ok: false, status: 500, body: { error: 'Configuration Supabase incomplète.' } };
  }

  let callerEmail = '';
  let userId = '';

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
      },
    });

    if (!userRes.ok) {
      return { ok: false, status: 401, body: { error: 'Session invalide — reconnectez-vous.' } };
    }

    const userPayload = await userRes.json();
    callerEmail = String(userPayload?.email ?? '').trim().toLowerCase();
    userId = String(userPayload?.id ?? '').trim();
    if (!callerEmail || !userId) {
      return { ok: false, status: 401, body: { error: 'Session invalide — reconnectez-vous.' } };
    }
  } catch (error) {
    console.warn('[staffAuth] user_lookup_failed', error);
    return { ok: false, status: 500, body: { error: 'Impossible de vérifier la session.' } };
  }

  if (getSuperAdminEmails().includes(callerEmail)) {
    return { ok: true, email: callerEmail, userId };
  }

  try {
    const staffRes = await fetch(
      `${supabaseUrl}/rest/v1/staff?select=email&email=eq.${encodeURIComponent(callerEmail)}&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );

    if (!staffRes.ok) {
      console.warn('[staffAuth] staff_lookup_failed', staffRes.status);
      return { ok: false, status: 500, body: { error: 'Impossible de vérifier votre profil staff.' } };
    }

    const rows = await staffRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        ok: false,
        status: 403,
        body: { error: 'Accès réservé à l’équipe Xeption.', code: 'staff_not_found' },
      };
    }
  } catch (error) {
    console.warn('[staffAuth] staff_lookup_error', error);
    return { ok: false, status: 500, body: { error: 'Impossible de vérifier votre profil staff.' } };
  }

  return { ok: true, email: callerEmail, userId };
};

export const staffAuthJsonResponse = (
  result: Extract<StaffAuthResult, { ok: false }>,
  corsHeaders: Record<string, string>,
): Response =>
  new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
