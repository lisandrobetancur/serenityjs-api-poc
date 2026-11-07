/**
 * Port for relational databases. Interactions and Questions depend on this interface only, so a project can
 * plug in MySQL or SQL Server by writing another adapter, without touching them.
 *
 * Statements use **named parameters** (`:orderId`); adapters translate them to their native placeholders.
 */
export interface DatabaseClient {
    readonly databaseName: string;

    /** Runs a statement outside of a transaction (reads). */
    query<Row = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<Row[]>;

    /**
     * Runs `fn` in a transaction: committed if it resolves, rolled back if it throws.
     * PostgreSQL adapters set `lock_timeout` so a locked row fails the step instead of hanging the run.
     */
    transaction<T>(fn: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;

    close(): Promise<void>;
}

export interface DatabaseTransaction {
    query<Row = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<Row[]>;
}

/** Raised by adapters when the connection itself failed (as opposed to a failing statement). */
export class DatabaseConnectionError extends Error {
    constructor(databaseName: string, cause: unknown) {
        super(
            `Could not connect to database "${databaseName}": ${cause instanceof Error ? cause.message : String(cause)}`,
            { cause },
        );
        this.name = 'DatabaseConnectionError';
    }
}
