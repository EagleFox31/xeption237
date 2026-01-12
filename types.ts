
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: 'phone' | 'computer' | 'accessory' | 'consumable';
  image: string;
  stock: number;
  isPromo?: boolean;
  // New detailed fields
  rating?: number; // Sur 10
  reviewShort?: string; // "Le verdict pour les pressés"
  specs?: { label: string; value: string }[]; // "Geek Details"
  pros?: string[];
  cons?: string[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid' | 'delivered';
  paymentMethod: 'OM' | 'MOMO' | 'CASH';
  customerName: string;
  customerPhone: string;
  date: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum PaymentMethod {
  OM = 'Orange Money',
  MOMO = 'MTN Mobile Money',
  CASH = 'Cash à la livraison'
}
