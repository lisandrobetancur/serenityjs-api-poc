import { existsSync } from 'node:fs';

// Load variables from .env when present (native support in Node.js >= 20.12)
if (existsSync('.env')) {
    process.loadEnvFile('.env');
}

/**
 * Configuration of the system under test.
 * Values can be overridden with environment variables or in a `.env` file.
 */
export const environment = {
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:8000',
    apiKey: process.env.API_KEY ?? 'test-api-key-123',
    requestTimeout: Number(process.env.API_TIMEOUT_MS ?? 10_000),
};
