
import { useEffect, useRef, useState } from 'react';
import { PaymentMethod, CartItem, DeliveryZone } from '../types';
import { computeDeliveryFee, freeDeliveryRemaining, qualifiesForFreeDelivery } from '../constants/delivery';
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from '../utils/checkoutDraftStorage';

interface CheckoutFormData {
    name: string;
    phone: string;
    email: string;
    city: string;
    neighborhood: string;
}

const emptyFormData: CheckoutFormData = {
    name: '', phone: '', email: '', city: '', neighborhood: '',
};

export const useCheckoutForm = (cart: CartItem[]) => {
    const initialDraft = loadCheckoutDraft();
    const hasRestoredDraft = useRef(Boolean(initialDraft));

    const [step, setStep] = useState<'cart' | 'details' | 'payment' | 'success'>(
        initialDraft?.step ?? 'cart',
    );
    const [formData, setFormData] = useState<CheckoutFormData>(
        initialDraft?.formData ?? emptyFormData,
    );
    const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>(
        initialDraft?.deliveryMode ?? 'delivery',
    );
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
    const [selectedDeliveryZone, setSelectedDeliveryZoneState] = useState<DeliveryZone | null>(
        initialDraft?.deliveryZoneSnapshot ?? null,
    );

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const zoneDeliveryFee = deliveryMode === 'pickup' ? 0 : (selectedDeliveryZone?.price ?? 0);
    const deliveryFee = cart.length > 0
        ? computeDeliveryFee(subtotal, deliveryMode, zoneDeliveryFee)
        : 0;
    const total = subtotal + deliveryFee;

    useEffect(() => {
        if (step === 'success') return;
        saveCheckoutDraft({
            step: step === 'success' ? 'details' : step,
            formData,
            deliveryMode,
            deliveryZoneId: selectedDeliveryZone?.id ?? null,
            deliveryZoneSnapshot: selectedDeliveryZone,
        });
    }, [step, formData, deliveryMode, selectedDeliveryZone]);

    const setSelectedDeliveryZone = (zone: DeliveryZone) => {
        setSelectedDeliveryZoneState((prev) => {
            if (prev?.id !== zone.id) {
                setFormData((current) => ({ ...current, neighborhood: '', city: '' }));
            }
            return zone;
        });
    };

    const syncDeliveryZone = (zone: DeliveryZone) => {
        setSelectedDeliveryZoneState(zone);
    };

    const setNeighborhood = (neighborhood: string) => {
        setFormData((prev) => ({
            ...prev,
            neighborhood,
            city: selectedDeliveryZone && neighborhood
                ? `${selectedDeliveryZone.name}, ${neighborhood}`
                : '',
        }));
    };

    const canProceedToPayment = () => {
        if (!formData.name || !formData.phone) return false;
        if (deliveryMode === 'delivery' && (!selectedDeliveryZone || !formData.neighborhood)) return false;
        return true;
    };

    const nextStep = () => {
        if (step === 'cart' && cart.length > 0) setStep('details');
        else if (step === 'details') {
            if (canProceedToPayment()) setStep('payment');
            else alert("Veuillez remplir les champs obligatoires.");
        }
    };

    const prevStep = () => {
        if (step === 'details') setStep('cart');
        if (step === 'payment') setStep('details');
    };

    const clearDraft = () => {
        clearCheckoutDraft();
        hasRestoredDraft.current = false;
    };

    return {
        step, setStep,
        formData, setFormData,
        deliveryMode, setDeliveryMode,
        selectedPayment, setSelectedPayment,
        selectedDeliveryZone, setSelectedDeliveryZone, syncDeliveryZone,
        setNeighborhood,
        subtotal, deliveryFee, zoneDeliveryFee, total,
        qualifiesForFreeDelivery: qualifiesForFreeDelivery(subtotal, deliveryMode),
        freeDeliveryRemaining: freeDeliveryRemaining(subtotal),
        nextStep, prevStep,
        clearDraft,
        hasRestoredDraft: hasRestoredDraft.current,
    };
};
