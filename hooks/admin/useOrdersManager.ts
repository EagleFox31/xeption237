
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

export const useOrdersManager = ({ orders, setOrders, refreshData }: UseOrdersManagerProps) => {

    const updateStatus = useCallback(async (orderId: string, newStatus: Order['status']) => {
        const order = orders.find((o) => o.id === orderId);
        const oldStatus = order?.status ?? null;

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

    const cancelOrder = useCallback(async (order: Order) => {
        await updateStatus(order.id, 'cancelled');
    }, [updateStatus]);

    return { updateStatus, cancelOrder };
};
