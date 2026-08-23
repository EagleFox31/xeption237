
/**
 * DB SCHEMA DEFINITION
 * Source unique de vérité pour les noms de tables et colonnes Supabase.
 * Correspondance exacte avec le SQL fourni.
 */

/** Slugs `categories.slug` — FK pour product_ranges.category et products.category */
export const CATEGORY_SLUGS = {
    PHONES: 'phones',
    TABLETTES: 'tablettes',
    ORDINATEURS: 'computer',
    ACCESSORIES: 'accessories',
} as const;

export const DB_TABLES = {
    PRODUCTS: 'products',
    BRANDS: 'brands',
    CATEGORIES: 'categories',
    DELIVERY_ZONES: 'delivery_zones',
    ORDERS: 'orders',
    ORDER_ITEMS: 'order_items',
    PACKS: 'packs',
    PRODUCT_RANGES: 'product_ranges',
    REPAIR_TICKETS: 'repair_tickets',
    STAFF: 'staff',
    STORES: 'stores',
    STORE_STOCK: 'store_stock',
    STOCK_MOVEMENTS: 'stock_movements',
    TRADE_IN_MODELS: 'trade_in_models',
    CUSTOMERS: 'customers' 
};

export const DB_SCHEMA = {
    PRODUCTS: {
        ID: 'id',
        NAME: 'name',
        DESCRIPTION: 'description',
        PRICE: 'price',
        CATEGORY: 'category',
        IMAGE: 'image',
        STOCK: 'stock',
        RATING: 'rating',
        SPECS: 'specs',
        PROS: 'pros',
        CONS: 'cons',
        REVIEWS: 'reviews', // NOUVEAU : Colonne JSONB pour les avis
        IMAGES: 'images',
        VIDEO: 'video',
        // CamelCase (Spécifique SQL)
        OLD_PRICE: 'oldPrice',
        IS_PROMO: 'isPromo',
        REVIEW_SHORT: 'reviewShort',
        // SnakeCase (Spécifique SQL)
        WARRANTY_MONTHS: 'warranty_months',
        IS_FEATURED: 'is_featured',
        BRAND: 'brand',
        PRODUCT_RANGE: 'product_range',
        CONDITION: 'condition',
        RELEASE_YEAR: 'release_year',
    },
    BRANDS: {
        ID: 'id',
        NAME: 'name',
        SLUG: 'slug',
        CREATED_AT: 'created_at'
    },
    CATEGORIES: {
        ID: 'id',
        NAME: 'name',
        SLUG: 'slug',
        CREATED_AT: 'created_at'
    },
    DELIVERY_ZONES: {
        ID: 'id',
        NAME: 'name',
        DELAY: 'delay',
        PRICE: 'price',
        TYPE: 'type',
        ACTIVE: 'active',
        CREATED_AT: 'created_at'
    },
    ORDERS: {
        ID: 'id',
        DATE: 'date',
        TOTAL: 'total',
        STATUS: 'status',
        ITEMS: 'items',
        // SnakeCase
        CUSTOMER_NAME: 'customer_name',
        CUSTOMER_PHONE: 'customer_phone',
        CUSTOMER_CITY: 'customer_city',
        CUSTOMER_EMAIL: 'customer_email',
        DELIVERY_MODE: 'delivery_mode',
        PAYMENT_METHOD: 'payment_method',
        STORE_ID: 'store_id',
        STAFF_ID: 'staff_id',
    },
    ORDER_ITEMS: {
        ID: 'id',
        ORDER_ID: 'order_id',
        LINE_INDEX: 'line_index',
        PRODUCT_ID: 'product_id',
        PRODUCT_NAME: 'product_name',
        UNIT_PRICE: 'unit_price',
        QUANTITY: 'quantity',
        LINE_TOTAL: 'line_total',
        CREATED_AT: 'created_at',
    },
    STORES: {
        ID: 'id',
        CODE: 'code',
        NAME: 'name',
        CITY: 'city',
        ADDRESS: 'address',
        ACTIVE: 'active',
        IS_DEFAULT: 'is_default',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at',
    },
    STORE_STOCK: {
        STORE_ID: 'store_id',
        PRODUCT_ID: 'product_id',
        QUANTITY: 'quantity',
        RESERVED: 'reserved',
        UPDATED_AT: 'updated_at',
    },
    STOCK_MOVEMENTS: {
        ID: 'id',
        STORE_ID: 'store_id',
        PRODUCT_ID: 'product_id',
        DELTA: 'delta',
        REASON: 'reason',
        REF_TYPE: 'ref_type',
        REF_ID: 'ref_id',
        STAFF_ID: 'staff_id',
        NOTE: 'note',
        CREATED_AT: 'created_at',
    },
    PACKS: {
        ID: 'id',
        NAME: 'name',
        DESCRIPTION: 'description',
        IMAGE: 'image',
        PRICE: 'price',
        ITEMS: 'items',
        // SnakeCase
        VALID_UNTIL: 'valid_until',
        IS_FEATURED: 'is_featured',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at'
    },
    PRODUCT_RANGES: {
        ID: 'id',
        NAME: 'name',
        SLUG: 'slug',
        CATEGORY: 'category',
        CREATED_AT: 'created_at',
        // SnakeCase
        BRAND_ID: 'brand_id'
    },
    REPAIR_TICKETS: {
        ID: 'id',
        STATUS: 'status',
        // SnakeCase
        ORDER_ID: 'order_id',
        PRODUCT_ID: 'product_id',
        PRODUCT_NAME: 'product_name',
        CUSTOMER_NAME: 'customer_name',
        CUSTOMER_PHONE: 'customer_phone',
        ISSUE_DESCRIPTION: 'issue_description',
        WARRANTY_STATUS: 'warranty_status',
        CREATED_AT: 'created_at'
    },
    STAFF: {
        ID: 'id',
        NAME: 'name',
        EMAIL: 'email',
        ROLE: 'role',
        PHONE: 'phone',
        AVATAR: 'avatar',
        STORE_ID: 'store_id',
        CREATED_AT: 'created_at'
    },
    TRADE_IN_MODELS: {
        ID: 'id',
        CATEGORY: 'category',
        BRAND: 'brand',
        CREATED_AT: 'created_at',
        // SnakeCase
        MODEL_NAME: 'model_name',
        BASE_PRICE: 'base_price'
    },
    CUSTOMERS: {
        ID: 'id',
        NAME: 'name',
        EMAIL: 'email',
        PHONE: 'phone',
        CITY: 'city',
        TOTAL_ORDERS: 'total_orders',
        TOTAL_SPENT: 'total_spent',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at'
    }
};
