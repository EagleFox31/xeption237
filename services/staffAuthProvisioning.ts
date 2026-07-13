import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

/** Mot de passe staff unique — aligné sur secret Edge Function STAFF_DEFAULT_PASSWORD. */
export const STAFF_DEFAULT_PASSWORD = '123456';

export type StaffAuthProvisionResult = {
  ok: boolean;
  existing?: boolean;
  email: string;
  temporaryPassword?: string;
  message: string;
};

export type StaffAuthStatus = {
  email: string;
  hasAuth: boolean;
};

type InvokePayload = StaffAuthProvisionResult | { error?: string; ok?: boolean; statuses?: StaffAuthStatus[] };

async function readFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        return body.error;
      }
    } catch {
      /* ignore */
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Appel serveur impossible.';
}

async function invokeStaffAuth(body: Record<string, unknown>): Promise<InvokePayload> {
  const { data, error } = await supabase.functions.invoke('create-staff-auth', { body });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error));
  }

  const payload = data as InvokePayload | null;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Réponse serveur invalide.');
  }
  if ('error' in payload && payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

export async function checkStaffAuthStatuses(emails: string[]): Promise<Record<string, boolean>> {
  if (!emails.length) return {};

  const payload = await invokeStaffAuth({
    action: 'check-batch',
    emails: emails.map((e) => e.trim().toLowerCase()),
  });

  const statuses = payload.statuses ?? [];
  return Object.fromEntries(statuses.map((s) => [s.email.toLowerCase(), s.hasAuth]));
}

/** Crée ou met à jour Auth : nom staff + mot de passe STAFF_DEFAULT_PASSWORD. */
export async function provisionStaffAuthUser(
  email: string,
  name: string,
): Promise<StaffAuthProvisionResult> {
  const payload = await invokeStaffAuth({
    action: 'provision',
    email: email.trim().toLowerCase(),
    name: name.trim(),
  });

  return payload as StaffAuthProvisionResult;
}

export function formatProvisionFeedback(result: StaffAuthProvisionResult): string {
  const pwd = result.temporaryPassword ?? STAFF_DEFAULT_PASSWORD;
  return `${result.email} — ${pwd}`;
}
