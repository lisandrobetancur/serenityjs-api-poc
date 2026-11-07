/**
 * Dot-separated path reads: `category.name`, `items.0.sku`, `detail.0.loc`, or `headers.x-tenant`.
 * An empty path returns the whole value; a missing segment returns `undefined`.
 */
export class JsonPath {
    static read(source: unknown, path: string): unknown {
        if (!path) {
            return source;
        }
        return path.split('.').reduce<unknown>((current, key) => {
            if (current === null || current === undefined) {
                return undefined;
            }
            return (current as Record<string, unknown>)[key];
        }, source);
    }
}
