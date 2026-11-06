import { Task } from '@serenity-js/core';

import type { PurchaseOrderCreate, PurchaseOrderUpdate } from '../../api/types';
import { query, Request } from '../interactions/Request';

export type PurchaseOrderTransition = 'submit' | 'receive' | 'cancel';

export class PurchaseOrders {
    static list = (filters: { status?: string, supplier_id?: number } = {}) =>
        Task.where(`#actor lists the purchase orders`,
            Request.get(`/purchase-orders${ query(filters) }`),
        );

    static fetch = (id: number) =>
        Task.where(`#actor fetches purchase order #${ id }`,
            Request.get(`/purchase-orders/${ id }`),
        );

    static draft = (order: PurchaseOrderCreate, idempotencyKey?: string) =>
        Task.where(`#actor drafts a purchase order for supplier #${ order.supplier_id }`,
            Request.post('/purchase-orders', order, {
                headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
            }),
        );

    static update = (id: number, changes: PurchaseOrderUpdate) =>
        Task.where(`#actor updates purchase order #${ id }`,
            Request.patch(`/purchase-orders/${ id }`, changes),
        );

    static remove = (id: number) =>
        Task.where(`#actor deletes purchase order #${ id }`,
            Request.delete(`/purchase-orders/${ id }`),
        );

    static transition = (id: number, transition: PurchaseOrderTransition) =>
        Task.where(`#actor ${ transition }s purchase order #${ id }`,
            Request.post(`/purchase-orders/${ id }/${ transition }`),
        );
}
