import { Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

/**
 * Reads a value from the last response body using a dot-separated path,
 * e.g. `sku`, `category.name`, `items.0.id` or `detail.0.loc`.
 * An empty path returns the whole body.
 */
export class ResponseField {
    static at = <T = unknown>(path: string) =>
        Question.about<T>(path ? `the "${ path }" field of the last response` : 'the last response body', async actor => {
            const body = await actor.answer(LastResponse.body<unknown>());
            return valueAt(body, path) as T;
        });

    static lengthOf = (path: string) =>
        Question.about<number>(`the number of entries in "${ path || 'the response' }"`, async actor => {
            const value = valueAt(await actor.answer(LastResponse.body<unknown>()), path);
            if (! Array.isArray(value)) {
                throw new TypeError(`Expected "${ path }" to be an array, but got ${ JSON.stringify(value) }`);
            }
            return value.length;
        });

    static valuesOf = <T = unknown>(arrayPath: string, field: string) =>
        Question.about<T[]>(`the "${ field }" of every entry in "${ arrayPath || 'the response' }"`, async actor => {
            const list = valueAt(await actor.answer(LastResponse.body<unknown>()), arrayPath);
            if (! Array.isArray(list)) {
                throw new TypeError(`Expected "${ arrayPath }" to be an array, but got ${ JSON.stringify(list) }`);
            }
            return list.map(item => valueAt(item, field) as T);
        });
}

export function valueAt(source: unknown, path: string): unknown {
    if (! path) {
        return source;
    }
    return path.split('.').reduce<unknown>((current, key) => {
        if (current === null || current === undefined) {
            return undefined;
        }
        return (current as Record<string, unknown>)[key];
    }, source);
}
