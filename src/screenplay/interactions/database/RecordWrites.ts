import { type Actor, Interaction } from '@serenity-js/core';

import { type DatabaseTransaction } from '../../../utils/database/DatabaseClient';
import { NativeQuerySafety } from '../../../utils/database/NativeQuerySafety';
import { identifier, type TableDefinition } from '../../../utils/database/TableDefinition';
import { QueryReport } from '../../../utils/report/QueryReport';
import { InteractWithDatabase } from '../../abilities/database/InteractWithDatabase';

type Row = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any row type is accepted; columns are checked as identifiers at runtime
type AnyTable = TableDefinition<any>;

export interface RowUpdate {
    table: AnyTable;
    id: unknown;
    changes: Row;
}

export interface RowInsert {
    table: AnyTable;
    row: Row;
}

export interface NativeStatement {
    sql: string;
    params: Record<string, unknown>;
}

/**
 * Database writes. Without an ORM the rule is: read the row, compute the diff, write only the changed columns.
 * The statement that runs is exactly the one shown in the report (with masked values for masked columns).
 */
export const SaveRecord = {
    of: (table: AnyTable, row: Row) =>
        Interaction.where(`#actor inserts a record into table ${table.table}`, actor =>
            write(actor as Actor, table.database, tx => insert(actor as Actor, tx, { table, row })),
        ),
};

export const UpdateRecord = {
    of: (table: AnyTable, id: unknown, changes: Row) =>
        Interaction.where(`#actor updates a record in table ${table.table}`, actor =>
            write(actor as Actor, table.database, tx => update(actor as Actor, tx, { table, id, changes })),
        ),
};

export const UpdateRecords = {
    /** Several updates and inserts in one transaction: all or nothing. */
    of: (updates: RowUpdate[], inserts: RowInsert[] = []) =>
        Interaction.where(`#actor writes ${updates.length + inserts.length} records in one transaction`, actor =>
            write(actor as Actor, (updates[0] ?? inserts[0])!.table.database, async tx => {
                for (const change of updates) {
                    await update(actor as Actor, tx, change);
                }
                for (const row of inserts) {
                    await insert(actor as Actor, tx, row);
                }
            }),
        ),
};

export const BulkUpdateRecords = {
    /**
     * Native statements such as `UPDATE … WHERE id IN (:ids)`, each validated by `NativeQuerySafety` before it runs
     * (lists are expanded), plus optional inserts, in one transaction.
     */
    of: (database: string, statements: NativeStatement[], inserts: RowInsert[] = []) =>
        Interaction.where(`#actor runs ${statements.length} bulk update(s) in one transaction`, actor =>
            write(actor as Actor, database, async tx => {
                for (const { sql, params } of statements) {
                    NativeQuerySafety.requireEveryParamBound(sql, params);
                    QueryReport.recordWrite(actor, sql, params);
                    await tx.query(sql, params);
                }
                for (const row of inserts) {
                    await insert(actor as Actor, tx, row);
                }
            }),
        ),
};

export const DeleteRecord = {
    of: (table: AnyTable, id: unknown) =>
        Interaction.where(`#actor deletes a record from table ${table.table}`, actor =>
            write(actor as Actor, table.database, async tx => {
                const sql = `DELETE FROM ${identifier(table.table)} WHERE ${identifier(table.primaryKey)} = :id`;
                QueryReport.recordWrite(actor, sql, { id });
                await tx.query(sql, { id });
            }),
        ),
};

// ---------------------------------------------------------------------------------------------------------------------

async function write(actor: Actor, database: string, fn: (tx: DatabaseTransaction) => Promise<unknown>): Promise<void> {
    await InteractWithDatabase.query(actor, database, db => db.inTransaction(fn));
}

async function insert(actor: Actor, tx: DatabaseTransaction, { table, row }: RowInsert): Promise<void> {
    const columns = Object.keys(row).map(identifier);
    const sql = `INSERT INTO ${identifier(table.table)} (${columns.join(', ')}) VALUES (${columns.map(column => `:${column}`).join(', ')})`; // sql-safe: columns checked by identifier()
    QueryReport.recordWrite(actor, sql, masked(table, row));
    await tx.query(sql, row);
}

async function update(actor: Actor, tx: DatabaseTransaction, { table, id, changes }: RowUpdate): Promise<void> {
    const key = identifier(table.primaryKey);
    const select = `SELECT * FROM ${identifier(table.table)} WHERE ${key} = :id FOR UPDATE`; // sql-safe: key checked by identifier()
    QueryReport.record(actor, select, { id });
    const [current] = await tx.query<Row>(select, { id });
    if (!current) {
        throw new Error(`No row in ${table.table} with ${key} = ${JSON.stringify(id)}`);
    }

    const changed = Object.fromEntries(
        Object.entries(changes).filter(([column, value]) => !sameValue(current[column], value)),
    );
    if (Object.keys(changed).length === 0) {
        QueryReport.recordResult([{ result: 'no changes: every column already had the requested value' }]);
        return;
    }
    const assignments = Object.keys(changed)
        .map(column => `${identifier(column)} = :${column}`)
        .join(', ');
    const sql = `UPDATE ${identifier(table.table)} SET ${assignments} WHERE ${key} = :__id`; // sql-safe: columns and key checked by identifier()
    QueryReport.recordWrite(actor, sql, { ...masked(table, changed), __id: id });
    await tx.query(sql, { ...changed, __id: id });
}

function sameValue(current: unknown, next: unknown): boolean {
    if (current instanceof Date || next instanceof Date) {
        return new Date(current as string).getTime() === new Date(next as string).getTime();
    }
    return JSON.stringify(current) === JSON.stringify(next) || String(current) === String(next);
}

function masked(table: AnyTable, row: Row): Row {
    const hidden = new Set(['password', ...(table.maskedColumns ?? [])]);
    return Object.fromEntries(
        Object.entries(row).map(([column, value]) => [column, hidden.has(column) ? '******' : value]),
    );
}
