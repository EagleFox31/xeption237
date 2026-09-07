import { isSuperAdminStaffRole } from '../constants/staffRoles';
import { fetchStaffLoginHint } from '../services/staffLoginHint';

/**
 * Le super-admin se reconnait a son ROLE dans `staff`, et a rien d'autre.
 *
 * Une liste d'emails vivait auparavant dans `VITE_SUPER_ADMIN_EMAILS`. Le
 * prefixe `VITE_` signifie « recopie dans le JavaScript livre » : l'adresse
 * personnelle du super-admin se lisait donc en clair dans le bundle public.
 * Elle servait de raccourci a un controle que la base sait deja faire — la
 * colonne `staff.role` existe et vaut `super_admin`.
 *
 * Le raccourci est supprime. Cote SERVEUR, les Edge Functions continuent de
 * lire `SUPER_ADMIN_EMAILS` depuis les secrets Supabase : la, rien n'est livre
 * au navigateur, et le mecanisme reste utile pour amorcer un acces quand la
 * table `staff` ne contient pas encore la personne.
 */
export async function resolveSuperAdminAccess(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  // Ce controle a lieu AVANT la saisie du mot de passe : il doit fonctionner
  // sans session, d'ou la RPC plutot qu'une lecture directe de la table.
  const hint = await fetchStaffLoginHint(normalized);
  if (!hint?.role) return false;
  return isSuperAdminStaffRole(hint.role);
}
