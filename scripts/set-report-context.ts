import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { EnvironmentConfig } from '../src/utils/config/EnvironmentConfig';
import { RESULTS_DIR } from './lib/serenity-results';

/**
 * Sets the report's Context column to the environment (`default` shown as `qa`) in every Serenity JSON result.
 * The Serenity/JS reporter leaves the field empty, so this runs between the tests and `serenity-bdd run`.
 */
const context = EnvironmentConfig.reportContext();
let updated = 0;
for (const file of readdirSync(RESULTS_DIR).filter(name => name.endsWith('.json') && name.startsWith('scenario-'))) {
    const path = join(RESULTS_DIR, file);
    const json = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    if (json.context !== context) {
        json.context = context;
        writeFileSync(path, JSON.stringify(json));
        updated++;
    }
}
process.stdout.write(`Report context set to "${context}" in ${updated} result file(s)\n`);
