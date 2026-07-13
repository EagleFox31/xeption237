
import React, { useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Order, Product } from '../../types';
import { DB_TABLES } from '../../constants/dbSchema';

interface UseOrdersManagerProps {
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

const getOrderItems = (order: Order) =>
    Array.isArray(order.items) ? order.items : [];

export const useOrdersManager = ({ products, onUpdateProducts, orders, setOrders }: UseOrdersManagerProps) => {

    const updateStatus = useCallback(async (orderId: string, newStatus: Order['status']) => {
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
    }, [setOrders]);

    const cancelOrder = useCallback(async (order: Order) => {
        const items = getOrderItems(order);
        const updatedProducts = [...products];

        for (const item of items) {
            if (!item?.id || !item.quantity) continue;

            const { data: productData, error: fetchError } = await supabase
                .from(DB_TABLES.PRODUCTS)
                .select('stock')
                .eq('id', item.id)
                .single();

            if (fetchError || !productData) continue;

            const newStock = productData.stock + item.quantity;
            const { error: stockError } = await supabase
                .from(DB_TABLES.PRODUCTS)
                .update({ stock: newStock })
                .eq('id', item.id);

            if (stockError) {
                console.warn('Stock non restauré pour', item.id, stockError.message);
                continue;
            }

            const prodIndex = updatedProducts.findIndex((p) => p.id === item.id);
            if (prodIndex !== -1) {
                updatedProducts[prodIndex] = { ...updatedProducts[prodIndex], stock: newStock };
            }
        }

        if (items.length > 0) {
            onUpdateProducts(updatedProducts);
        }

        await updateStatus(order.id, 'cancelled');
    }, [products, onUpdateProducts, updateStatus]);

    return { updateStatus, cancelOrder };
};
