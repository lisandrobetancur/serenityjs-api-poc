/**
 * Every resource of the API under test, with `{placeholders}` for path parameters.
 *
 * The placeholder stays in the URL recorded in the report, so ids never leak into the run summary.
 * Tasks always reference these constants instead of writing paths inline.
 */
export const Endpoints = {
    // Auth
    LOGIN: '/auth/login',
    TOKEN: '/auth/token',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REGISTER: '/auth/register',
    BASIC: '/auth/basic',
    API_KEY: '/auth/api-key',
    SESSION: '/auth/session',

    // Users
    USERS: '/users',
    USER: '/users/{userId}',

    // Products
    PRODUCTS: '/products',
    PRODUCTS_IMPORT: '/products/import',
    PRODUCT: '/products/{productId}',
    PRODUCT_STOCK: '/products/{productId}/stock',
    PRODUCT_LEDGER: '/products/{productId}/ledger',
    PRODUCT_DESCRIPTION: '/products/{productId}/description',
    PRODUCT_PHOTO: '/products/{productId}/photo',

    // Catalog
    CATEGORIES: '/categories',
    CATEGORY: '/categories/{categoryId}',
    SUPPLIERS: '/suppliers',
    SUPPLIER: '/suppliers/{supplierId}',

    // Inventory
    WAREHOUSES: '/warehouses',
    WAREHOUSE: '/warehouses/{warehouseId}',
    WAREHOUSE_STOCK: '/warehouses/{warehouseId}/stock',
    STOCK_LEVEL: '/warehouses/{warehouseId}/stock/{productId}',
    MOVEMENTS: '/movements',
    MOVEMENT: '/movements/{movementId}',
    LOW_STOCK_ALERTS: '/alerts/low-stock',

    // Purchasing
    PURCHASE_ORDERS: '/purchase-orders',
    PURCHASE_ORDER: '/purchase-orders/{orderId}',
    PURCHASE_ORDER_TRANSITION: '/purchase-orders/{orderId}/{transition}',

    // Reports
    REPORTS: '/reports',
    JOB: '/jobs/{jobId}',
    JOB_DOWNLOAD: '/jobs/{jobId}/download',

    // Platform and testing support
    HEALTH: '/health',
    RESET: '/__reset',
    MAINTENANCE: '/__maintenance',
    CHAOS: '/chaos',
    CHAOS_EXCEPTION: '/chaos/exception',
    ECHO: '/echo',
    RATE_LIMITED: '/rate-limited',
    PREFERENCES: '/preferences',
    CONTACT: '/contact',
} as const;

export type Endpoint = (typeof Endpoints)[keyof typeof Endpoints];
