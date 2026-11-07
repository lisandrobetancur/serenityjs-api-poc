import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Heuristic lint for mutable module-level state in steps, hooks and the Screenplay layer, which would leak
 * between scenarios of a worker. Module-level `let`, and `static` / top-level `Map`, `Set` or arrays, must be
 * either immutable caches or explicitly scenario-/worker-scoped, marked with a `// per-worker:` or
 * `// scenario-scoped:` comment on the same or previous line.
 */
const ROOTS = ['features', 'src/screenplay', 'src/utils'];
const MUTABLE = [
    /^let\s+\w+/,
    /^(export\s+)?const\s+\w+\s*=\s*new\s+(Map|Set|WeakMap)\b/,
    /^\s*(private\s+|public\s+|protected\s+)?static\s+(readonly\s+)?\w+\s*(:\s*[^=]+)?=\s*(new\s+(Map|Set)|\[|[^;(]*Notepad\.empty)/,
];

function files(dir: string): string[] {
    return readdirSync(dir).flatMap(entry => {
        const path = join(dir, entry);
        return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
    });
}

const problems = ROOTS.flatMap(files).flatMap(file => {
    const lines = readFileSync(file, 'utf8').split('\n');
    return lines.flatMap((line, index) => {
        if (!MUTABLE.some(pattern => pattern.test(line))) {
            return [];
        }
        const context = `${lines[index - 1] ?? ''}\n${line}`;
        return /\/\/\s*(per-worker|scenario-scoped):/.test(context) ? [] : [`${file}:${index + 1}: ${line.trim()}`];
    });
});

if (problems.length > 0) {
    process.stderr.write(
        `Mutable module-level state without a "// per-worker:" or "// scenario-scoped:" justification:\n${problems.join('\n')}\n`,
    );
    process.exit(1);
}
process.stdout.write('Shared state: OK\n');
