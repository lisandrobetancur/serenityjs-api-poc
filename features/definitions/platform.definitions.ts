import { type Actor } from '@serenity-js/core';

import { type HttpMethod } from '../../src/screenplay';
import { PlatformSteps } from '../steps/PlatformSteps';
import { given, when } from './define';

// Health and maintenance ----------------------------------------------------------------------------------------------

when('{actor} checks the health of the API', (actor: Actor) => PlatformSteps.health(actor));

when('{actor} checks the health of the API with a HEAD request', (actor: Actor) => PlatformSteps.health(actor, 'HEAD'));

given('{actor} has switched maintenance mode on with a retry after {int} seconds', (actor: Actor, seconds: number) =>
    PlatformSteps.switchMaintenance(actor, true, seconds),
);

given('{actor} has switched maintenance mode off', (actor: Actor) => PlatformSteps.switchMaintenance(actor, false));

when('{actor} calls {string} with the request id {string}', (actor: Actor, resource: string, requestId: string) =>
    PlatformSteps.withRequestId(actor, resource, requestId),
);

// Generic HTTP behaviour ----------------------------------------------------------------------------------------------

when('{actor} sends a {method} request to the echo endpoint', (actor: Actor, method: HttpMethod) =>
    PlatformSteps.echo(actor, method, {
        body: method === 'GET' || method === 'DELETE' ? undefined : { line: 'To be, or not to be' },
    }),
);

when(
    '{actor} echoes the JSON body {} with the header {string} set to {string} and the query {string}',
    (actor: Actor, json: string, header: string, value: string, queryString: string) =>
        PlatformSteps.echo(actor, 'POST', {
            body: JSON.parse(json),
            headers: { [header]: value },
            query: Object.fromEntries(new URLSearchParams(queryString)),
        }),
);

when('{actor} echoes a request', (actor: Actor) => PlatformSteps.echo(actor, 'GET'));

when(
    '{actor} sends {method} {string} without following redirects',
    (actor: Actor, method: HttpMethod, resource: string) =>
        PlatformSteps.callWithoutFollowingRedirects(actor, method, resource),
);

when(
    '{actor} sends {method} {string} with the body {} following redirects',
    (actor: Actor, method: HttpMethod, resource: string, json: string) =>
        PlatformSteps.call(actor, method, resource, JSON.parse(json)),
);

when('{actor} sends {method} {string}', (actor: Actor, method: HttpMethod, resource: string) =>
    PlatformSteps.call(actor, method, resource),
);

when('{actor} asks which methods {string} allows', (actor: Actor, resource: string) =>
    PlatformSteps.allowedMethods(actor, resource),
);

when(
    '{actor} sends the raw body {string} as {string} to {method} {string}',
    (actor: Actor, body: string, contentType: string, method: HttpMethod, resource: string) =>
        PlatformSteps.sendRaw(actor, method, resource, body, contentType),
);

when('{actor} asks the chaos endpoint for a {int}', (actor: Actor, status: number) =>
    PlatformSteps.chaos(actor, status),
);

when('{actor} asks the chaos endpoint for a {int} after {int} ms', (actor: Actor, status: number, delay: number) =>
    PlatformSteps.chaos(actor, status, delay),
);

when('{actor} triggers an unhandled exception', (actor: Actor) => PlatformSteps.unhandledException(actor));

when('{actor} calls the rate-limited endpoint once as client {string}', (actor: Actor, clientId: string) =>
    PlatformSteps.rateLimited(actor, clientId, 1),
);

when(
    '{actor} calls the rate-limited endpoint {int} times as client {string}',
    (actor: Actor, times: number, clientId: string) => PlatformSteps.rateLimited(actor, clientId, times),
);

given(
    '{actor} has called the rate-limited endpoint {int} times as client {string}',
    (actor: Actor, times: number, clientId: string) => PlatformSteps.rateLimited(actor, clientId, times),
);

when(
    '{actor} saves the preferences language {string} and theme {string}',
    (actor: Actor, language: string, theme: string) => PlatformSteps.savePreferences(actor, { language, theme }),
);

when('{actor} reads [his|her|their] preferences with the cookies {string}', (actor: Actor, cookies: string) =>
    PlatformSteps.readPreferences(actor, cookies),
);

when(
    '{actor} sends the contact form as {string} with the email {string} and the message {string}',
    (actor: Actor, name: string, email: string, message: string) =>
        PlatformSteps.sendContactForm(actor, { name, email, message }),
);
