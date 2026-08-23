export const FEEDBACK_KINDS = ['service', 'product', 'sav'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const PRODUCT_FEEDBACK_DELAY_DAYS = 7;

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  service: 'Accueil boutique',
  product: 'Produit',
  sav: 'SAV',
};

export const isFeedbackKind = (value: string): value is FeedbackKind =>
  (FEEDBACK_KINDS as readonly string[]).includes(value);

export const normalizeWhatsAppPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length >= 12) return digits;
  if (digits.length === 9) return `237${digits}`;
  return digits;
};

export const buildCustomerWhatsAppUrl = (phone: string, message: string): string => {
  const to = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
};

export const firstNameOf = (fullName: string): string => {
  const part = fullName.trim().split(/\s+/)[0];
  return part || 'toi';
};

export const buildFeedbackPagePath = (token: string): string => `/avis/${token}`;

export const buildFeedbackInviteMessage = (input: {
  kind: FeedbackKind;
  customerName: string;
  headline?: string;
  pageUrl: string;
}): string => {
  const name = firstNameOf(input.customerName);
  const device = (input.headline || 'ton appareil').trim();
  if (input.kind === 'service') {
    return [
      `Salut ${name}, c’est Xeption.`,
      'Tu as récupéré ta commande — merci.',
      'En 10 secondes, tu notes juste l’accueil en boutique :',
      input.pageUrl,
    ].join('\n');
  }
  if (input.kind === 'sav') {
    return [
      `Salut ${name}, c’est Xeption.`,
      `Ton SAV sur ${device} est terminé.`,
      'Tu notes l’atelier ?',
      input.pageUrl,
    ].join('\n');
  }
  return [
    `Salut ${name}, c’est Xeption.`,
    `Ça fait une semaine avec ${device}.`,
    'Il est comme prévu ? Note-le ici :',
    input.pageUrl,
  ].join('\n');
};

export const isInviteDue = (inviteAtIso: string, now: Date = new Date()): boolean =>
  new Date(inviteAtIso).getTime() <= now.getTime();

export const clampStarRating = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
};
