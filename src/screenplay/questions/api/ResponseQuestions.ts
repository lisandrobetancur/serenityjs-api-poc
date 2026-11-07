import { Question, type QuestionAdapter } from '@serenity-js/core';
import { CallAnApi, LastResponse } from '@serenity-js/rest';
import Decimal from 'decimal.js';

import { CallTheApi } from '../../abilities/CallTheApi';
import { JsonPath } from './JsonPath';

/**
 * Questions about the last response. They never send requests; Tasks do.
 *
 * Naming: `The*` answers a value, `Get*`/`Count*` fetches an artifact, a predicate answers a condition.
 */
export class TheStatusCode {
    static was = (): QuestionAdapter<number> => LastResponse.status().describedAs('the status code');
}

export class TheResponseBody {
    static asString = (): QuestionAdapter<string> =>
        Question.about('the response body as text', async actor => {
            const body = await actor.answer(LastResponse.body<unknown>());
            return typeof body === 'string' ? body : JSON.stringify(body);
        });

    static of = <T>(): QuestionAdapter<T> => LastResponse.body<T>().describedAs('the response body');

    /** One node of the body mapped to `T`, e.g. `TheResponseBody.at<Category>('category')`. */
    static at = <T>(path: string): QuestionAdapter<T> =>
        Question.about<T>(
            path ? `the "${path}" of the response` : 'the response body',
            async actor => JsonPath.read(await actor.answer(LastResponse.body<unknown>()), path) as T,
        );
}

export class TheResponseList {
    static of = <T>(path = ''): QuestionAdapter<T[]> =>
        Question.about<T[]>(`the list at "${path || 'the response body'}"`, async actor => {
            const value = JsonPath.read(await actor.answer(LastResponse.body<unknown>()), path);
            if (!Array.isArray(value)) {
                throw new TypeError(
                    `Expected "${path || 'the response body'}" to be a list, but got ${JSON.stringify(value)}`,
                );
            }
            return value as T[];
        });

    static sizeOf = (path = ''): QuestionAdapter<number> =>
        Question.about<number>(
            `the number of entries in "${path || 'the response body'}"`,
            async actor => (await actor.answer(TheResponseList.of(path))).length,
        );

    /** The value of `field` in every entry of the list at `path`. */
    static valuesOf = <T = unknown>(path: string, field: string): QuestionAdapter<T[]> =>
        Question.about<T[]>(`the "${field}" of every entry in "${path || 'the response body'}"`, async actor =>
            (await actor.answer(TheResponseList.of<unknown>(path))).map(entry => JsonPath.read(entry, field) as T),
        );
}

/**
 * Typed reads by path from the last response body (`error.details.clientId`, `items.0.sku`).
 *
 * Use these when the path comes from Gherkin or configuration. When the path is known at compile time,
 * the Serenity/JS proxy reads better: `LastResponse.body<Product>().category.name`.
 */
export class TheJsonPath {
    static valueAt = <T = unknown>(path: string): QuestionAdapter<T> => TheResponseBody.at<T>(path);

    static stringAt = (path: string): QuestionAdapter<string> =>
        typed(path, 'text', value => (value === undefined || value === null ? value : String(value)) as string);

    /** `false` when the path is missing. */
    static booleanAt = (path: string): QuestionAdapter<boolean> =>
        typed(path, 'boolean', value => value === true || value === 'true');

    static integerAt = (path: string): QuestionAdapter<number> =>
        typed(path, 'integer', value => Number.parseInt(String(value), 10));

    static numberAt = (path: string): QuestionAdapter<number> => typed(path, 'number', value => Number(value));

    /**
     * Exact decimal (money, rates) as `Decimal`, `undefined` when missing.
     * `decimal.js` avoids binary floating-point errors such as `0.1 + 0.2 !== 0.3`.
     */
    static decimalAt = (path: string): QuestionAdapter<Decimal | undefined> =>
        typed(path, 'decimal', value =>
            value === undefined || value === null ? undefined : new Decimal(String(value)),
        );

    /** `Date`, `undefined` when missing. */
    static dateAt = (path: string): QuestionAdapter<Date | undefined> =>
        typed(path, 'date', value => (value === undefined || value === null ? undefined : new Date(String(value))));

    static listAt = <T = unknown>(path: string): QuestionAdapter<T[]> => TheResponseList.of<T>(path);

    static mapAt = (path: string): QuestionAdapter<Record<string, unknown>> =>
        typed(path, 'map', value => (value ?? {}) as Record<string, unknown>);
}

export class TheResponseHeader {
    /** The header value, or `undefined` when the response does not have it. Multi-value headers are joined with `; `. */
    static called = (name: string): QuestionAdapter<string | undefined> =>
        Question.about<string | undefined>(`the "${name}" header`, async actor => {
            const headers = await actor.answer(LastResponse.headers());
            const value = headers[name.toLowerCase()];
            if (value === undefined || value === null) {
                return undefined;
            }
            return Array.isArray(value) ? value.join('; ') : String(value);
        });

    /** The header value; fails with a clear message when it is missing. */
    static valueOf = (name: string): QuestionAdapter<string> =>
        Question.about<string>(`the "${name}" header`, async actor => {
            const value = await actor.answer(TheResponseHeader.called(name));
            if (value === undefined) {
                throw new Error(`The last response has no "${name}" header`);
            }
            return value;
        });

    /** The `name=value` pair of a cookie set by the last response, ready to send back in a `Cookie` header. */
    static cookie = (name: string): QuestionAdapter<string> =>
        Question.about<string>(`the "${name}" cookie`, async actor => {
            const headers = await actor.answer(LastResponse.headers());
            const setCookie = ([] as string[]).concat((headers['set-cookie'] as string[] | string | undefined) ?? []);
            const cookie = setCookie.find(entry => entry.startsWith(`${name}=`));
            if (!cookie) {
                throw new Error(`The last response did not set a "${name}" cookie`);
            }
            return cookie.split(';')[0]!;
        });
}

export class TheResponseTime {
    /** Milliseconds the last request took, measured by `CallTheApi`. */
    static was = (): QuestionAdapter<number> =>
        Question.about<number>('the response time in milliseconds', actor => {
            const ability = CallAnApi.as(actor);
            if (!(ability instanceof CallTheApi)) {
                throw new Error('TheResponseTime needs the CallTheApi ability, which measures response times');
            }
            return ability.lastResponseTime();
        });
}

function typed<T>(path: string, kind: string, convert: (value: unknown) => T): QuestionAdapter<T> {
    return Question.about<T>(`the ${kind} at "${path}"`, async actor =>
        convert(JsonPath.read(await actor.answer(LastResponse.body<unknown>()), path)),
    );
}
