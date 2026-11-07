import { type Actor } from '@serenity-js/core';

import type { MovementRequest } from '../../src/models/types';
import { InventorySteps } from '../steps/InventorySteps';
import { given, when } from './define';

/**
 * Parses the readable direction of a movement:
 * "into warehouse 1", "out of warehouse 2", "from warehouse 1 to warehouse 2",
 * optionally followed by `with the idempotency key "..."`.
 */
function movementFrom(
    type: string,
    quantity: number,
    productId: number,
    direction: string,
): { movement: MovementRequest; idempotencyKey?: string } {
    const [, where = '', idempotencyKey] = direction.match(/^(.*?)(?: with the idempotency key "([^"]+)")?$/) ?? [];
    const warehouses = [...where.matchAll(/warehouse (\d+)/g)].map(match => Number(match[1]));
    const movement: MovementRequest =
        type === 'transfer'
            ? {
                  type,
                  quantity,
                  product_id: productId,
                  from_warehouse_id: warehouses[0]!,
                  to_warehouse_id: warehouses[1]!,
              }
            : { type: type as 'in' | 'out', quantity, product_id: productId, warehouse_id: warehouses[0]! };
    return { movement, idempotencyKey };
}

// Warehouses ----------------------------------------------------------------------------------------------------------

when('{actor} lists the warehouses', (actor: Actor) => InventorySteps.listWarehouses(actor));

when('{actor} lists the active warehouses', (actor: Actor) => InventorySteps.listWarehouses(actor, { active: true }));

when('{actor} fetches warehouse {int}', (actor: Actor, warehouseId: number) =>
    InventorySteps.fetchWarehouse(actor, warehouseId),
);

when(
    '{actor} creates the warehouse {string} called {string} in {string}',
    (actor: Actor, code: string, name: string, city: string) =>
        InventorySteps.createWarehouse(actor, { code, name, city }),
);

when('{actor} deactivates warehouse {int}', (actor: Actor, warehouseId: number) =>
    InventorySteps.updateWarehouse(actor, warehouseId, { active: false }),
);

when('{actor} deletes warehouse {int}', (actor: Actor, warehouseId: number) =>
    InventorySteps.deleteWarehouse(actor, warehouseId),
);

// Stock levels --------------------------------------------------------------------------------------------------------

when(
    '{actor} checks the stock of product {int} in warehouse {int}',
    (actor: Actor, productId: number, warehouseId: number) => InventorySteps.stockLevel(actor, productId, warehouseId),
);

given(
    '{actor} has checked the stock of product {int} in warehouse {int} and remembered its ETag',
    (actor: Actor, productId: number, warehouseId: number) =>
        InventorySteps.stockLevelAndRememberEtag(actor, productId, warehouseId),
);

when('{actor} checks the low stock in warehouse {int}', (actor: Actor, warehouseId: number) =>
    InventorySteps.stockInWarehouse(actor, warehouseId, { low_only: true }),
);

when(
    '{actor} checks the stock in warehouse {int} sorted by {string}',
    (actor: Actor, warehouseId: number, sort: string) => InventorySteps.stockInWarehouse(actor, warehouseId, { sort }),
);

when(
    '{actor} records a count of {int} for product {int} in warehouse {int} because {string}',
    (actor: Actor, quantity: number, productId: number, warehouseId: number, reason: string) =>
        InventorySteps.recordCount(actor, productId, warehouseId, quantity, reason),
);

given(
    '{actor} has recorded a count of {int} for product {int} in warehouse {int} because {string}',
    (actor: Actor, quantity: number, productId: number, warehouseId: number, reason: string) =>
        InventorySteps.recordCountSuccessfully(actor, productId, warehouseId, quantity, reason),
);

when(
    '{actor} records a count of {int} for product {int} in warehouse {int} without an ETag',
    (actor: Actor, quantity: number, productId: number, warehouseId: number) =>
        InventorySteps.recordCount(actor, productId, warehouseId, quantity, 'No ETag', 'none'),
);

when('{actor} checks the low-stock alerts', (actor: Actor) => InventorySteps.lowStockAlerts(actor));

when('{actor} checks the low-stock alerts for warehouse {int}', (actor: Actor, warehouseId: number) =>
    InventorySteps.lowStockAlerts(actor, warehouseId),
);

// Movements -----------------------------------------------------------------------------------------------------------

when(
    '{actor} records a {string} movement of {int} units of product {int} {}',
    (actor: Actor, type: string, quantity: number, productId: number, direction: string) => {
        const { movement, idempotencyKey } = movementFrom(type, quantity, productId, direction);
        return InventorySteps.recordMovement(actor, movement, idempotencyKey);
    },
);

given(
    '{actor} has recorded a {string} movement of {int} units of product {int} {}',
    (actor: Actor, type: string, quantity: number, productId: number, direction: string) => {
        const { movement, idempotencyKey } = movementFrom(type, quantity, productId, direction);
        return InventorySteps.recordMovementSuccessfully(actor, movement, idempotencyKey);
    },
);

when('{actor} lists the {string} movements', (actor: Actor, type: string) =>
    InventorySteps.listMovements(actor, { type, limit: 50 }),
);

when('{actor} lists the {string} movements of product {int}', (actor: Actor, type: string, productId: number) =>
    InventorySteps.listMovements(actor, { type, product_id: productId }),
);

when('{actor} lists the movements sorted by {string}', (actor: Actor, sort: string) =>
    InventorySteps.listMovements(actor, { sort }),
);

when('{actor} fetches movement {int}', (actor: Actor, movementId: number) =>
    InventorySteps.fetchMovement(actor, movementId),
);

when('{actor} attempts to change movement {int}', (actor: Actor, movementId: number) =>
    InventorySteps.changeMovement(actor, movementId),
);

when('{actor} attempts to delete movement {int}', (actor: Actor, movementId: number) =>
    InventorySteps.deleteMovement(actor, movementId),
);
