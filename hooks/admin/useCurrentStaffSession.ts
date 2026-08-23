import { useEffect, useMemo, useState } from 'react';
import { getStaffRoleShortLabel, normalizeStaffRole, type StaffRoleId } from '../../constants/staffRoles';
import { supabase } from '../../services/supabaseClient';
import { Staff } from '../../types';

export const staffInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export function useCurrentStaffSession(staffMembers: Staff[]) {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [fetchedStaff, setFetchedStaff] = useState<Staff | null>(null);

  useEffect(() => {
    const sync = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSessionEmail(session?.user?.email?.toLowerCase() ?? null);
    };
    void sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email?.toLowerCase() ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const staffFromList = useMemo(
    () => staffMembers.find((s) => s.email?.toLowerCase() === sessionEmail) ?? null,
    [staffMembers, sessionEmail],
  );

  useEffect(() => {
    if (staffFromList || !sessionEmail) {
      setFetchedStaff(null);
      return;
    }

    let cancelled = false;
    void supabase
      .from('staff')
      .select('id,name,email,role,store_id')
      .eq('email', sessionEmail)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setFetchedStaff(data as Staff);
      });

    return () => {
      cancelled = true;
    };
  }, [staffFromList, sessionEmail]);

  const staff = staffFromList ?? fetchedStaff;

  const displayName = staff?.name?.trim() || sessionEmail?.split('@')[0] || 'Équipe';
  const roleId: StaffRoleId = normalizeStaffRole(staff?.role);
  const roleLabel = staff?.role ? getStaffRoleShortLabel(staff.role) : 'Staff';

  return {
    staff,
    sessionEmail,
    displayName,
    roleId,
    roleLabel,
    initials: staffInitials(displayName),
  };
}
