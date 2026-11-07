import { Endpoints } from '../../../utils/constants/Endpoints';
import { Headers } from '../../../utils/constants/Patterns';
import {
    type ApiCall,
    ApiDelete,
    ApiGet,
    ApiHead,
    ApiOptions,
    ApiPatch,
    ApiPost,
    ApiPut,
} from '../../interactions/api/ApiCall';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const verb = (method: HttpMethod, resource: string): ApiCall => {
    switch (method) {
        case 'GET':
            return ApiGet.to(resource);
        case 'POST':
            return ApiPost.to(resource);
        case 'PUT':
            return ApiPut.to(resource);
        case 'PATCH':
            return ApiPatch.to(resource);
        case 'DELETE':
            return ApiDelete.to(resource);
    }
};

/**
 * Calls to the testing-support and generic HTTP-behaviour endpoints of the API.
 */
export const Platform = {
    resetToSeedData: () => ApiPost.to(Endpoints.RESET),

    switchMaintenance: (active: boolean, retryAfterSeconds?: number) =>
        ApiPost.to(Endpoints.MAINTENANCE).withBody(active ? { active, retry_after: retryAfterSeconds } : { active }),

    health: (method: 'GET' | 'HEAD' = 'GET') =>
        method === 'GET' ? ApiGet.to(Endpoints.HEALTH) : ApiHead.to(Endpoints.HEALTH),

    echo: (
        method: HttpMethod,
        options: { body?: unknown; headers?: Record<string, string>; query?: Record<string, string> } = {},
    ) =>
        verb(method, Endpoints.ECHO)
            .withBody(options.body)
            .withHeaders(options.headers ?? {})
            .withQueryParams(options.query ?? {}),

    call: (method: HttpMethod, resource: string, body?: unknown) => verb(method, resource).withBody(body),

    callWithoutFollowingRedirects: (method: HttpMethod, resource: string) =>
        verb(method, resource)
            .withBody(method === 'GET' || method === 'DELETE' ? undefined : { probe: true })
            .withoutFollowingRedirects(),

    sendRaw: (method: HttpMethod, resource: string, body: string, contentType: string) =>
        verb(method, resource).authenticated().withRawBody(body, contentType),

    allowedMethodsOf: (resource: string) => ApiOptions.to(resource),

    chaos: (status: number, delayMs?: number) =>
        ApiGet.to(Endpoints.CHAOS).withQueryParams({ status, delay: delayMs || undefined }),

    unhandledException: () => ApiGet.to(Endpoints.CHAOS_EXCEPTION),

    rateLimited: (clientId: string) => ApiGet.to(Endpoints.RATE_LIMITED).withHeader(Headers.CLIENT_ID, clientId),

    savePreferences: (preferences: { language?: string; theme?: string }) =>
        ApiPut.to(Endpoints.PREFERENCES).withBody(preferences),

    readPreferences: (cookies?: string) =>
        ApiGet.to(Endpoints.PREFERENCES).withHeaders(cookies ? { Cookie: cookies } : {}),

    sendContactForm: (fields: Record<string, string>) =>
        ApiPost.to(Endpoints.CONTACT).withRawBody(
            new URLSearchParams(fields).toString(),
            'application/x-www-form-urlencoded',
        ),

    withRequestId: (resource: string, requestId: string) =>
        ApiGet.to(resource).withHeader(Headers.REQUEST_ID, requestId),

    /** An absolute URL outside the API under test (e.g. the local fake API used by the retry demos). */
    external: (method: HttpMethod, url: string) => verb(method, url).external(),
};
