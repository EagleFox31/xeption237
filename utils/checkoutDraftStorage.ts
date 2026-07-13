import { DeliveryZone } from '../types';

export interface CheckoutDraftFormData {
  name: string;
  phone: string;
  email: string;
  city: string;
  neighborhood: string;
}

export interface CheckoutDraft {
  dateKey: string;
  step: 'cart' | 'details' | 'payment';
  formData: CheckoutDraftFormData;
  deliveryMode: 'delivery' | 'pickup';
  deliveryZoneId: string | null;
  deliveryZoneSnapshot: DeliveryZone | null;
}

const STORAGE_KEY = 'xeption_checkout_draft_v1';

function getTodayKey(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as CheckoutDraft;
    if (draft.dateKey !== getTodayKey()) {
      clearCheckoutDraft();
      return null;
    }
    return draft;
  } catch {
    clearCheckoutDraft();
    return null;
  }
}

export function saveCheckoutDraft(
  draft: Omit<CheckoutDraft, 'dateKey'>,
): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, dateKey: getTodayKey() }),
    );
  } catch {
    // quota / private mode — ignore
  }
}

export function clearCheckoutDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
