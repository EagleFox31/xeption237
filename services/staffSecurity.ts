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

export const MIN_PASSWORD_LENGTH = 8;

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

  const { error: auditError } = await supabase.from('security_events').insert({
    event_type: 'password_changed_self',
    actor_email: email,
    actor_name: session?.user?.user_metadata?.display_name ?? null,
    detail: 'Changement effectué depuis l’espace admin.',
  });

  return auditError
    ? { ok: true, auditWarning: auditError.message }
    : { ok: true };
};

export interface SecurityEvent {
  id: string;
  event_type: string;
  actor_email: string;
  actor_name: string | null;
  detail: string | null;
  created_at: string;
}

/**
 * Événements récents — la RLS ne les rend visibles qu'à la direction, donc un
 * tableau vide signifie soit « rien à signaler », soit « pas les droits ».
 * Les deux cas se traitent pareil côté interface : on n'affiche rien.
 */
export const fetchRecentSecurityEvents = async (limit = 20): Promise<SecurityEvent[]> => {
  const { data, error } = await supabase
    .from('security_events')
    .select('id, event_type, actor_email, actor_name, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[security] lecture du journal impossible :', error.message);
    return [];
  }
  return (data ?? []) as SecurityEvent[];
};
