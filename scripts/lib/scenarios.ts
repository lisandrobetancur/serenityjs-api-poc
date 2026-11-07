import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { AstBuilder, compile, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin';
import { IdGenerator, type Pickle } from '@cucumber/messages';
import parseTagExpression from '@cucumber/tag-expressions';

/** Every pickle (scenario or outline example) of the suite, with its feature file. */
export function allPickles(featuresDir = 'features'): Array<Pickle & { featureName: string }> {
    const newId = IdGenerator.uuid();
    return featureFiles(featuresDir).flatMap(uri => {
        const document = new Parser(new AstBuilder(newId), new GherkinClassicTokenMatcher()).parse(
            readFileSync(uri, 'utf8'),
        );
        const featureName = document.feature?.name ?? uri;
        return compile(document, uri, newId).map(pickle => ({ ...pickle, featureName }));
    });
}

/** Pickles selected by a Cucumber tag expression (all of them when the expression is empty). */
export function selectedBy(tagExpression: string, pickles = allPickles()): typeof pickles {
    if (!tagExpression.trim()) {
        return pickles;
    }
    const expression = parseTagExpression(tagExpression);
    return pickles.filter(pickle => expression.evaluate(pickle.tags.map(tag => tag.name)));
}

export function featureFiles(dir: string): string[] {
    return readdirSync(dir)
        .flatMap(entry => {
            const path = join(dir, entry);
            return statSync(path).isDirectory() ? featureFiles(path) : path.endsWith('.feature') ? [path] : [];
        })
        .sort();
}
