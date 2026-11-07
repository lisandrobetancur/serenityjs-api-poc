import { readFileSync } from 'node:fs';

import { Client } from 'pg';

import { DatabaseNames, Databases } from '../src/utils/database/DatabaseNames';

/**
 * Creates the example database of the current environment (`orders` → `<environment>_orders`) on the server in
 * `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD`, and applies `docker/postgres/schema.sql` (which also resets
 * the example rows). Use it with a PostgreSQL that is not the docker-compose one.
 *
 *   DB_HOST=localhost DB_USER=$USER npx tsx scripts/setup-local-db.ts
 */
async function main(): Promise<void> {
    const database = DatabaseNames.resolve(Databases.ORDERS);
    const connection = {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        user: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? '',
    };

    const admin = new Client({ ...connection, database: 'postgres' });
    await admin.connect();
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (exists.rowCount === 0) {
        await admin.query(`CREATE DATABASE "${database.replace(/"/g, '')}"`);
    }
    await admin.end();

    const client = new Client({ ...connection, database });
    await client.connect();
    await client.query(readFileSync('docker/postgres/schema.sql', 'utf8'));
    await client.end();
    process.stdout.write(`Database ${database} is ready on ${connection.host}:${connection.port}\n`);
}

main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
