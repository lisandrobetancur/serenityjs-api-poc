import { Ensure, equals } from '@serenity-js/assertions';
import { Task } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import { query, Request, RequestConfig } from '../interactions/Request';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const send = (method: HttpMethod, url: string, body?: unknown, config: RequestConfig = {}) => {
    switch (method) {
        case 'GET':    return Request.get(url, config);
        case 'DELETE': return Request.delete(url, config);
        case 'POST':   return Request.post(url, body, config);
        case 'PUT':    return Request.put(url, body, config);
        case 'PATCH':  return Request.patch(url, body, config);
    }
};

/**
 * Tasks for the testing-support and generic HTTP-behaviour endpoints.
 */
export class Platform {
    static resetToSeedData = () =>
        Task.where(`#actor resets the API to its seed data`,
            Request.post('/__reset'),
            Ensure.that(LastResponse.status(), equals(200)),
        );

    static enableMaintenance = (retryAfterSeconds: number) =>
        Task.where(`#actor switches maintenance mode on`,
            Request.post('/__maintenance', { active: true, retry_after: retryAfterSeconds }),
        );

    static disableMaintenance = () =>
        Task.where(`#actor switches maintenance mode off`,
            Request.post('/__maintenance', { active: false }),
        );

    static checkHealth = (method: 'GET' | 'HEAD' = 'GET') =>
        Task.where(`#actor checks the health of the API`,
            method === 'GET' ? Request.get('/health') : Request.head('/health'),
        );

    static echo = (method: HttpMethod, options: { body?: unknown, headers?: Record<string, string>, query?: Record<string, string> } = {}) =>
        Task.where(`#actor sends a ${ method } request to the echo endpoint`,
            send(method, `/echo${ query(options.query ?? {}) }`, options.body, { headers: options.headers ?? {} }),
        );

    static callWithoutFollowingRedirects = (method: HttpMethod, url: string) =>
        Task.where(`#actor sends ${ method } ${ url } without following redirects`,
            send(method, url, method === 'GET' || method === 'DELETE' ? undefined : { probe: true }, { maxRedirects: 0 }),
        );

    static callFollowingRedirects = (method: HttpMethod, url: string, body?: unknown) =>
        Task.where(`#actor sends ${ method } ${ url } following redirects`,
            send(method, url, body),
        );

    static chaos = (status: number, delayMs = 0) =>
        Task.where(`#actor asks the chaos endpoint for a ${ status } after ${ delayMs } ms`,
            Request.get(`/chaos${ query({ status, delay: delayMs || undefined }) }`),
        );

    static triggerUnhandledException = () =>
        Task.where(`#actor triggers an unhandled exception`,
            Request.get('/chaos/exception'),
        );

    static callRateLimitedEndpoint = (clientId: string, times = 1) =>
        Task.where(`#actor calls the rate-limited endpoint ${ times } time(s) as client "${ clientId }"`,
            ...Array.from({ length: times }, () =>
                Request.get('/rate-limited', { headers: { 'X-Client-Id': clientId } })),
        );

    static savePreferences = (preferences: { language?: string, theme?: string }) =>
        Task.where(`#actor saves the preferences ${ JSON.stringify(preferences) }`,
            Request.put('/preferences', preferences),
        );

    static readPreferences = (cookies?: string) =>
        Task.where(`#actor reads the preferences`,
            Request.get('/preferences', { headers: cookies ? { Cookie: cookies } : {} }),
        );

    static sendContactForm = (fields: Record<string, string>) =>
        Task.where(`#actor sends the contact form`,
            Request.post('/contact', new URLSearchParams(fields).toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }),
        );

    static askForAllowedMethods = (url: string) =>
        Task.where(`#actor asks which methods ${ url } allows`,
            Request.options(url),
        );

    static callWithRequestId = (url: string, requestId: string) =>
        Task.where(`#actor calls ${ url } with the request id "${ requestId }"`,
            Request.get(url, { headers: { 'X-Request-ID': requestId } }),
        );

    static sendRaw = (method: HttpMethod, url: string, body: string, contentType: string) =>
        Task.where(`#actor sends a raw ${ contentType } body to ${ method } ${ url }`,
            send(method, url, body, { headers: { 'Content-Type': contentType }, transformRequest: [ (data: unknown) => data ] }),
        );

    static call = (method: HttpMethod, url: string) =>
        Task.where(`#actor sends ${ method } ${ url }`,
            send(method, url),
        );
}
