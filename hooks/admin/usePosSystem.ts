
import { useState } from 'react';
import { Product, CartItem, Order, Staff } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { applyTestOrderPrefix } from '../../utils/testMode';
import { generateInvoiceHTML } from '../../utils/invoiceGenerator';
import { assertRpcSuccess } from '../../utils/rpcResult';
import type { PosPaymentMethod } from '../../utils/paymentMethods';

interface UsePosSystemProps {
    products: Product[];
    refreshData: () => void;
    staff?: Staff | null;
}

export const usePosSystem = ({ products, refreshData, staff }: UsePosSystemProps) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
    const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const safeDiscount = Math.min(Math.max(0, discountAmount), subtotal);
    const total = Math.max(0, subtotal - safeDiscount);

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
        if (paymentMethod === 'TROC') {
            throw new Error('Utilise le panneau Smart Troc pour cette vente.');
        }
        if (cart.length === 0) throw new Error("Panier vide");
        if (!customer.name) throw new Error("Nom du client requis");
        if (!staff?.store_id) throw new Error("Aucune boutique rattachée à ton compte — demande à la direction.");

        const newOrderId = applyTestOrderPrefix(`POS-${Date.now().toString().slice(-6)}`);
        const orderDate = new Date().toISOString();
        const rpcPayment = paymentMethod === 'CARD' ? 'CARD' : paymentMethod;

        const { data: rpcData, error: rpcError } = await supabase.rpc('complete_pos_sale_atomic', {
            p_order_id: newOrderId,
            p_customer_name: customer.name,
            p_customer_email: customer.email || null,
            p_customer_phone: customer.phone || null,
            p_customer_city: 'Retrait Boutique (POS)',
            p_delivery_mode: 'pickup',
            p_payment_method: rpcPayment,
            p_total: total,
            p_items: cart,
            p_date: orderDate,
            p_status: 'delivered',
            p_store_id: staff.store_id,
            p_staff_id: staff.id,
            p_discount_amount: safeDiscount,
        });

        if (rpcError) {
            console.error('POS Order Error:', rpcError);
            throw new Error(rpcError.message || 'Erreur lors de la vente POS.');
        }
        assertRpcSuccess(rpcData, 'Stock insuffisant ou article invalide.');

        const saleDate = new Date().toLocaleDateString('fr-FR');
        const completedOrder: Order = {
            id: newOrderId,
            items: [...cart],
            total,
            subtotal,
            discountAmount: safeDiscount,
            status: 'delivered',
            paymentMethod: rpcPayment,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customerCity: 'Retrait Boutique',
            deliveryMode: 'pickup',
            date: saleDate,
            staffId: staff.id,
            storeId: staff.store_id,
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
        setDiscountAmount(0);
        setPaymentMethod('CASH');
        refreshData();
    };

    const registerTrocSuccess = (orderId: string) => {
        setLastOrder({
            id: orderId,
            items: [],
            total: 0,
            status: 'delivered',
            paymentMethod: 'TROC',
            customerName: 'Client Troc',
            customerPhone: '',
            deliveryMode: 'pickup',
            date: new Date().toLocaleDateString('fr-FR'),
            staffId: staff?.id,
            storeId: staff?.store_id ?? undefined,
        });
        setPaymentMethod('CASH');
        refreshData();
    };

    return {
        cart, setCart,
        search, setSearch,
        customer, setCustomer,
        paymentMethod, setPaymentMethod,
        discountAmount, setDiscountAmount,
        subtotal,
        total,
        lastOrder, setLastOrder,
        addToCart,
        removeFromCart,
        submitSale,
        registerTrocSuccess,
    };
};
