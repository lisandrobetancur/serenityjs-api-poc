import { Ensure, equals } from '@serenity-js/assertions';
import { Answerable, Masked, q, Task } from '@serenity-js/core';
import { ChangeApiConfig, LastResponse } from '@serenity-js/rest';

import { environment } from '../../config/environment';
import { UseCredentials } from '../abilities/UseCredentials';
import { Request } from '../interactions/Request';
import { remembered } from '../notes/ApiNotes';
import { ResponseHeader } from '../questions/ResponseHeader';

const bearer = (token: Parameters<typeof q>[1]) => Masked.valueOf(q`Bearer ${ token }`);

/**
 * Tasks that authenticate the actor with each scheme the Prop Room API supports.
 */
export class Authenticate {

    /**
     * Logs in with the actor's seed credentials and sends the access token with every following request.
     */
    static withBearerToken = (expiresInSeconds?: number) =>
        Task.where(`#actor logs in with a Bearer token`,
            Authenticate.logIn(expiresInSeconds),
            Ensure.that(LastResponse.status(), equals(200)),
            Authenticate.rememberTokens(),
            Authenticate.useRememberedAccessToken(),
        );

    /**
     * Sends the actor's seed credentials to the login endpoint, without asserting on the outcome.
     */
    static logIn = (expiresInSeconds?: number) =>
        Task.where(`#actor logs in with their credentials`,
            Request.post('/auth/login', {
                email: UseCredentials.email(),
                password: UseCredentials.password(),
                ...(expiresInSeconds ? { expires_in: expiresInSeconds } : {}),
            }),
        );

    static logInAs = (email: Answerable<string>, password: string) =>
        Task.where(`#actor logs in with another account`,
            Request.post('/auth/login', { email, password: Masked.valueOf(password) }),
        );

    static rememberTokens = () =>
        Task.where(`#actor remembers the issued tokens`,
            remembered().set('accessToken', LastResponse.body<{ access_token: string }>().access_token),
            remembered().set('refreshToken', LastResponse.body<{ refresh_token: string }>().refresh_token),
        );

    static useRememberedAccessToken = () =>
        Task.where(`#actor sends the remembered access token with every request`,
            ChangeApiConfig.setHeader('Authorization', bearer(remembered().get('accessToken'))),
        );

    static useAccessToken = (token: string) =>
        Task.where(`#actor sends the access token "${ token }" with every request`,
            ChangeApiConfig.setHeader('Authorization', `Bearer ${ token }`),
        );

    static attemptLogin = (email: string, password: string) =>
        Task.where(`#actor attempts to log in as ${ email }`,
            Request.post('/auth/login', { email, password: Masked.valueOf(password) }),
        );

    static withOAuth2Form = () =>
        Task.where(`#actor logs in using the OAuth2 password form`,
            Request.post('/auth/token', q`username=${ UseCredentials.email() }&password=${ UseCredentials.password() }`, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }),
        );

    static refreshTheSession = () =>
        Task.where(`#actor refreshes the session with the remembered refresh token`,
            Request.post('/auth/refresh', { refresh_token: remembered().get('refreshToken') }),
        );

    static logOut = () =>
        Task.where(`#actor logs out`,
            Request.post('/auth/logout', { refresh_token: remembered().get('refreshToken') }),
        );

    static withBasicCredentials = () =>
        Task.where(`#actor identifies with HTTP Basic credentials`,
            Request.get('/auth/basic', { headers: { Authorization: UseCredentials.basicAuthHeader() } }),
        );

    static withBasicCredentialsOf = (email: string, password: string) =>
        Task.where(`#actor identifies with HTTP Basic credentials of ${ email }`,
            Request.get('/auth/basic', {
                headers: { Authorization: `Basic ${ Buffer.from(`${ email }:${ password }`).toString('base64') }` },
            }),
        );

    static withApiKey = (apiKey: string = environment.apiKey) =>
        Task.where(`#actor identifies with an API key`,
            Request.get('/auth/api-key', { headers: apiKey ? { 'X-API-Key': Masked.valueOf(apiKey) } : {} }),
        );

    static startCookieSession = () =>
        Task.where(`#actor starts a cookie session`,
            Request.post('/auth/session', { email: UseCredentials.email(), password: UseCredentials.password() }),
            Ensure.that(LastResponse.status(), equals(200)),
            remembered().set('sessionCookie', ResponseHeader.cookie('session')),
        );

    static checkCookieSession = (cookie: 'remembered' | 'none' = 'remembered') =>
        Task.where(`#actor checks the cookie session`,
            Request.get('/auth/session', {
                headers: cookie === 'remembered' ? { Cookie: remembered().get('sessionCookie') } : {},
            }),
        );

    static endCookieSession = () =>
        Task.where(`#actor ends the cookie session`,
            Request.delete('/auth/session', { headers: { Cookie: remembered().get('sessionCookie') } }),
        );

    static register = (account: { email: string, name: string, password: string }) =>
        Task.where(`#actor registers the account ${ account.email }`,
            Request.post('/auth/register', { ...account, password: Masked.valueOf(account.password) }),
        );
}
