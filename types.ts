
export interface Category {
  id: string;
  name: string;
  slug: string; // ex: 'phones-gaming'
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: string; // Changé de l'énumération fixe vers string pour la dynamicité
  image: string;
  images?: string[];
  video?: string;
  stock: number;
  isPromo?: boolean;
  rating?: number;
  reviewShort?: string;
  specs?: { label: string; value: string }[];
  pros?: string[];
  cons?: string[];
  warrantyMonths?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'ready' | 'delivered' | 'cancelled';
  paymentMethod: 'OM' | 'MOMO' | 'CASH';
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerCity?: string;
  deliveryMode: 'delivery' | 'pickup';
  date: string;
  createdAt?: string; // Ajouté pour le tri
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
  username: string;
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

export interface AdminNotification {
  id: string;
  type: 'order' | 'ticket' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  linkToTab?: string; // Pour rediriger vers l'onglet concerné (ex: 'orders')
}

export enum PaymentMethod {
  OM = 'Orange Money',
  MOMO = 'MTN Mobile Money',
  CASH = 'Cash à la livraison'
}
