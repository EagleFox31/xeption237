
/**
 * DB SCHEMA DEFINITION
 * Source unique de vérité pour les noms de tables et colonnes Supabase.
 * Correspondance exacte avec le SQL fourni.
 */

export const DB_TABLES = {
    PRODUCTS: 'products',
    BRANDS: 'brands',
    CATEGORIES: 'categories',
    DELIVERY_ZONES: 'delivery_zones',
    ORDERS: 'orders',
    PACKS: 'packs',
    PRODUCT_RANGES: 'product_ranges',
    REPAIR_TICKETS: 'repair_tickets',
    STAFF: 'staff',
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
        CONDITION: 'condition'
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
        PAYMENT_METHOD: 'payment_method'
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
        PASSWORD: 'password',
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
