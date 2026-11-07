import { EnvironmentConfig } from '../config/EnvironmentConfig';

/**
 * Database names are resolved with the environment as a prefix: `orders` → `qa_orders`.
 * The base name never includes the prefix.
 *
 * Exception: the environment's own database is named after the environment alone (`qa`), see `ENVIRONMENT_OWN`.
 * Projects list their databases here.
 */
export const Databases = {
    ORDERS: 'orders',
    ENVIRONMENT_OWN: '',
} as const;

export type DatabaseBaseName = (typeof Databases)[keyof typeof Databases];

export class DatabaseNames {
    static resolve(baseName: DatabaseBaseName | string): string {
        const environment = EnvironmentConfig.getEnvironment();
        if (baseName.startsWith(`${environment}_`)) {
            throw new Error(
                `Database base name "${baseName}" already includes the environment prefix; use the base name only`,
            );
        }
        return baseName === Databases.ENVIRONMENT_OWN ? environment : `${environment}_${baseName}`;
    }
}
