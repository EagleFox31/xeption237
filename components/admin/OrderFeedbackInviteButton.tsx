import React from 'react';
import { MessageCircle } from 'lucide-react';
import { FEEDBACK_KIND_LABELS, type FeedbackKind } from '../../utils/orderFeedback';
import { openFeedbackWhatsApp, type DueFeedbackInvite } from '../../services/orderFeedback';

interface OrderFeedbackInviteButtonProps {
  invite: DueFeedbackInvite;
  onSent?: (token: string) => void;
}

const shortLabel = (kind: FeedbackKind): string => {
  if (kind === 'service') return 'Avis accueil';
  if (kind === 'sav') return 'Avis SAV';
  return 'Avis produit';
};

const OrderFeedbackInviteButton: React.FC<OrderFeedbackInviteButtonProps> = ({
  invite,
  onSent,
}) => {
  const [busy, setBusy] = React.useState(false);

  const onClick = async () => {
    if (!invite.customer_phone) return;
    setBusy(true);
    try {
      await openFeedbackWhatsApp(invite);
      onSent?.(invite.token);
    } finally {
      setBusy(false);
    }
  };

  if (!invite.customer_phone) {
    return (
      <span className="text-[10px] text-white/65">
        Pas de WhatsApp pour {FEEDBACK_KIND_LABELS[invite.kind].toLowerCase()}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      className="text-[10px] inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded uppercase font-bold disabled:opacity-50"
      title={`Envoyer l’avis ${FEEDBACK_KIND_LABELS[invite.kind].toLowerCase()} au client`}
    >
      <MessageCircle className="w-3 h-3" />
      {invite.sent_at ? `${shortLabel(invite.kind)} (renvoyer)` : shortLabel(invite.kind)}
    </button>
  );
};

export default OrderFeedbackInviteButton;
