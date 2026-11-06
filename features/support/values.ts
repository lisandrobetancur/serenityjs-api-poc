/**
 * Turns a Gherkin literal into a typed value:
 * numbers, booleans, null and JSON arrays/objects are parsed; quoted text is unquoted; anything else stays a string.
 */
export function parseLiteral(text: string): unknown {
    const trimmed = text.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1);
    }
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return trimmed;
    }
}

/**
 * Turns a vertical data table (`| field | value |`) into an object with typed values.
 * Dotted keys create nested objects, e.g. `dimensions.width_cm`.
 */
export function objectFrom(rows: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [ key, raw ] of Object.entries(rows)) {
        if (raw === '') {
            continue;
        }
        const path = key.split('.');
        let target = result;
        for (const segment of path.slice(0, -1)) {
            target = (target[segment] ??= {}) as Record<string, unknown>;
        }
        target[path.at(-1)!] = parseLiteral(raw);
    }
    return result;
}

/**
 * A unique-enough suffix so that scenarios which create data never collide.
 */
export function uniqueSuffix(): string {
    return `${ Date.now().toString(36) }${ Math.floor(Math.random() * 1_000).toString(36) }`.toUpperCase();
}
