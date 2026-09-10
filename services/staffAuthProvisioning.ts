import { supabase } from './supabaseClient';
import { readEdgeFunctionErrorMessage } from '../utils/edgeFunctionError';

/**
 * Il n'y a plus de mot de passe d'équipe.
 *
 * Chaque compte reçoit un mot de passe aléatoire, renvoyé UNE FOIS par
 * `create-staff-auth` et affiché à l'admin qui provisionne. Un mot de passe
 * commun rendait l'attribution des ventes invérifiable : n'importe qui pouvait
 * se connecter en tant que n'importe qui, alors que le projet porte des
 * objectifs et des commissions par vendeur.
 */

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

async function invokeStaffAuth(body: Record<string, unknown>): Promise<InvokePayload> {
  const { data, error } = await supabase.functions.invoke('create-staff-auth', { body });

  if (error) {
    throw new Error(await readEdgeFunctionErrorMessage(error, 'Appel serveur impossible.'));
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

/**
 * Crée le compte Auth d'un membre, ou met à jour son profil.
 *
 * `resetPassword` n'est vrai que sur une action explicite : enregistrer un
 * membre pour changer son rôle ne doit pas lui reprendre son mot de passe.
 */
export async function provisionStaffAuthUser(
  email: string,
  name: string,
  options: { resetPassword?: boolean } = {},
): Promise<StaffAuthProvisionResult> {
  const payload = await invokeStaffAuth({
    action: 'provision',
    email: email.trim().toLowerCase(),
    name: name.trim(),
    resetPassword: options.resetPassword === true,
  });

  return payload as StaffAuthProvisionResult;
}

export function formatProvisionFeedback(result: StaffAuthProvisionResult): string {
  return result.temporaryPassword
    ? `${result.email} — ${result.temporaryPassword}`
    : `${result.email} — compte déjà en place`;
}
