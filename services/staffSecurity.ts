/**
 * Changement de mot de passe par le membre du staff lui-même, et journal
 * de sécurité associé.
 *
 * Pourquoi ce module existe : jusqu'ici, changer son mot de passe n'était
 * possible qu'en suivant un lien reçu **par email** (`?type=recovery`). Or tout
 * le monde n'a pas d'adresse joignable — deux des quatre comptes staff sont sur
 * un domaine sans enregistrement MX. Ces personnes ne pouvaient donc jamais
 * changer le mot de passe qui leur avait été attribué.
 */

import { supabase } from './supabaseClient';

export interface PasswordChangeOutcome {
  ok: boolean;
  /** Renseigné si le mot de passe a changé mais que le journal a échoué. */
  auditWarning?: string;
}

export type SecurityEventType =
  | 'password_changed_self'
  | 'password_reset_by_admin'
  | 'role_changed';

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Consigne un événement de sécurité.
 *
 * `actor_email` vient de la session, jamais de l'appelant : la politique RLS
 * exige qu'il corresponde à l'email du jeton. Un admin journalise donc EN SON
 * NOM, la personne concernée allant dans `target_email`.
 *
 * Ne lève jamais. Un journal est un effet de bord : faire échouer un
 * changement de rôle parce que sa trace n'a pas pu être écrite serait une
 * mauvaise affaire. L'échec est renvoyé pour que l'appelant puisse le dire.
 */
export const logSecurityEvent = async (
  eventType: SecurityEventType,
  options: { targetEmail?: string; targetName?: string; detail?: string } = {},
): Promise<{ ok: boolean; warning?: string }> => {
  try {
    const { data: session } = await supabase.auth.getUser();
    const email = session?.user?.email;
    if (!email) return { ok: false, warning: 'Session absente.' };

    const { error } = await supabase.from('security_events').insert({
      event_type: eventType,
      actor_email: email,
      actor_name: session?.user?.user_metadata?.display_name ?? null,
      target_email: options.targetEmail ?? null,
      target_name: options.targetName ?? null,
      detail: options.detail ?? null,
    });

    return error ? { ok: false, warning: error.message } : { ok: true };
  } catch (err) {
    return { ok: false, warning: err instanceof Error ? err.message : 'Échec inconnu.' };
  }
};

/**
 * Refuse ce qui n'apporte aucune protection réelle.
 * Volontairement court : une règle trop stricte pousse à noter le mot de passe
 * sur un papier à côté de la caisse, ce qui est pire.
 */
export const describePasswordWeakness = (password: string): string | null => {
  const value = password ?? '';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (/^\d+$/.test(value)) {
    return 'Pas uniquement des chiffres — ajoute des lettres.';
  }
  if (new Set(value).size <= 2) {
    return 'Trop répétitif pour protéger quoi que ce soit.';
  }
  return null;
};

/**
 * Change le mot de passe du compte connecté, puis consigne l'événement.
 *
 * Le journal est écrit APRÈS le changement, et son échec n'annule pas celui-ci :
 * refuser un mot de passe déjà modifié laisserait l'utilisateur dans un état
 * qu'il ne comprendrait pas. L'appelant est prévenu par `auditWarning`.
 *
 * `actor_email` n'est pas envoyé par confiance : la politique RLS exige qu'il
 * corresponde à l'email du jeton, sinon l'insertion est refusée.
 */
export const changeOwnPassword = async (newPassword: string): Promise<PasswordChangeOutcome> => {
  const weakness = describePasswordWeakness(newPassword);
  if (weakness) throw new Error(weakness);

  const { data: session } = await supabase.auth.getUser();
  const email = session?.user?.email;
  if (!email) throw new Error('Session expirée — reconnecte-toi.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  const audit = await logSecurityEvent('password_changed_self', {
    detail: 'Changement effectué depuis l’espace admin.',
  });

  return audit.ok ? { ok: true } : { ok: true, auditWarning: audit.warning };
};

export interface SecurityEvent {
  id: string;
  event_type: SecurityEventType;
  actor_email: string;
  actor_name: string | null;
  target_email: string | null;
  target_name: string | null;
  detail: string | null;
  created_at: string;
}

/** Phrase lisible pour le centre de notifications de la direction. */
export const describeSecurityEvent = (event: SecurityEvent): string => {
  const acteur = event.actor_name ?? event.actor_email;
  const cible = event.target_name ?? event.target_email ?? '';

  switch (event.event_type) {
    case 'password_changed_self':
      return `${acteur} a changé son mot de passe.`;
    case 'password_reset_by_admin':
      return `${acteur} a régénéré le mot de passe de ${cible}.`;
    case 'role_changed':
      return `${acteur} a changé le rôle de ${cible}${event.detail ? ` — ${event.detail}` : ''}.`;
    default:
      return `${acteur} : ${event.detail ?? 'événement de sécurité'}.`;
  }
};

/**
 * Événements récents — la RLS ne les rend visibles qu'à la direction, donc un
 * tableau vide signifie soit « rien à signaler », soit « pas les droits ».
 * Les deux cas se traitent pareil côté interface : on n'affiche rien.
 */
export const fetchRecentSecurityEvents = async (limit = 20): Promise<SecurityEvent[]> => {
  const { data, error } = await supabase
    .from('security_events')
    .select('id, event_type, actor_email, actor_name, target_email, target_name, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[security] lecture du journal impossible :', error.message);
    return [];
  }
  return (data ?? []) as SecurityEvent[];
};
