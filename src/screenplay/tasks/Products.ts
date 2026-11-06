import { Answerable, Task } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import type { ProductCreate, ProductUpdate } from '../../api/types';
import { query, Request } from '../interactions/Request';
import { remembered } from '../notes/ApiNotes';

export type ProductFilters = Record<string, string | number | boolean | undefined>;

/**
 * How a conditional request should use the entity tag:
 * the one the actor remembered, a stale/explicit value, or no tag at all.
 */
export type EntityTag = 'remembered' | 'none' | string;

export const conditionalHeader = (name: 'If-Match' | 'If-None-Match', etag: EntityTag): Record<string, Answerable<string>> => {
    switch (etag) {
        case 'none':       return {};
        case 'remembered': return { [name]: remembered().get('etag') };
        default:           return { [name]: etag };
    }
};

export class Products {
    static list = (filters: ProductFilters = {}) =>
        Task.where(`#actor lists the products${ Object.keys(filters).length ? ` filtered by ${ JSON.stringify(filters) }` : '' }`,
            Request.get(`/products${ query(filters) }`),
        );

    static count = (filters: ProductFilters = {}) =>
        Task.where(`#actor counts the products with a HEAD request`,
            Request.head(`/products${ query(filters) }`),
        );

    static fetch = (id: number, etag: EntityTag = 'none') =>
        Task.where(`#actor fetches product #${ id }`,
            Request.get(`/products/${ id }`, { headers: conditionalHeader('If-None-Match', etag) }),
        );

    static fetchAndRememberEtag = (id: number) =>
        Task.where(`#actor fetches product #${ id } and remembers its ETag`,
            Products.fetch(id),
            remembered().set('etag', LastResponse.header('etag')),
        );

    static create = (product: ProductCreate) =>
        Task.where(`#actor creates the product ${ product.sku }`,
            Request.post('/products', product),
        );

    static replace = (id: number, product: ProductCreate, etag: EntityTag = 'none') =>
        Task.where(`#actor replaces product #${ id }`,
            Request.put(`/products/${ id }`, product, { headers: conditionalHeader('If-Match', etag) }),
        );

    static update = (id: number, changes: ProductUpdate, etag: EntityTag = 'none', contentType = 'application/json') =>
        Task.where(`#actor updates product #${ id } with ${ JSON.stringify(changes) }`,
            Request.patch(`/products/${ id }`, changes, {
                headers: { 'Content-Type': contentType, ...conditionalHeader('If-Match', etag) },
            }),
        );

    static remove = (id: number) =>
        Task.where(`#actor deletes product #${ id }`,
            Request.delete(`/products/${ id }`),
        );

    static stockOf = (id: number) =>
        Task.where(`#actor checks the stock of product #${ id }`,
            Request.get(`/products/${ id }/stock`),
        );

    static ledgerOf = (id: number, warehouseId?: number) =>
        Task.where(`#actor reads the ledger of product #${ id }`,
            Request.get(`/products/${ id }/ledger${ query({ warehouse_id: warehouseId }) }`),
        );

    static readDescription = (id: number) =>
        Task.where(`#actor reads the description of product #${ id }`,
            Request.get(`/products/${ id }/description`, { headers: { Accept: 'text/plain' } }),
        );

    static writeDescription = (id: number, text: string, contentType = 'text/plain') =>
        Task.where(`#actor writes the description of product #${ id }`,
            Request.put(`/products/${ id }/description`, text, { headers: { 'Content-Type': contentType } }),
        );

    static uploadPhoto = (id: number, file: { name: string, type: string, content: Uint8Array<ArrayBuffer> }) =>
        Task.where(`#actor uploads the photo ${ file.name } for product #${ id }`,
            Request.post(`/products/${ id }/photo`, formWithFile(file)),
        );

    static downloadPhoto = (id: number, asAttachment = false) =>
        Task.where(`#actor downloads the photo of product #${ id }`,
            Request.get(`/products/${ id }/photo${ query({ download: asAttachment || undefined }) }`, {
                responseType: 'arraybuffer',
                headers: { Accept: '*/*' },
            }),
        );

    static removePhoto = (id: number) =>
        Task.where(`#actor removes the photo of product #${ id }`,
            Request.delete(`/products/${ id }/photo`),
        );

    static importCsv = (csv: string, options: { dryRun?: boolean, fileName?: string, type?: string } = {}) =>
        Task.where(`#actor imports products from a CSV file${ options.dryRun ? ' (dry run)' : '' }`,
            Request.post(`/products/import${ query({ dry_run: options.dryRun || undefined }) }`, formWithFile({
                name: options.fileName ?? 'products.csv',
                type: options.type ?? 'text/csv',
                content: new TextEncoder().encode(csv),
            })),
        );
}

function formWithFile(file: { name: string, type: string, content: Uint8Array<ArrayBuffer> }): FormData {
    const form = new FormData();
    form.append('file', new Blob([ file.content ], { type: file.type }), file.name);
    return form;
}
