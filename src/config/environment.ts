import { existsSync } from 'node:fs';

// Carga variables desde .env si existe (soporte nativo de Node.js >= 20.12)
if (existsSync('.env')) {
    process.loadEnvFile('.env');
}

/**
 * Configuración del entorno bajo prueba.
 * Los valores se pueden sobreescribir con variables de entorno o en un archivo `.env`.
 */
export const environment = {
    apiBaseUrl: process.env.API_BASE_URL ?? 'https://jsonplaceholder.typicode.com',
    requestTimeout: Number(process.env.API_TIMEOUT_MS ?? 10_000),
};
