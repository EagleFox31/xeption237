
import React, { useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Order, Product } from '../../types';

interface UseOrdersManagerProps {
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

export const useOrdersManager = ({ products, onUpdateProducts, orders, setOrders }: UseOrdersManagerProps) => {

    const updateStatus = useCallback(async (orderId: string, newStatus: Order['status']) => {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (!error) {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } else {
            throw error;
        }
    }, [setOrders]);

    const cancelOrder = useCallback(async (order: Order) => {
        // 1. Restore Stock Logic
        const updatedProducts = [...products];
        
        for (const item of order.items) {
            const { data: productData } = await supabase.from('products').select('stock').eq('id', item.id).single();
            
            if (productData) {
                const newStock = productData.stock + item.quantity;
                
                // DB Update
                await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                
                // Optimistic UI Update
                const prodIndex = updatedProducts.findIndex(p => p.id === item.id);
                if (prodIndex !== -1) {
                    updatedProducts[prodIndex] = { ...updatedProducts[prodIndex], stock: newStock };
                }
            }
        }

        onUpdateProducts(updatedProducts);
        await updateStatus(order.id, 'cancelled');
    }, [products, onUpdateProducts, updateStatus]);

    return { updateStatus, cancelOrder };
};
