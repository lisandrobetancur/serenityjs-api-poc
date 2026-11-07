import { AsyncLocalStorage } from 'node:async_hooks';

import { type CollectsArtifacts } from '@serenity-js/core';
import { Name, TextData } from '@serenity-js/core/model';

import { ReportBuffer } from './ReportBuffer';
import { QueryResultTable, type QueryResultTableOptions } from './QueryResultTable';

export type QueryParams = Record<string, unknown>;

interface RecordedStatement {
    kind: 'read' | 'write';
    sql: string;
    params: QueryParams;
}

interface QueryScope {
    database: string;
    statements: RecordedStatement[];
    result?: string;
}

const storage = new AsyncLocalStorage<QueryScope[]>();

/**
 * "DB Query" evidence: every statement the suite runs, split by clause, with its bound parameters and,
 * for the last read, a table of the rows it returned.
 *
 * Statements are buffered per scope (`within(database, fn)`) because the database name and the result are only
 * known when the scope closes. A statement recorded outside of a scope is published immediately, without them.
 * Scopes nest; each one publishes its own block. If the scope fails, it publishes without a result and re-throws.
 */
export class QueryReport {
    static async within<T>(
        actor: CollectsArtifacts,
        database: string,
        fn: () => Promise<T>,
        tableOptions?: QueryResultTableOptions,
    ): Promise<T> {
        const scope: QueryScope = { database, statements: [] };
        const stack = [...(storage.getStore() ?? []), scope];
        try {
            const value = await storage.run(stack, fn);
            if (scope.result === undefined && Array.isArray(value)) {
                scope.result = QueryResultTable.render(value, tableOptions);
            }
            QueryReport.publish(actor, scope);
            return value;
        } catch (error) {
            scope.result = undefined;
            QueryReport.publish(actor, scope);
            throw error;
        }
    }

    /** Records a read. Inside a scope it is buffered; outside of one it is published straight away. */
    static record(actor: CollectsArtifacts, sql: string, params: QueryParams = {}): void {
        QueryReport.add(actor, { kind: 'read', sql, params });
    }

    /** Records a write (INSERT / UPDATE / DELETE). */
    static recordWrite(actor: CollectsArtifacts, sql: string, params: QueryParams = {}): void {
        QueryReport.add(actor, { kind: 'write', sql, params });
    }

    /** Sets the result table of the innermost scope (for reads that return something other than an array). */
    static recordResult(rows: readonly unknown[], tableOptions?: QueryResultTableOptions): void {
        const scope = storage.getStore()?.at(-1);
        if (scope) {
            scope.result = QueryResultTable.render(rows, tableOptions);
        }
    }

    /** Splits a statement into one line per clause, without breaking quoted literals. */
    static formatSql(sql: string): string {
        const clauses =
            /\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|INSERT INTO|VALUES|(?<!FOR )UPDATE|SET|DELETE FROM|RETURNING|LEFT JOIN|INNER JOIN|JOIN|ON)\b/gi;
        const parts = sql
            .trim()
            .replace(/\s+/g, ' ')
            .split(/('(?:[^']|'')*')/);
        return parts
            .map((part, index) => (index % 2 === 1 ? part : part.replace(clauses, '\n$1')))
            .join('')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .join('\n');
    }

    private static add(actor: CollectsArtifacts, statement: RecordedStatement): void {
        const scope = storage.getStore()?.at(-1);
        if (scope) {
            scope.statements.push(statement);
            return;
        }
        QueryReport.publish(actor, { database: '', statements: [statement] });
    }

    private static publish(actor: CollectsArtifacts, scope: QueryScope): void {
        if (scope.statements.length === 0) {
            return;
        }
        const title = scope.database
            ? `Query executed on database **${scope.database}**`
            : 'Query executed on the database';
        const lastReadIndex = scope.statements.map(statement => statement.kind).lastIndexOf('read');

        const contents = scope.statements
            .map((statement, index) =>
                [
                    QueryReport.formatSql(statement.sql),
                    parameters(statement.params),
                    index === lastReadIndex && scope.result ? scope.result : undefined,
                ]
                    .filter(Boolean)
                    .join('\n\n'),
            )
            .join('\n\n----\n\n');

        const publication = (target: CollectsArtifacts, suffix: string) =>
            target.collect(
                TextData.fromJSON({ contentType: 'text/plain', data: contents }),
                new Name(`${title}${suffix}`),
            );

        if (ReportBuffer.isHoldingBack()) {
            ReportBuffer.holdBack(publication);
        } else {
            publication(actor, '');
        }
    }
}

function parameters(params: QueryParams): string | undefined {
    const entries = Object.entries(params);
    if (entries.length === 0) {
        return undefined;
    }
    return [
        'Parameters:',
        ...entries.map(([name, value]) => `  ${name} = ${/password/i.test(name) ? '******' : JSON.stringify(value)}`),
    ].join('\n');
}
