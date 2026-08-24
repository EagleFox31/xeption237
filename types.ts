
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
  releaseYear?: number; // Année de sortie du modèle de base (colonne release_year)
  updated_at?: string; // Date DB — proxy de fraîcheur pour la rangée "Nouveautés"
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

export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  subtotal?: number;
  discountAmount?: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'ready' | 'delivered' | 'cancelled' | 'refused' | 'returned';
  paymentMethod: 'OM' | 'MOMO' | 'CASH' | 'CARD' | 'TROC';
  paymentStatus?: OrderPaymentStatus;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerCity?: string;
  deliveryMode: 'delivery' | 'pickup';
  date: string;
  createdAt?: string;
  staffId?: string;
  storeId?: string;
  /** Vente enregistrée localement, en attente de synchronisation serveur. */
  queuedLocally?: boolean;
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

import type { StaffRoleValue } from './constants/staffRoles';

export interface Staff {
  id: string;
  username?: string;
  name: string;
  email: string;
  role: StaffRoleValue;
  phone?: string;
  avatar?: string;
  store_id?: string | null;
  created_at?: string;
}

export interface Store {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  address?: string | null;
  active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoreStockRow {
  store_id: string;
  product_id: string;
  quantity: number;
  reserved: number;
}

export interface ProductStockMismatch {
  product_id: string;
  product_name: string;
  catalog_stock: number;
  distributed_stock: number;
}

export interface StockReservationOverview {
  product_id: string;
  product_name: string;
  reserved_qty: number;
  oldest_since: string;
  order_count: number;
}

export interface PendingOrderReservation {
  order_id: string;
  customer_name: string;
  customer_phone: string | null;
  order_total: number;
  reserved_since: string;
  expires_at: string;
}

export interface ShipmentReservationAlert {
  order_id: string;
  order_status: string;
  customer_name: string;
  customer_phone: string | null;
  reserved_since: string;
  days_out: number;
  alert_level: 'warning' | 'loss_pending' | 'ok';
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
  camera_condition?: string;
  previous_repairs?: string;
  powers_on?: boolean;
  charges_normally?: boolean;
  biometrics_work?: boolean;
  account_unlocked?: boolean;
  has_water_damage?: boolean;
  has_original_box?: boolean;
  has_invoice?: boolean;
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
  trade_in_value_cash?: number;
  trade_in_grade?: 'excellent' | 'bon' | 'pieces' | 'refuse';
  /** Raison technique du refus quand trade_in_grade='refuse'. Null sinon. */
  blocker_reason?: BlockerReason | null;
  /** Palier de service payé : 'express' | 'premium' | 'safety'. Premium+ déverrouille le certificat PDF. */
  tier?: 'express' | 'premium' | 'safety' | null;
  status: 'in_progress' | 'pending' | 'accepted' | 'refused' | 'validated' | 'completed' | 'cancelled';
  /** Commande POS générée à la clôture troc (si applicable). */
  linked_order_id?: string | null;
  admin_notes?: string;
  /** Horodatage du passage en `validated` (vérification physique en boutique). */
  validated_at?: string | null;
  /** Horodatage du passage en `completed` (échange finalisé). */
  completed_at?: string | null;
  /** Motif staff si le bon était hors validité à la clôture (override en grâce ≤ 7 j, ou ré-évaluation). */
  redemption_reason?: string | null;
  voucher_reference?: string;
  trade_in_model_id?: string;
  /** Smart Troc — appareil cible choisi par le client (voucher + précommande boutique). Lié au MÊME dossier, pas de table séparée. */
  target_product_id?: string | null;
  /** Snapshot du nom cible au moment du choix (lisibilité staff ; survit au renommage/suppression du produit). */
  target_product_name?: string | null;
  /** Échéance de validité du bon de reprise (barème 7/10/14 j selon `release_year` du repris). ISO. */
  voucher_expires_at?: string | null;
  /** UUID session navigateur — lien direct avec troc_payments.session_key. */
  session_key?: string;
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
  /** Id du modèle catalogue sélectionné (`trade_in_models.id`) — permet au serveur de
   *  retrouver le base_price par id (exact) plutôt que par matching de nom fragile. */
  tradeInModelId?: string;
  // Provenance
  acquisitionCondition: 'new' | 'used';
  purchaseDate: string;
  /** UI : date inconnue — validation serveur assouplie côté Claude Code */
  purchaseDateUnknown?: boolean;
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
  /** Nom formulaire au moment du paiement (avant save-trade-in). */
  customer_name?: string;
  /** Téléphone formulaire (peut différer du numéro OM/Momo `phone`). */
  customer_phone?: string;
  /** Palier de service payé. Défaut DB = 'express'. */
  tier: 'express' | 'premium' | 'safety';
  status: 'pending' | 'paid' | 'failed' | 'expired';
  notchpay_status?: string;
  paid_at?: string;
  /** Dossier lié après save-trade-in (FK explicite). */
  trade_in_request_id?: string | null;
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

export type TrocEvaluationMode =
  | 'vision_ai'
  | 'local_heuristic'
  | 'local_heuristic_fallback'
  | 'credibility_verified';
export type TrocTradeInGrade = 'excellent' | 'bon' | 'pieces' | 'refuse';

/**
 * Cote du marché — tendance d'évolution de la valeur du modèle au Cameroun.
 * Issue du pipeline cascade Wayback → Bing → Google Trends → fallback âge.
 * Voir supabase/functions/get-market-trend/index.ts pour le calcul.
 */
export interface MarketTrend {
  label:        'rising' | 'stable' | 'falling' | 'insufficient_data';
  /** 0 = aucun mouvement, 1 = mouvement majeur. */
  strength:     number;
  /** 0 = fallback fragile, 1 = data croisée robuste. */
  confidence:   number;
  /** Chaîne des sources qui ont parlé (ex: ['wayback', 'bing']). Debug/admin. */
  source_chain: string[];
  /** Phrase prête à afficher côté UI. */
  message_fr:   string;
}

/**
 * Raisons techniques de refus issues de checkBlockers (utils/trocPricing.ts).
 * Affiche un message client adapté via resolveEvaluationMessage.
 */
export type BlockerReason = 'powers_off' | 'water_damage' | 'no_base_price' | 'too_old';

export interface TrocEvaluationResult {
  score: number;
  scoreColor: 'green' | 'orange' | 'red';
  justification: string;
  /** Valeur principale = crédit boutique. Alias historique de tradeInValueCredit. */
  tradeInValue: number;
  /** Valeur crédit boutique (= sortie pure algo, montant marketing principal). */
  tradeInValueCredit: number;
  /** Valeur cash immédiat (= crédit / 1.10, arrondi 5000 inférieur). */
  tradeInValueCash: number;
  tradeInGrade: TrocTradeInGrade;
  evaluationMode: TrocEvaluationMode;
  pricingRuleVersion: string;
  blockerReason?: BlockerReason | null;
  /** Cote du marché — issue de get-market-trend, null si indispo. */
  marketTrend?: MarketTrend | null;
}
