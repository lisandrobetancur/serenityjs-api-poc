import { readFileSync } from 'node:fs';

import { allPickles } from './lib/scenarios';

/**
 * Validates `test-data/scenario-users.json`:
 * - every key is the unique tag of an existing scenario;
 * - no account (email) is assigned to scenarios of two different features, so parallel features never share one.
 */
const users = JSON.parse(readFileSync('test-data/scenario-users.json', 'utf8')) as Record<
    string,
    Record<string, string>
>;
const pickles = allPickles();
const featureOfTag = new Map<string, string>();
for (const pickle of pickles) {
    for (const tag of pickle.tags) {
        if (/_\d{2,}$/.test(tag.name)) {
            featureOfTag.set(tag.name, pickle.uri);
        }
    }
}

const problems: string[] = [];
const featuresByEmail = new Map<string, Set<string>>();
for (const [tag, account] of Object.entries(users)) {
    const feature = featureOfTag.get(tag);
    if (!feature) {
        problems.push(`${tag} is not the id tag of any scenario`);
        continue;
    }
    const email = account.email ?? '';
    featuresByEmail.set(email, new Set([...(featuresByEmail.get(email) ?? []), feature]));
}
for (const [email, features] of featuresByEmail) {
    if (features.size > 1) {
        problems.push(`${email} is shared by several features: ${[...features].join(', ')}`);
    }
}

if (problems.length > 0) {
    process.stderr.write(`test-data/scenario-users.json:\n${problems.join('\n')}\n`);
    process.exit(1);
}
process.stdout.write('Test data: OK\n');
