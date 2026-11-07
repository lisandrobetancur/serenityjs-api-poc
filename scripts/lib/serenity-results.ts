import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RESULTS_DIR = 'target/site/serenity';

export type Result = 'SUCCESS' | 'FAILURE' | 'ERROR' | 'COMPROMISED' | 'SKIPPED' | 'PENDING' | 'IGNORED' | string;

export interface SerenityStep {
    description: string;
    result: Result;
    duration?: number;
    children?: SerenityStep[];
    restQuery?: { method: string; path: string; statusCode: number };
    reportData?: Array<{ title: string; contents: string }>;
    exception?: { errorType?: string; message?: string };
}

export interface ScenarioOutcome {
    file: string;
    feature: string;
    name: string;
    result: Result;
    durationMs: number;
    tags: string[];
    steps: SerenityStep[];
}

interface SerenityJson {
    name: string;
    title: string;
    result?: Result;
    duration?: number;
    tags?: Array<{ name: string; type: string }>;
    userStory?: { storyName?: string };
    testSteps: SerenityStep[];
    dataTable?: { rows: Array<{ values: string[]; result: Result }> };
}

/**
 * Reads the Serenity BDD JSON results. A Scenario Outline is stored as one file whose top-level steps are its
 * examples; each example becomes its own outcome, as Cucumber counts it.
 */
export function readOutcomes(dir = RESULTS_DIR): ScenarioOutcome[] {
    if (!existsSync(dir)) {
        return [];
    }
    return readdirSync(dir)
        .filter(file => file.endsWith('.json') && file.startsWith('scenario-'))
        .flatMap(file => {
            const json = JSON.parse(readFileSync(join(dir, file), 'utf8')) as SerenityJson;
            const tags = (json.tags ?? []).filter(tag => tag.type === 'tag').map(tag => `@${tag.name}`);
            const feature = json.userStory?.storyName ?? '';

            if (json.dataTable?.rows?.length) {
                return json.dataTable.rows.map((row, index) => ({
                    file,
                    feature,
                    name: `${json.title} [${row.values.join(', ')}]`,
                    result: row.result,
                    durationMs: json.testSteps[index]?.duration ?? 0,
                    tags,
                    steps: json.testSteps[index]?.children ?? [],
                }));
            }
            return [
                {
                    file,
                    feature,
                    name: json.title,
                    result: json.result ?? 'PENDING',
                    durationMs: json.duration ?? 0,
                    tags,
                    steps: json.testSteps,
                },
            ];
        });
}

export const isFailed = (result: Result) => ['FAILURE', 'ERROR', 'COMPROMISED'].includes(result);

/** The deepest failed step, following the first failed child at every level. */
export function deepestFailure(steps: SerenityStep[], path: SerenityStep[] = []): SerenityStep[] {
    const failed = steps.find(step => isFailed(step.result));
    return failed ? deepestFailure(failed.children ?? [], [...path, failed]) : path;
}

/** REST queries in the order they were made. */
export function restQueriesOf(steps: SerenityStep[]): Array<NonNullable<SerenityStep['restQuery']>> {
    return steps.flatMap(step => [...(step.restQuery ? [step.restQuery] : []), ...restQueriesOf(step.children ?? [])]);
}

/**
 * The REST query that explains a failure: the last one inside the deepest failed step or, when the failing step made
 * no call (a Then step asserting on the previous When), the last call made before it in the scenario.
 */
export function restQueryOfFailure(steps: SerenityStep[]): NonNullable<SerenityStep['restQuery']> | undefined {
    const path = deepestFailure(steps);
    const inside = [...path]
        .reverse()
        .map(step => restQueriesOf([step]).at(-1))
        .find(Boolean);
    if (inside || path.length === 0) {
        return inside;
    }
    const failedIndex = steps.indexOf(path[0]!);
    return restQueriesOf(steps.slice(0, failedIndex)).at(-1);
}
