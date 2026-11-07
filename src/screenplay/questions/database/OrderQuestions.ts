import { type Actor, Question, type QuestionAdapter } from '@serenity-js/core';

import { type AppUserRow, AppUsersTable, type OrderRow, OrdersTable } from '../../../entities/orders';
import { readRows } from './DatabaseQuestions';

const ORDER_BY_REFERENCE = `
    SELECT id::text, reference, status, total::text, customer_email, notes, expires_at
    FROM public.orders
    WHERE reference = :reference
    LIMIT 1`;

const USERS_OF_TENANT = `
    SELECT id::text, email, password, tenant
    FROM public.app_users
    WHERE tenant = :tenant
    ORDER BY email`;

/**
 * Example database questions: constant statements, named parameters, ids as strings.
 */
export const TheOrder = {
    withReference: (reference: string): QuestionAdapter<OrderRow | undefined> =>
        Question.about<OrderRow | undefined>(
            `the order ${reference}`,
            async actor =>
                (
                    await readRows<OrderRow>(
                        actor as unknown as Actor,
                        OrdersTable.database,
                        ORDER_BY_REFERENCE,
                        { reference },
                        OrdersTable,
                    )
                )[0],
        ),
};

export const GetUsersOfTenant = {
    withCode: (tenant: string): QuestionAdapter<AppUserRow[]> =>
        Question.about<AppUserRow[]>(`the users of tenant ${tenant}`, actor =>
            readRows<AppUserRow>(
                actor as unknown as Actor,
                AppUsersTable.database,
                USERS_OF_TENANT,
                { tenant },
                AppUsersTable,
            ),
        ),
};
