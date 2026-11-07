import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync } from 'node:fs';

import { planShards } from './lib/shards';

/**
 * Runs the scenarios, then always generates the report and the summary, and exits with the scenarios' exit code.
 *
 *   npm test                         serial
 *   npm run test:parallel            shards by exclusive resource (parallel-resources.json), PARALLEL_WORKERS at most
 *   npm run test:dry                 lists what would run, without calling anything
 *   TAGS='@smoke and not @slow' npm test
 *
 * Scenarios are filtered ONLY with the Cucumber tag expression in TAGS. Other mechanisms (`--tags`, `--name`,
 * `--order`, a feature path, or a runner-level filter) are rejected: in the Java suite, a second filter silently
 * disabled Cucumber's and made the excluded scenarios disappear from the report and the summary. One filter keeps
 * the report and the "outside the tag filter" count honest.
 */
const args = process.argv.slice(2);
const parallel = args.includes('--parallel');
const dryRun = args.includes('--dry-run');
const tags = process.env.TAGS ?? '';

const rejected = args.filter(arg => !['--parallel', '--dry-run'].includes(arg));
const rejectedEnv = ['CUCUMBER_TAGS', 'CUCUMBER_NAME'].filter(name => process.env[name]);
if (rejected.length > 0 || rejectedEnv.length > 0) {
    process.stderr.write(
        [
            `Refusing to run with: ${[...rejected, ...rejectedEnv].join(' ')}`,
            'Filter scenarios only with a Cucumber tag expression in TAGS, e.g.:',
            "  TAGS='@products and not @slow' npm test",
            'A second filtering mechanism hides the excluded scenarios from the report and the run summary.',
            '',
        ].join('\n'),
    );
    process.exit(2);
}

const run = (command: string, commandArgs: string[]) =>
    spawnSync(command, commandArgs, { stdio: 'inherit', env: process.env }).status ?? 1;

async function runShards(): Promise<number> {
    const shards = planShards(tags, Number(process.env.PARALLEL_WORKERS ?? 4));
    mkdirSync('target/logs', { recursive: true });
    process.stdout.write(`Running ${shards.length} shard(s) in parallel:\n`);
    shards.forEach((shard, index) =>
        process.stdout.write(
            `  shard ${index + 1}: ${shard.scenarios} scenario(s), resources ${shard.resources.join(', ')}\n`,
        ),
    );

    const codes = await Promise.all(
        shards.map(
            (shard, index) =>
                new Promise<number>(resolve => {
                    const log = createWriteStream(`target/logs/shard-${index + 1}.log`);
                    const child = spawn('npx', ['cucumber-js'], { env: { ...process.env, TAGS: shard.tagExpression } });
                    child.stdout.pipe(log);
                    child.stderr.pipe(log);
                    child.on('close', code => {
                        process.stdout.write(
                            `  shard ${index + 1} finished with exit code ${code} (target/logs/shard-${index + 1}.log)\n`,
                        );
                        resolve(code ?? 1);
                    });
                }),
        ),
    );
    return Math.max(0, ...codes);
}

async function main(): Promise<void> {
    const exitCode = dryRun
        ? run('npx', ['cucumber-js', '--dry-run', '--format', 'progress'])
        : parallel
          ? await runShards()
          : run('npx', ['cucumber-js']);

    if (!dryRun && existsSync('target/site/serenity')) {
        run('npx', ['tsx', 'scripts/set-report-context.ts']);
        const cache = 'node_modules/@serenity-js/serenity-bdd/cache';
        const cliCached = existsSync(cache) && readdirSync(cache).some(file => file.endsWith('.jar'));
        if (cliCached && process.env.SKIP_REPORT !== 'true') {
            run('npx', ['serenity-bdd', 'run', '--features', './features']);
        } else if (!cliCached) {
            process.stdout.write('Skipping the HTML report: run "npm run serenity:update" once (needs Java).\n');
        }
        run('npx', ['tsx', 'scripts/test-summary.ts']);
        run('npx', ['tsx', 'scripts/run-results.ts']);
    }
    process.exit(exitCode);
}

void main();
