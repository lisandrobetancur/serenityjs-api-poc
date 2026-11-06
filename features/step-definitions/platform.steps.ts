import { Given, When } from '@cucumber/cucumber';
import { Actor } from '@serenity-js/core';

import { Platform } from '../../src/screenplay';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ---------------------------------------------------------------------------------------------------------------------
// Health and maintenance
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} checks the health of the API', (actor: Actor) =>
    actor.attemptsTo(
        Platform.checkHealth(),
    ));

When('{actor} checks the health of the API with a HEAD request', (actor: Actor) =>
    actor.attemptsTo(
        Platform.checkHealth('HEAD'),
    ));

Given('{actor} has switched maintenance mode on with a retry after {int} seconds', (actor: Actor, seconds: number) =>
    actor.attemptsTo(
        Platform.enableMaintenance(seconds),
    ));

Given('{actor} has switched maintenance mode off', (actor: Actor) =>
    actor.attemptsTo(
        Platform.disableMaintenance(),
    ));

When('{actor} calls {string} with the request id {string}', (actor: Actor, url: string, requestId: string) =>
    actor.attemptsTo(
        Platform.callWithRequestId(url, requestId),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Generic HTTP behaviour
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} sends a {method} request to the echo endpoint', (actor: Actor, method: Method) =>
    actor.attemptsTo(
        Platform.echo(method, { body: method === 'GET' || method === 'DELETE' ? undefined : { line: 'To be, or not to be' } }),
    ));

When('{actor} echoes the JSON body {} with the header {string} set to {string} and the query {string}',
    (actor: Actor, json: string, header: string, value: string, queryString: string) =>
        actor.attemptsTo(
            Platform.echo('POST', {
                body: JSON.parse(json),
                headers: { [header]: value },
                query: Object.fromEntries(new URLSearchParams(queryString)),
            }),
        ));

When('{actor} sends {method} {string} without following redirects', (actor: Actor, method: Method, url: string) =>
    actor.attemptsTo(
        Platform.callWithoutFollowingRedirects(method, url),
    ));

When('{actor} sends {method} {string} with the body {} following redirects', (actor: Actor, method: Method, url: string, json: string) =>
    actor.attemptsTo(
        Platform.callFollowingRedirects(method, url, JSON.parse(json)),
    ));

When('{actor} sends {method} {string}', (actor: Actor, method: Method, url: string) =>
    actor.attemptsTo(
        Platform.call(method, url),
    ));

When('{actor} asks which methods {string} allows', (actor: Actor, url: string) =>
    actor.attemptsTo(
        Platform.askForAllowedMethods(url),
    ));

When('{actor} sends the raw body {string} as {string} to {method} {string}', (actor: Actor, body: string, contentType: string, method: Method, url: string) =>
    actor.attemptsTo(
        Platform.sendRaw(method, url, body, contentType),
    ));

When('{actor} asks the chaos endpoint for a {int}', (actor: Actor, status: number) =>
    actor.attemptsTo(
        Platform.chaos(status),
    ));

When('{actor} asks the chaos endpoint for a {int} after {int} ms', (actor: Actor, status: number, delay: number) =>
    actor.attemptsTo(
        Platform.chaos(status, delay),
    ));

When('{actor} triggers an unhandled exception', (actor: Actor) =>
    actor.attemptsTo(
        Platform.triggerUnhandledException(),
    ));

When('{actor} calls the rate-limited endpoint once as client {string}', (actor: Actor, clientId: string) =>
    actor.attemptsTo(
        Platform.callRateLimitedEndpoint(clientId),
    ));

When('{actor} calls the rate-limited endpoint {int} times as client {string}', (actor: Actor, times: number, clientId: string) =>
    actor.attemptsTo(
        Platform.callRateLimitedEndpoint(clientId, times),
    ));

Given('{actor} has called the rate-limited endpoint {int} times as client {string}', (actor: Actor, times: number, clientId: string) =>
    actor.attemptsTo(
        Platform.callRateLimitedEndpoint(clientId, times),
    ));

When('{actor} saves the preferences language {string} and theme {string}', (actor: Actor, language: string, theme: string) =>
    actor.attemptsTo(
        Platform.savePreferences({ language, theme }),
    ));

When('{actor} reads (his)(her)(their) preferences with the cookies {string}', (actor: Actor, cookies: string) =>
    actor.attemptsTo(
        Platform.readPreferences(cookies),
    ));

When('{actor} sends the contact form as {string} with the email {string} and the message {string}', (actor: Actor, name: string, email: string, message: string) =>
    actor.attemptsTo(
        Platform.sendContactForm({ name, email, message }),
    ));
