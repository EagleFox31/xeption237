import { isSuperAdminStaffRole } from '../constants/staffRoles';
import { supabase } from '../services/supabaseClient';

export function getSuperAdminEmails(): string[] {
  const raw = import.meta.env.VITE_SUPER_ADMIN_EMAILS || '';
  return raw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return getSuperAdminEmails().includes(normalized);
}

export async function resolveSuperAdminAccess(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (isSuperAdminEmail(normalized)) return true;

  const { data, error } = await supabase
    .from('staff')
    .select('role')
    .eq('email', normalized)
    .maybeSingle();

  if (error || !data?.role) return false;
  return isSuperAdminStaffRole(String(data.role));
}
