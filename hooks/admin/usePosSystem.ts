
import { useState } from 'react';
import { Product, CartItem, Order } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { generateInvoiceHTML } from '../../utils/invoiceGenerator';
import { assertRpcSuccess } from '../../utils/rpcResult';

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

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.id !== productId));
    };

    const submitSale = async () => {
        if (cart.length === 0) throw new Error("Panier vide");
        if (!customer.name) throw new Error("Nom du client requis");

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const newOrderId = `POS-${Date.now().toString().slice(-6)}`;
        
        const orderDate = new Date().toISOString();
        const { data: rpcData, error: rpcError } = await supabase.rpc('complete_pos_sale_atomic', {
            p_order_id: newOrderId,
            p_customer_name: customer.name,
            p_customer_email: customer.email || null,
            p_customer_phone: customer.phone || null,
            p_customer_city: 'Retrait Boutique (POS)',
            p_delivery_mode: 'pickup',
            p_payment_method: paymentMethod,
            p_total: total,
            p_items: cart,
            p_date: orderDate,
            p_status: 'delivered',
        });

        if (rpcError) {
            console.error('POS Order Error:', rpcError);
            throw new Error(rpcError.message || 'Erreur lors de la vente POS.');
        }
        assertRpcSuccess(rpcData, 'Stock insuffisant ou article invalide.');

        const updatedList = products.map((product) => {
            const item = cart.find((entry) => entry.id === product.id);
            if (!item) return product;
            return { ...product, stock: product.stock - item.quantity };
        });
        onUpdateProducts(updatedList);

        const saleDate = new Date().toLocaleDateString('fr-FR');
        const completedOrder: Order = {
            id: newOrderId,
            items: [...cart],
            total,
            status: 'delivered',
            paymentMethod,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customerCity: 'Retrait Boutique',
            deliveryMode: 'pickup',
            date: saleDate,
        };

        setLastOrder(completedOrder);

        const customerEmail = customer.email?.trim();
        if (customerEmail) {
            const html = generateInvoiceHTML(completedOrder);
            supabase.functions.invoke('send-invoice', {
                body: {
                    to: customerEmail,
                    subject: `XEPTION | Facture boutique ${newOrderId}`,
                    html,
                    text: `Vente ${newOrderId} — Total: ${total.toLocaleString('fr-FR')} FCFA. Merci pour votre achat à Xeption.`,
                },
            }).catch((err) => console.warn('POS invoice email failed', err));
        }

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
        addToCart,
        removeFromCart,
        submitSale,
    };
};
