import { statSync } from 'node:fs';

import { Before } from '@cucumber/cucumber';
import { type Actor, actorInTheSpotlight } from '@serenity-js/core';

import { LOG_FILE } from '../../src/utils/log/logger';
import { FrameworkSteps } from '../steps/FrameworkSteps';
import { then, when } from './define';

/** Size of the run log when the scenario started, so a scenario only counts its own retry lines. */
// scenario-scoped: reset by the @framework Before hook at the start of every scenario
let logOffset = 0;
const spotlight = () => actorInTheSpotlight();
Before({ tags: '@framework' }, () => {
    logOffset = statSync(LOG_FILE, { throwIfNoEntry: false })?.size ?? 0;
});

when(
    '{actor} fetches order {string} while the gateway fails {int} [time|times] with {word}',
    (actor: Actor, orderId: string, times: number, failure: string) =>
        FrameworkSteps.fetchOrderWhileFailing(actor, orderId, times, failure),
);

when(
    '{actor} creates an order while the gateway fails {int} [time|times] with {word}',
    (actor: Actor, times: number, failure: string) => FrameworkSteps.createOrderWhileFailing(actor, times, failure),
);

when('{actor} fetches order {string} from the fake API', (actor: Actor, orderId: string) =>
    FrameworkSteps.fetchOrder(actor, orderId),
);

when('{actor} waits until order {string} is {string}', (actor: Actor, orderId: string, status: string) =>
    FrameworkSteps.waitForOrderStatus(actor, orderId, status),
);

when(
    '{actor} logs in to the fake API as {string} with password {string}',
    (actor: Actor, email: string, password: string) => FrameworkSteps.logInToFakeApi(actor, email, password),
);

then('{actor} should have the test-data account {string}', (actor: Actor, email: string) =>
    FrameworkSteps.hasScenarioAccount(actor, email),
);

then('the response should have arrived in under {int} ms', (milliseconds: number) =>
    FrameworkSteps.respondedWithin(spotlight(), milliseconds),
);

then('the run log should show {int} {string} retries for this scenario', (expected: number, message: string) =>
    FrameworkSteps.retriesLogged(spotlight(), message, expected, logOffset),
);
