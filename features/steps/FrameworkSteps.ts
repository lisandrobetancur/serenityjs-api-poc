import { readFileSync } from 'node:fs';

import { Ensure, equals, isLessThan } from '@serenity-js/assertions';
import { type Actor, Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import { ApiGet, ApiPost, TheNote, TheResponseTime } from '../../src/screenplay';
import { LOG_FILE } from '../../src/utils/log/logger';
import { WaitUtils } from '../../src/utils/wait/WaitUtils';
import { step } from './step';

const fakeApi = (path: string) => {
    const base = process.env.FAKE_API_URL;
    if (!base) {
        throw new Error(
            'FAKE_API_URL is not set; the fake API is started by the BeforeAll hook in features/hooks/index.ts',
        );
    }
    return `${base}${path}`;
};

/** Unique per scenario run, so the fake API's failure counters never leak between scenarios. */
const counterKey = () => `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Steps that exercise the framework itself (retries, polling, tenants, test data) against the local fake API.
 */
export const FrameworkSteps = {
    fetchOrderWhileFailing: (actor: Actor, orderId: string, times: number, failure: string) =>
        step(
            actor,
            `#actor fetches order ${orderId} while the gateway fails ${times} time(s) with ${failure}`,
            ApiGet.to(fakeApi(`/orders/${orderId}?fail=${failure}&times=${times}&key=${counterKey()}`)).external(),
        ),

    createOrderWhileFailing: (actor: Actor, times: number, failure: string) =>
        step(
            actor,
            `#actor creates an order while the gateway fails ${times} time(s) with ${failure}`,
            ApiPost.to(fakeApi(`/orders?fail=${failure}&times=${times}&key=${counterKey()}`))
                .external()
                .withBody({ item: 'acme-widget', quantity: 1 }),
        ),

    fetchOrder: (actor: Actor, orderId: string) =>
        step(
            actor,
            `#actor fetches order ${orderId} from the fake API`,
            ApiGet.to(fakeApi(`/orders/${orderId}`)).external(),
        ),

    /** Poll + assertion in one Step; only the final call is reported, as `· call N of M`. */
    waitForOrderStatus: (actor: Actor, orderId: string, expected: string) => {
        const key = counterKey();
        return step(
            actor,
            `#actor waits until order ${orderId} is ${expected}`,
            Ensure.that(
                WaitUtils.pollUntil(
                    `the status of order ${orderId}`,
                    async pollingActor => {
                        await ApiGet.to(fakeApi(`/orders/${orderId}/status?key=${key}`))
                            .external()
                            .performAs(pollingActor as never);
                        return pollingActor.answer(LastResponse.body<{ status: string }>().status);
                    },
                    status => status === expected,
                    0.2,
                    5,
                ),
                equals(expected),
            ),
        );
    },

    logInToFakeApi: (actor: Actor, email: string, password: string) =>
        step(
            actor,
            `#actor logs in to the fake API as ${email}`,
            ApiPost.to(fakeApi('/auth/login')).external().withBody({ email, password }),
        ),

    hasScenarioAccount: (actor: Actor, email: string) =>
        step(
            actor,
            `#actor has the test-data account ${email}`,
            Ensure.that(
                TheNote.called('scenarioUser')
                    .as(user => user.email)
                    .describedAs('email:'),
                equals(email),
            ),
        ),

    respondedWithin: (actor: Actor, milliseconds: number) =>
        step(
            actor,
            `#actor got the response in under ${milliseconds} ms`,
            Ensure.that(TheResponseTime.was(), isLessThan(milliseconds)),
        ),

    /** Counts the retry lines this worker wrote to the run log since the scenario started. */
    retriesLogged: (actor: Actor, message: string, expected: number, sinceOffset: number) =>
        step(
            actor,
            `#actor sees ${expected} "${message}" retries in the run log`,
            Ensure.that(
                Question.about(
                    `the "${message}" lines in the run log`,
                    () =>
                        readFileSync(LOG_FILE, 'utf8')
                            .slice(sinceOffset)
                            .split('\n')
                            .filter(line => line.includes(message) && line.includes(`"pid":${process.pid}`)).length,
                ),
                equals(expected),
            ),
        ),
};
