import { type Actor, Question, type QuestionAdapter } from '@serenity-js/core';

import { identifier, type TableDefinition } from '../../../utils/database/TableDefinition';
import { QueryReport } from '../../../utils/report/QueryReport';
import { InteractWithDatabase } from '../../abilities/database/InteractWithDatabase';

/**
 * Database questions follow the same pattern:
 *
 * - the statement is a **constant** with named parameters; values are never concatenated;
 * - read-only, outside of a transaction; `LIMIT 1` when several rows could qualify;
 * - the statement is recorded in the report before it runs (`QueryReport.record`);
 * - ids come back as `string`, and type conversion happens here, never in a Step.
 */
export const GetRecordById = {
    /** Raw re-read by primary key, e.g. to compare a row before and after a write. */
    of: <Row extends Record<string, unknown>>(
        table: TableDefinition<Row>,
        id: unknown,
    ): QuestionAdapter<Row | undefined> =>
        Question.about<Row | undefined>(
            `the ${table.table} record with ${table.primaryKey} ${JSON.stringify(id)}`,
            actor => {
                const sql = `SELECT * FROM ${identifier(table.table)} WHERE ${identifier(table.primaryKey)} = :id LIMIT 1`;
                return readRows<Row>(actor as unknown as Actor, table.database, sql, { id }, table).then(
                    rows => rows[0],
                );
            },
        ),
};

/**
 * Runs a read inside a report scope, so the block shows the database, the statement, its parameters and the rows.
 */
export async function readRows<Row extends Record<string, unknown>>(
    actor: Actor,
    database: string,
    sql: string,
    params: Record<string, unknown>,
    table?: TableDefinition<Row>,
): Promise<Row[]> {
    return InteractWithDatabase.query(actor, database, async db => {
        QueryReport.record(actor, sql, params);
        const rows = await db.read(client => client.query<Row>(sql, params));
        QueryReport.recordResult(rows, { maskedColumns: ['password', ...(table?.maskedColumns ?? [])] });
        return rows;
    });
}
