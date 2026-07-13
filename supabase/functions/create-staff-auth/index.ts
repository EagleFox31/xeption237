// @ts-ignore — Deno runtime (Supabase Edge Functions)
const Deno = globalThis.Deno;

export {};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROVISION_ROLES = new Set(['direction', 'super_admin', 'responsable']);
const LEGACY_ROLE_MAP: Record<string, string> = {
  editor: 'vendeur',
  manager: 'responsable',
  admin: 'direction',
  manager_vente: 'responsable',
  'manager vente': 'responsable',
  directeur_commercial: 'responsable',
};

function normalizeRole(role: string | null | undefined): string {
  const raw = (role || '').trim().toLowerCase();
  if (raw in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[raw as keyof typeof LEGACY_ROLE_MAP];
  return raw;
}

function getSuperAdminEmails(): string[] {
  const raw =
    Deno.env.get('SUPER_ADMIN_EMAILS')?.trim() ||
    Deno.env.get('VITE_SUPER_ADMIN_EMAILS')?.trim() ||
    '';
  return raw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function defaultPassword(): string {
  return Deno.env.get('STAFF_DEFAULT_PASSWORD')?.trim() || '123456';
}

function resolveDisplayName(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) return trimmed;
  return email.split('@')[0] || email;
}

function buildStaffUserMetadata(name: string, email: string) {
  const displayName = resolveDisplayName(name, email);
  return {
    full_name: displayName,
    name: displayName,
    display_name: displayName,
    staff_name: displayName,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function assertCallerCanProvision(authHeader: string, supabaseUrl: string, serviceKey: string) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1');

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const {
    data: { user: caller },
    error: callerError,
  } = await adminClient.auth.getUser(jwt);

  if (callerError || !caller?.email) {
    console.error('getUser failed:', callerError);
    return { error: json({ error: 'Session invalide — reconnectez-vous.' }, 401) };
  }

  const callerEmail = caller.email.toLowerCase();

  if (getSuperAdminEmails().includes(callerEmail)) {
    return { adminClient, callerEmail };
  }

  const { data: callerStaff, error: callerStaffError } = await adminClient
    .from('staff')
    .select('role, email')
    .eq('email', callerEmail)
    .maybeSingle();

  if (callerStaffError) {
    console.error('staff lookup failed:', callerStaffError);
    return { error: json({ error: 'Impossible de vérifier votre profil staff.' }, 500) };
  }

  if (!callerStaff) {
    return {
      error: json(
        {
          error: `Votre email (${callerEmail}) n’est pas dans l’équipe.`,
          code: 'staff_not_found',
        },
        403,
      ),
    };
  }

  const callerRole = normalizeRole(callerStaff.role);
  if (!PROVISION_ROLES.has(callerRole)) {
    return {
      error: json(
        {
          error: 'Seuls Direction, Responsable boutique et Super admin peuvent synchroniser les connexions.',
          code: 'forbidden_role',
          role: callerRole,
        },
        403,
      ),
    };
  }

  return { adminClient, callerEmail };
}

async function findAuthUserByEmail(
  adminClient: Awaited<ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>>,
  email: string,
) {
  let page = 1;
  const normalized = email.toLowerCase();

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function syncDisplayNameInDatabase(
  adminClient: Awaited<ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>>,
  email: string,
  name: string,
) {
  const { error } = await adminClient.rpc('sync_staff_auth_display_name', {
    p_email: email,
    p_name: name,
  });
  if (error) {
    throw new Error(
      `Display name non synchronisé (${error.message}). Appliquez la migration sync_staff_auth_display_name.`,
    );
  }
}

async function upsertAuthUser(
  adminClient: Awaited<ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>>,
  supabaseUrl: string,
  serviceKey: string,
  email: string,
  name: string,
) {
  const password = defaultPassword();
  const displayName = resolveDisplayName(name, email);
  const metadata = buildStaffUserMetadata(name, email);
  const existingUser = await findAuthUserByEmail(adminClient, email);

  if (existingUser) {
    const { data: freshUser } = await adminClient.auth.admin.getUserById(existingUser.id);
    const mergedMetadata = {
      ...(freshUser?.user?.user_metadata ?? {}),
      ...metadata,
    };

    const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: mergedMetadata,
    });

    if (updateError) {
      throw new Error(updateError.message || 'Impossible de mettre à jour le compte Auth.');
    }

    await syncDisplayNameInDatabase(adminClient, email, displayName);

    return { existing: true, displayName, password };
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (createError) {
    throw new Error(createError.message || 'Impossible de créer le compte Auth.');
  }

  if (created.user?.id) {
    await syncDisplayNameInDatabase(adminClient, email, displayName);
  }

  return { existing: false, displayName, password, userId: created.user?.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Non authentifié.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Configuration serveur incomplète.' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'provision';

    const authCheck = await assertCallerCanProvision(authHeader, supabaseUrl, serviceKey);
    if ('error' in authCheck && authCheck.error) return authCheck.error;
    const { adminClient } = authCheck;

    if (action === 'check-batch') {
      const emails = Array.isArray(body.emails)
        ? body.emails.filter((e: unknown) => typeof e === 'string').map((e: string) => e.trim().toLowerCase())
        : [];

      const existingEmails = new Set<string>();
      let page = 1;
      while (page <= 10) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        for (const user of data.users) {
          if (user.email) existingEmails.add(user.email.toLowerCase());
        }
        if (data.users.length < 200) break;
        page += 1;
      }

      return json({
        ok: true,
        statuses: emails.map((email: string) => ({
          email,
          hasAuth: existingEmails.has(email),
        })),
      });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!email || !email.includes('@')) {
      return json({ error: 'Email staff invalide.' }, 400);
    }

    const result = await upsertAuthUser(adminClient, supabaseUrl, serviceKey, email, name);

    return json({
      ok: true,
      existing: result.existing,
      email,
      displayName: result.displayName,
      userId: result.userId,
      temporaryPassword: result.password,
      message: `${result.displayName} — mot de passe ${result.password}`,
    });
  } catch (err) {
    console.error('create-staff-auth error:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur.';
    return json({ error: message }, 500);
  }
});
