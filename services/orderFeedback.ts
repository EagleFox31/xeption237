import { supabase } from './supabaseClient';
import { assertRpcSuccess } from '../utils/rpcResult';
import {
  type FeedbackKind,
  buildCustomerWhatsAppUrl,
  buildFeedbackInviteMessage,
  buildFeedbackPagePath,
  isFeedbackKind,
  isInviteDue,
} from '../utils/orderFeedback';

export type DueFeedbackInvite = {
  token: string;
  order_id: string | null;
  repair_ticket_id: string | null;
  kind: FeedbackKind;
  customer_name: string;
  customer_phone: string;
  headline: string | null;
  invite_at: string;
  sent_at: string | null;
  completed_at: string | null;
};

export type PublicFeedbackInvite = {
  already: boolean;
  kind: FeedbackKind;
  headline: string | null;
  firstName: string;
  items: { id?: string; name?: string }[];
};

const publicAppOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://www.xeptionetwork.shop';
};

export const feedbackPageUrl = (token: string): string =>
  `${publicAppOrigin()}${buildFeedbackPagePath(token)}`;

export const openFeedbackWhatsApp = async (invite: DueFeedbackInvite): Promise<void> => {
  const url = buildCustomerWhatsAppUrl(
    invite.customer_phone,
    buildFeedbackInviteMessage({
      kind: invite.kind,
      customerName: invite.customer_name,
      headline: invite.headline ?? undefined,
      pageUrl: feedbackPageUrl(invite.token),
    }),
  );
  window.open(url, '_blank', 'noopener,noreferrer');
  const { data, error } = await supabase.rpc('mark_feedback_invite_sent', {
    p_token: invite.token,
  });
  if (error) throw error;
  assertRpcSuccess(data, 'Impossible de marquer l’invitation comme envoyée.');
};

export const listDueFeedbackInvites = async (): Promise<DueFeedbackInvite[]> => {
  const { data, error } = await supabase.rpc('list_due_feedback_invites');
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data
    .map((row): DueFeedbackInvite | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const kind = typeof r.kind === 'string' && isFeedbackKind(r.kind) ? r.kind : null;
      const token = typeof r.token === 'string' ? r.token : null;
      if (!kind || !token) return null;
      return {
        token,
        order_id: typeof r.order_id === 'string' ? r.order_id : null,
        repair_ticket_id: typeof r.repair_ticket_id === 'string' ? r.repair_ticket_id : null,
        kind,
        customer_name: typeof r.customer_name === 'string' ? r.customer_name : '',
        customer_phone: typeof r.customer_phone === 'string' ? r.customer_phone : '',
        headline: typeof r.headline === 'string' ? r.headline : null,
        invite_at: typeof r.invite_at === 'string' ? r.invite_at : '',
        sent_at: typeof r.sent_at === 'string' ? r.sent_at : null,
        completed_at: typeof r.completed_at === 'string' ? r.completed_at : null,
      };
    })
    .filter((row): row is DueFeedbackInvite => row !== null && isInviteDue(row.invite_at));
};

export const getPublicFeedbackInvite = async (
  token: string,
): Promise<PublicFeedbackInvite | { tooEarly: true; inviteAt: string } | null> => {
  const { data, error } = await supabase.rpc('get_feedback_invite', { p_token: token });
  if (error) throw error;
  if (!data || typeof data !== 'object') return null;
  const payload = data as { success?: boolean; error?: string; invite_at?: string };
  if (payload.error === 'too_early') {
    return { tooEarly: true, inviteAt: String(payload.invite_at || '') };
  }
  if (!payload.success) return null;
  const body = data as Record<string, unknown>;
  const kind = typeof body.kind === 'string' && isFeedbackKind(body.kind) ? body.kind : null;
  if (!kind) return null;
  const items = Array.isArray(body.items)
    ? body.items.map((item) => {
        const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        return {
          id: typeof row.id === 'string' ? row.id : undefined,
          name: typeof row.name === 'string' ? row.name : undefined,
        };
      })
    : [];
  return {
    already: Boolean(body.already),
    kind,
    headline: typeof body.headline === 'string' ? body.headline : null,
    firstName: typeof body.first_name === 'string' && body.first_name ? body.first_name : 'toi',
    items,
  };
};

export const submitPublicFeedback = async (input: {
  token: string;
  rating: number;
  comment?: string;
  productRatings?: { product_id?: string; rating: number }[];
}): Promise<void> => {
  const { data, error } = await supabase.rpc('submit_feedback', {
    p_token: input.token,
    p_rating: input.rating,
    p_comment: input.comment ?? null,
    p_product_ratings: input.productRatings ?? [],
  });
  if (error) throw error;
  assertRpcSuccess(data, 'Impossible d’enregistrer ton avis.');
};
