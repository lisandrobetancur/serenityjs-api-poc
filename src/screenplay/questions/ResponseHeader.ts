import { Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

export class ResponseHeader {
    /**
     * The value of a header in the last response, or `undefined` when absent.
     * Multi-value headers (such as `Set-Cookie`) are joined with `; `.
     */
    static called = (name: string) =>
        Question.about<string | undefined>(`the "${ name }" header of the last response`, async actor => {
            const headers = await actor.answer(LastResponse.headers());
            const value = headers[name.toLowerCase()];
            if (value === undefined || value === null) {
                return undefined;
            }
            return Array.isArray(value) ? value.join('; ') : String(value);
        });

    /**
     * The value of a header that must be present in the last response.
     */
    static valueOf = (name: string) =>
        Question.about<string>(`the "${ name }" header of the last response`, async actor => {
            const value = await actor.answer(ResponseHeader.called(name));
            if (value === undefined) {
                throw new Error(`The last response has no "${ name }" header`);
            }
            return value;
        });

    /**
     * The `name=value` pair of a cookie set by the last response, ready to be sent back in a `Cookie` header.
     */
    static cookie = (name: string) =>
        Question.about<string>(`the "${ name }" cookie set by the last response`, async actor => {
            const headers = await actor.answer(LastResponse.headers());
            const setCookie = ([] as string[]).concat((headers['set-cookie'] as string[] | string | undefined) ?? []);
            const cookie = setCookie.find(entry => entry.startsWith(`${ name }=`));
            if (! cookie) {
                throw new Error(`The last response did not set a "${ name }" cookie`);
            }
            return cookie.split(';')[0];
        });
}
