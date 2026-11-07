import { Ensure, equals } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';

import { AnnotateRecord, ExpireRecord } from '../../src/screenplay/tasks/database/orders/OrderRecords';
import { GetUsersOfTenant, TheOrder } from '../../src/screenplay/questions/database/OrderQuestions';
import { step } from './step';

export const DatabaseSteps = {
    /** Read + assertion on the same row. */
    orderHasStatus: (actor: Actor, reference: string, status: string) =>
        step(
            actor,
            `#actor sees order ${reference} with status ${status} in the database`,
            Ensure.that(
                TheOrder.withReference(reference)
                    .as(order => order?.status)
                    .describedAs('status:'),
                equals(status),
            ),
        ),

    /** Write + re-read of the same record. */
    expireOrder: (actor: Actor, orderId: string, reference: string) =>
        step(
            actor,
            `#actor expires order ${reference} in the database`,
            ExpireRecord.withTheRecord(orderId),
            Ensure.that(
                TheOrder.withReference(reference)
                    .as(order => order?.status)
                    .describedAs('status:'),
                equals('expired'),
            ),
        ),

    annotateOrder: (actor: Actor, orderId: string, notes: string | null) =>
        step(
            actor,
            '#actor writes the notes of the order in the database',
            AnnotateRecord.withTheRecord(orderId, notes),
        ),

    tenantHasUsers: (actor: Actor, tenant: string, count: number) =>
        step(
            actor,
            `#actor sees ${count} users of tenant ${tenant} in the database`,
            Ensure.that(GetUsersOfTenant.withCode(tenant).length.describedAs('users:'), equals(count)),
        ),
};
