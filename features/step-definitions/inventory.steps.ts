import { Given, When } from '@cucumber/cucumber';
import { Actor } from '@serenity-js/core';

import type { MovementRequest } from '../../src/api/types';
import { Movements, Stock, Warehouses } from '../../src/screenplay';

// ---------------------------------------------------------------------------------------------------------------------
// Warehouses
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} lists the warehouses', (actor: Actor) =>
    actor.attemptsTo(
        Warehouses.list(),
    ));

When('{actor} lists the active warehouses', (actor: Actor) =>
    actor.attemptsTo(
        Warehouses.list({ active: true }),
    ));

When('{actor} fetches warehouse {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Warehouses.fetch(id),
    ));

When('{actor} creates the warehouse {string} called {string} in {string}', (actor: Actor, code: string, name: string, city: string) =>
    actor.attemptsTo(
        Warehouses.create({ code, name, city }),
    ));

When('{actor} deactivates warehouse {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Warehouses.update(id, { active: false }),
    ));

When('{actor} deletes warehouse {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Warehouses.remove(id),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Stock levels
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} checks the stock of product {int} in warehouse {int}', (actor: Actor, productId: number, warehouseId: number) =>
    actor.attemptsTo(
        Stock.levelOf(productId, warehouseId),
    ));

Given('{actor} has checked the stock of product {int} in warehouse {int} and remembered its ETag', (actor: Actor, productId: number, warehouseId: number) =>
    actor.attemptsTo(
        Stock.levelAndRememberEtag(productId, warehouseId),
    ));

When('{actor} checks the low stock in warehouse {int}', (actor: Actor, warehouseId: number) =>
    actor.attemptsTo(
        Stock.inWarehouse(warehouseId, { low_only: true }),
    ));

When('{actor} checks the stock in warehouse {int} sorted by {string}', (actor: Actor, warehouseId: number, sort: string) =>
    actor.attemptsTo(
        Stock.inWarehouse(warehouseId, { sort }),
    ));

When('{actor} records a count of {int} for product {int} in warehouse {int} because {string}', (actor: Actor, quantity: number, productId: number, warehouseId: number, reason: string) =>
    actor.attemptsTo(
        Stock.adjust(productId, warehouseId, { quantity, reason }),
    ));

Given('{actor} has recorded a count of {int} for product {int} in warehouse {int} because {string}', (actor: Actor, quantity: number, productId: number, warehouseId: number, reason: string) =>
    actor.attemptsTo(
        Stock.adjust(productId, warehouseId, { quantity, reason }),
    ));

When('{actor} records a count of {int} for product {int} in warehouse {int} without an ETag', (actor: Actor, quantity: number, productId: number, warehouseId: number) =>
    actor.attemptsTo(
        Stock.adjust(productId, warehouseId, { quantity, reason: 'No ETag' }, 'none'),
    ));

When('{actor} checks the low-stock alerts', (actor: Actor) =>
    actor.attemptsTo(
        Stock.lowStockAlerts(),
    ));

When('{actor} checks the low-stock alerts for warehouse {int}', (actor: Actor, warehouseId: number) =>
    actor.attemptsTo(
        Stock.lowStockAlerts(warehouseId),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Movements
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Parses the human-readable direction of a movement, e.g.
 * "into warehouse 1", "out of warehouse 2" or "from warehouse 1 to warehouse 2".
 */
function movement(type: string, quantity: number, productId: number, direction: string): MovementRequest {
    const warehouses = [ ...direction.matchAll(/warehouse (\d+)/g) ].map(match => Number(match[1]));
    if (type === 'transfer') {
        return { type, quantity, product_id: productId, from_warehouse_id: warehouses[0], to_warehouse_id: warehouses[1] };
    }
    return { type: type as 'in' | 'out', quantity, product_id: productId, warehouse_id: warehouses[0] };
}

When('{actor} records a {string} movement of {int} units of product {int} {}', (actor: Actor, type: string, quantity: number, productId: number, direction: string) => {
    const [ , where, key ] = direction.match(/^(.*?)(?: with the idempotency key "([^"]+)")?$/)!;
    return actor.attemptsTo(
        Movements.record(movement(type, quantity, productId, where), key),
    );
});

Given('{actor} has recorded a {string} movement of {int} units of product {int} {}', (actor: Actor, type: string, quantity: number, productId: number, direction: string) => {
    const [ , where, key ] = direction.match(/^(.*?)(?: with the idempotency key "([^"]+)")?$/)!;
    return actor.attemptsTo(
        Movements.record(movement(type, quantity, productId, where), key),
    );
});

When('{actor} lists the {string} movements', (actor: Actor, type: string) =>
    actor.attemptsTo(
        Movements.list({ type, limit: 50 }),
    ));

When('{actor} lists the {string} movements of product {int}', (actor: Actor, type: string, productId: number) =>
    actor.attemptsTo(
        Movements.list({ type, product_id: productId }),
    ));

When('{actor} lists the movements sorted by {string}', (actor: Actor, sort: string) =>
    actor.attemptsTo(
        Movements.list({ sort }),
    ));

When('{actor} fetches movement {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Movements.fetch(id),
    ));

When('{actor} attempts to change movement {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Movements.attemptToChange(id),
    ));

When('{actor} attempts to delete movement {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Movements.attemptToDelete(id),
    ));
