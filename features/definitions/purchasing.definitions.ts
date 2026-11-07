import { type DataTable } from '@cucumber/cucumber';
import { type Actor } from '@serenity-js/core';

import type { PurchaseOrderLineIn } from '../../src/models/types';
import { type PurchaseOrderTransition } from '../../src/screenplay';
import { PurchasingSteps } from '../steps/PurchasingSteps';
import { objectFrom } from '../support/values';
import { given, when } from './define';

const singleLineOrder = (supplierId: number, warehouseId: number, quantity: number, productId: number) => ({
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    lines: [{ product_id: productId, quantity, unit_cost: 10 }],
});

when('{actor} lists the {string} purchase orders', (actor: Actor, status: string) =>
    PurchasingSteps.list(actor, status),
);

when('{actor} fetches purchase order {int}', (actor: Actor, orderId: number) => PurchasingSteps.fetch(actor, orderId));

when(
    '{actor} drafts a purchase order from supplier {int} into warehouse {int} with:',
    (actor: Actor, supplierId: number, warehouseId: number, table: DataTable) =>
        PurchasingSteps.draft(actor, {
            supplier_id: supplierId,
            warehouse_id: warehouseId,
            lines: table.hashes().map(row => objectFrom(row) as unknown as PurchaseOrderLineIn),
        }),
);

when(
    '{actor} drafts a purchase order from supplier {int} into warehouse {int} with no lines',
    (actor: Actor, supplierId: number, warehouseId: number) =>
        PurchasingSteps.draft(actor, { supplier_id: supplierId, warehouse_id: warehouseId, lines: [] }),
);

when(
    '{actor} drafts a purchase order from supplier {int} into warehouse {int} for {int} units of product {int} with the idempotency key {string}',
    (actor: Actor, supplierId: number, warehouseId: number, quantity: number, productId: number, key: string) =>
        PurchasingSteps.draft(actor, singleLineOrder(supplierId, warehouseId, quantity, productId), key),
);

given(
    '{actor} has drafted a purchase order from supplier {int} into warehouse {int} for {int} units of product {int} with the idempotency key {string}',
    (actor: Actor, supplierId: number, warehouseId: number, quantity: number, productId: number, key: string) =>
        PurchasingSteps.draftAndRemember(actor, singleLineOrder(supplierId, warehouseId, quantity, productId), key),
);

given(
    '{actor} has drafted a purchase order from supplier {int} into warehouse {int} for {int} units of product {int}',
    (actor: Actor, supplierId: number, warehouseId: number, quantity: number, productId: number) =>
        PurchasingSteps.draftAndRemember(actor, singleLineOrder(supplierId, warehouseId, quantity, productId)),
);

when('{actor} adds the note {string} to purchase order {int}', (actor: Actor, notes: string, orderId: number) =>
    PurchasingSteps.addNote(actor, orderId, notes),
);

when('{actor} deletes purchase order {int}', (actor: Actor, orderId: number) => PurchasingSteps.remove(actor, orderId));

when(
    '{actor} {transition}s purchase order {int}',
    (actor: Actor, transition: PurchaseOrderTransition, orderId: number) =>
        PurchasingSteps.transition(actor, orderId, transition),
);

when(
    '{actor} {transition}s the purchase order [he|she|they] drafted',
    (actor: Actor, transition: PurchaseOrderTransition) => PurchasingSteps.transitionDrafted(actor, transition),
);
