import { Task } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import type { MovementRequest, StockAdjustment, WarehouseIn, WarehouseUpdate } from '../../../models/types';
import { Endpoints } from '../../../utils/constants/Endpoints';
import { Headers } from '../../../utils/constants/Patterns';
import { ApiDelete, ApiGet, ApiPatch, ApiPost, ApiPut } from '../../interactions/api/ApiCall';
import { scene } from '../../notes/Notes';
import { conditional, type EntityTag } from '../products/Products';

export const Warehouses = {
    list: (params: { active?: boolean; limit?: number; offset?: number } = {}) =>
        ApiGet.to(Endpoints.WAREHOUSES).authenticated().withQueryParams(params),

    fetch: (warehouseId: number) => ApiGet.to(Endpoints.WAREHOUSE).authenticated().withPathParams({ warehouseId }),

    create: (payload: WarehouseIn) => ApiPost.to(Endpoints.WAREHOUSES).authenticated().withBody(payload),

    update: (warehouseId: number, changes: WarehouseUpdate) =>
        ApiPatch.to(Endpoints.WAREHOUSE).authenticated().withPathParams({ warehouseId }).withBody(changes),

    remove: (warehouseId: number) => ApiDelete.to(Endpoints.WAREHOUSE).authenticated().withPathParams({ warehouseId }),
};

export const Stock = {
    inWarehouse: (warehouseId: number, params: { low_only?: boolean; sort?: string; limit?: number } = {}) =>
        ApiGet.to(Endpoints.WAREHOUSE_STOCK).authenticated().withPathParams({ warehouseId }).withQueryParams(params),

    levelOf: (productId: number, warehouseId: number) =>
        ApiGet.to(Endpoints.STOCK_LEVEL).authenticated().withPathParams({ warehouseId, productId }),

    levelAndRememberItsEtag: (productId: number, warehouseId: number) =>
        Task.where(
            `#actor checks the stock of product #${productId} in warehouse #${warehouseId} and remembers its ETag`,
            Stock.levelOf(productId, warehouseId),
            scene().set('etag', LastResponse.header('etag')),
        ),

    adjust: (productId: number, warehouseId: number, payload: StockAdjustment, etag: EntityTag = 'remembered') =>
        ApiPut.to(Endpoints.STOCK_LEVEL)
            .authenticated()
            .withPathParams({ warehouseId, productId })
            .withBody(payload)
            .withHeaders(conditional(Headers.IF_MATCH, etag)),

    lowStockAlerts: (warehouseId?: number) =>
        ApiGet.to(Endpoints.LOW_STOCK_ALERTS).authenticated().withQueryParams({ warehouse_id: warehouseId }),
};

export const Movements = {
    record: (payload: MovementRequest, idempotencyKey?: string) =>
        ApiPost.to(Endpoints.MOVEMENTS)
            .authenticated()
            .withBody(payload)
            .withHeaders(idempotencyKey ? { [Headers.IDEMPOTENCY_KEY]: idempotencyKey } : {}),

    list: (params: Record<string, string | number | undefined> = {}) =>
        ApiGet.to(Endpoints.MOVEMENTS).authenticated().withQueryParams(params),

    fetch: (movementId: number) => ApiGet.to(Endpoints.MOVEMENT).authenticated().withPathParams({ movementId }),

    change: (movementId: number) =>
        ApiPut.to(Endpoints.MOVEMENT).authenticated().withPathParams({ movementId }).withBody({ quantity: 1 }),

    remove: (movementId: number) => ApiDelete.to(Endpoints.MOVEMENT).authenticated().withPathParams({ movementId }),
};
