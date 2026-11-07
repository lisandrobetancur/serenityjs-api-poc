import { AsyncLocalStorage } from 'node:async_hooks';

import type { CollectsArtifacts } from '@serenity-js/core';

/**
 * Something that writes evidence to the report once it is published.
 * `titleSuffix` is appended to artifact names, e.g. ` · call 3 of 10` for the final attempt of a poll.
 */
export type Publication = (actor: CollectsArtifacts, titleSuffix: string) => void;

interface BufferScope {
    publications: Publication[];
}

const storage = new AsyncLocalStorage<BufferScope>();

/**
 * Holds back report evidence while an operation is retried or polled, so only the attempt that the scenario
 * actually sees reaches the report.
 *
 * `ApiCall`, `QueryReport` and `ReportEvidence` ask `isHoldingBack()` before writing; when it is true they hand
 * their evidence to `holdBack()` instead. The scope follows the async call chain (`AsyncLocalStorage`), the
 * counterpart of the Java suite's `ThreadLocal`.
 */
export class ReportBuffer {
    static isHoldingBack(): boolean {
        return storage.getStore() !== undefined;
    }

    static holdBack(publication: Publication): void {
        const scope = storage.getStore();
        if (!scope) {
            throw new Error('ReportBuffer.holdBack() was called outside of an attempt; check isHoldingBack() first');
        }
        scope.publications.push(publication);
    }

    /**
     * Runs one attempt of a retried or polled operation while holding back its evidence.
     * If the attempt throws, its evidence is published (numbered) before the error is re-thrown,
     * so a failing attempt is never invisible.
     */
    static async attempt<T>(
        actor: CollectsArtifacts,
        read: () => Promise<T>,
        attemptNumber: number,
        maxAttempts: number,
    ): Promise<{ value: T; publications: Publication[] }> {
        const scope: BufferScope = { publications: [] };
        try {
            const value = await storage.run(scope, read);
            return { value, publications: scope.publications };
        } catch (error) {
            ReportBuffer.publish(actor, scope.publications, attemptNumber, maxAttempts);
            throw error;
        }
    }

    static publish(
        actor: CollectsArtifacts,
        publications: Publication[],
        attemptNumber: number,
        maxAttempts: number,
    ): void {
        const suffix = maxAttempts > 1 ? ` · call ${attemptNumber} of ${maxAttempts}` : '';
        for (const publication of publications) {
            publication(actor, suffix);
        }
    }
}
