/**
 * Validation patterns shared by Questions and Steps.
 */
export const Patterns = {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    JWT: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    ISO_8601: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    IPV4: /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/,
} as const;

/**
 * Header names used by the framework.
 */
export const Headers = {
    AUTHORIZATION: 'Authorization',
    TENANT: 'X-Tenant',
    API_KEY: 'X-API-Key',
    IDEMPOTENCY_KEY: 'Idempotency-Key',
    IF_MATCH: 'If-Match',
    IF_NONE_MATCH: 'If-None-Match',
    REQUEST_ID: 'X-Request-ID',
    CLIENT_ID: 'X-Client-Id',
    CONTENT_TYPE: 'Content-Type',
} as const;
