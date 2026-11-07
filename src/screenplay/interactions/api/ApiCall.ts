import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import {
    type Answerable,
    type AnswersQuestions,
    type CollectsArtifacts,
    Interaction,
    Question,
    TakeNotes,
    type UsesAbilities,
} from '@serenity-js/core';
import { HTTPRequestResponse, Name } from '@serenity-js/core/model';
import { CallAnApi } from '@serenity-js/rest';
import { AxiosHeaders, type AxiosRequestConfig, type AxiosResponse, type Method } from 'axios';

import { EnvironmentConfig } from '../../../utils/config/EnvironmentConfig';
import { Headers } from '../../../utils/constants/Patterns';
import { logger } from '../../../utils/log/logger';
import { ReportBuffer } from '../../../utils/report/ReportBuffer';
import { Throttle, WaitUtils } from '../../../utils/wait/WaitUtils';
import { type Notes } from '../../notes/Notes';

type ApiActor = UsesAbilities & AnswersQuestions & CollectsArtifacts & { name: string };
type ParamValue = Answerable<string | number | boolean | undefined>;
type DefaultHeaders = (actor: ApiActor) => Promise<Record<string, string>> | Record<string, string>;

/**
 * Default headers sent with every non-external call: the tenant header derived from the scene notes.
 * Replace with `ApiCall.useDefaultHeaders(...)` when a project needs other defaults.
 */
// per-worker: configured once at start-up with ApiCall.useDefaultHeaders()
let defaultHeaders: DefaultHeaders = actor => {
    const notepad = sceneNotepadOf(actor);
    const headers: Record<string, string> = {};
    if (notepad?.has('tenantCode')) {
        headers[Headers.TENANT] = notepad.get('tenantCode');
    }
    return headers;
};

/**
 * One HTTP call, owning the whole protocol so Tasks never deal with it:
 *
 * - base URL resolution, `{placeholder}` path params and query params (always maps);
 * - default headers (tenant), authentication from the scene notes, content types, multipart and raw files;
 * - retries: 502 on any verb and 504 only on GET (3 times, 5 s apart), and 403 from the edge
 *   (2 times, 60 s × attempt of silence). A 403 from the application and any other status are never retried;
 * - sliding-window throttling of edge-rate-limited resources;
 * - every attempt is sent without reporting; only the final response becomes the "last response"
 *   (`LastResponse` keeps working) and a single REST Query is recorded, with the URL template
 *   (placeholders intact) and a `· call N of M` suffix when the call is part of a poll.
 *
 * Use the verbs: `ApiGet.to(Endpoints.PRODUCT).withPathParams({ productId: 1 })`.
 */
export class ApiCall extends Interaction {
    private body: unknown = undefined;
    private readonly headers: Record<string, Answerable<string>> = {};
    private queryParams: Record<string, ParamValue> = {};
    private pathParams: Record<string, ParamValue> = {};
    private sessionOwner: string | undefined;
    private authenticate = false;
    private contentType: string | undefined;
    private isExternal = false;
    private gatewayRetry = true;
    private followRedirects = true;
    private binaryResponse = false;
    private rawBody = false;

    static useDefaultHeaders(provider: DefaultHeaders): void {
        defaultHeaders = provider;
    }

    constructor(
        private readonly method: Method,
        private readonly resource: string,
    ) {
        super(`#actor sends ${method} ${resource}`);
    }

    withBody(body: unknown): this {
        this.body = body;
        return this;
    }

    /** Sends a string body exactly as given (no JSON serialisation), e.g. to test malformed payloads. */
    withRawBody(body: Answerable<string>, contentType: string): this {
        this.body = body;
        this.rawBody = true;
        this.contentType = contentType;
        return this;
    }

    /** Sends the access token of the acting persona, when it has one (guests send nothing). */
    authenticated(): this {
        this.authenticate = true;
        return this;
    }

    /** Sends the access token stored for another session owner, e.g. a token from an earlier login phase. */
    authenticatedWith(sessionOwner: string): this {
        this.authenticate = true;
        this.sessionOwner = sessionOwner;
        return this;
    }

    withQueryParams(params: Record<string, ParamValue>): this {
        this.queryParams = { ...this.queryParams, ...params };
        return this;
    }

    withPathParams(params: Record<string, ParamValue>): this {
        this.pathParams = { ...this.pathParams, ...params };
        return this;
    }

    withHeader(name: string, value: Answerable<string>): this {
        this.headers[name] = value;
        return this;
    }

    withHeaders(headers: Record<string, Answerable<string>>): this {
        Object.assign(this.headers, headers);
        return this;
    }

    withContentType(contentType: string): this {
        this.contentType = contentType;
        return this;
    }

    /** Multipart upload of a file from disk; switches the content type to `multipart/form-data`. */
    withFile(controlName: string, path: string, type = 'application/octet-stream'): this {
        return this.withFileContent(controlName, basename(path), type, readFileSync(path));
    }

    /** Multipart upload of in-memory content. */
    withFileContent(controlName: string, fileName: string, type: string, content: Uint8Array): this {
        const form = new FormData();
        form.append(controlName, new Blob([new Uint8Array(content)], { type }), fileName);
        this.body = form;
        this.contentType = undefined;
        return this;
    }

    /** Raw bytes as the body (e.g. a pre-signed URL upload); binary content type unless one is set explicitly. */
    withFileBody(path: string): this {
        this.body = readFileSync(path);
        this.contentType ??= 'application/octet-stream';
        return this;
    }

    /**
     * An absolute third-party URL: not resolved against the base URL, no tenant header,
     * and the URL is never re-encoded (a pre-signed S3 URL breaks if its query string is re-encoded).
     */
    external(): this {
        this.isExternal = true;
        return this;
    }

    /** Disables the 502/504 retries, e.g. for scenarios that measure response times. */
    withGatewayRetry(enabled: boolean): this {
        this.gatewayRetry = enabled;
        return this;
    }

    withoutFollowingRedirects(): this {
        this.followRedirects = false;
        return this;
    }

    /** Reads the response as bytes (photos, downloads). */
    expectingBinary(): this {
        this.binaryResponse = true;
        return this;
    }

    async performAs(actor: ApiActor): Promise<void> {
        const callAnApi = CallAnApi.as(actor);
        const config = await this.requestConfig(actor);
        const response = await this.sendWithRetries(actor, callAnApi, config);

        const recordedUrl = this.recordedUrl(callAnApi, config);
        const publication = (target: CollectsArtifacts, suffix: string) =>
            target.collect(
                toArtifact(recordedUrl, config, response),
                new Name(`${this.method.toUpperCase()} ${recordedUrl}${suffix}`),
            );

        if (ReportBuffer.isHoldingBack()) {
            ReportBuffer.holdBack(publication);
        } else {
            publication(actor, '');
        }
    }

    private async requestConfig(actor: ApiActor): Promise<AxiosRequestConfig> {
        const pathParams = await answerAll(actor, this.pathParams);
        const queryParams = await answerAll(actor, this.queryParams);
        const extraHeaders = await answerAll(actor, this.headers);

        const headers: Record<string, string> = {
            ...(this.isExternal ? {} : await defaultHeaders(actor)),
            ...(this.contentType ? { [Headers.CONTENT_TYPE]: this.contentType } : {}),
            ...stringValues(extraHeaders),
        };

        if (this.authenticate) {
            const token = accessTokenOf(actor, this.sessionOwner ?? actor.name);
            if (token) {
                headers[Headers.AUTHORIZATION] = `Bearer ${token}`;
            }
        }

        const url = this.isExternal ? this.resource : withQuery(fillPath(this.resource, pathParams), queryParams);
        const body = await resolveBody(actor, this.body);

        return {
            method: this.method,
            url,
            data: body,
            headers,
            ...(this.isExternal ? { baseURL: undefined } : {}),
            ...(this.rawBody ? { transformRequest: [(data: unknown) => data] } : {}),
            ...(this.followRedirects ? {} : { maxRedirects: 0 }),
            ...(this.binaryResponse ? { responseType: 'arraybuffer' as const } : {}),
        };
    }

    private async sendWithRetries(
        actor: ApiActor,
        callAnApi: CallAnApi,
        config: AxiosRequestConfig,
    ): Promise<AxiosResponse> {
        const http = EnvironmentConfig.http();
        const policy = retryPolicyOf(actor, http.gatewayRetryWaitSeconds, http.edgeRetrySilenceSeconds);
        let badGatewayRetries = 0;
        let gatewayTimeoutRetries = 0;
        let edgeRetries = 0;

        for (;;) {
            await this.throttle(http.throttledResources);
            logger.debug(
                {
                    method: config.method,
                    url: config.url,
                    headers: redact(config.headers),
                    body: describeBody(config.data),
                },
                'HTTP request',
            );

            const response = await callAnApi.request(config);
            logger.debug(
                { status: response.status, headers: response.headers, body: describeBody(response.data) },
                'HTTP response',
            );

            if (this.gatewayRetry && response.status === 502 && badGatewayRetries < http.gatewayRetries) {
                await WaitUtils.badGatewayRetry(++badGatewayRetries, policy.gatewayRetryWaitSeconds);
                continue;
            }
            if (
                this.gatewayRetry &&
                response.status === 504 &&
                this.method.toUpperCase() === 'GET' &&
                gatewayTimeoutRetries < http.gatewayRetries
            ) {
                await WaitUtils.gatewayTimeoutRetry(++gatewayTimeoutRetries, policy.gatewayRetryWaitSeconds);
                continue;
            }
            if (
                response.status === 403 &&
                isEdgeRejection(response, http.edgeErrorHeader) &&
                edgeRetries < http.edgeRetries
            ) {
                await WaitUtils.edgeRateLimitRetry(++edgeRetries, policy.edgeRetrySilenceSeconds);
                continue;
            }
            return response;
        }
    }

    private async throttle(
        resources: ReadonlyArray<{ resource: string; calls: number; perSeconds: number }>,
    ): Promise<void> {
        const rule = resources.find(candidate => candidate.resource === this.resource);
        if (rule) {
            await Throttle.acquire(rule.resource, rule.calls, rule.perSeconds);
        }
    }

    private recordedUrl(callAnApi: CallAnApi, config: AxiosRequestConfig): string {
        if (this.isExternal) {
            return this.resource;
        }
        const query = (config.url ?? '').includes('?') ? (config.url ?? '').slice((config.url ?? '').indexOf('?')) : '';
        return callAnApi.resolveUrl({ ...config, url: `${this.resource}${query}` });
    }
}

export const ApiGet = { to: (resource: string) => new ApiCall('GET', resource) };
export const ApiPost = { to: (resource: string) => new ApiCall('POST', resource) };
export const ApiPut = { to: (resource: string) => new ApiCall('PUT', resource) };
export const ApiPatch = { to: (resource: string) => new ApiCall('PATCH', resource) };
export const ApiDelete = { to: (resource: string) => new ApiCall('DELETE', resource) };
export const ApiHead = { to: (resource: string) => new ApiCall('HEAD', resource) };
export const ApiOptions = { to: (resource: string) => new ApiCall('OPTIONS', resource) };

// ---------------------------------------------------------------------------------------------------------------------

function sceneNotepadOf(actor: UsesAbilities) {
    try {
        return TakeNotes.as<TakeNotes<Notes>>(actor).notepad;
    } catch {
        return undefined;
    }
}

function accessTokenOf(actor: UsesAbilities, owner: string): string | undefined {
    const notepad = sceneNotepadOf(actor);
    return notepad?.has('sessions') ? notepad.get('sessions')[owner]?.accessToken : undefined;
}

function retryPolicyOf(actor: UsesAbilities, gatewayRetryWaitSeconds: number, edgeRetrySilenceSeconds: number) {
    const notepad = sceneNotepadOf(actor);
    return notepad?.has('retryPolicy')
        ? notepad.get('retryPolicy')
        : { gatewayRetryWaitSeconds, edgeRetrySilenceSeconds };
}

async function answerAll<T>(
    actor: AnswersQuestions,
    values: Record<string, Answerable<T>>,
): Promise<Record<string, T>> {
    const entries = await Promise.all(
        Object.entries(values).map(async ([key, value]) => [key, await actor.answer(value)] as const),
    );
    return Object.fromEntries(entries);
}

/** Plain objects may contain Answerables (notes, masked secrets) and are resolved recursively. */
async function resolveBody(actor: AnswersQuestions, body: unknown): Promise<unknown> {
    if (Question.isAQuestion(body) || isPromiseLike(body)) {
        return actor.answer(body);
    }
    const isPlainObject = typeof body === 'object' && body !== null && Object.getPrototypeOf(body) === Object.prototype;
    return isPlainObject ? actor.answer(Question.fromObject(body)) : body;
}

function isPromiseLike(value: unknown): boolean {
    return typeof (value as { then?: unknown } | null)?.then === 'function';
}

function stringValues(values: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(values)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
    );
}

function fillPath(template: string, params: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
        if (!(name in params)) {
            throw new Error(`Missing path parameter "${name}" for ${template}`);
        }
        return encodeURIComponent(String(params[name]));
    });
}

function withQuery(path: string, params: Record<string, unknown>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
            search.append(key, String(value));
        }
    }
    const query = search.toString();
    return query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path;
}

function isEdgeRejection(response: AxiosResponse, header: { name: string; contains: string }): boolean {
    const value = AxiosHeaders.from(response.headers as Record<string, string>).get(header.name);
    return typeof value === 'string' && value.includes(header.contains);
}

function redact(headers: unknown): unknown {
    const copy = { ...(headers as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
        if (/authorization|api-key|cookie/i.test(key)) {
            copy[key] = '[redacted]';
        }
    }
    return copy;
}

function describeBody(data: unknown): unknown {
    if (data instanceof FormData) {
        return `[multipart: ${[...(data as unknown as { keys(): Iterable<string> }).keys()].join(', ')}]`;
    }
    if (data instanceof ArrayBuffer || Buffer.isBuffer(data)) {
        return `[${(data as ArrayBuffer).byteLength} bytes]`;
    }
    return data;
}

function toArtifact(url: string, config: AxiosRequestConfig, response: AxiosResponse): HTTPRequestResponse {
    return HTTPRequestResponse.fromJSON({
        request: {
            method: String(config.method).toUpperCase(),
            url,
            headers: stringValues(redact(config.headers) as Record<string, unknown>),
            data: describeBody(config.data) as never,
        },
        response: {
            status: response.status,
            headers: AxiosHeaders.from(response.headers as Record<string, string>).toJSON(false) as Record<
                string,
                string
            >,
            data: describeBody(response.data) as never,
        },
    });
}
