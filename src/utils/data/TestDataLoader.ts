import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DATA_DIR = process.env.TEST_DATA_DIR ?? 'test-data';

/**
 * Loads and caches JSON files from `test-data/`.
 *
 * Accounts are indexed by the scenario's unique tag (`@<feature_tag>_NN`), so no two features share an account
 * (`scripts/check-test-data.ts` enforces it).
 */
export class TestDataLoader {
    // per-worker: immutable cache of test-data files
    private static readonly cache = new Map<string, unknown>();

    static load<T>(fileName: string): T {
        if (!TestDataLoader.cache.has(fileName)) {
            TestDataLoader.cache.set(fileName, JSON.parse(readFileSync(join(TEST_DATA_DIR, fileName), 'utf8')));
        }
        return TestDataLoader.cache.get(fileName) as T;
    }

    /** The scenario's unique tag, e.g. `@framework_02`, or `undefined` when it has none. */
    static scenarioTagOf(tags: readonly string[]): string | undefined {
        return tags.find(tag => /^@[a-z][a-z0-9_]*_\d{2,}$/.test(tag));
    }

    /** Feature-level tags (`@auth`, `@framework`) of the scenario. */
    static featureIds(tags: readonly string[]): string[] {
        return tags.filter(tag => /^@[a-z][a-z0-9_]*$/.test(tag));
    }

    /** The account assigned to a scenario tag in `test-data/scenario-users.json`. */
    static userFor(scenarioTag: string): Record<string, string> | undefined {
        return TestDataLoader.load<Record<string, Record<string, string>>>('scenario-users.json')[scenarioTag];
    }
}
