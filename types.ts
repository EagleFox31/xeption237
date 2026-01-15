
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: 'phone' | 'computer' | 'accessory' | 'consumable';
  image: string; // Image principale
  images?: string[]; // Galerie d'images
  video?: string; // URL Vidéo (mp4)
  stock: number;
  isPromo?: boolean;
  // New detailed fields
  rating?: number; // Sur 10
  reviewShort?: string; // "Le verdict pour les pressés"
  specs?: { label: string; value: string }[]; // "Geek Details"
  pros?: string[];
  cons?: string[];
  // SAV
  warrantyMonths?: number; // Durée de garantie en mois (défaut 0 ou null)
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[]; // Stored as JSONB in Supabase
  total: number;
  status: 'pending' | 'paid' | 'delivered';
  paymentMethod: 'OM' | 'MOMO' | 'CASH';
  customerName: string; // Mapped to customer_name in DB
  customerEmail?: string; // Mapped to customer_email in DB
  customerPhone: string; // Mapped to customer_phone in DB
  customerCity?: string; // Mapped to customer_city
  deliveryMode: 'delivery' | 'pickup'; // Mapped to delivery_mode
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  total_orders?: number;
  total_spent?: number;
  created_at?: string;
}

export interface Staff {
  id: string;
  username: string; // Added for login
  name: string;
  email?: string;
  password?: string;
  role: 'admin' | 'manager' | 'editor';
  phone?: string;
  avatar?: string;
  created_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface RepairTicket {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  issueDescription: string;
  status: 'open' | 'received' | 'in_progress' | 'completed' | 'rejected';
  createdAt: string;
  warrantyStatus: 'active' | 'expired';
}

export enum PaymentMethod {
  OM = 'Orange Money',
  MOMO = 'MTN Mobile Money',
  CASH = 'Cash à la livraison'
}
