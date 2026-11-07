import { Ensure, equals } from '@serenity-js/assertions';
import { type Actor, Duration, Interaction, Wait } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import { Authenticate, RememberSession, scene, TheStatusCode, Users } from '../../src/screenplay';
import type { UserRole } from '../../src/models/types';
import { RunRegistry } from '../../src/utils/registry/RunRegistry';
import { step } from './step';

export interface NewAccount {
    email: string;
    name: string;
    password: string;
}

export const AuthSteps = {
    /** Precondition: log in and check the status gate, so a broken login fails here and not later. */
    logIn: (actor: Actor, expiresInSeconds?: number) =>
        step(
            actor,
            expiresInSeconds ? `#actor logs in with a token that expires in ${expiresInSeconds} s` : '#actor logs in',
            Authenticate.withBearerToken(expiresInSeconds),
            Ensure.that(TheStatusCode.was(), equals(200)),
        ),

    useAccessToken: (actor: Actor, token: string) =>
        step(actor, `#actor uses the access token "${token}"`, RememberSession.withAccessToken(token)),

    sendCredentials: (actor: Actor) =>
        step(actor, '#actor sends their credentials to the login endpoint', Authenticate.withTheCredentials()),

    attemptLogin: (actor: Actor, email: string, password: string) =>
        step(actor, `#actor attempts to log in as ${email}`, Authenticate.withThePayload({ email, password })),

    loginWithRegisteredAccount: (actor: Actor, password: string) =>
        step(
            actor,
            '#actor logs in with the account they registered',
            Authenticate.withThePayload({ email: scene().get('registeredEmail'), password }),
        ),

    waitSeconds: (actor: Actor, seconds: number) =>
        step(actor, `#actor waits ${seconds} s`, Wait.for(Duration.ofSeconds(seconds))),

    whoAmI: (actor: Actor) => step(actor, '#actor asks who they are', Authenticate.whoAmI()),

    refreshSession: (actor: Actor) =>
        step(actor, '#actor refreshes their session', Authenticate.refreshingTheSession()),

    logOut: (actor: Actor) => step(actor, '#actor logs out', Authenticate.loggingOut()),

    loginWithOAuth2Form: (actor: Actor) =>
        step(actor, '#actor logs in with the OAuth2 password form', Authenticate.withTheOAuth2Form()),

    identifyWithBasic: (actor: Actor) =>
        step(actor, '#actor identifies with HTTP Basic credentials', Authenticate.withBasicCredentials()),

    identifyWithBasicOf: (actor: Actor, email: string, password: string) =>
        step(
            actor,
            `#actor identifies with the HTTP Basic credentials of ${email}`,
            Authenticate.withBasicCredentialsOf(email, password),
        ),

    identifyWithApiKey: (actor: Actor, apiKey: string) =>
        step(
            actor,
            apiKey ? '#actor identifies with an API key' : '#actor calls the API-key endpoint without a key',
            Authenticate.withTheApiKey(apiKey),
        ),

    startCookieSession: (actor: Actor) =>
        step(actor, '#actor starts a cookie session', Authenticate.startingACookieSession()),

    checkCookieSession: (actor: Actor) =>
        step(actor, '#actor checks their cookie session', Authenticate.checkingTheCookieSession()),

    checkCookieSessionWithoutCookie: (actor: Actor) =>
        step(
            actor,
            '#actor checks a cookie session without a cookie',
            Authenticate.checkingACookieSessionWithoutACookie(),
        ),

    endCookieSession: (actor: Actor) =>
        step(actor, '#actor ends their cookie session', Authenticate.endingTheCookieSession()),

    register: (actor: Actor, account: NewAccount) =>
        step(actor, `#actor registers the account ${account.email}`, Authenticate.registering(account)),

    /** Registration as a precondition: register, check it worked and remember the email. */
    registerAndRemember: (actor: Actor, account: NewAccount) =>
        step(
            actor,
            `#actor has registered the account ${account.email}`,
            Authenticate.registering(account),
            Ensure.that(TheStatusCode.was(), equals(201)),
            scene().set('registeredEmail', account.email),
            Interaction.where('#actor registers the new user for cleanup at the end of the run', async a =>
                RunRegistry.register('registeredUserIds', await a.answer(LastResponse.body<{ id: number }>().id)),
            ),
        ),

    // Users ------------------------------------------------------------------------------------------------------------

    listUsers: (actor: Actor, role?: UserRole) =>
        step(
            actor,
            role ? `#actor lists the users with the role ${role}` : '#actor lists the users',
            Users.list(role ? { role } : {}),
        ),

    fetchUser: (actor: Actor, userId: number) => step(actor, `#actor fetches user #${userId}`, Users.fetch(userId)),

    renameUser: (actor: Actor, userId: number, name: string) =>
        step(actor, `#actor renames user #${userId} to "${name}"`, Users.update(userId, { name })),

    changeRole: (actor: Actor, userId: number, role: UserRole) =>
        step(actor, `#actor changes the role of user #${userId} to ${role}`, Users.update(userId, { role })),

    deleteUser: (actor: Actor, userId: number) => step(actor, `#actor deletes user #${userId}`, Users.remove(userId)),
};
