
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Order, CartItem, PaymentMethod } from '../types';
import { generateInvoiceHTML, buildOrderTrackingUrl, generateTrackingQRCode } from '../utils/invoiceGenerator';
import { DB_TABLES, DB_SCHEMA } from '../constants/dbSchema';
import { safeRandomUUID } from '../utils/uuid';

interface OrderProcessProps {
    cart: CartItem[];
    total: number;
    subtotal?: number;
    deliveryFee?: number;
    trocVoucher?: { ref: string; credit: number; brand?: string; model?: string; imei?: string } | null;
    formData: { name: string; phone: string; email: string; city: string };
    deliveryMode: 'delivery' | 'pickup';
    paymentMethod: PaymentMethod | null;
    captchaToken: string | null;
}

export const useOrderProcess = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
    const [lastOrderHtml, setLastOrderHtml] = useState<string | null>(null);

    const submitOrder = async ({ cart, total, trocVoucher, formData, deliveryMode, paymentMethod, captchaToken }: OrderProcessProps) => {
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

            // Reference de commande : prefixe lisible + partie ALEATOIRE.
            //
            // Avant : `ORD-` + les six derniers chiffres de l'horodatage. Elle
            // se devinait — qui connait l'heure d'une commande trouve sa
            // reference en essayant quelques numeros autour.
            //
            // Maintenant : 8 caracteres tires au hasard dans un alphabet sans
            // caracteres ambigus (ni 0/O, ni 1/I/L), comme le font les grandes
            // enseignes pour que la reference se dicte au telephone sans
            // confusion. 32^8 = 1 100 milliards de valeurs.
            //
            // Elle n'est pas un secret pour autant : le suivi exige aussi le
            // telephone (RPC track_order). C'est une protection de plus, pas la
            // seule.
            const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
            const alea = new Uint32Array(8);
            crypto.getRandomValues(alea);
            const suffixe = Array.from(alea, (n) => ALPHABET[n % ALPHABET.length]).join('');
            const newOrderId = `ORD-${suffixe.slice(0, 4)}-${suffixe.slice(4)}`;
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

            if (rpcError) {
                throw new Error(rpcError.message || 'Erreur lors de la création de la commande.');
            }
            if (rpcData && !rpcData.success) {
                const rpcMessage = typeof rpcData.error === 'string' ? rpcData.error : '';
                if (rpcMessage.includes('timestamp with time zone') && rpcMessage.includes('text')) {
                    throw new Error(
                        'Mise à jour serveur requise (date de commande). Applique la migration Supabase 20260611_002 puis réessaie.',
                    );
                }
                throw new Error(rpcMessage || 'Erreur lors de la commande (stock épuisé ?)');
            }

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
                date: displayDate,
                discountAmount: trocVoucher?.credit ?? 0,
                discountReason: trocVoucher ? `Bon Smart Troc ${trocVoucher.ref}` : undefined,
                trocVoucher: trocVoucher ? {
                    ref: trocVoucher.ref,
                    device_brand: trocVoucher.brand,
                    device_model: trocVoucher.model,
                    imei: trocVoucher.imei,
                    trade_in_value: trocVoucher.credit,
                } : undefined,
            };

            // Sauvegarde de la remise éventuelle sur la commande et liaison du bon Smart Troc
            if (trocVoucher?.credit) {
                const voucherRef = trocVoucher.ref;
                supabase.from('orders').update({
                    discount_amount: trocVoucher.credit,
                }).eq('id', newOrderId).then(() => {}).catch(console.warn);

                if (voucherRef) {
                    supabase.from('trade_in_requests').update({
                        completed_order_id: newOrderId,
                        credit_applied: trocVoucher.credit,
                    }).or(`voucher_reference.eq.${voucherRef},id.eq.${voucherRef}`)
                    .then(() => {}).catch(console.warn);
                }
            }

            const trackingUrl = buildOrderTrackingUrl(newOrderId);
            let qrDataUrl = '';
            try {
                qrDataUrl = await generateTrackingQRCode(trackingUrl);
            } catch (e) {
                console.warn('QR Code tracking generation error:', e);
            }

            const html = generateInvoiceHTML(invoiceData, { qrDataUrl, trackingUrl });
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
        // Utilisation des constantes DB_SCHEMA
        const { data: existing } = await supabase.from(DB_TABLES.CUSTOMERS)
            .select('*')
            .eq(DB_SCHEMA.CUSTOMERS.EMAIL, formData.email)
            .single();
            
        if (existing) {
            await supabase.from(DB_TABLES.CUSTOMERS).update({
                [DB_SCHEMA.CUSTOMERS.TOTAL_ORDERS]: (existing[DB_SCHEMA.CUSTOMERS.TOTAL_ORDERS] || 0) + 1,
                [DB_SCHEMA.CUSTOMERS.TOTAL_SPENT]: (existing[DB_SCHEMA.CUSTOMERS.TOTAL_SPENT] || 0) + total,
                [DB_SCHEMA.CUSTOMERS.PHONE]: formData.phone || existing[DB_SCHEMA.CUSTOMERS.PHONE],
                [DB_SCHEMA.CUSTOMERS.CITY]: formData.city || existing[DB_SCHEMA.CUSTOMERS.CITY],
                [DB_SCHEMA.CUSTOMERS.NAME]: formData.name,
                [DB_SCHEMA.CUSTOMERS.UPDATED_AT]: new Date().toISOString()
            }).eq(DB_SCHEMA.CUSTOMERS.EMAIL, formData.email);
        } else {
            await supabase.from(DB_TABLES.CUSTOMERS).insert([{
                [DB_SCHEMA.CUSTOMERS.ID]: safeRandomUUID(),
                [DB_SCHEMA.CUSTOMERS.NAME]: formData.name,
                [DB_SCHEMA.CUSTOMERS.EMAIL]: formData.email,
                [DB_SCHEMA.CUSTOMERS.PHONE]: formData.phone,
                [DB_SCHEMA.CUSTOMERS.CITY]: formData.city,
                [DB_SCHEMA.CUSTOMERS.TOTAL_ORDERS]: 1,
                [DB_SCHEMA.CUSTOMERS.TOTAL_SPENT]: total,
                [DB_SCHEMA.CUSTOMERS.CREATED_AT]: new Date().toISOString()
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
