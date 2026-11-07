/**
 * Guards for native SQL. Statements must use named parameters (`:name`); values are never concatenated.
 *
 * - `requireEveryParamBound` (runtime): every `:name` in the statement has a value, and no value is unused.
 * - `toPositional`: translates `:name` into `$1…$n` for `pg`, expanding arrays for `IN (:ids)`.
 * - `scripts/check-native-query-safety.ts` (static) rejects SQL built by concatenation or interpolation.
 */
export class NativeQuerySafety {
    /** Named parameters in order of appearance, ignoring `::casts` and quoted literals. */
    static paramNamesOf(sql: string): string[] {
        const withoutLiterals = sql.replace(/'(?:[^']|'')*'/g, "''");
        return [...withoutLiterals.matchAll(/(?<!:):([A-Za-z_]\w*)/g)].map(match => match[1]!);
    }

    static requireEveryParamBound(sql: string, params: Record<string, unknown>): void {
        const names = new Set(NativeQuerySafety.paramNamesOf(sql));
        const missing = [...names].filter(name => !(name in params));
        const unused = Object.keys(params).filter(name => !names.has(name));
        if (missing.length > 0 || unused.length > 0) {
            throw new Error(
                `Unsafe or inconsistent native query: ${missing.length ? `missing values for :${missing.join(', :')}` : ''}` +
                    `${missing.length && unused.length ? '; ' : ''}${unused.length ? `unused parameters ${unused.join(', ')}` : ''}\n${sql}`,
            );
        }
        for (const [name, value] of Object.entries(params)) {
            if (Array.isArray(value) && value.length === 0) {
                throw new Error(`Parameter :${name} is an empty list; "IN ()" is not valid SQL`);
            }
        }
    }

    static toPositional(sql: string, params: Record<string, unknown>): { text: string; values: unknown[] } {
        NativeQuerySafety.requireEveryParamBound(sql, params);
        const values: unknown[] = [];
        const parts = sql.split(/('(?:[^']|'')*')/);
        const text = parts
            .map((part, index) =>
                index % 2 === 1
                    ? part
                    : part.replace(/(?<!:):([A-Za-z_]\w*)/g, (_, name: string) => {
                          const value = params[name];
                          if (Array.isArray(value)) {
                              return value.map(item => `$${values.push(item)}`).join(', ');
                          }
                          return `$${values.push(value)}`;
                      }),
            )
            .join('');
        return { text, values };
    }
}
