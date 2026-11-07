import { mkdirSync, writeFileSync } from 'node:fs';

import { EnvironmentConfig } from '../src/utils/config/EnvironmentConfig';
import {
    deepestFailure,
    isFailed,
    readOutcomes,
    restQueriesOf,
    restQueryOfFailure,
    type SerenityStep,
} from './lib/serenity-results';

/**
 * Consolidated JSON of the run (history, dashboards, archiving to S3): result and duration of every scenario and,
 * for the failed ones, the Gherkin step, the Step, expected vs actual of the assertion and the resource
 * (endpoint, query, Lambda, task, table, bucket) where it failed. Written to `target/run-results.json`.
 */
const outcomes = readOutcomes();

const resourceOf = (path: SerenityStep[]): string | undefined => {
    for (const step of [...path].reverse()) {
        const query = restQueriesOf([step]).at(-1);
        if (query) {
            return `${query.method} ${query.path.split('?')[0]}`;
        }
        const evidence = (step.reportData ?? []).find(data =>
            /^(Query executed|Invoke|RunTask|PutObject|PutItem|UpdateItem|DeleteItem)/.test(data.title),
        );
        if (evidence) {
            return evidence.title;
        }
        const aws = step.description.match(/(Lambda|Fargate task|Dynamo table|s3:\/\/)\s*\S+/);
        if (aws) {
            return aws[0];
        }
    }
    return undefined;
};

const describeQuery = (query: ReturnType<typeof restQueryOfFailure>) =>
    query ? `${query.method} ${query.path.split('?')[0]}` : undefined;

const parseAssertion = (message: string | undefined) => {
    const expected = message?.match(/Expected[^:\n]*:\s*(.+)/)?.[1]?.trim();
    const actual = message?.match(/Received[^:\n]*:\s*(.+)/)?.[1]?.trim();
    return { expected, actual };
};

const scenarios = outcomes.map(outcome => {
    if (!isFailed(outcome.result)) {
        return {
            feature: outcome.feature,
            scenario: outcome.name,
            result: outcome.result,
            durationMs: outcome.durationMs,
        };
    }
    const path = deepestFailure(outcome.steps);
    const deepest = path.at(-1);
    const message = deepest?.exception?.message ?? path.find(step => step.exception)?.exception?.message;
    return {
        feature: outcome.feature,
        scenario: outcome.name,
        result: outcome.result,
        durationMs: outcome.durationMs,
        failure: {
            gherkinStep: path[0]?.description,
            step: path[1]?.description,
            ...parseAssertion(message),
            message,
            resource: resourceOf(path) ?? describeQuery(restQueryOfFailure(outcome.steps)),
        },
    };
});

mkdirSync('target', { recursive: true });
writeFileSync(
    'target/run-results.json',
    JSON.stringify(
        {
            environment: EnvironmentConfig.reportContext(),
            tags: process.env.TAGS ?? '',
            generatedAt: new Date().toISOString(),
            totals: {
                scenarios: scenarios.length,
                failed: scenarios.filter(scenario => isFailed(scenario.result)).length,
            },
            scenarios,
        },
        null,
        2,
    ),
);
process.stdout.write(`Wrote target/run-results.json (${scenarios.length} scenarios)\n`);
