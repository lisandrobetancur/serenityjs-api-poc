import { type Answerable, Interaction, Masked, q, Question, Task, TakeNotes } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import type { TokenPair } from '../../../models/types';
import { EnvironmentConfig } from '../../../utils/config/EnvironmentConfig';
import { Endpoints } from '../../../utils/constants/Endpoints';
import { Headers } from '../../../utils/constants/Patterns';
import { UseCredentials } from '../../abilities/UseCredentials';
import { ApiDelete, ApiGet, ApiPost } from '../../interactions/api/ApiCall';
import { type Notes, scene } from '../../notes/Notes';
import { TheResponseHeader } from '../../questions/api/ResponseQuestions';

/**
 * Stores the token pair of the last response as the acting persona's session.
 * `ApiCall.authenticated()` reads it from there.
 */
export const RememberSession = {
    fromTheLastResponse: () =>
        Interaction.where('#actor remembers the issued tokens', async actor => {
            const tokens = await actor.answer(LastResponse.body<TokenPair>());
            storeSession(actor, actor.name, { accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        }),

    withAccessToken: (accessToken: string) =>
        Interaction.where(`#actor uses the access token "${accessToken}"`, actor =>
            storeSession(actor, actor.name, { accessToken }),
        ),
};

/**
 * Authentication tasks for every scheme the API supports.
 * Single-call tasks return the call directly (silent: the Step that wraps them already names the action).
 */
export const Authenticate = {
    /** Logs in with the persona's seed credentials and remembers the session. */
    withBearerToken: (expiresInSeconds?: number) =>
        Task.where(
            '#actor logs in with a Bearer token',
            Authenticate.withTheCredentials(expiresInSeconds),
            RememberSession.fromTheLastResponse(),
        ),

    withTheCredentials: (expiresInSeconds?: number) =>
        ApiPost.to(Endpoints.LOGIN).withBody({
            email: UseCredentials.email(),
            password: UseCredentials.password(),
            ...(expiresInSeconds ? { expires_in: expiresInSeconds } : {}),
        }),

    withThePayload: (payload: { email: Answerable<string>; password: string }) =>
        ApiPost.to(Endpoints.LOGIN).withBody({ email: payload.email, password: Masked.valueOf(payload.password) }),

    withTheOAuth2Form: () =>
        ApiPost.to(Endpoints.TOKEN).withRawBody(
            q`username=${UseCredentials.email()}&password=${UseCredentials.password()}`,
            'application/x-www-form-urlencoded',
        ),

    refreshingTheSession: () => ApiPost.to(Endpoints.REFRESH).withBody({ refresh_token: refreshTokenOfTheActor() }),

    loggingOut: () =>
        ApiPost.to(Endpoints.LOGOUT).authenticated().withBody({ refresh_token: refreshTokenOfTheActor() }),

    withBasicCredentials: () =>
        ApiGet.to(Endpoints.BASIC).withHeader(Headers.AUTHORIZATION, UseCredentials.basicAuthHeader()),

    withBasicCredentialsOf: (email: string, password: string) =>
        ApiGet.to(Endpoints.BASIC).withHeader(
            Headers.AUTHORIZATION,
            Masked.valueOf(`Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`),
        ),

    withTheApiKey: (apiKey: string = EnvironmentConfig.flag('API_KEY') ?? 'test-api-key-123') =>
        apiKey
            ? ApiGet.to(Endpoints.API_KEY).withHeader(Headers.API_KEY, Masked.valueOf(apiKey))
            : ApiGet.to(Endpoints.API_KEY),

    startingACookieSession: () =>
        Task.where(
            '#actor starts a cookie session',
            ApiPost.to(Endpoints.SESSION).withBody({
                email: UseCredentials.email(),
                password: UseCredentials.password(),
            }),
            scene().set('sessionCookie', TheResponseHeader.cookie('session')),
        ),

    checkingTheCookieSession: () => ApiGet.to(Endpoints.SESSION).withHeader('Cookie', scene().get('sessionCookie')),

    checkingACookieSessionWithoutACookie: () => ApiGet.to(Endpoints.SESSION),

    endingTheCookieSession: () => ApiDelete.to(Endpoints.SESSION).withHeader('Cookie', scene().get('sessionCookie')),

    registering: (account: { email: string; name: string; password: string }) =>
        ApiPost.to(Endpoints.REGISTER).withBody({ ...account, password: Masked.valueOf(account.password) }),

    whoAmI: () => ApiGet.to(Endpoints.ME).authenticated(),
};

function refreshTokenOfTheActor() {
    return Question.about('the refresh token of #actor', actor => {
        const notepad = TakeNotes.as<TakeNotes<Notes>>(actor).notepad;
        const owner = (actor as unknown as { name: string }).name;
        return (notepad.has('sessions') ? notepad.get('sessions')[owner]?.refreshToken : undefined) ?? '';
    });
}

function storeSession(
    actor: Parameters<typeof TakeNotes.as>[0],
    owner: string,
    session: Notes['sessions'][string],
): void {
    const notepad = TakeNotes.as<TakeNotes<Notes>>(actor).notepad;
    const sessions = notepad.has('sessions') ? notepad.get('sessions') : {};
    notepad.set('sessions', { ...sessions, [owner]: session });
}
