import { Ensure, equals } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';

import { type HttpMethod, Platform, TheStatusCode } from '../../src/screenplay';
import { step } from './step';

export const PlatformSteps = {
    health: (actor: Actor, method: 'GET' | 'HEAD' = 'GET') =>
        step(actor, `#actor checks the health of the API with ${method}`, Platform.health(method)),

    switchMaintenance: (actor: Actor, active: boolean, retryAfterSeconds?: number) =>
        step(
            actor,
            `#actor switches maintenance mode ${active ? 'on' : 'off'}`,
            Platform.switchMaintenance(active, retryAfterSeconds),
            Ensure.that(TheStatusCode.was(), equals(200)),
        ),

    withRequestId: (actor: Actor, resource: string, requestId: string) =>
        step(
            actor,
            `#actor calls ${resource} with the request id "${requestId}"`,
            Platform.withRequestId(resource, requestId),
        ),

    echo: (
        actor: Actor,
        method: HttpMethod,
        options: { body?: unknown; headers?: Record<string, string>; query?: Record<string, string> } = {},
    ) => step(actor, `#actor sends a ${method} request to the echo endpoint`, Platform.echo(method, options)),

    callWithoutFollowingRedirects: (actor: Actor, method: HttpMethod, resource: string) =>
        step(
            actor,
            `#actor sends ${method} ${resource} without following redirects`,
            Platform.callWithoutFollowingRedirects(method, resource),
        ),

    call: (actor: Actor, method: HttpMethod, resource: string, body?: unknown) =>
        step(actor, `#actor sends ${method} ${resource}`, Platform.call(method, resource, body)),

    allowedMethods: (actor: Actor, resource: string) =>
        step(actor, `#actor asks which methods ${resource} allows`, Platform.allowedMethodsOf(resource)),

    sendRaw: (actor: Actor, method: HttpMethod, resource: string, body: string, contentType: string) =>
        step(
            actor,
            `#actor sends a raw ${contentType} body to ${method} ${resource}`,
            Platform.sendRaw(method, resource, body, contentType),
        ),

    chaos: (actor: Actor, status: number, delayMs?: number) =>
        step(
            actor,
            `#actor asks the chaos endpoint for a ${status}${delayMs ? ` after ${delayMs} ms` : ''}`,
            Platform.chaos(status, delayMs),
        ),

    unhandledException: (actor: Actor) =>
        step(actor, '#actor triggers an unhandled exception', Platform.unhandledException()),

    rateLimited: (actor: Actor, clientId: string, times: number) =>
        step(
            actor,
            `#actor calls the rate-limited endpoint ${times} time(s) as client "${clientId}"`,
            ...Array.from({ length: times }, () => Platform.rateLimited(clientId)),
        ),

    savePreferences: (actor: Actor, preferences: { language?: string; theme?: string }) =>
        step(actor, '#actor saves their preferences', Platform.savePreferences(preferences)),

    readPreferences: (actor: Actor, cookies: string) =>
        step(actor, '#actor reads their preferences', Platform.readPreferences(cookies)),

    sendContactForm: (actor: Actor, fields: Record<string, string>) =>
        step(actor, '#actor sends the contact form', Platform.sendContactForm(fields)),

    external: (actor: Actor, method: HttpMethod, url: string, title: string) =>
        step(actor, title, Platform.external(method, url)),
};
