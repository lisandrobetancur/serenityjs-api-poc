import { textTable } from './ReportEvidence';

export interface QueryResultTableOptions {
    maxRows?: number;
    maxCellLength?: number;
    maskedColumns?: readonly string[];
}

const DEFAULTS: Required<QueryResultTableOptions> = {
    maxRows: 10,
    maxCellLength: 60,
    maskedColumns: ['password'],
};

const MASK = '******';

/**
 * Renders query results for the report:
 *
 * - objects become columns, arrays/tuples become `col1…colN`, scalars become a single `value` column;
 * - at most 10 rows (`Result (showing 10 of 42):`), cells truncated to 60 characters with `...`;
 * - `NULL` written explicitly, line breaks flattened;
 * - masked columns (`password` by default) shown as `******`.
 */
export class QueryResultTable {
    static render(rows: readonly unknown[], options: QueryResultTableOptions = {}): string {
        const settings = { ...DEFAULTS, ...options };
        if (rows.length === 0) {
            return 'Result: no rows';
        }
        const shown = rows.slice(0, settings.maxRows);
        const records = shown.map(toRecord);
        const columns = [...new Set(records.flatMap(record => Object.keys(record)))];
        const masked = new Set(settings.maskedColumns.map(column => column.toLowerCase()));

        const body = records.map(record =>
            columns.map(column =>
                masked.has(column.toLowerCase()) && record[column] !== null && record[column] !== undefined
                    ? MASK
                    : cell(record[column], settings.maxCellLength),
            ),
        );

        return `Result (showing ${shown.length} of ${rows.length}):\n${textTable([columns, ...body])}`;
    }

    static notRendered(error: unknown): string {
        return `Result: not rendered (${error instanceof Error ? error.name : String(error)})`;
    }
}

function toRecord(row: unknown): Record<string, unknown> {
    if (Array.isArray(row)) {
        return Object.fromEntries(row.map((value, index) => [`col${index + 1}`, value]));
    }
    if (row !== null && typeof row === 'object' && !(row instanceof Date)) {
        return row as Record<string, unknown>;
    }
    return { value: row };
}

function cell(value: unknown, maxLength: number): string {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    const text = (
        value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value)
    ).replace(/\s*\r?\n\s*/g, ' ');
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}
