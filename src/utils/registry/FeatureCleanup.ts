import { type Actor } from '@serenity-js/core';

import { logger } from '../log/logger';
import { RunRegistry } from './RunRegistry';

type CleanupHandler = (actor: Actor, values: unknown[]) => Promise<void>;

/**
 * Feature-level cleanup: steps register ids in `RunRegistry` under a key, and the handler for that key undoes
 * them once the worker has finished its scenarios.
 *
 * Why at the end of the worker (`AfterAll`) and not "when the feature ends": Cucumber.js has no feature hooks and,
 * in parallel runs, the scenarios of one feature can be spread over several worker processes, so no single worker
 * knows when a feature is over. Each worker only undoes what it registered itself, so the result is the same.
 * The cleanup runs with its own actor and is not part of any scenario's report.
 */
export class FeatureCleanup {
    // per-worker: handlers registered once at start-up
    private static readonly handlers = new Map<string, CleanupHandler>();

    static on(key: string, handler: CleanupHandler): void {
        FeatureCleanup.handlers.set(key, handler);
    }

    static async runAll(actorFor: () => Actor): Promise<void> {
        for (const [key, handler] of FeatureCleanup.handlers) {
            const values = RunRegistry.drain(key);
            if (values.length === 0) {
                continue;
            }
            try {
                await handler(actorFor(), values);
                logger.info({ key, count: values.length }, 'Feature cleanup done');
            } catch (error) {
                logger.error({ key, values, error: String(error) }, 'Feature cleanup failed');
            }
        }
    }
}
