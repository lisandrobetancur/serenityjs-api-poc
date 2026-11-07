import http from 'node:http';
import https from 'node:https';
import type { Socket } from 'node:net';

import { TestCompromisedError } from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';
import axios, {
    AxiosHeaders,
    type AxiosRequestConfig,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from 'axios';

import { EnvironmentConfig } from '../../utils/config/EnvironmentConfig';
import { logger } from '../../utils/log/logger';

const STARTED_AT = Symbol('startedAt');

/** Status recorded when the API did not answer in time, so the scenario fails on its status gate. */
export const NO_RESPONSE_STATUS = 0;

/**
 * `CallAnApi` with the transport rules of the Java suite:
 *
 * - 30 s to connect and 120 s without receiving bytes (configurable per environment).
 * - A timeout or connection failure becomes a response with **status 0** instead of an exception,
 *   so the scenario fails on its status gate and the run summary recognises it.
 * - Measures the response time of every request (read by `TheResponseTime`).
 *
 * Because it extends `CallAnApi`, `CallAnApi.as(actor)` and `LastResponse` keep working.
 */
export class CallTheApi extends CallAnApi {
    static atBaseUrl(baseURL: string = EnvironmentConfig.apiBaseUrl()): CallTheApi {
        const { connectTimeoutSeconds, idleTimeoutSeconds } = EnvironmentConfig.http();
        const instance = axios.create({
            baseURL,
            headers: { Accept: 'application/json' },
            // A request that receives no bytes for this long is aborted by the agents below;
            // the overall axios timeout is a safety net slightly above it.
            timeout: (connectTimeoutSeconds + idleTimeoutSeconds) * 1000,
            httpAgent: new TimeoutAgent(http.Agent, connectTimeoutSeconds, idleTimeoutSeconds),
            httpsAgent: new TimeoutAgent(https.Agent, connectTimeoutSeconds, idleTimeoutSeconds),
            // Never throw on a status code; the scenario asserts on it.
            validateStatus: () => true,
        });
        instance.interceptors.request.use(config => {
            (config as InternalAxiosRequestConfig & { [STARTED_AT]?: number })[STARTED_AT] = performance.now();
            return config;
        });
        instance.interceptors.response.use(recordElapsedTime);
        return new CallTheApi(instance);
    }

    override async request(config: AxiosRequestConfig): Promise<AxiosResponse> {
        try {
            return await super.request(config);
        } catch (error) {
            if (error instanceof TestCompromisedError) {
                logger.error(
                    { url: config.url, method: config.method, cause: String(error.cause ?? error) },
                    'No response from the API (recorded as status 0)',
                );
                const response = noResponse(config, error);
                (this as unknown as { lastResponse: AxiosResponse }).lastResponse = response;
                return response;
            }
            throw error;
        }
    }

    /** Milliseconds between sending the last request and receiving its response. */
    lastResponseTime(): number {
        return this.mapLastResponse(response => (response as { elapsedMs?: number }).elapsedMs ?? Number.NaN);
    }
}

/**
 * Stores the elapsed time on the response as soon as it arrives.
 */
function recordElapsedTime(response: AxiosResponse): AxiosResponse {
    const startedAt = (response.config as { [STARTED_AT]?: number })[STARTED_AT];
    if (startedAt !== undefined) {
        (response as { elapsedMs?: number }).elapsedMs = Math.round(performance.now() - startedAt);
    }
    return response;
}

function noResponse(config: AxiosRequestConfig, error: Error): AxiosResponse {
    return {
        status: NO_RESPONSE_STATUS,
        statusText: 'No response',
        headers: {},
        data: { detail: error.message },
        config: {
            ...config,
            headers: AxiosHeaders.from((config.headers ?? {}) as Record<string, string>),
        } as InternalAxiosRequestConfig,
        request: undefined,
    };
}

/**
 * An HTTP(S) agent with two timeouts: one until the socket connects, and an idle timeout once connected.
 */
class TimeoutAgent {
    constructor(
        AgentType: typeof http.Agent | typeof https.Agent,
        connectTimeoutSeconds: number,
        idleTimeoutSeconds: number,
    ) {
        // No keep-alive: a pooled socket that the server closed during a retry wait fails with ECONNRESET.
        const agent = new AgentType({ keepAlive: false });
        const createConnection = (
            agent as unknown as { createConnection: (...args: unknown[]) => Socket }
        ).createConnection.bind(agent);

        (agent as unknown as { createConnection: (...args: unknown[]) => Socket }).createConnection = (
            ...args: unknown[]
        ) => {
            const socket = createConnection(...args);
            socket.setTimeout(connectTimeoutSeconds * 1000, () =>
                socket.destroy(new Error(`Connect timeout after ${connectTimeoutSeconds} s`)),
            );
            socket.once('connect', () => {
                socket.setTimeout(idleTimeoutSeconds * 1000, () =>
                    socket.destroy(new Error(`No data received for ${idleTimeoutSeconds} s`)),
                );
            });
            return socket;
        };

        return agent;
    }
}
