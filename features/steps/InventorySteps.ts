import { Ensure, equals, isPresent } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';

import type { MovementRequest, WarehouseIn, WarehouseUpdate } from '../../src/models/types';
import { Movements, Stock, TheResponseHeader, TheStatusCode, Warehouses } from '../../src/screenplay';
import { step } from './step';

export const InventorySteps = {
    listWarehouses: (actor: Actor, params: { active?: boolean } = {}) =>
        step(
            actor,
            params.active ? '#actor lists the active warehouses' : '#actor lists the warehouses',
            Warehouses.list(params),
        ),

    fetchWarehouse: (actor: Actor, warehouseId: number) =>
        step(actor, `#actor fetches warehouse #${warehouseId}`, Warehouses.fetch(warehouseId)),

    createWarehouse: (actor: Actor, payload: WarehouseIn) =>
        step(actor, `#actor creates the warehouse ${payload.code}`, Warehouses.create(payload)),

    updateWarehouse: (actor: Actor, warehouseId: number, changes: WarehouseUpdate) =>
        step(actor, `#actor updates warehouse #${warehouseId}`, Warehouses.update(warehouseId, changes)),

    deleteWarehouse: (actor: Actor, warehouseId: number) =>
        step(actor, `#actor deletes warehouse #${warehouseId}`, Warehouses.remove(warehouseId)),

    stockLevel: (actor: Actor, productId: number, warehouseId: number) =>
        step(
            actor,
            `#actor checks the stock of product #${productId} in warehouse #${warehouseId}`,
            Stock.levelOf(productId, warehouseId),
        ),

    /** Precondition: read the level, check the gate and that an ETag came back, then remember it. */
    stockLevelAndRememberEtag: (actor: Actor, productId: number, warehouseId: number) =>
        step(
            actor,
            `#actor has checked the stock of product #${productId} in warehouse #${warehouseId} and remembered its ETag`,
            Stock.levelAndRememberItsEtag(productId, warehouseId),
            Ensure.that(TheStatusCode.was(), equals(200)),
            Ensure.that(TheResponseHeader.called('ETag'), isPresent()),
        ),

    stockInWarehouse: (actor: Actor, warehouseId: number, params: { low_only?: boolean; sort?: string }) =>
        step(actor, `#actor checks the stock in warehouse #${warehouseId}`, Stock.inWarehouse(warehouseId, params)),

    recordCount: (
        actor: Actor,
        productId: number,
        warehouseId: number,
        quantity: number,
        reason: string,
        etag = 'remembered',
    ) =>
        step(
            actor,
            `#actor records a count of ${quantity} for product #${productId} in warehouse #${warehouseId}`,
            Stock.adjust(productId, warehouseId, { quantity, reason }, etag),
        ),

    /** Precondition variant: the count must succeed. */
    recordCountSuccessfully: (actor: Actor, productId: number, warehouseId: number, quantity: number, reason: string) =>
        step(
            actor,
            `#actor has recorded a count of ${quantity} for product #${productId} in warehouse #${warehouseId}`,
            Stock.adjust(productId, warehouseId, { quantity, reason }),
            Ensure.that(TheStatusCode.was(), equals(200)),
        ),

    lowStockAlerts: (actor: Actor, warehouseId?: number) =>
        step(
            actor,
            warehouseId
                ? `#actor checks the low-stock alerts of warehouse #${warehouseId}`
                : '#actor checks the low-stock alerts',
            Stock.lowStockAlerts(warehouseId),
        ),

    recordMovement: (actor: Actor, movement: MovementRequest, idempotencyKey?: string) =>
        step(
            actor,
            `#actor records a "${movement.type}" movement of ${movement.quantity} x product #${movement.product_id}`,
            Movements.record(movement, idempotencyKey),
        ),

    /** Precondition variant: the movement must be created. */
    recordMovementSuccessfully: (actor: Actor, movement: MovementRequest, idempotencyKey?: string) =>
        step(
            actor,
            `#actor has recorded a "${movement.type}" movement of ${movement.quantity} x product #${movement.product_id}`,
            Movements.record(movement, idempotencyKey),
            Ensure.that(TheStatusCode.was(), equals(201)),
        ),

    listMovements: (actor: Actor, params: Record<string, string | number | undefined>) =>
        step(actor, '#actor lists the stock movements', Movements.list(params)),

    fetchMovement: (actor: Actor, movementId: number) =>
        step(actor, `#actor fetches movement #${movementId}`, Movements.fetch(movementId)),

    changeMovement: (actor: Actor, movementId: number) =>
        step(actor, `#actor attempts to change movement #${movementId}`, Movements.change(movementId)),

    deleteMovement: (actor: Actor, movementId: number) =>
        step(actor, `#actor attempts to delete movement #${movementId}`, Movements.remove(movementId)),
};
