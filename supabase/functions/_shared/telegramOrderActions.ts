/**
 * Boutons d'action des alertes de commande dans le groupe Telegram staff :
 * « ✅ Livrée », « 📵 Injoignable », « ❌ Annuler ».
 * Module pur (sans Deno) : clavier, callback_data et traitement du clic, dépendances injectées.
 * L'écriture passe par la RPC telegram_staff_order_action (droits, stock, encaissement, audit).
 *
 * Convention du bot : callback_data = nav:<action>:<args>, limite Telegram 64 octets
 * (« nav:oa:cxr: » + id ≤ 40 + « :4 » = 54 octets au plus).
 *
 * Droits (vérifiés par la RPC, reflétés ici pour répondre tout de suite) :
 * tout staff lié pour Livrée / Injoignable, responsable et plus pour Annuler.
 */
import type { TelegramInlineButton, TelegramInlineKeyboard } from './telegramDigestAck.ts';

const PREFIX = 'nav:oa:';
const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const SQLSTATE_INSUFFICIENT_PRIVILEGE = '42501';
const SQLSTATE_RAISE = 'P0001';

/** Rang minimum pour annuler (ROLE_RANK du bot : responsable = 1). */
export const RANK_CANCEL = 1;

/** Miroir de ORDER_CANCEL_REASONS (utils/orderWorkflow.ts), vérifié par tests/telegram-order-actions.test.ts. */
export const TELEGRAM_CANCEL_REASONS = [
  'Client injoignable',
  'Client a renoncé',
  'Rupture de stock',
  'Doublon',
  'Prix ou délai refusé',
] as const;

/** Statuts « en cours » (ORDER_OPEN_STATUSES) : seules ces commandes portent les boutons. */
const OPEN_STATUSES: ReadonlySet<string> = new Set(['pending', 'confirmed', 'ready', 'shipped']);

/** Alertes qui portent les boutons : la commande attend encore une issue. */
export const ORDER_ACTION_EVENT_TYPES: ReadonlySet<string> = new Set([
  'order_created', 'order_unreachable', 'order_stale',
]);

export type OrderActionOp = 'dlv' | 'dok' | 'cash' | 'unr' | 'cxl' | 'cxr' | 'back';
const OPS: ReadonlySet<string> = new Set(['dlv', 'dok', 'cash', 'unr', 'cxl', 'cxr', 'back']);

export interface OrderActionCallback {
  op: OrderActionOp;
  orderId: string;
  /** Index dans TELEGRAM_CANCEL_REASONS (op = cxr). */
  reasonIndex?: number;
}

export const orderActionCallbackData = (op: OrderActionOp, orderId: string, arg?: number): string =>
  `${PREFIX}${op}:${orderId}${arg === undefined ? '' : `:${arg}`}`;

export const parseOrderActionCallback = (data: string | undefined | null): OrderActionCallback | null => {
  if (!data || !data.startsWith(PREFIX)) return null;
  const [op, orderId, arg, ...rest] = data.slice(PREFIX.length).split(':');
  if (rest.length || !OPS.has(op) || !ORDER_ID_PATTERN.test(orderId ?? '')) return null;
  if (op !== 'cxr') return arg === undefined ? { op: op as OrderActionOp, orderId } : null;
  const reasonIndex = Number(arg);
  return Number.isInteger(reasonIndex) && reasonIndex >= 0 && reasonIndex < TELEGRAM_CANCEL_REASONS.length
    ? { op: 'cxr', orderId, reasonIndex }
    : null;
};

export const isOrderActionable = (status: unknown, deliveryMode?: unknown): boolean =>
  typeof status === 'string' && OPEN_STATUSES.has(status) && deliveryMode !== 'pos';

const button = (text: string, op: OrderActionOp, orderId: string, arg?: number): TelegramInlineButton =>
  ({ text, callback_data: orderActionCallbackData(op, orderId, arg) });

/** Ligne d'actions d'une commande ouverte ; pas d'annulation pour un colis déjà parti. */
export const orderActionRows = (orderId: string, status: string): TelegramInlineButton[][] => {
  if (!ORDER_ID_PATTERN.test(orderId) || !OPEN_STATUSES.has(status)) return [];
  const row = [button('✅ Livrée', 'dlv', orderId), button('📵 Injoignable', 'unr', orderId)];
  if (status !== 'shipped') row.push(button('❌ Annuler', 'cxl', orderId));
  return [row];
};

const deliverConfirmRows = (orderId: string, paid: boolean): TelegramInlineButton[][] => [[
  paid ? button('✅ Oui, livrée', 'dok', orderId) : button('💵 Espèces reçues → livrée', 'cash', orderId),
  button('↩️ Retour', 'back', orderId),
]];

const cancelReasonRows = (orderId: string): TelegramInlineButton[][] => {
  const rows: TelegramInlineButton[][] = [];
  TELEGRAM_CANCEL_REASONS.forEach((reason, i) => {
    if (i % 2 === 0) rows.push([]);
    rows[rows.length - 1].push(button(reason, 'cxr', orderId, i));
  });
  rows.push([button('↩️ Retour', 'back', orderId)]);
  return rows;
};

const isOrderActionButton = (b: TelegramInlineButton): boolean =>
  typeof b.callback_data === 'string' && b.callback_data.startsWith(PREFIX);

/** Garde les boutons-liens du message, remplace les lignes d'action par `rows`. */
export const replaceOrderActionRows = (markup: unknown, rows: TelegramInlineButton[][]): TelegramInlineKeyboard => {
  const current = (markup as Partial<TelegramInlineKeyboard> | null | undefined)?.inline_keyboard;
  const kept = (Array.isArray(current) ? current : [])
    .filter(Array.isArray)
    .map((row) => row.filter((b) => b && typeof b === 'object' && !isOrderActionButton(b)))
    .filter((row) => row.length > 0);
  return { inline_keyboard: [...kept, ...rows] };
};

// ── Traitement du clic ─────────────────────────────────────────────────────────

export type OrderRpcAction = 'delivered' | 'cash_delivered' | 'unreachable' | 'cancelled';

export interface OrderActionRpcResult {
  data?: Record<string, unknown> | null;
  /** SQLSTATE (42501 = lien staff absent / rôle insuffisant, P0001 = refus métier). */
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface OrderState {
  status: string;
  paymentStatus: string | null;
  deliveryMode: string | null;
}

export interface OrderActionDeps {
  /** Staff lié à l'auteur du clic (null : compte Telegram non lié). */
  actor: { rank: number; name?: string | null } | null;
  act(orderId: string, action: OrderRpcAction, telegramUserId: string, reason?: string): Promise<OrderActionRpcResult>;
  orderState(orderId: string): Promise<OrderState | null>;
  telegram(method: string, body: Record<string, unknown>): Promise<unknown>;
  now?: () => Date;
}

export const ORDER_ACTION_REPLIES = {
  notLinked: '🔒 Compte Telegram non lié au staff : ouvrez la discussion privée avec le bot pour le lier.',
  cancelForbidden: '🔒 Annulation réservée aux responsables et à la direction.',
  closed: 'ℹ️ Cette commande est déjà clôturée.',
  shipped: '🚚 Colis déjà parti : passez par « Refus livraison » puis « Retour reçu » depuis la fiche commande.',
  confirmDelivered: 'Confirmez la livraison.',
  needsPayment: '💵 Paiement non enregistré : confirmez les espèces reçues, ou encaissez le Mobile Money depuis la fiche commande.',
  chooseReason: 'Choisissez le motif d\'annulation.',
  delivered: '✅ Commande livrée.',
  cancelled: '❌ Commande annulée.',
  unavailable: 'Action indisponible pour le moment, réessayez plus tard.',
} as const;

type Obj = Record<string, unknown>;

const doualaTime = (d: Date): string =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit' }).format(d);

/**
 * Traite un callback « nav:oa: ». Renvoie false si ce n'en est pas un (le routeur continue),
 * true sinon : réponse envoyée, clavier et texte du message mis à jour.
 */
export async function handleOrderActionCallback(cb: Obj, deps: OrderActionDeps): Promise<boolean> {
  const parsed = parseOrderActionCallback(typeof cb.data === 'string' ? cb.data : null);
  if (!parsed) return false;
  const { op, orderId } = parsed;

  const callbackQueryId = String(cb.id ?? '');
  const from = cb.from as Obj | undefined;
  const telegramUserId = String(from?.id ?? '');
  const message = cb.message as Obj | undefined;
  const chatId = (message?.chat as Obj | undefined)?.id;
  const messageId = message?.message_id;
  const markup = message?.reply_markup;

  const answer = (text: string, showAlert = false) =>
    deps.telegram('answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: showAlert }).catch(() => {});
  const canEdit = chatId !== undefined && messageId !== undefined;
  const setRows = async (rows: TelegramInlineButton[][]) => {
    if (!canEdit) return;
    await deps.telegram('editMessageReplyMarkup', {
      chat_id: chatId, message_id: messageId, reply_markup: replaceOrderActionRows(markup, rows),
    }).catch(() => {});
  };
  /** Ajoute une ligne de suivi au message (entités conservées) ; à défaut, met seulement le clavier à jour. */
  const appendLine = async (line: string, rows: TelegramInlineButton[][]) => {
    if (!canEdit) return;
    const text = typeof message?.text === 'string' ? message.text : '';
    const next = `${text}\n${line}`;
    if (text && next.length <= 4096) {
      const ok = await deps.telegram('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: next,
        ...(Array.isArray(message?.entities) ? { entities: message.entities } : {}),
        disable_web_page_preview: true,
        reply_markup: replaceOrderActionRows(markup, rows),
      }).then(() => true, () => false);
      if (ok) return;
    }
    await setRows(rows);
  };

  if (!deps.actor) {
    await answer(ORDER_ACTION_REPLIES.notLinked, true);
    return true;
  }

  // Étapes intermédiaires (confirmation, motif, retour) : aucune écriture, seulement le clavier.
  if (op === 'dlv' || op === 'cxl' || op === 'back') {
    if (op === 'cxl' && deps.actor.rank < RANK_CANCEL) {
      await answer(ORDER_ACTION_REPLIES.cancelForbidden, true);
      return true;
    }
    let state: OrderState | null;
    try {
      state = await deps.orderState(orderId);
    } catch {
      await answer(ORDER_ACTION_REPLIES.unavailable, true);
      return true;
    }
    if (!state || !isOrderActionable(state.status, state.deliveryMode)) {
      await answer(ORDER_ACTION_REPLIES.closed);
      await setRows([]);
      return true;
    }
    if (op === 'back') {
      await answer('');
      await setRows(orderActionRows(orderId, state.status));
    } else if (op === 'dlv') {
      const paid = state.paymentStatus === 'paid';
      await answer(paid ? ORDER_ACTION_REPLIES.confirmDelivered : ORDER_ACTION_REPLIES.needsPayment, !paid);
      await setRows(deliverConfirmRows(orderId, paid));
    } else if (state.status === 'shipped') {
      await answer(ORDER_ACTION_REPLIES.shipped, true);
      await setRows(orderActionRows(orderId, state.status));
    } else {
      await answer(ORDER_ACTION_REPLIES.chooseReason);
      await setRows(cancelReasonRows(orderId));
    }
    return true;
  }

  if (op === 'cxr' && deps.actor.rank < RANK_CANCEL) {
    await answer(ORDER_ACTION_REPLIES.cancelForbidden, true);
    return true;
  }

  const action: OrderRpcAction =
    op === 'dok' ? 'delivered' : op === 'cash' ? 'cash_delivered' : op === 'unr' ? 'unreachable' : 'cancelled';
  const reason = op === 'cxr' ? TELEGRAM_CANCEL_REASONS[parsed.reasonIndex as number] : undefined;

  let result: OrderActionRpcResult;
  try {
    result = await deps.act(orderId, action, telegramUserId, reason);
  } catch {
    await answer(ORDER_ACTION_REPLIES.unavailable, true);
    return true;
  }
  if (result.errorCode === SQLSTATE_INSUFFICIENT_PRIVILEGE) {
    await answer(action === 'cancelled' ? ORDER_ACTION_REPLIES.cancelForbidden : ORDER_ACTION_REPLIES.notLinked, true);
    return true;
  }
  if (result.errorCode) {
    // P0001 : refus métier rédigé par les RPC (stock insuffisant, annulation impossible…).
    const detail = result.errorCode === SQLSTATE_RAISE && result.errorMessage ? result.errorMessage.slice(0, 180) : null;
    await answer(detail ? `⚠️ ${detail}` : ORDER_ACTION_REPLIES.unavailable, true);
    return true;
  }

  const data = result.data ?? {};
  const outcome = String(data.outcome ?? '');
  const status = String(data.status ?? '');
  const count = Number(data.count ?? 0);
  const actorName = String(data.actor ?? deps.actor.name ?? from?.first_name ?? '').trim();
  const stamp = `${actorName ? `${actorName}, ` : ''}${doualaTime(deps.now?.() ?? new Date())}`;

  switch (outcome) {
    case 'not_found':
    case 'closed':
      await answer(ORDER_ACTION_REPLIES.closed);
      await setRows([]);
      return true;
    case 'shipped':
      await answer(ORDER_ACTION_REPLIES.shipped, true);
      await setRows(orderActionRows(orderId, 'shipped'));
      return true;
    case 'needs_payment':
      await answer(ORDER_ACTION_REPLIES.needsPayment, true);
      await setRows(deliverConfirmRows(orderId, false));
      return true;
    case 'unreachable_recent':
      await answer(`📵 Déjà notée il y a moins de 10 min (tentative n°${count}).`);
      await setRows(orderActionRows(orderId, status));
      return true;
    case 'unreachable':
      await answer(`📵 Tentative n°${count} notée.`);
      await appendLine(`📵 Injoignable (tentative n°${count}) — ${stamp}`, orderActionRows(orderId, status));
      return true;
    case 'delivered':
    case 'cash_delivered':
      await answer(ORDER_ACTION_REPLIES.delivered);
      await appendLine(`✅ Livrée${outcome === 'cash_delivered' ? ', espèces reçues' : ''} — ${stamp}`, []);
      return true;
    case 'cancelled':
      await answer(ORDER_ACTION_REPLIES.cancelled);
      await appendLine(`❌ Annulée (${reason}) — ${stamp}`, []);
      return true;
    default:
      await answer(ORDER_ACTION_REPLIES.unavailable, true);
      return true;
  }
}
