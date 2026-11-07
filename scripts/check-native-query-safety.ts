import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static guard for native SQL: fails when a statement is built by concatenation or by template-literal
 * interpolation instead of named parameters (`:name`).
 *
 * An interpolation inside SQL is only accepted when it is an identifier checked at runtime — `${ identifier(...) }` —
 * or when the line ends with `// sql-safe: <reason>` (for lists of already-checked identifiers).
 *
 *   npx tsx scripts/check-native-query-safety.ts              checks src/ and features/
 *   npx tsx scripts/check-native-query-safety.ts --self-test  proves the check rejects an unsafe statement
 */
const SQL = /\b(SELECT\s.+\sFROM|INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM)\b/is;

export function findUnsafeSql(source: string): string[] {
    const problems: string[] = [];
    const lines = source.split('\n');

    // Template literals that contain SQL and interpolate something other than identifier(...)
    for (const match of source.matchAll(/`([^`]*)`/g)) {
        const literal = match[1]!;
        if (!SQL.test(literal)) {
            continue;
        }
        const startLine = source.slice(0, match.index).split('\n').length;
        for (const interpolation of literal.matchAll(/\$\{([^}]*)\}/g)) {
            const lineNumber = startLine + literal.slice(0, interpolation.index).split('\n').length - 1;
            const expression = interpolation[1]!.trim();
            const line = lines[lineNumber - 1] ?? '';
            if (!expression.startsWith('identifier(') && !/\/\/\s*sql-safe:/.test(line)) {
                problems.push(`line ${lineNumber}: interpolation \${ ${expression} } inside SQL`);
            }
        }
    }

    // String concatenation with SQL
    lines.forEach((line, index) => {
        if (
            /(['"])[^'"]*\b(SELECT|INSERT INTO|UPDATE|DELETE FROM|WHERE)\b[^'"]*\1\s*\+\s*\w/i.test(line) &&
            !/\/\/\s*sql-safe:/.test(line)
        ) {
            problems.push(`line ${index + 1}: SQL built by string concatenation`);
        }
    });
    return problems;
}

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap(entry => {
        const path = join(dir, entry);
        return statSync(path).isDirectory()
            ? sourceFiles(path)
            : /\.ts$/.test(path) && !path.endsWith('.d.ts')
              ? [path]
              : [];
    });
}

if (process.argv.includes('--self-test')) {
    const unsafe =
        "const sql = `SELECT * FROM public.orders WHERE reference = '${ reference }'`;\n" +
        "const other = 'SELECT * FROM public.orders WHERE id = ' + id;\n";
    const safe = 'const sql = `SELECT * FROM ${ identifier(table) } WHERE id = :id`;\n';
    const unsafeProblems = findUnsafeSql(unsafe);
    const safeProblems = findUnsafeSql(safe);
    if (unsafeProblems.length !== 2 || safeProblems.length !== 0) {
        process.stderr.write(
            `Self-test failed: unsafe sample → ${JSON.stringify(unsafeProblems)}, safe sample → ${JSON.stringify(safeProblems)}\n`,
        );
        process.exit(1);
    }
    process.stdout.write(
        `Self-test passed: the unsafe sample was rejected (${unsafeProblems.join('; ')}) and the safe one accepted.\n`,
    );
    process.exit(0);
}

const problems = ['src', 'features']
    .flatMap(sourceFiles)
    .flatMap(file => findUnsafeSql(readFileSync(file, 'utf8')).map(problem => `${file} ${problem}`));

if (problems.length > 0) {
    process.stderr.write(`Unsafe native SQL found; use named parameters (:name):\n${problems.join('\n')}\n`);
    process.exit(1);
}
process.stdout.write('Native query safety: OK\n');
