import type { PurchaseOrderCreate, PurchaseOrderUpdate } from '../../../models/types';
import { Endpoints } from '../../../utils/constants/Endpoints';
import { Headers } from '../../../utils/constants/Patterns';
import { ApiDelete, ApiGet, ApiPatch, ApiPost } from '../../interactions/api/ApiCall';
import { scene } from '../../notes/Notes';

export type PurchaseOrderTransition = 'submit' | 'receive' | 'cancel';

export const PurchaseOrders = {
    list: (params: { status?: string; supplier_id?: number } = {}) =>
        ApiGet.to(Endpoints.PURCHASE_ORDERS).authenticated().withQueryParams(params),

    fetch: (orderId: number) => ApiGet.to(Endpoints.PURCHASE_ORDER).authenticated().withPathParams({ orderId }),

    draft: (payload: PurchaseOrderCreate, idempotencyKey?: string) =>
        ApiPost.to(Endpoints.PURCHASE_ORDERS)
            .authenticated()
            .withBody(payload)
            .withHeaders(idempotencyKey ? { [Headers.IDEMPOTENCY_KEY]: idempotencyKey } : {}),

    update: (orderId: number, changes: PurchaseOrderUpdate) =>
        ApiPatch.to(Endpoints.PURCHASE_ORDER).authenticated().withPathParams({ orderId }).withBody(changes),

    remove: (orderId: number) => ApiDelete.to(Endpoints.PURCHASE_ORDER).authenticated().withPathParams({ orderId }),

    transition: (orderId: number, transition: PurchaseOrderTransition) =>
        ApiPost.to(Endpoints.PURCHASE_ORDER_TRANSITION).authenticated().withPathParams({ orderId, transition }),

    transitionTheDraftedOne: (transition: PurchaseOrderTransition) =>
        ApiPost.to(Endpoints.PURCHASE_ORDER_TRANSITION)
            .authenticated()
            .withPathParams({ orderId: scene().get('createdId'), transition }),
};
