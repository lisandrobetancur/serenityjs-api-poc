/**
 * Minimal metadata of a table, used by the write interactions and by the report evidence.
 * The TypeScript counterpart of a read-mostly Hibernate `@Entity`: a row type plus where to find it.
 */
export interface TableDefinition<Row extends Record<string, unknown> = Record<string, unknown>> {
    /** Schema-qualified table name, e.g. `public.orders`. */
    table: string;
    primaryKey: keyof Row & string;
    /** Columns shown as `******` in the report (in addition to `password`). */
    maskedColumns?: ReadonlyArray<keyof Row & string>;
    /** Database the table lives in, as a base name (resolved with the environment prefix). */
    database: string;
}

/** SQL identifiers cannot be bound as parameters; table and column names must match this pattern. */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/;

export function identifier(name: string): string {
    if (!IDENTIFIER.test(name)) {
        throw new Error(`"${name}" is not a valid SQL identifier`);
    }
    return name;
}
