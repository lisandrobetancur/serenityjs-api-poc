import { DataTable, Given, Then } from '@cucumber/cucumber';
import {
    contain,
    Ensure,
    equals,
    includes,
    isPresent,
    isTrue,
    matches,
    not,
} from '@serenity-js/assertions';
import { Actor, actorInTheSpotlight } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import { Authenticate, ResponseField, ResponseHeader } from '../../src/screenplay';
import { parseLiteral } from '../support/values';

// ---------------------------------------------------------------------------------------------------------------------
// Authentication preconditions
// ---------------------------------------------------------------------------------------------------------------------

Given('{actor} is logged in', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.withBearerToken(),
    ));

Given('{actor} is logged in with a token that expires in {int} second(s)', (actor: Actor, seconds: number) =>
    actor.attemptsTo(
        Authenticate.withBearerToken(seconds),
    ));

Given('{actor} uses the access token {string}', (actor: Actor, token: string) =>
    actor.attemptsTo(
        Authenticate.useAccessToken(token),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Status codes
// ---------------------------------------------------------------------------------------------------------------------

Then('{actor} should receive a {int} response', (actor: Actor, status: number) =>
    actor.attemptsTo(
        Ensure.that(LastResponse.status(), equals(status)),
    ));

Then('the response status should be {int}', (status: number) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(LastResponse.status(), equals(status)),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------------------------------------------------

Then('the response should include the {string} header', (name: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseHeader.called(name), isPresent()),
    ));

Then('the response should not include the {string} header', (name: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseHeader.called(name), not(isPresent())),
    ));

Then('the {string} header should be {string}', (name: string, value: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseHeader.called(name), equals(value)),
    ));

Then('the {string} header should contain {string}', (name: string, value: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseHeader.valueOf(name), includes(value)),
    ));

Then('the {string} header should match {string}', (name: string, pattern: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseHeader.valueOf(name), matches(new RegExp(pattern))),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------------------------------------------------

Then('the response field {string} should be {value}', (path: string, expected: unknown) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseField.at(path), equals(expected)),
    ));

Then('the response field {string} should contain {string}', (path: string, expected: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseField.at<string>(path), includes(expected)),
    ));

Then('the response field {string} should include {value}', (path: string, expected: unknown) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseField.at<unknown[]>(path), contain(expected)),
    ));

Then('the response field {string} should be present', (path: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseField.at(path), isPresent()),
    ));

Then('the response should contain:', (table: DataTable) =>
    actorInTheSpotlight().attemptsTo(
        ...table.raw().map(([ path, value ]) =>
            Ensure.that(ResponseField.at(path), equals(parseLiteral(value)))),
    ));

Then('the response field {string} should list {int} entr(y)(ies)', (path: string, count: number) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseField.lengthOf(path), equals(count)),
    ));

Then('the response should list {int} entr(y)(ies)', (count: number) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseField.lengthOf(''), equals(count)),
    ));

Then('every entry in {string} should have {string} equal to {value}', (arrayPath: string, field: string, expected: unknown) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseField.valuesOf(arrayPath, field).as(values => values.every(v => equalsDeep(v, expected))), isTrue()),
    ));

Then('the {string} of the entries in {string} should be {string}', (field: string, arrayPath: string, expectedCsv: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(
            ResponseField.valuesOf(arrayPath, field),
            equals(expectedCsv.split(',').map(value => parseLiteral(value))),
        ),
    ));

Then('the entries in {string} should be sorted by {string} in {word} order', (arrayPath: string, field: string, order: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(
            ResponseField.valuesOf<number | string>(arrayPath, field).as(values => isSorted(values, order === 'descending')),
            isTrue(),
        ),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------------------------------------------------

Then('the error should say {string}', (message: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(ResponseField.at<string>('detail'), includes(message)),
    ));

Then('the response should report a validation error for {string}', (field: string) =>
    actorInTheSpotlight().attemptsTo(
        Ensure.that(
            ResponseField.at<Array<{ loc: Array<string | number> }>>('detail')
                .as(errors => errors.map(error => error.loc.join('.'))),
            contain(`body.${ field }`),
        ),
    ));

// ---------------------------------------------------------------------------------------------------------------------

function equalsDeep(actual: unknown, expected: unknown): boolean {
    return JSON.stringify(actual) === JSON.stringify(expected);
}

function isSorted<T extends number | string>(values: T[], descending: boolean): boolean {
    return values.every((value, i) =>
        i === 0 || (descending ? values[i - 1] >= value : values[i - 1] <= value));
}
