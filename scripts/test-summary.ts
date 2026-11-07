import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { LOG_FILE } from '../src/utils/log/logger';
import { RetryLog } from '../src/utils/wait/WaitUtils';
import { allPickles, selectedBy } from './lib/scenarios';
import { isFailed, readOutcomes, restQueryOfFailure, type ScenarioOutcome } from './lib/serenity-results';

/**
 * Post-run summary, read from the Serenity JSON results (not from the runner's own output):
 *
 * - executed / passed / failed / errors / not executed, with the reasons for not executing
 *   (work in progress, reported bug, reported finding, reported improvement, performance, outside the tag filter);
 * - total time and the 502 / 504 / edge retries counted from the run log;
 * - scenarios that failed because the endpoint did not answer (502, 504, or status 0 = timeout), taking the REST
 *   query of the deepest failed step, with the URL template (no ids) and no query string.
 *
 * Writes `target/scenario-summary.env` and `target/gateway-failures.tsv` for the CI notification.
 */
const outcomes = readOutcomes();
const tagExpression = process.env.TAGS ?? '';
const pickles = allPickles();
const selected = selectedBy(tagExpression, pickles);

const SKIP_REASONS: Array<[string, string]> = [
    ['@wip', 'work in progress'],
    ['@skip', 'work in progress'],
    ['@bug_reported', 'bug reported'],
    ['@finding_reported', 'finding reported'],
    ['@improvement_reported', 'improvement reported'],
    ['@performance', 'performance'],
];

const passed = outcomes.filter(outcome => outcome.result === 'SUCCESS');
const failed = outcomes.filter(outcome => outcome.result === 'FAILURE');
const errors = outcomes.filter(outcome => isFailed(outcome.result) && outcome.result !== 'FAILURE');
const skipped = outcomes.filter(outcome => ['SKIPPED', 'IGNORED', 'PENDING'].includes(outcome.result));
const executed = passed.length + failed.length + errors.length;

const skipReasons = new Map<string, number>();
for (const outcome of skipped) {
    const reason =
        SKIP_REASONS.find(([tag]) => outcome.tags.includes(tag))?.[1] ??
        'precondition (time window or unavailable service)';
    skipReasons.set(reason, (skipReasons.get(reason) ?? 0) + 1);
}
const outsideFilter = pickles.length - selected.length;

const log = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf8') : '';
const count = (marker: string) => log.split('\n').filter(line => line.includes(marker)).length;
const retries = {
    badGateway: count(RetryLog.badGateway(0).replace(/ — retry 0$/, '')),
    gatewayTimeout: count(RetryLog.gatewayTimeout(0).replace(/ — retry 0$/, '')),
    edge: count('Edge rate limit (403)'),
};

const totalMs = outcomes.reduce((sum, outcome) => sum + outcome.durationMs, 0);

const gatewayFailures = [...failed, ...errors].flatMap((outcome: ScenarioOutcome) => {
    const query = restQueryOfFailure(outcome.steps);
    if (!query || ![0, 502, 504].includes(query.statusCode)) {
        return [];
    }
    return [
        {
            feature: outcome.feature,
            scenario: outcome.name,
            method: query.method,
            url: query.path.split('?')[0]!,
            status: query.statusCode,
        },
    ];
});

const lines = [
    `Scenarios in scope: ${outcomes.length} (executed ${executed}, passed ${passed.length}, failed ${failed.length}, errors ${errors.length}, not executed ${skipped.length + outsideFilter})`,
    ...[...skipReasons].map(([reason, n]) => `  not executed · ${reason}: ${n}`),
    ...(outsideFilter > 0 ? [`  not executed · outside the tag filter (${tagExpression}): ${outsideFilter}`] : []),
    `Total scenario time: ${(totalMs / 1000).toFixed(1)} s`,
    `Retries: 502 ${retries.badGateway} · 504 ${retries.gatewayTimeout} · edge 403 ${retries.edge}`,
    `Failed because the endpoint did not answer (502/504/timeout): ${gatewayFailures.length}`,
    ...gatewayFailures.map(failure => `  ${failure.status} ${failure.method} ${failure.url} · ${failure.scenario}`),
];
process.stdout.write(`\n${lines.join('\n')}\n`);

mkdirSync('target', { recursive: true });
writeFileSync(
    'target/scenario-summary.env',
    [
        `SCENARIOS_EXECUTED=${executed}`,
        `SCENARIOS_PASSED=${passed.length}`,
        `SCENARIOS_FAILED=${failed.length}`,
        `SCENARIOS_ERRORS=${errors.length}`,
        `SCENARIOS_NOT_EXECUTED=${skipped.length + outsideFilter}`,
        ...[...skipReasons].map(
            ([reason, n]) =>
                `SCENARIOS_SKIPPED_${reason
                    .toUpperCase()
                    .replace(/[^A-Z]+/g, '_')
                    .replace(/_+$/, '')}=${n}`,
        ),
        `SCENARIOS_OUTSIDE_FILTER=${outsideFilter}`,
        `TOTAL_TIME_SECONDS=${Math.round(totalMs / 1000)}`,
        `RETRIES_502=${retries.badGateway}`,
        `RETRIES_504=${retries.gatewayTimeout}`,
        `RETRIES_EDGE_403=${retries.edge}`,
        `GATEWAY_FAILURES=${gatewayFailures.length}`,
        '',
    ].join('\n'),
);
writeFileSync(
    'target/gateway-failures.tsv',
    [
        ['feature', 'scenario', 'method', 'url', 'status'].join('\t'),
        ...gatewayFailures.map(failure =>
            [failure.feature, failure.scenario, failure.method, failure.url, failure.status].join('\t'),
        ),
        '',
    ].join('\n'),
);
