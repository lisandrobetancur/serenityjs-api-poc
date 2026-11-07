/**
 * Ids that must outlive the scenario that produced them: resources a feature-level cleanup undoes,
 * or ids one process leaves for another. Entries are kept per key and per scope (the feature URI),
 * so draining one feature never takes what a feature running next to it registered.
 *
 * State lives in the worker process. Cucumber.js runs each worker as its own process and a worker only
 * cleans up what it registered (see `FeatureCleanupHook`), so no cross-process storage is needed.
 */
export class RunRegistry {
    // per-worker: each worker only cleans up what it registered (see FeatureCleanup)
    private static readonly entries = new Map<string, Map<string, unknown[]>>();
    private static scope = 'run';

    static setScope(scope: string): void {
        RunRegistry.scope = scope;
    }

    static currentScope(): string {
        return RunRegistry.scope;
    }

    static register(key: string, value: unknown, scope: string = RunRegistry.scope): void {
        const byScope = RunRegistry.entries.get(key) ?? new Map<string, unknown[]>();
        byScope.set(scope, [...(byScope.get(scope) ?? []), value]);
        RunRegistry.entries.set(key, byScope);
    }

    /** Values registered under `key` (all scopes, or one), without removing them. */
    static peek<T = unknown>(key: string, scope?: string): T[] {
        const byScope = RunRegistry.entries.get(key);
        if (!byScope) {
            return [];
        }
        return (scope ? (byScope.get(scope) ?? []) : [...byScope.values()].flat()) as T[];
    }

    /** Removes and returns the values registered under `key` (all scopes, or one). */
    static drain<T = unknown>(key: string, scope?: string): T[] {
        const values = RunRegistry.peek<T>(key, scope);
        const byScope = RunRegistry.entries.get(key);
        if (byScope) {
            if (scope) {
                byScope.delete(scope);
            } else {
                byScope.clear();
            }
        }
        return values;
    }

    static scopes(): string[] {
        return [...new Set([...RunRegistry.entries.values()].flatMap(byScope => [...byScope.keys()]))];
    }
}
