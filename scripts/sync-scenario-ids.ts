import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every scenario carries a unique id tag `@<feature_tag>_NN`, derived from its feature tag (`@auth` → `@auth_07`).
 * Test data (`test-data/scenario-users.json`) and the run summary key on it.
 *
 *   npx tsx scripts/sync-scenario-ids.ts          checks: fails if a scenario has no id or an id is duplicated
 *   npx tsx scripts/sync-scenario-ids.ts --write  assigns the next free id to scenarios that have none
 *
 * Existing ids are never renumbered, so test data keeps pointing at the same scenario.
 */
const FEATURES_DIR = 'features';
const write = process.argv.includes('--write');

const featureFiles = (dir: string): string[] =>
    readdirSync(dir)
        .flatMap(entry => {
            const path = join(dir, entry);
            return statSync(path).isDirectory() ? featureFiles(path) : path.endsWith('.feature') ? [path] : [];
        })
        .sort();

const files = featureFiles(FEATURES_DIR);
const used = new Map<string, string>();
const problems: string[] = [];
const idPattern = /@([a-z][a-z0-9_]*)_(\d{2,})\b/;

// First pass: collect existing ids.
for (const file of files) {
    readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
            for (const match of line.matchAll(new RegExp(idPattern, 'g'))) {
                const id = match[0];
                if (used.has(id)) {
                    problems.push(`${file}:${index + 1} duplicates ${id} (first used at ${used.get(id)})`);
                }
                used.set(id, `${file}:${index + 1}`);
            }
        });
}

const nextId = (featureTag: string): string => {
    for (let n = 1; ; n++) {
        const id = `@${featureTag}_${String(n).padStart(2, '0')}`;
        if (!used.has(id)) {
            used.set(id, 'new');
            return id;
        }
    }
};

let assigned = 0;
for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const featureLine = lines.findIndex(line => /^\s*Feature:/.test(line));
    const featureTag = lines
        .slice(0, featureLine)
        .join(' ')
        .match(/@([a-z][a-z0-9_]*)\b/)?.[1];
    if (!featureTag) {
        problems.push(`${file} has no feature tag (e.g. @auth) above "Feature:"`);
        continue;
    }

    for (let index = featureLine + 1; index < lines.length; index++) {
        const line = lines[index]!;
        if (!/^\s*Scenario( Outline)?:/.test(line)) {
            continue;
        }
        const previous = lines[index - 1] ?? '';
        const isTagLine = /^\s*@/.test(previous);
        if (isTagLine && idPattern.test(previous)) {
            continue;
        }
        if (!write) {
            problems.push(`${file}:${index + 1} has no scenario id tag`);
            continue;
        }
        const id = nextId(featureTag);
        assigned++;
        if (isTagLine) {
            lines[index - 1] = `${previous.trimEnd()} ${id}`;
        } else {
            lines.splice(index, 0, `${line.match(/^\s*/)![0]}${id}`);
            index++;
        }
    }
    if (write) {
        writeFileSync(file, lines.join('\n'));
    }
}

if (write) {
    process.stdout.write(`Assigned ${assigned} scenario id(s).\n`);
}
if (problems.length > 0) {
    process.stderr.write(
        `${problems.join('\n')}\n\nRun "npx tsx scripts/sync-scenario-ids.ts --write" to assign missing ids.\n`,
    );
    process.exit(1);
}
