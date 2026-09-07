import { supabase } from './supabaseClient';

/**
 * Point d'entree UNIQUE pour les lectures de `staff` faites AVANT la connexion.
 *
 * L'ecran de connexion a besoin de resoudre un identifiant (nom ou email) en
 * nom / email / role, avant tout mot de passe. Cela se faisait en lisant
 * directement la table, qui devait donc rester ouverte a `anon` — et ce qui est
 * ouvert pour repondre a une question l'est aussi pour LISTER toute l'equipe.
 *
 * La RPC `staff_login_hint` repond a la meme question sans ouvrir la table :
 * correspondance exacte, une ligne au plus, jamais de liste. Un motif comme
 * « % » ne renvoie rien.
 *
 * Trois appelants passaient par la table ; ils passent tous par ici desormais.
 * Ajouter un quatrieme acces direct annulerait la fermeture : utiliser cette
 * fonction.
 */
export interface StaffLoginHint {
  name: string;
  email: string;
  role: string;
}

export const fetchStaffLoginHint = async (
  identifier: string,
): Promise<StaffLoginHint | null> => {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase.rpc('staff_login_hint', {
    p_identifier: trimmed,
  });

  if (error) {
    console.error('staff_login_hint:', error);
    throw new Error('Impossible de vérifier l’identifiant pour le moment.');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.email) return null;

  return { name: row.name ?? '', email: String(row.email), role: String(row.role ?? '') };
};
