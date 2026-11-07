import { EnvironmentConfig } from '../config/EnvironmentConfig';

/**
 * The three ways infrastructure names carry the environment. Catalogs of concrete names belong to the project.
 *
 * - prefix: databases, `orders` → `qa_orders` (see `DatabaseNames`)
 * - suffix: Dynamo tables, `appConfig` → `appConfig_qa`
 * - template: Lambdas and Fargate task definitions, `acme-orders-%s-confirm-orders` → `acme-orders-qa-confirm-orders`
 */
export class ResourceNames {
    static withPrefix(baseName: string, environment = EnvironmentConfig.getEnvironment()): string {
        return `${environment}_${baseName}`;
    }

    static withSuffix(baseName: string, environment = EnvironmentConfig.getEnvironment()): string {
        return `${baseName}_${environment}`;
    }

    static fromTemplate(template: string, environment = EnvironmentConfig.getEnvironment()): string {
        if (!template.includes('%s')) {
            throw new Error(`Name template "${template}" has no %s placeholder for the environment`);
        }
        return template.replace('%s', environment);
    }
}

/** Example catalogs with fictitious names. */
export const DynamoTables = {
    APP_CONFIG: () => ResourceNames.withSuffix('appConfig'),
    CRON_LOCKS: () => ResourceNames.withSuffix(EnvironmentConfig.cron().lockTable),
} as const;

export const LambdaFunctions = {
    CONFIRM_ORDERS: () => ResourceNames.fromTemplate('acme-orders-%s-confirm-orders'),
} as const;

export const FargateTasks = {
    DAILY_RECONCILIATION: () => ResourceNames.fromTemplate('acme-orders-%s-daily-reconciliation'),
} as const;

export const Buckets = {
    FILES: () => ResourceNames.fromTemplate('acme-files-%s'),
} as const;
