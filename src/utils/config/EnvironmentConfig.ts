import { existsSync } from 'node:fs';

import { environments, type EnvironmentSettings } from './environments';

if (existsSync('.env')) {
    process.loadEnvFile('.env');
}

const DEFAULT_ENVIRONMENT = 'qa';

/**
 * Reads the configuration of the environment selected with `ENVIRONMENT` (default `qa`).
 *
 * - `qa` uses the `default` block.
 * - An environment without a block of its own also falls back to `default` (never to `dev`).
 * - A few values can be overridden by environment variables, so CI can point the suite elsewhere
 *   without editing code: `API_BASE_URL`, `AWS_ENDPOINT`, `AWS_REGION`.
 */
export class EnvironmentConfig {
    private static cached: EnvironmentSettings | undefined;

    /** The raw environment name, used to build prefixed or suffixed resource names. */
    static getEnvironment(): string {
        return (process.env.ENVIRONMENT ?? DEFAULT_ENVIRONMENT).trim().toLowerCase();
    }

    /** The environment name shown in the report's Context column (`default` is shown as `qa`). */
    static reportContext(): string {
        const environment = EnvironmentConfig.getEnvironment();
        return environment === 'default' ? DEFAULT_ENVIRONMENT : environment;
    }

    static settings(): EnvironmentSettings {
        if (!EnvironmentConfig.cached) {
            const block = environments[EnvironmentConfig.getEnvironment()] ?? {};
            const merged = deepMerge(environments.default, block) as EnvironmentSettings;
            merged.apiBaseUrl = process.env.API_BASE_URL ?? merged.apiBaseUrl;
            merged.aws.endpoint = process.env.AWS_ENDPOINT ?? merged.aws.endpoint;
            merged.aws.region = process.env.AWS_REGION ?? merged.aws.region;
            EnvironmentConfig.cached = Object.freeze(merged);
        }
        return EnvironmentConfig.cached;
    }

    static apiBaseUrl(): string {
        return EnvironmentConfig.settings().apiBaseUrl;
    }

    static databaseSecret(): string {
        return EnvironmentConfig.settings().databaseSecret;
    }

    static aws(): EnvironmentSettings['aws'] {
        return EnvironmentConfig.settings().aws;
    }

    static http(): EnvironmentSettings['http'] {
        return EnvironmentConfig.settings().http;
    }

    static cron(): EnvironmentSettings['cron'] {
        return EnvironmentConfig.settings().cron;
    }

    /** Reads a value from the `custom` block with a dot-separated path. */
    static custom<T = unknown>(path: string): T | undefined {
        return path
            .split('.')
            .reduce<unknown>(
                (value, key) => (value as Record<string, unknown> | undefined)?.[key],
                EnvironmentConfig.settings().custom,
            ) as T | undefined;
    }

    /**
     * Reads an on-demand flag by name from the environment variables, e.g. `MOCK_PAYMENTS=off`.
     * Returns `undefined` when the flag is not set.
     */
    static flag(name: string): string | undefined {
        const value = process.env[name];
        return value === undefined || value === '' ? undefined : value.trim();
    }

    /** The Cucumber tag expression of this run, as passed in `TAGS`. */
    static tagExpression(): string {
        return process.env.TAGS ?? '';
    }

    /** True when the tag expression explicitly asks for `@performance` scenarios. */
    static isPerformanceRun(): boolean {
        return (
            /@performance\b/.test(EnvironmentConfig.tagExpression()) &&
            !/not\s+@performance\b/.test(EnvironmentConfig.tagExpression())
        );
    }

    /** Clears the cache; only meant for scripts that switch environments in one process. */
    static reset(): void {
        EnvironmentConfig.cached = undefined;
    }
}

function deepMerge(base: unknown, override: unknown): unknown {
    if (!isPlainObject(base) || !isPlainObject(override)) {
        return override === undefined ? structuredClone(base) : structuredClone(override);
    }
    const result: Record<string, unknown> = structuredClone(base);
    for (const [key, value] of Object.entries(override)) {
        result[key] = deepMerge(result[key], value);
    }
    return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
