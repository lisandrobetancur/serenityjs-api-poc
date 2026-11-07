import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Opens the Serenity BDD HTML report with the platform's default browser. */
const report = resolve('target/site/serenity/index.html');
if (!existsSync(report)) {
    process.stderr.write(
        'No report found. Run "npm test" (with the Serenity BDD CLI downloaded) or "npm run report" first.\n',
    );
    process.exit(1);
}
const [command, args] =
    process.platform === 'darwin'
        ? ['open', [report]]
        : process.platform === 'win32'
          ? ['cmd', ['/c', 'start', '', report]]
          : ['xdg-open', [report]];
spawn(command, args, { stdio: 'ignore', detached: true }).unref();
process.stdout.write(`Opened ${report}\n`);
