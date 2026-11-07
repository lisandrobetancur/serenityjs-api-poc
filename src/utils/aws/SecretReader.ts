import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

import { SecretRetrievalError } from '../../errors/IntegrationErrors';
import { AwsConnectors } from './AwsConnectors';

/**
 * Reads JSON secrets from Secrets Manager with the default credential chain.
 * The raw string is cached per secret name for the whole run; a failure is not cached.
 */
export class SecretReader {
    // per-worker: immutable cache of secret strings for the run
    private static readonly cache = new Map<string, string>();

    static async getRaw(name: string): Promise<string> {
        const cached = SecretReader.cache.get(name);
        if (cached !== undefined) {
            return cached;
        }
        try {
            const { SecretString } = await AwsConnectors.secrets().send(new GetSecretValueCommand({ SecretId: name }));
            if (SecretString === undefined) {
                throw new Error('the secret has no string value');
            }
            SecretReader.cache.set(name, SecretString);
            return SecretString;
        } catch (cause) {
            throw new SecretRetrievalError(`Could not read secret "${name}"`, cause);
        }
    }

    static async getSecretValue(name: string, key: string): Promise<string> {
        const value = (await SecretReader.json(name))[key];
        if (value === undefined || value === null || value === '') {
            throw new SecretRetrievalError(`Secret "${name}" has no "${key}" field`);
        }
        return String(value);
    }

    /** Database credentials: `{ "host", "username", "password" }` → `{ host, user, pass }`. */
    static async getDbSecret(name: string): Promise<{ host: string; user: string; pass: string }> {
        return {
            host: await SecretReader.getSecretValue(name, 'host'),
            user: await SecretReader.getSecretValue(name, 'username'),
            pass: await SecretReader.getSecretValue(name, 'password'),
        };
    }

    private static async json(name: string): Promise<Record<string, unknown>> {
        try {
            return JSON.parse(await SecretReader.getRaw(name)) as Record<string, unknown>;
        } catch (cause) {
            throw cause instanceof SecretRetrievalError
                ? cause
                : new SecretRetrievalError(`Secret "${name}" is not valid JSON`, cause);
        }
    }
}
