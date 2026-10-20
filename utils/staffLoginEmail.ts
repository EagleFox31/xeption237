/**
 * Le staff boutique n'a pas toujours d'email. Supabase Auth en exige un : on
 * dérive alors un identifiant technique stable du numéro (jamais utilisé pour
 * écrire au membre). Le membre se connecte avec son nom ou son numéro, que
 * `staff_login_hint` résout vers cet email.
 */
export const STAFF_LOGIN_EMAIL_DOMAIN = 'staff.xeptionetwork.shop';

/** Numéro camerounais sur 9 chiffres (indicatif 237 et séparateurs retirés), ou null. */
export const normalizeStaffPhone = (phone: string | null | undefined): string | null => {
  const digits = (phone ?? '').replace(/\D/g, '');
  const local = /^237\d{9}$/.test(digits) ? digits.slice(3) : digits;
  return /^\d{9}$/.test(local) ? local : null;
};

export const staffLoginEmailFromPhone = (phone: string | null | undefined): string | null => {
  const local = normalizeStaffPhone(phone);
  return local ? `237${local}@${STAFF_LOGIN_EMAIL_DOMAIN}` : null;
};

export const isGeneratedStaffEmail = (email: string | null | undefined): boolean =>
  (email ?? '').toLowerCase().endsWith(`@${STAFF_LOGIN_EMAIL_DOMAIN}`);
