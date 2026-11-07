import { type Actor } from '@serenity-js/core';

import { DatabaseSteps } from '../steps/DatabaseSteps';
import { then, when } from './define';

then(
    '{actor} should see order {string} with status {string} in the database',
    (actor: Actor, reference: string, status: string) => DatabaseSteps.orderHasStatus(actor, reference, status),
);

when(
    '{actor} expires order {string} with id {string} in the database',
    (actor: Actor, reference: string, orderId: string) => DatabaseSteps.expireOrder(actor, orderId, reference),
);

when(
    '{actor} writes the notes {string} on order {string} in the database',
    (actor: Actor, notes: string, orderId: string) => DatabaseSteps.annotateOrder(actor, orderId, notes),
);

then(
    '{actor} should see {int} users of tenant {string} in the database',
    (actor: Actor, count: number, tenant: string) => DatabaseSteps.tenantHasUsers(actor, tenant, count),
);
