
export interface Category {
  id: string;
  name: string;
  slug: string; // ex: 'phones-gaming'
  icon?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface ProductRange {
  id: string;
  brand_id: string; // Lien vers la marque
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: string; // Slug de la catégorie
  brand?: string; // ID ou Slug de la marque
  productRange?: string; // ID ou Slug de la gamme
  condition?: 'new' | 'refurbished'; // Nouvel état
  image: string;
  images?: string[];
  video?: string;
  stock: number;
  isPromo?: boolean;
  isFeatured?: boolean; 
  rating?: number;
  reviewShort?: string;
  specs?: { label: string; value: string }[];
  pros?: string[];
  cons?: string[];
  warrantyMonths?: number;
}

export interface PackItem {
  productId: string;
  quantity: number;
  product?: Product; // Pour l'affichage
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  validUntil?: string;
  items: PackItem[];
  isFeatured?: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  delay: string;
  price: number;
  type: 'express' | 'standard';
  active: boolean;
}

export interface TradeInModel {
  id: string;
  category: 'phone' | 'laptop';
  brand: string;
  model_name: string;
  base_price: number;
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
  createdAt?: string; 
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
  linkToTab?: string; 
}

export enum PaymentMethod {
  OM = 'Orange Money',
  MOMO = 'MTN Mobile Money',
  CASH = 'Cash à la livraison'
}
