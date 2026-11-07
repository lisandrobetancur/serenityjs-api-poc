import { EnvironmentConfig } from '../config/EnvironmentConfig';
import { SecretReader } from '../aws/SecretReader';
import { type DatabaseClient } from './DatabaseClient';
import { PgDatabaseClient } from './PgDatabaseClient';

/**
 * Caches one pool per database for the whole run (building a pool is expensive) and closes them all at the end.
 *
 * Pools are closed from an `AfterAll` hook rather than `process.on('exit')`: `exit` handlers must be synchronous,
 * and ending a pool is asynchronous. Each Cucumber.js worker process has its own provider and runs its own
 * `AfterAll`.
 *
 * A connection error discards the cached pool of that database, so the next scenario does not reuse a broken one.
 * Abilities never own the pool: their `discard()` does not close it.
 */
export class DatabaseClientProvider {
    // per-worker: one pool per database and process, closed by closeAll() in AfterAll
    private static readonly clients = new Map<string, Promise<DatabaseClient>>();

    static clientFor(databaseName: string): Promise<DatabaseClient> {
        let client = DatabaseClientProvider.clients.get(databaseName);
        if (!client) {
            client = DatabaseClientProvider.create(databaseName);
            client.catch(() => DatabaseClientProvider.clients.delete(databaseName));
            DatabaseClientProvider.clients.set(databaseName, client);
        }
        return client;
    }

    static discard(databaseName: string): void {
        const client = DatabaseClientProvider.clients.get(databaseName);
        DatabaseClientProvider.clients.delete(databaseName);
        void client?.then(c => c.close()).catch(() => undefined);
    }

    static async closeAll(): Promise<void> {
        const clients = [...DatabaseClientProvider.clients.values()];
        DatabaseClientProvider.clients.clear();
        await Promise.allSettled(clients.map(async client => (await client).close()));
    }

    private static async create(databaseName: string): Promise<DatabaseClient> {
        const credentials = await DatabaseCredentials.resolve();
        return new PgDatabaseClient(
            {
                ...credentials,
                port: Number(process.env.DB_PORT ?? EnvironmentConfig.settings().databasePort),
                database: databaseName,
            },
            () => DatabaseClientProvider.discard(databaseName),
        );
    }
}

/**
 * Where database credentials come from: the environment's secret in Secrets Manager, or, when `DB_HOST` is set,
 * from `DB_HOST` / `DB_USER` / `DB_PASSWORD` (handy for local databases and LocalStack-less runs).
 */
export class DatabaseCredentials {
    static async resolve(): Promise<{ host: string; user: string; password: string }> {
        if (process.env.DB_HOST) {
            return {
                host: process.env.DB_HOST,
                user: process.env.DB_USER ?? 'postgres',
                password: process.env.DB_PASSWORD ?? '',
            };
        }
        const secret = await SecretReader.getDbSecret(EnvironmentConfig.databaseSecret());
        return { host: secret.host, user: secret.user, password: secret.pass };
    }
}
