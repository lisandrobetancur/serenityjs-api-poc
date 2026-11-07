import { readFileSync } from 'node:fs';

import { allPickles, selectedBy } from './scenarios';

export interface Shard {
    resources: string[];
    tagExpression: string;
    scenarios: number;
}

/**
 * Splits the selected scenarios into shards for parallel runs.
 *
 * Every resource in `parallel-resources.json` (and every unlisted feature tag, which is its own resource) goes to
 * exactly one shard, so two scenarios that need the same resource never run at the same time. Shards are balanced
 * by scenario count (largest group first into the emptiest shard).
 *
 * Shards replace Cucumber.js's `--parallel`: in that mode the Serenity/JS formatter runs in a different process
 * from the workers, so the reporter receives activity events for scenes it never saw start.
 */
export function planShards(userTags: string, maxShards: number, resourcesFile = 'parallel-resources.json'): Shard[] {
    const { resources } = JSON.parse(readFileSync(resourcesFile, 'utf8')) as { resources: Record<string, string> };
    const pickles = selectedBy(userTags, allPickles());

    const groups = new Map<string, { featureTags: Set<string>; scenarios: number }>();
    for (const pickle of pickles) {
        const names = pickle.tags.map(tag => tag.name);
        const featureTag = names.find(name => name in resources) ?? names[0] ?? '@untagged';
        const resource = resources[featureTag] ?? featureTag;
        const group = groups.get(resource) ?? { featureTags: new Set<string>(), scenarios: 0 };
        group.featureTags.add(featureTag);
        group.scenarios++;
        groups.set(resource, group);
    }

    const shards: Array<{ resources: string[]; featureTags: string[]; scenarios: number }> = Array.from(
        { length: Math.max(1, Math.min(maxShards, groups.size)) },
        () => ({ resources: [], featureTags: [], scenarios: 0 }),
    );
    for (const [resource, group] of [...groups].sort((a, b) => b[1].scenarios - a[1].scenarios)) {
        const target = shards.reduce((emptiest, shard) => (shard.scenarios < emptiest.scenarios ? shard : emptiest));
        target.resources.push(resource);
        target.featureTags.push(...group.featureTags);
        target.scenarios += group.scenarios;
    }

    return shards
        .filter(shard => shard.scenarios > 0)
        .map(shard => {
            const own = `(${shard.featureTags.join(' or ')})`;
            return {
                resources: shard.resources,
                scenarios: shard.scenarios,
                tagExpression: userTags ? `(${userTags}) and ${own}` : own,
            };
        });
}
