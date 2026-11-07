import { mkdirSync, writeFileSync } from 'node:fs';

import { allPickles } from './lib/scenarios';

/**
 * Exports the scenario inventory as CSV (`target/scenarios.csv`), e.g. for test management tools.
 *
 *   npx tsx scripts/export-scenarios-csv.ts --depth 1   one row per feature
 *   npx tsx scripts/export-scenarios-csv.ts --depth 2   one row per scenario (default)
 *   npx tsx scripts/export-scenarios-csv.ts --depth 3   one row per step
 */
const depth = Number(process.argv[process.argv.indexOf('--depth') + 1] ?? 2) || 2;
const csv = (values: string[]) => values.map(value => `"${value.replace(/"/g, '""')}"`).join(',');
const pickles = allPickles();

const rows: string[][] = [];
if (depth === 1) {
    rows.push(['feature', 'file', 'scenarios']);
    const byFeature = new Map<string, { file: string; count: number }>();
    for (const pickle of pickles) {
        byFeature.set(pickle.featureName, {
            file: pickle.uri,
            count: (byFeature.get(pickle.featureName)?.count ?? 0) + 1,
        });
    }
    rows.push(...[...byFeature].map(([feature, { file, count }]) => [feature, file, String(count)]));
} else {
    rows.push(depth === 3 ? ['feature', 'scenario', 'tags', 'step'] : ['feature', 'scenario', 'tags']);
    for (const pickle of pickles) {
        const base = [pickle.featureName, pickle.name, pickle.tags.map(tag => tag.name).join(' ')];
        if (depth === 3) {
            rows.push(...pickle.steps.map(step => [...base, step.text]));
        } else {
            rows.push(base);
        }
    }
}

mkdirSync('target', { recursive: true });
writeFileSync('target/scenarios.csv', `${rows.map(csv).join('\n')}\n`);
process.stdout.write(`Wrote target/scenarios.csv (${rows.length - 1} rows, depth ${depth})\n`);
