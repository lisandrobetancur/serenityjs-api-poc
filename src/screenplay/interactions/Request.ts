import { Answerable, Question } from '@serenity-js/core';
import {
    DeleteRequest,
    GetRequest,
    HeadRequest,
    OptionsRequest,
    PatchRequest,
    PostRequest,
    PutRequest,
    Send,
} from '@serenity-js/rest';

/**
 * Axios request configuration where every property can be an Answerable,
 * e.g. a header value read from the actor's notes.
 */
export type RequestConfig = Parameters<GetRequest['using']>[0];

/**
 * Thin, low-level Interactions used by the Tasks. Steps should not call these directly.
 */
export class Request {
    static get = (url: Answerable<string>, config: RequestConfig = {}) =>
        Send.a(GetRequest.to(url).using(config));

    static head = (url: Answerable<string>, config: RequestConfig = {}) =>
        Send.a(HeadRequest.to(url).using(config));

    static options = (url: Answerable<string>, config: RequestConfig = {}) =>
        Send.a(OptionsRequest.to(url).using(config));

    static delete = (url: Answerable<string>, config: RequestConfig = {}) =>
        Send.a(DeleteRequest.to(url).using(config));

    static post = (url: Answerable<string>, body?: unknown, config: RequestConfig = {}) =>
        Send.a(PostRequest.to(url).with(answerableBody(body)).using(config));

    static put = (url: Answerable<string>, body?: unknown, config: RequestConfig = {}) =>
        Send.a(PutRequest.to(url).with(answerableBody(body)).using(config));

    static patch = (url: Answerable<string>, body?: unknown, config: RequestConfig = {}) =>
        Send.a(PatchRequest.to(url).with(answerableBody(body)).using(config));
}

/**
 * Plain-object bodies may contain Answerables (e.g. a token from the actor's notes, a masked password),
 * so they are resolved recursively. Other bodies (strings, FormData, Questions) are sent as they are.
 */
function answerableBody(body: unknown): Answerable<any> {
    const isPlainObject = typeof body === 'object' && body !== null && Object.getPrototypeOf(body) === Object.prototype;
    return isPlainObject && ! Question.isAQuestion(body)
        ? Question.fromObject(body as object)
        : body as Answerable<any>;
}

/**
 * Builds a query string from the defined values only, e.g. `query({ limit: 2, q: undefined })` → `?limit=2`.
 */
export function query(params: Record<string, string | number | boolean | undefined>): string {
    const search = new URLSearchParams();
    for (const [ key, value ] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
            search.append(key, String(value));
        }
    }
    const result = search.toString();
    return result ? `?${ result }` : '';
}
