import { setTimeout as sleep } from 'node:timers/promises';

import {
    type AnswersQuestions,
    type CollectsArtifacts,
    Question,
    type QuestionAdapter,
    type UsesAbilities,
} from '@serenity-js/core';
import { Name, TextData } from '@serenity-js/core/model';

import { logger } from '../log/logger';
import { type Publication, ReportBuffer } from '../report/ReportBuffer';

/**
 * The exact wording of the retry log lines. `scripts/test-summary.ts` counts them, so treat them as an API.
 */
export const RetryLog = {
    badGateway: (attempt: number) => `Bad gateway (502) — retry ${attempt}`,
    gatewayTimeout: (attempt: number) => `Gateway timeout (504) — retry ${attempt}`,
    edgeRateLimit: (attempt: number, seconds: number) =>
        `Edge rate limit (403) — retry ${attempt} after ${seconds} s of silence`,
    throttled: (resource: string, seconds: number) => `Throttling ${resource} — waiting ${seconds.toFixed(1)} s`,
} as const;

type PollingActor = AnswersQuestions & UsesAbilities & CollectsArtifacts;

/**
 * Waiting helpers. Every wait is an awaited timer; nothing blocks the event loop.
 */
export class WaitUtils {
    static async waitSeconds(seconds: number, reason = 'wait'): Promise<void> {
        await WaitUtils.waitMillis(seconds * 1000, reason);
    }

    static async waitMillis(milliseconds: number, reason = 'wait'): Promise<void> {
        if (milliseconds <= 0) {
            return;
        }
        logger.debug({ milliseconds }, `Waiting: ${reason}`);
        await sleep(milliseconds);
    }

    static async badGatewayRetry(attempt: number, waitSeconds: number): Promise<void> {
        logger.warn(RetryLog.badGateway(attempt));
        await WaitUtils.waitSeconds(waitSeconds, 'bad gateway retry');
    }

    static async gatewayTimeoutRetry(attempt: number, waitSeconds: number): Promise<void> {
        logger.warn(RetryLog.gatewayTimeout(attempt));
        await WaitUtils.waitSeconds(waitSeconds, 'gateway timeout retry');
    }

    static async edgeRateLimitRetry(attempt: number, baseSilenceSeconds: number): Promise<void> {
        const seconds = baseSilenceSeconds * attempt;
        logger.warn(RetryLog.edgeRateLimit(attempt, seconds));
        await WaitUtils.waitSeconds(seconds, 'edge rate limit silence');
    }

    /**
     * Polls `read` until `done(value)` or `maxRetries` calls, waiting `intervalSeconds` between them,
     * and answers the **last value read** so the assertion can name the final state.
     *
     * Only the final attempt reaches the report, numbered (`· call 3 of 10`). `Wait.until` from Serenity/JS
     * cannot do this: it reports every poll and answers nothing.
     *
     * `read` runs as a plain async function (not through `attemptsTo`), so its own activities do not show up;
     * use Interactions' `performAs` or Questions inside it.
     */
    static pollUntil<T>(
        description: string,
        read: (actor: PollingActor) => Promise<T>,
        done: (value: T) => boolean,
        intervalSeconds: number,
        maxRetries: number,
    ): QuestionAdapter<T> {
        return Question.about<T>(
            `${description} (polled every ${intervalSeconds} s, up to ${maxRetries} calls)`,
            async actor => {
                const collector = actor as unknown as PollingActor;
                let last: { value: T; publications: Publication[] } | undefined;
                let attempt = 0;
                while (attempt < maxRetries) {
                    attempt++;
                    last = await ReportBuffer.attempt(collector, () => read(collector), attempt, maxRetries);
                    if (done(last.value)) {
                        break;
                    }
                    if (attempt < maxRetries) {
                        await WaitUtils.waitSeconds(intervalSeconds, `poll: ${description}`);
                    }
                }
                ReportBuffer.publish(collector, last?.publications ?? [], attempt, maxRetries);
                // Serenity BDD shows REST queries without their artifact name, so the attempt number is also published
                // as its own evidence next to them.
                collector.collect(
                    TextData.fromJSON({
                        contentType: 'text/plain',
                        data: `${description}\nfinal value: ${JSON.stringify(last!.value)}\nattempts: ${attempt} of at most ${maxRetries}`,
                    }),
                    new Name(`Poll · call ${attempt} of ${maxRetries}`),
                );
                return last!.value;
            },
        );
    }
}

/**
 * Sliding-window throttle for resources that are rate limited at the edge: at most `calls` per `perSeconds`.
 * State is per worker process; workers do not share the window.
 */
export class Throttle {
    // per-worker: the throttle window is per process, documented in docs/MIGRATION.md
    private static readonly calls = new Map<string, number[]>();

    static async acquire(resource: string, calls: number, perSeconds: number): Promise<void> {
        const windowMs = perSeconds * 1000;
        for (;;) {
            const now = Date.now();
            const recent = (Throttle.calls.get(resource) ?? []).filter(timestamp => now - timestamp < windowMs);
            if (recent.length < calls) {
                recent.push(now);
                Throttle.calls.set(resource, recent);
                return;
            }
            const waitMs = windowMs - (now - recent[0]!) + 5;
            logger.warn(RetryLog.throttled(resource, waitMs / 1000));
            await sleep(waitMs);
        }
    }
}
