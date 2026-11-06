import { Given, When } from '@cucumber/cucumber';
import { Actor, Duration, Wait } from '@serenity-js/core';

import { Authenticate, remembered } from '../../src/screenplay';
import { uniqueSuffix } from '../support/values';

When('{actor} logs in with (his)(her)(their) credentials', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.logIn(),
    ));

When('{actor} attempts to log in as {string} with password {string}', (actor: Actor, email: string, password: string) =>
    actor.attemptsTo(
        Authenticate.attemptLogin(email, password),
    ));

When('{actor} waits for {int} second(s)', (actor: Actor, seconds: number) =>
    actor.attemptsTo(
        Wait.for(Duration.ofSeconds(seconds)),
    ));

Given('{actor} has refreshed (his)(her)(their) session', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.refreshTheSession(),
    ));

When('{actor} refreshes (his)(her)(their) session', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.refreshTheSession(),
    ));

When('{actor} refreshes (his)(her)(their) session again with the same refresh token', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.refreshTheSession(),
    ));

When('{actor} logs out', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.logOut(),
    ));

Given('{actor} has logged out', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.logOut(),
    ));

When('{actor} logs in using the OAuth2 password form', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.withOAuth2Form(),
    ));

When('{actor} identifies with HTTP Basic credentials', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.withBasicCredentials(),
    ));

When('{actor} identifies with HTTP Basic credentials {string} and {string}', (actor: Actor, email: string, password: string) =>
    actor.attemptsTo(
        Authenticate.withBasicCredentialsOf(email, password),
    ));

When('{actor} identifies with the API key {string}', (actor: Actor, apiKey: string) =>
    actor.attemptsTo(
        Authenticate.withApiKey(apiKey),
    ));

Given('{actor} has started a cookie session', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.startCookieSession(),
    ));

When('{actor} starts a cookie session', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.startCookieSession(),
    ));

When('{actor} checks (his)(her)(their) cookie session', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.checkCookieSession(),
    ));

When('{actor} checks (his)(her)(their) cookie session without a cookie', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.checkCookieSession('none'),
    ));

When('{actor} ends (his)(her)(their) cookie session', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.endCookieSession(),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------------------------------------------------

const newAccountFor = (actor: Actor) => ({
    email: `${ actor.name.toLowerCase() }.${ uniqueSuffix().toLowerCase() }@proproom.test`,
    name: actor.name,
    password: 'Secret123!',
});

When('{actor} registers a new account', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.register(newAccountFor(actor)),
    ));

Given('{actor} has registered a new account', (actor: Actor) => {
    const account = newAccountFor(actor);
    return actor.attemptsTo(
        Authenticate.register(account),
        remembered().set('registeredEmail', account.email),
    );
});

When('{actor} logs in with the account (he)(she)(they) registered', (actor: Actor) =>
    actor.attemptsTo(
        Authenticate.logInAs(remembered().get('registeredEmail'), 'Secret123!'),
    ));

When('{actor} registers the email {string}', (actor: Actor, email: string) =>
    actor.attemptsTo(
        Authenticate.register({ email, name: actor.name, password: 'Secret123!' }),
    ));

When('{actor} registers with the email {string} and password {string}', (actor: Actor, email: string, password: string) =>
    actor.attemptsTo(
        Authenticate.register({ email, name: actor.name, password }),
    ));
