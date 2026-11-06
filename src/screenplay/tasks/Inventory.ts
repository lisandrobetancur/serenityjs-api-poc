import { Task } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import type { MovementRequest, StockAdjustment, WarehouseIn, WarehouseUpdate } from '../../api/types';
import { query, Request } from '../interactions/Request';
import { remembered } from '../notes/ApiNotes';
import { conditionalHeader, EntityTag } from './Products';

export class Warehouses {
    static list = (filters: { active?: boolean, limit?: number, offset?: number } = {}) =>
        Task.where(`#actor lists the warehouses`,
            Request.get(`/warehouses${ query(filters) }`),
        );

    static fetch = (id: number) =>
        Task.where(`#actor fetches warehouse #${ id }`,
            Request.get(`/warehouses/${ id }`),
        );

    static create = (warehouse: WarehouseIn) =>
        Task.where(`#actor creates the warehouse ${ warehouse.code }`,
            Request.post('/warehouses', warehouse),
        );

    static update = (id: number, changes: WarehouseUpdate) =>
        Task.where(`#actor updates warehouse #${ id }`,
            Request.patch(`/warehouses/${ id }`, changes),
        );

    static remove = (id: number) =>
        Task.where(`#actor deletes warehouse #${ id }`,
            Request.delete(`/warehouses/${ id }`),
        );
}

export class Stock {
    static inWarehouse = (warehouseId: number, filters: { low_only?: boolean, sort?: string, limit?: number } = {}) =>
        Task.where(`#actor checks the stock in warehouse #${ warehouseId }`,
            Request.get(`/warehouses/${ warehouseId }/stock${ query(filters) }`),
        );

    static levelOf = (productId: number, warehouseId: number) =>
        Task.where(`#actor checks the stock of product #${ productId } in warehouse #${ warehouseId }`,
            Request.get(`/warehouses/${ warehouseId }/stock/${ productId }`),
        );

    static levelAndRememberEtag = (productId: number, warehouseId: number) =>
        Task.where(`#actor checks the stock of product #${ productId } in warehouse #${ warehouseId } and remembers its ETag`,
            Stock.levelOf(productId, warehouseId),
            remembered().set('etag', LastResponse.header('etag')),
        );

    static adjust = (productId: number, warehouseId: number, adjustment: StockAdjustment, etag: EntityTag = 'remembered') =>
        Task.where(`#actor adjusts the stock of product #${ productId } in warehouse #${ warehouseId } to ${ adjustment.quantity }`,
            Request.put(`/warehouses/${ warehouseId }/stock/${ productId }`, adjustment, {
                headers: conditionalHeader('If-Match', etag),
            }),
        );

    static lowStockAlerts = (warehouseId?: number) =>
        Task.where(`#actor checks the low-stock alerts`,
            Request.get(`/alerts/low-stock${ query({ warehouse_id: warehouseId }) }`),
        );
}

export class Movements {
    static record = (movement: MovementRequest, idempotencyKey?: string) =>
        Task.where(`#actor records a "${ movement.type }" movement of ${ movement.quantity } x product #${ movement.product_id }`,
            Request.post('/movements', movement, {
                headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
            }),
        );

    static list = (filters: Record<string, string | number | undefined> = {}) =>
        Task.where(`#actor lists the stock movements`,
            Request.get(`/movements${ query(filters) }`),
        );

    static fetch = (id: number) =>
        Task.where(`#actor fetches movement #${ id }`,
            Request.get(`/movements/${ id }`),
        );

    static attemptToChange = (id: number) =>
        Task.where(`#actor attempts to change movement #${ id }`,
            Request.put(`/movements/${ id }`, { quantity: 1 }),
        );

    static attemptToDelete = (id: number) =>
        Task.where(`#actor attempts to delete movement #${ id }`,
            Request.delete(`/movements/${ id }`),
        );
}
