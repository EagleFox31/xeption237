
import { useState } from 'react';
import { PaymentMethod, CartItem } from '../types';

interface CheckoutFormData {
    name: string;
    phone: string;
    email: string;
    city: string;
}

export const useCheckoutForm = (cart: CartItem[]) => {
    const [step, setStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart');
    const [formData, setFormData] = useState<CheckoutFormData>({ name: '', phone: '', email: '', city: '' });
    const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = deliveryMode === 'pickup' ? 0 : 2000;
    const total = subtotal + (cart.length > 0 ? deliveryFee : 0);

    const canProceedToPayment = () => {
        if (!formData.name || !formData.phone) return false;
        if (deliveryMode === 'delivery' && !formData.city) return false;
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

    return {
        step, setStep,
        formData, setFormData,
        deliveryMode, setDeliveryMode,
        selectedPayment, setSelectedPayment,
        subtotal, deliveryFee, total,
        nextStep, prevStep
    };
};
