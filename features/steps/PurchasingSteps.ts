import { Ensure, equals } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import type { PurchaseOrderCreate } from '../../src/models/types';
import { PurchaseOrders, type PurchaseOrderTransition, scene, TheStatusCode } from '../../src/screenplay';
import { Endpoints } from '../../src/utils/constants/Endpoints';
import { step } from './step';

export const PurchasingSteps = {
    list: (actor: Actor, status: string) =>
        step(actor, `#actor lists the ${status} purchase orders`, PurchaseOrders.list({ status })),

    fetch: (actor: Actor, orderId: number) =>
        step(actor, `#actor fetches purchase order #${orderId}`, PurchaseOrders.fetch(orderId)),

    draft: (actor: Actor, payload: PurchaseOrderCreate, idempotencyKey?: string) =>
        step(
            actor,
            `#actor drafts a purchase order for supplier #${payload.supplier_id}`,
            PurchaseOrders.draft(payload, idempotencyKey),
        ),

    /** Precondition: draft, check the gate and remember the order id. */
    draftAndRemember: (actor: Actor, payload: PurchaseOrderCreate, idempotencyKey?: string) =>
        step(
            actor,
            `#actor has drafted a purchase order for supplier #${payload.supplier_id}`,
            PurchaseOrders.draft(payload, idempotencyKey),
            Ensure.that(TheStatusCode.was(), equals(201)),
            scene().set('createdId', LastResponse.body<{ id: number }>().id),
            scene().set('createdResource', Endpoints.PURCHASE_ORDER),
        ),

    addNote: (actor: Actor, orderId: number, notes: string) =>
        step(actor, `#actor adds a note to purchase order #${orderId}`, PurchaseOrders.update(orderId, { notes })),

    remove: (actor: Actor, orderId: number) =>
        step(actor, `#actor deletes purchase order #${orderId}`, PurchaseOrders.remove(orderId)),

    transition: (actor: Actor, orderId: number, transition: PurchaseOrderTransition) =>
        step(actor, `#actor ${transition}s purchase order #${orderId}`, PurchaseOrders.transition(orderId, transition)),

    transitionDrafted: (actor: Actor, transition: PurchaseOrderTransition) =>
        step(
            actor,
            `#actor ${transition}s the purchase order they drafted`,
            PurchaseOrders.transitionTheDraftedOne(transition),
        ),
};
