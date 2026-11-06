import { Then } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { Actor } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

Then('{pronoun} should receive a response with status {int}', (actor: Actor, status: number) =>
    actor.attemptsTo(
        Ensure.that(LastResponse.status(), equals(status)),
    ));
