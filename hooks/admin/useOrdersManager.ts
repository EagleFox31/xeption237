
import React, { useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Order } from '../../types';
import { DB_TABLES } from '../../constants/dbSchema';
import { assertRpcSuccess } from '../../utils/rpcResult';
import { canTransitionOrder } from '../../utils/orderWorkflow';

interface UseOrdersManagerProps {
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    refreshData?: () => void;
}

export interface MarkUnreachableResult {
    /** Nombre total de tentatives enregistrées pour la commande. */
    count: number;
    /** true si une tentative a déjà été notée il y a moins de 10 min (aucune écriture). */
    skipped: boolean;
}

/** Message lisible pour une erreur Supabase (PostgrestError n'est pas toujours une Error). */
const toActionError = (error: unknown, fallback: string): Error => {
    const raw =
        error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
            ? (error as { message: string }).message
            : '';
    if (/responsable boutique ou à la direction/i.test(raw)) {
        return new Error('Seul un responsable boutique ou la direction peut annuler une commande.');
    }
    if (/réservé à l'équipe|réservé à l’équipe/i.test(raw)) {
        return new Error('Action réservée à l’équipe connectée.');
    }
    return new Error(raw.trim() || fallback);
};

export const useOrdersManager = ({ orders, setOrders, refreshData }: UseOrdersManagerProps) => {

    /**
     * `fromStatus` : statut connu de l'appelant. Indispensable quand plusieurs étapes
     * s'enchaînent dans un même handler (Livrée depuis « En attente ») : `orders`
     * capturé par ce callback n'est pas encore re-rendu entre deux étapes.
     */
    const updateStatus = useCallback(async (orderId: string, newStatus: Order['status'], fromStatus?: Order['status']) => {
        const order = orders.find((o) => o.id === orderId);
        const oldStatus = fromStatus ?? order?.status ?? null;

        if (!oldStatus || !canTransitionOrder(oldStatus, newStatus)) {
            throw new Error('Cette étape n\'est pas possible pour cette commande.');
        }

        if (oldStatus !== newStatus) {
            const { data: syncData, error: syncError } = await supabase.rpc('sync_order_stock_on_status', {
                p_order_id: orderId,
                p_new_status: newStatus,
                p_old_status: oldStatus,
            });
            if (syncError) throw syncError;
            assertRpcSuccess(syncData, 'Impossible de mettre à jour le stock pour cette commande.');
        }

        const { data, error } = await supabase
            .from(DB_TABLES.ORDERS)
            .update({ status: newStatus })
            .eq('id', orderId)
            .select('id');

        if (error) throw error;
        if (!data?.length) {
            throw new Error('Commande introuvable ou mise à jour refusée.');
        }

        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        refreshData?.();
    }, [orders, setOrders, refreshData]);

    const cancelOrder = useCallback(async (order: Order, reason?: string) => {
        const { data, error } = await supabase.rpc('cancel_order_with_stock', {
            p_order_id: order.id,
            p_reason: reason ?? null,
        });
        if (error) throw toActionError(error, 'Annulation refusée');
        assertRpcSuccess(data, 'Annulation refusée');

        setOrders((prev) =>
            prev.map((o) =>
                o.id === order.id
                    ? { ...o, status: 'cancelled' as const }
                    : o,
            ),
        );
        refreshData?.();
    }, [setOrders, refreshData]);

    /** Note une tentative de contact sans réponse (idempotent sur 10 min côté serveur). */
    const markUnreachable = useCallback(async (orderId: string): Promise<MarkUnreachableResult> => {
        const { data, error } = await supabase.rpc('mark_order_unreachable', { p_order_id: orderId });
        if (error) throw toActionError(error, 'Impossible de noter la tentative.');
        assertRpcSuccess(data, 'Impossible de noter la tentative.');

        const count = Number(data.count ?? 0);
        const skipped = data.skipped === true;
        const lastUnreachableAt = typeof data.last_unreachable_at === 'string' ? data.last_unreachable_at : null;
        setOrders((prev) =>
            prev.map((o) =>
                o.id === orderId
                    ? { ...o, unreachableCount: count, lastUnreachableAt: lastUnreachableAt ?? o.lastUnreachableAt ?? null }
                    : o,
            ),
        );
        return { count, skipped };
    }, [setOrders]);

    return { updateStatus, cancelOrder, markUnreachable };
};
