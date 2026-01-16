
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Order, CartItem, PaymentMethod } from '../types';
import { generateInvoiceHTML } from '../utils/invoiceGenerator';

interface OrderProcessProps {
    cart: CartItem[];
    total: number;
    formData: { name: string; phone: string; email: string; city: string };
    deliveryMode: 'delivery' | 'pickup';
    paymentMethod: PaymentMethod | null;
    captchaToken: string | null;
}

export const useOrderProcess = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
    const [lastOrderHtml, setLastOrderHtml] = useState<string | null>(null);

    const submitOrder = async ({ cart, total, formData, deliveryMode, paymentMethod, captchaToken }: OrderProcessProps) => {
        setIsProcessing(true);
        try {
            if (!captchaToken) throw new Error("Captcha requis.");
            if (!paymentMethod) throw new Error("Moyen de paiement requis.");

            // 1. Auth Anonyme (si nécessaire)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                const { error: authError } = await supabase.auth.signInAnonymously({ options: { captchaToken } });
                if (authError) throw new Error("Erreur de sécurité session.");
            }

            const newOrderId = `ORD-${Date.now().toString().slice(-6)}`;
            const dbDate = new Date().toISOString();
            const displayDate = new Date().toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            // 2. TRANSACTION ATOMIQUE (RPC) - Stock + Commande
            // On appelle la fonction SQL qu'on a créée
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_order_atomic', {
                p_order_id: newOrderId,
                p_customer_name: formData.name,
                p_customer_email: formData.email,
                p_customer_phone: formData.phone,
                p_customer_city: deliveryMode === 'pickup' ? 'Retrait Boutique' : formData.city,
                p_delivery_mode: deliveryMode,
                p_payment_method: paymentMethod,
                p_total: total,
                p_items: cart, // JSONB
                p_date: dbDate
            });

            if (rpcError) throw rpcError;
            if (rpcData && !rpcData.success) throw new Error(rpcData.error || "Erreur lors de la commande (Stock épuisé ?)");

            setCreatedOrderId(newOrderId);

            // 3. Mise à jour CRM (Non-bloquant / Side Effect)
            if (formData.email) {
                updateCrm(formData, total).catch(console.warn);
            }

            // 4. Génération Facture & Email
            const invoiceData: any = {
                id: newOrderId,
                items: cart,
                total,
                status: 'pending',
                paymentMethod,
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: formData.phone,
                customerCity: deliveryMode === 'pickup' ? 'Retrait Boutique' : formData.city,
                deliveryMode,
                date: displayDate
            };

            const html = generateInvoiceHTML(invoiceData);
            setLastOrderHtml(html);

            if (formData.email) {
                supabase.functions.invoke('send-invoice', {
                    body: {
                        to: formData.email,
                        subject: `XEPTION | Commande ${newOrderId} Confirmée`,
                        html: html,
                        text: `Commande ${newOrderId} confirmée. Total: ${total.toLocaleString('fr-FR')} FCFA.`
                    }
                }).catch(console.warn);
            }

            return { success: true, orderId: newOrderId };

        } catch (error: any) {
            console.error("Order Process Error:", error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    const updateCrm = async (formData: any, total: number) => {
        const { data: existing } = await supabase.from('customers').select('*').eq('email', formData.email).single();
        if (existing) {
            await supabase.from('customers').update({
                total_orders: (existing.total_orders || 0) + 1,
                total_spent: (existing.total_spent || 0) + total,
                phone: formData.phone || existing.phone,
                city: formData.city || existing.city,
                name: formData.name
            }).eq('email', formData.email);
        } else {
            await supabase.from('customers').insert([{
                id: crypto.randomUUID(),
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                city: formData.city,
                total_orders: 1,
                total_spent: total,
                created_at: new Date().toISOString()
            }]);
        }
    };

    return {
        isProcessing,
        createdOrderId,
        lastOrderHtml,
        submitOrder
    };
};
