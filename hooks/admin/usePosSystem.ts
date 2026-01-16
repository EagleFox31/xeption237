
import { useState } from 'react';
import { Product, CartItem, Order } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface UsePosSystemProps {
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
    refreshData: () => void;
}

export const usePosSystem = ({ products, onUpdateProducts, refreshData }: UsePosSystemProps) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'OM' | 'MOMO'>('CASH');
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const exists = prev.find(item => item.id === product.id);
            if (exists) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const submitSale = async () => {
        if (cart.length === 0) throw new Error("Panier vide");
        if (!customer.name) throw new Error("Nom du client requis");

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const newOrderId = `POS-${Date.now().toString().slice(-6)}`;
        
        await supabase.from('orders').insert([{
            id: newOrderId,
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            customer_city: 'Retrait Boutique (POS)',
            delivery_mode: 'pickup',
            total: total,
            status: 'delivered',
            payment_method: paymentMethod,
            items: cart,
            date: new Date().toISOString()
        }]);

        // Stock Update
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                const newStock = Math.max(0, product.stock - item.quantity);
                await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                // Optimistic
                const updatedList = products.map(p => p.id === item.id ? { ...p, stock: newStock } : p);
                onUpdateProducts(updatedList);
            }
        }

        setLastOrder({
            id: newOrderId,
            items: [...cart],
            total: total,
            status: 'delivered',
            paymentMethod: paymentMethod,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customerCity: 'Retrait Boutique',
            deliveryMode: 'pickup',
            date: new Date().toLocaleDateString('fr-FR')
        });
        
        setCart([]);
        setCustomer({ name: '', phone: '', email: '' });
        refreshData();
    };

    return {
        cart, setCart,
        search, setSearch,
        customer, setCustomer,
        paymentMethod, setPaymentMethod,
        lastOrder, setLastOrder,
        addToCart, submitSale
    };
};
