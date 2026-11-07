import { EnvironmentConfig } from '../../config/EnvironmentConfig';

export interface CronDefinition {
    /** Handler name the backend uses, e.g. `confirmOrders`. */
    handler: string;
    /** Group-level keys that disable this cron in the switches table (the handler name is added automatically). */
    disableKeys: string[];
}

/**
 * Catalog of crons the suite launches. Projects list their own; the entry below is a fictitious example.
 */
export const CronLocks: Record<string, CronDefinition> = {
    CONFIRM_ORDERS: { handler: 'confirmOrders', disableKeys: ['DISABLE_ORDER_CRONS'] },
};

export const lockKeyOf = (cron: CronDefinition): string => `${EnvironmentConfig.cron().lockKeyPrefix}${cron.handler}`;

export const disablingKeysOf = (cron: CronDefinition): string[] => [...cron.disableKeys, cron.handler];
