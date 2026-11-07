import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import pino from 'pino';

export const LOG_FILE = process.env.LOG_FILE ?? 'target/logs/test-run.log';

mkdirSync(dirname(LOG_FILE), { recursive: true });

/**
 * The run log (Logback's counterpart): everything at `debug` and above goes to `target/logs/test-run.log`,
 * warnings and errors are also printed to the console.
 *
 * `scripts/test-summary.ts` counts the retry lines in this file, so their wording is part of the contract
 * (see `RetryLog` in `src/utils/wait/WaitUtils.ts`).
 */
export const logger = pino(
    { level: process.env.LOG_LEVEL ?? 'debug', base: { pid: process.pid } },
    pino.multistream([
        { level: 'debug', stream: pino.destination({ dest: LOG_FILE, append: true, sync: true }) },
        { level: 'warn', stream: process.stderr },
    ]),
);
