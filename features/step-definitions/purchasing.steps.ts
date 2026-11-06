import { DataTable, Given, When } from '@cucumber/cucumber';
import { Actor } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import type { PurchaseOrderLineIn } from '../../src/api/types';
import { PurchaseOrders, PurchaseOrderTransition, remembered } from '../../src/screenplay';
import { objectFrom } from '../support/values';

const draftedOrder = (actor: Actor) => actor.answer(remembered().get('createdId'));

When('{actor} lists the {string} purchase orders', (actor: Actor, status: string) =>
    actor.attemptsTo(
        PurchaseOrders.list({ status }),
    ));

When('{actor} fetches purchase order {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        PurchaseOrders.fetch(id),
    ));

When('{actor} drafts a purchase order from supplier {int} into warehouse {int} with:', (actor: Actor, supplierId: number, warehouseId: number, table: DataTable) =>
    actor.attemptsTo(
        PurchaseOrders.draft({
            supplier_id: supplierId,
            warehouse_id: warehouseId,
            lines: table.hashes().map(row => objectFrom(row) as unknown as PurchaseOrderLineIn),
        }),
    ));

When('{actor} drafts a purchase order from supplier {int} into warehouse {int} with no lines', (actor: Actor, supplierId: number, warehouseId: number) =>
    actor.attemptsTo(
        PurchaseOrders.draft({ supplier_id: supplierId, warehouse_id: warehouseId, lines: [] }),
    ));

const singleLineOrder = (supplierId: number, warehouseId: number, quantity: number, productId: number) => ({
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    lines: [ { product_id: productId, quantity, unit_cost: 10 } ],
});

When('{actor} drafts a purchase order from supplier {int} into warehouse {int} for {int} units of product {int} with the idempotency key {string}',
    (actor: Actor, supplierId: number, warehouseId: number, quantity: number, productId: number, key: string) =>
        actor.attemptsTo(
            PurchaseOrders.draft(singleLineOrder(supplierId, warehouseId, quantity, productId), key),
        ));

Given('{actor} has drafted a purchase order from supplier {int} into warehouse {int} for {int} units of product {int} with the idempotency key {string}',
    (actor: Actor, supplierId: number, warehouseId: number, quantity: number, productId: number, key: string) =>
        actor.attemptsTo(
            PurchaseOrders.draft(singleLineOrder(supplierId, warehouseId, quantity, productId), key),
        ));

Given('{actor} has drafted a purchase order from supplier {int} into warehouse {int} for {int} units of product {int}',
    (actor: Actor, supplierId: number, warehouseId: number, quantity: number, productId: number) =>
        actor.attemptsTo(
            PurchaseOrders.draft(singleLineOrder(supplierId, warehouseId, quantity, productId)),
            remembered().set('createdId', LastResponse.body<{ id: number }>().id),
        ));

When('{actor} adds the note {string} to purchase order {int}', (actor: Actor, notes: string, id: number) =>
    actor.attemptsTo(
        PurchaseOrders.update(id, { notes }),
    ));

When('{actor} deletes purchase order {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        PurchaseOrders.remove(id),
    ));

When('{actor} {transition}s purchase order {int}', (actor: Actor, transition: PurchaseOrderTransition, id: number) =>
    actor.attemptsTo(
        PurchaseOrders.transition(id, transition),
    ));

When('{actor} {transition}s the purchase order (he)(she)(they) drafted', async (actor: Actor, transition: PurchaseOrderTransition) =>
    actor.attemptsTo(
        PurchaseOrders.transition(await draftedOrder(actor), transition),
    ));
