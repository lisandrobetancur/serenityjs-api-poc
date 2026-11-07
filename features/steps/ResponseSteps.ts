import { contain, Ensure, equals, includes, isPresent, isTrue, matches, not } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';

import { TheJsonPath, TheResponseHeader, TheResponseList, TheStatusCode } from '../../src/screenplay';
import { step } from './step';

/**
 * Verifications of the last response. The status gate is its own Step; body checks are grouped in one Step
 * with a labelled `Ensure` per field, like the single grouped `should` of the Java suite.
 */
export const ResponseSteps = {
    statusIs: (actor: Actor, status: number) =>
        step(actor, `#actor gets a ${status} response`, Ensure.that(TheStatusCode.was(), equals(status))),

    hasHeader: (actor: Actor, name: string) =>
        step(actor, `#actor sees the "${name}" header`, Ensure.that(TheResponseHeader.called(name), isPresent())),

    lacksHeader: (actor: Actor, name: string) =>
        step(
            actor,
            `#actor does not see the "${name}" header`,
            Ensure.that(TheResponseHeader.called(name), not(isPresent())),
        ),

    headerIs: (actor: Actor, name: string, value: string) =>
        step(
            actor,
            `#actor sees the "${name}" header set to "${value}"`,
            Ensure.that(TheResponseHeader.valueOf(name).describedAs(`${name}:`), equals(value)),
        ),

    headerContains: (actor: Actor, name: string, value: string) =>
        step(
            actor,
            `#actor sees the "${name}" header containing "${value}"`,
            Ensure.that(TheResponseHeader.valueOf(name).describedAs(`${name}:`), includes(value)),
        ),

    headerMatches: (actor: Actor, name: string, pattern: string) =>
        step(
            actor,
            `#actor sees the "${name}" header matching ${pattern}`,
            Ensure.that(TheResponseHeader.valueOf(name).describedAs(`${name}:`), matches(new RegExp(pattern))),
        ),

    fieldIs: (actor: Actor, path: string, expected: unknown) =>
        step(
            actor,
            `#actor sees "${path || 'the body'}" equal to ${JSON.stringify(expected)}`,
            Ensure.that(TheJsonPath.valueAt(path).describedAs(`${path || 'body'}:`), equals(expected)),
        ),

    fieldContains: (actor: Actor, path: string, expected: string) =>
        step(
            actor,
            `#actor sees "${path}" containing "${expected}"`,
            Ensure.that(TheJsonPath.stringAt(path).describedAs(`${path}:`), includes(expected)),
        ),

    fieldIncludes: (actor: Actor, path: string, expected: unknown) =>
        step(
            actor,
            `#actor sees "${path}" including ${JSON.stringify(expected)}`,
            Ensure.that(TheJsonPath.listAt(path).describedAs(`${path}:`), contain(expected)),
        ),

    fieldIsPresent: (actor: Actor, path: string) =>
        step(
            actor,
            `#actor sees "${path}" in the response`,
            Ensure.that(TheJsonPath.valueAt(path).describedAs(`${path}:`), isPresent()),
        ),

    /** One Step, one labelled Ensure per field. */
    bodyContains: (actor: Actor, fields: Array<[path: string, expected: unknown]>) =>
        step(
            actor,
            `#actor sees ${fields.map(([path]) => path).join(', ')} in the response`,
            ...fields.map(([path, expected]) =>
                Ensure.that(TheJsonPath.valueAt(path).describedAs(`${path}:`), equals(expected)),
            ),
        ),

    listSizeIs: (actor: Actor, path: string, count: number) =>
        step(
            actor,
            `#actor sees ${count} entries in "${path || 'the body'}"`,
            Ensure.that(TheResponseList.sizeOf(path), equals(count)),
        ),

    everyEntryHas: (actor: Actor, path: string, field: string, expected: unknown) =>
        step(
            actor,
            `#actor sees "${field}" equal to ${JSON.stringify(expected)} in every entry of "${path || 'the body'}"`,
            Ensure.that(
                TheResponseList.valuesOf(path, field).as(values =>
                    values.every(value => JSON.stringify(value) === JSON.stringify(expected)),
                ),
                isTrue(),
            ),
        ),

    valuesAre: (actor: Actor, path: string, field: string, expected: unknown[]) =>
        step(
            actor,
            `#actor sees the "${field}" of the entries in "${path || 'the body'}"`,
            Ensure.that(TheResponseList.valuesOf(path, field).describedAs(`${field}:`), equals(expected)),
        ),

    sortedBy: (actor: Actor, path: string, field: string, descending: boolean) =>
        step(
            actor,
            `#actor sees "${path || 'the body'}" sorted by "${field}" in ${descending ? 'descending' : 'ascending'} order`,
            Ensure.that(
                TheResponseList.valuesOf<number | string>(path, field).as(values => isSorted(values, descending)),
                isTrue(),
            ),
        ),

    errorSays: (actor: Actor, message: string) =>
        step(
            actor,
            `#actor sees the error "${message}"`,
            Ensure.that(TheJsonPath.stringAt('detail').describedAs('detail:'), includes(message)),
        ),

    validationErrorFor: (actor: Actor, field: string) =>
        step(
            actor,
            `#actor sees a validation error for "${field}"`,
            Ensure.that(
                TheJsonPath.listAt<{ loc: Array<string | number> }>('detail')
                    .as(errors => errors.map(error => error.loc.join('.')))
                    .describedAs('detail.loc:'),
                contain(`body.${field}`),
            ),
        ),
};

function isSorted<T extends number | string>(values: T[], descending: boolean): boolean {
    return values.every(
        (value, index) => index === 0 || (descending ? values[index - 1]! >= value : values[index - 1]! <= value),
    );
}
