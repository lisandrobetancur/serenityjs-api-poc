import { type Actor } from '@serenity-js/core';

import type { UserRole } from '../../src/models/types';
import { AuthSteps } from '../steps/AuthSteps';
import { uniqueSuffix } from '../support/values';
import { given, when } from './define';

const PASSWORD = 'Secret123!';

const newAccountFor = (actor: Actor) => ({
    email: `${actor.name.toLowerCase()}.${uniqueSuffix().toLowerCase()}@example.test`,
    name: actor.name,
    password: PASSWORD,
});

// Bearer tokens -------------------------------------------------------------------------------------------------------

when('{actor} logs in with [his|her|their] credentials', (actor: Actor) => AuthSteps.sendCredentials(actor));

when('{actor} attempts to log in as {string} with password {string}', (actor: Actor, email: string, password: string) =>
    AuthSteps.attemptLogin(actor, email, password),
);

when('{actor} asks who [he is|she is|they are]', (actor: Actor) => AuthSteps.whoAmI(actor));

given('{actor} has refreshed [his|her|their] session', (actor: Actor) => AuthSteps.refreshSession(actor));
when('{actor} refreshes [his|her|their] session', (actor: Actor) => AuthSteps.refreshSession(actor));
when('{actor} refreshes [his|her|their] session again with the same refresh token', (actor: Actor) =>
    AuthSteps.refreshSession(actor),
);

given('{actor} has logged out', (actor: Actor) => AuthSteps.logOut(actor));
when('{actor} logs out', (actor: Actor) => AuthSteps.logOut(actor));

// Other schemes -------------------------------------------------------------------------------------------------------

when('{actor} logs in using the OAuth2 password form', (actor: Actor) => AuthSteps.loginWithOAuth2Form(actor));

when('{actor} identifies with HTTP Basic credentials', (actor: Actor) => AuthSteps.identifyWithBasic(actor));

when(
    '{actor} identifies with HTTP Basic credentials {string} and {string}',
    (actor: Actor, email: string, password: string) => AuthSteps.identifyWithBasicOf(actor, email, password),
);

when('{actor} identifies with the API key {string}', (actor: Actor, apiKey: string) =>
    AuthSteps.identifyWithApiKey(actor, apiKey),
);

given('{actor} has started a cookie session', (actor: Actor) => AuthSteps.startCookieSession(actor));
when('{actor} starts a cookie session', (actor: Actor) => AuthSteps.startCookieSession(actor));
when('{actor} checks [his|her|their] cookie session', (actor: Actor) => AuthSteps.checkCookieSession(actor));
when('{actor} checks [his|her|their] cookie session without a cookie', (actor: Actor) =>
    AuthSteps.checkCookieSessionWithoutCookie(actor),
);
when('{actor} ends [his|her|their] cookie session', (actor: Actor) => AuthSteps.endCookieSession(actor));

// Registration --------------------------------------------------------------------------------------------------------

when('{actor} registers a new account', (actor: Actor) => AuthSteps.register(actor, newAccountFor(actor)));

given('{actor} has registered a new account', (actor: Actor) =>
    AuthSteps.registerAndRemember(actor, newAccountFor(actor)),
);

when('{actor} logs in with the account [he|she|they] registered', (actor: Actor) =>
    AuthSteps.loginWithRegisteredAccount(actor, PASSWORD),
);

when('{actor} registers the email {string}', (actor: Actor, email: string) =>
    AuthSteps.register(actor, { email, name: actor.name, password: PASSWORD }),
);

when(
    '{actor} registers with the email {string} and password {string}',
    (actor: Actor, email: string, password: string) => AuthSteps.register(actor, { email, name: actor.name, password }),
);

// Users ---------------------------------------------------------------------------------------------------------------

when('{actor} lists the users', (actor: Actor) => AuthSteps.listUsers(actor));

when('{actor} lists the users with the role {string}', (actor: Actor, role: UserRole) =>
    AuthSteps.listUsers(actor, role),
);

when('{actor} fetches user {int}', (actor: Actor, userId: number) => AuthSteps.fetchUser(actor, userId));

when('{actor} renames user {int} to {string}', (actor: Actor, userId: number, name: string) =>
    AuthSteps.renameUser(actor, userId, name),
);

when('{actor} changes the role of user {int} to {string}', (actor: Actor, userId: number, role: UserRole) =>
    AuthSteps.changeRole(actor, userId, role),
);

when('{actor} deletes user {int}', (actor: Actor, userId: number) => AuthSteps.deleteUser(actor, userId));
