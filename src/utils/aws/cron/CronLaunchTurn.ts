import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import lockfile from 'proper-lockfile';

import { logger } from '../../log/logger';
import { WaitUtils } from '../../wait/WaitUtils';

const LOCK_DIR = process.env.CRON_TURN_DIR ?? 'target/locks';

/**
 * A first-come mutex per cron lock key, shared by every worker process of the run, plus a settle time after each
 * launch: the backend writes its lock inside the Lambda, not when the Lambda is invoked, so two launchers that
 * both read "free" would start the same cron twice.
 *
 * Cucumber.js workers are separate processes, so an in-memory mutex is not enough. A lock file
 * (`proper-lockfile`, atomic `mkdir` with stale detection) works across processes on one machine without extra
 * infrastructure. Use a conditional write in Dynamo instead if workers ever run on several machines.
 */
export class CronLaunchTurn {
    static async take<T>(lockKey: string, settleSeconds: number, fn: () => Promise<T>): Promise<T> {
        mkdirSync(LOCK_DIR, { recursive: true });
        const file = join(LOCK_DIR, `${lockKey.replace(/[^\w.-]/g, '_')}.turn`);
        writeFileSync(file, '', { flag: 'a' });

        const release = await lockfile.lock(file, {
            retries: { retries: 600, factor: 1, minTimeout: 1000, maxTimeout: 1000 },
            stale: 15 * 60 * 1000,
        });
        logger.debug({ lockKey, pid: process.pid }, 'Cron launch turn taken');
        try {
            const result = await fn();
            await WaitUtils.waitSeconds(settleSeconds, `settle after launching ${lockKey}`);
            return result;
        } finally {
            await release();
            logger.debug({ lockKey, pid: process.pid }, 'Cron launch turn released');
        }
    }
}
