import { type DataTable } from '@cucumber/cucumber';
import { type Actor, actorInTheSpotlight } from '@serenity-js/core';

import { AuthSteps } from '../steps/AuthSteps';
import { ResponseSteps } from '../steps/ResponseSteps';
import { parseLiteral } from '../support/values';
import { given, then } from './define';

/*
 * Definitions only call Steps, pass values from the scenario and decide the order.
 * They never use attemptsTo, answer or Ensure.
 */

// Authentication preconditions ----------------------------------------------------------------------------------------

given('{actor} is logged in', (actor: Actor) => AuthSteps.logIn(actor));

given('{actor} is logged in with a token that expires in {int} [second|seconds]', (actor: Actor, seconds: number) =>
    AuthSteps.logIn(actor, seconds),
);

given('{actor} uses the access token {string}', (actor: Actor, token: string) =>
    AuthSteps.useAccessToken(actor, token),
);

// Status --------------------------------------------------------------------------------------------------------------

then('{actor} should receive a {int} response', (actor: Actor, status: number) =>
    ResponseSteps.statusIs(actor, status),
);

then('the response status should be {int}', (status: number) => ResponseSteps.statusIs(actorInTheSpotlight(), status));

// Headers -------------------------------------------------------------------------------------------------------------

then('the response should include the {string} header', (name: string) =>
    ResponseSteps.hasHeader(actorInTheSpotlight(), name),
);

then('the response should not include the {string} header', (name: string) =>
    ResponseSteps.lacksHeader(actorInTheSpotlight(), name),
);

then('the {string} header should be {string}', (name: string, value: string) =>
    ResponseSteps.headerIs(actorInTheSpotlight(), name, value),
);

then('the {string} header should contain {string}', (name: string, value: string) =>
    ResponseSteps.headerContains(actorInTheSpotlight(), name, value),
);

then('the {string} header should match {string}', (name: string, pattern: string) =>
    ResponseSteps.headerMatches(actorInTheSpotlight(), name, pattern),
);

// Body ----------------------------------------------------------------------------------------------------------------

then('the response field {string} should be {value}', (path: string, expected: unknown) =>
    ResponseSteps.fieldIs(actorInTheSpotlight(), path, expected),
);

then('the response field {string} should contain {string}', (path: string, expected: string) =>
    ResponseSteps.fieldContains(actorInTheSpotlight(), path, expected),
);

then('the response field {string} should include {value}', (path: string, expected: unknown) =>
    ResponseSteps.fieldIncludes(actorInTheSpotlight(), path, expected),
);

then('the response field {string} should be present', (path: string) =>
    ResponseSteps.fieldIsPresent(actorInTheSpotlight(), path),
);

then('the response should contain:', (table: DataTable) =>
    ResponseSteps.bodyContains(
        actorInTheSpotlight(),
        table.raw().map(([path, value]) => [path ?? '', parseLiteral(value ?? '')]),
    ),
);

then('the response field {string} should list {int} [entry|entries]', (path: string, count: number) =>
    ResponseSteps.listSizeIs(actorInTheSpotlight(), path, count),
);

then('the response should list {int} [entry|entries]', (count: number) =>
    ResponseSteps.listSizeIs(actorInTheSpotlight(), '', count),
);

then(
    'every entry in {string} should have {string} equal to {value}',
    (path: string, field: string, expected: unknown) =>
        ResponseSteps.everyEntryHas(actorInTheSpotlight(), path, field, expected),
);

then('the {string} of the entries in {string} should be {string}', (field: string, path: string, expectedCsv: string) =>
    ResponseSteps.valuesAre(
        actorInTheSpotlight(),
        path,
        field,
        expectedCsv.split(',').map(value => parseLiteral(value)),
    ),
);

then('the entries in {string} should be sorted by {string} in ascending order', (path: string, field: string) =>
    ResponseSteps.sortedBy(actorInTheSpotlight(), path, field, false),
);

then('the entries in {string} should be sorted by {string} in descending order', (path: string, field: string) =>
    ResponseSteps.sortedBy(actorInTheSpotlight(), path, field, true),
);

// Errors --------------------------------------------------------------------------------------------------------------

then('the error should say {string}', (message: string) => ResponseSteps.errorSays(actorInTheSpotlight(), message));

then('the response should report a validation error for {string}', (field: string) =>
    ResponseSteps.validationErrorFor(actorInTheSpotlight(), field),
);

// Waiting: the only step that does not assert -------------------------------------------------------------------------

given('{actor} waits for {int} [second|seconds]', (actor: Actor, seconds: number) =>
    AuthSteps.waitSeconds(actor, seconds),
);
