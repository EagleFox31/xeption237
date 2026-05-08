
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
  category?: string; // Lien vers le type (slug) - NOUVEAU
  name: string;
  slug: string;
}

export interface Review {
  id: string;
  author: string;
  location: string;
  rating: number;
  text: string;
  date: string;
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
  manualChecks?: string[];
  reviews?: Review[]; // NOUVEAU : Avis générés par IA
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
  username?: string;
  name: string;
  email: string;
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

// ─── Smart Troc ──────────────────────────────────────────────────────────────

export interface TradeInRequest {
  id: string;
  created_at: string;
  updated_at?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  device_brand: string;
  device_model: string;
  device_storage?: string;
  device_ram?: string;
  acquisition_condition?: 'new' | 'used';
  purchase_date?: string;
  ownership_rank?: 'unknown' | 'first' | 'second' | 'third_plus';
  device_age_months?: number;
  ownership_adjustment_factor?: number;
  battery_health?: number;
  screen_condition?: string;
  body_condition?: string;
  accessories?: string[];
  photo_urls: string[];
  imei?: string;
  imei_status: 'not_checked' | 'valid' | 'invalid' | 'check_failed';
  imei_blacklist_status: 'unknown' | 'clear' | 'blacklisted';
  imei_assurance_level: 'basic' | 'premium';
  ai_score?: number;
  ai_score_color?: 'green' | 'orange' | 'red';
  ai_justification?: string;
  trade_in_value?: number;
  trade_in_grade?: 'excellent' | 'bon' | 'pieces' | 'refuse';
  /** Raison technique du refus quand trade_in_grade='refuse'. Null sinon. */
  blocker_reason?: BlockerReason | null;
  status: 'pending' | 'accepted' | 'refused' | 'validated' | 'completed' | 'cancelled';
  admin_notes?: string;
  voucher_reference?: string;
  trade_in_model_id?: string;
}

export interface TrocDeviceForm {
  // Infos client
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  createAccount?: boolean;
  // Identification appareil
  deviceBrand: string;
  deviceModel: string;
  deviceStorage: string;
  deviceRam: string;
  // Provenance
  acquisitionCondition: 'new' | 'used';
  purchaseDate: string;
  ownershipRank: 'unknown' | 'first' | 'second' | 'third_plus';
  // État physique
  batteryHealth: number;
  screenCondition: string;
  bodyCondition: string;
  cameraCondition: string;           // 'bon' | 'rayures' | 'défectueuse'
  // État fonctionnel (critères bloquants ou décote)
  powersOn: boolean;                  // false → refus direct
  chargesNormally: boolean;           // false → décote
  biometricsWork: boolean;            // false → décote
  accountUnlocked: boolean;           // false → notice info (résolution en boutique avec technicien)
  hasWaterDamage: boolean;            // true → refus direct
  // Historique
  previousRepairs: string;           // 'aucune' | 'écran' | 'batterie' | 'autre'
  // Accessoires
  accessories: string[];
  hasOriginalBox: boolean;
  hasInvoice: boolean;
  // IMEI
  imei: string;
}

export type TrocStep = 'form' | 'photos' | 'imei' | 'payment' | 'result' | 'voucher';

export interface TrocPayment {
  id: string;
  session_key: string;
  reference: string;
  amount: number;
  currency: string;
  channel: 'om' | 'momo';
  phone: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  notchpay_status?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TrocSession {
  id: string;
  session_key: string;
  last_step: TrocStep;
  device_brand?: string;
  device_model?: string;
  trade_in_id?: string;
  created_at: string;
  updated_at: string;
}

export type TrocEvaluationMode = 'vision_ai' | 'local_heuristic' | 'local_heuristic_fallback';
export type TrocTradeInGrade = 'excellent' | 'bon' | 'pieces' | 'refuse';

/**
 * Raisons techniques de refus issues de checkBlockers (utils/trocPricing.ts).
 * Affiche un message client adapté via resolveEvaluationMessage.
 */
export type BlockerReason = 'powers_off' | 'water_damage' | 'no_base_price';

export interface TrocEvaluationResult {
  score: number;
  scoreColor: 'green' | 'orange' | 'red';
  justification: string;
  tradeInValue: number;
  tradeInGrade: TrocTradeInGrade;
  evaluationMode: TrocEvaluationMode;
  pricingRuleVersion: string;
  blockerReason?: BlockerReason | null;
}
