import { Pool, type PoolClient } from 'pg';

import { type DatabaseClient, DatabaseConnectionError, type DatabaseTransaction } from './DatabaseClient';
import { NativeQuerySafety } from './NativeQuerySafety';

export interface PgConnection {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

/** Error codes that mean the connection is broken (not that the statement is wrong). */
// per-worker: constant set, never modified
const CONNECTION_ERRORS = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    '57P01',
    '57P02',
    '57P03',
    '08000',
    '08003',
    '08006',
]);

/**
 * PostgreSQL adapter of `DatabaseClient`, backed by a `pg` Pool.
 */
export class PgDatabaseClient implements DatabaseClient {
    private readonly pool: Pool;

    constructor(
        connection: PgConnection,
        private readonly onConnectionError: () => void = () => undefined,
    ) {
        this.pool = new Pool({ ...connection, max: 4, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 30_000 });
        this.pool.on('error', () => this.onConnectionError());
    }

    get databaseName(): string {
        return (this.pool as unknown as { options: { database: string } }).options.database;
    }

    async query<Row>(sql: string, params: Record<string, unknown> = {}): Promise<Row[]> {
        return this.guard(async () => {
            const { text, values } = NativeQuerySafety.toPositional(sql, params);
            return (await this.pool.query(text, values)).rows as Row[];
        });
    }

    async transaction<T>(fn: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
        return this.guard(async () => {
            const client: PoolClient = await this.pool.connect();
            try {
                await client.query('BEGIN');
                // A row locked by someone else fails the step after 30 s instead of hanging the run.
                await client.query(`SET LOCAL lock_timeout = '30s'`);
                const result = await fn({
                    query: async <Row>(sql: string, params: Record<string, unknown> = {}) => {
                        const { text, values } = NativeQuerySafety.toPositional(sql, params);
                        return (await client.query(text, values)).rows as Row[];
                    },
                });
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK').catch(() => undefined);
                throw error;
            } finally {
                client.release();
            }
        });
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    private async guard<T>(fn: () => Promise<T>): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (CONNECTION_ERRORS.has((error as { code?: string }).code ?? '')) {
                this.onConnectionError();
                throw new DatabaseConnectionError(this.databaseName, error);
            }
            throw error;
        }
    }
}
