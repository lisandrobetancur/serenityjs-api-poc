import { type Answerable, Task } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import type { ProductCreate, ProductUpdate } from '../../../models/types';
import { Endpoints } from '../../../utils/constants/Endpoints';
import { Headers } from '../../../utils/constants/Patterns';
import { ApiDelete, ApiGet, ApiHead, ApiPatch, ApiPost, ApiPut } from '../../interactions/api/ApiCall';
import { scene } from '../../notes/Notes';

export type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * How a conditional request uses the entity tag: the one remembered in the scene notes,
 * an explicit (possibly stale) value, or none at all.
 */
export type EntityTag = 'remembered' | 'none' | string;

export const conditional = (
    header: 'If-Match' | 'If-None-Match',
    etag: EntityTag,
): Record<string, Answerable<string>> => {
    switch (etag) {
        case 'none':
            return {};
        case 'remembered':
            return { [header]: scene().get('etag') };
        default:
            return { [header]: etag };
    }
};

export interface FileContent {
    name: string;
    type: string;
    content: Uint8Array;
}

export const Products = {
    list: (params: QueryParams = {}) => ApiGet.to(Endpoints.PRODUCTS).withQueryParams(params),

    count: (params: QueryParams = {}) => ApiHead.to(Endpoints.PRODUCTS).withQueryParams(params),

    fetch: (productId: number, etag: EntityTag = 'none') =>
        ApiGet.to(Endpoints.PRODUCT)
            .withPathParams({ productId })
            .withHeaders(conditional(Headers.IF_NONE_MATCH, etag)),

    fetchAndRememberItsEtag: (productId: number) =>
        Task.where(
            `#actor fetches product #${productId} and remembers its ETag`,
            Products.fetch(productId),
            scene().set('etag', LastResponse.header('etag')),
        ),

    create: (payload: ProductCreate) => ApiPost.to(Endpoints.PRODUCTS).authenticated().withBody(payload),

    replace: (productId: number, payload: ProductCreate, etag: EntityTag = 'none') =>
        ApiPut.to(Endpoints.PRODUCT)
            .authenticated()
            .withPathParams({ productId })
            .withBody(payload)
            .withHeaders(conditional(Headers.IF_MATCH, etag)),

    update: (productId: number, changes: ProductUpdate, etag: EntityTag = 'none', contentType = 'application/json') =>
        ApiPatch.to(Endpoints.PRODUCT)
            .authenticated()
            .withPathParams({ productId })
            .withBody(changes)
            .withContentType(contentType)
            .withHeaders(conditional(Headers.IF_MATCH, etag)),

    remove: (productId: number) => ApiDelete.to(Endpoints.PRODUCT).authenticated().withPathParams({ productId }),

    stockOf: (productId: number) => ApiGet.to(Endpoints.PRODUCT_STOCK).authenticated().withPathParams({ productId }),

    ledgerOf: (productId: number, warehouseId?: number) =>
        ApiGet.to(Endpoints.PRODUCT_LEDGER)
            .authenticated()
            .withPathParams({ productId })
            .withQueryParams({ warehouse_id: warehouseId }),

    readDescription: (productId: number) =>
        ApiGet.to(Endpoints.PRODUCT_DESCRIPTION).withPathParams({ productId }).withHeader('Accept', 'text/plain'),

    writeDescription: (productId: number, text: string, contentType = 'text/plain') =>
        ApiPut.to(Endpoints.PRODUCT_DESCRIPTION)
            .authenticated()
            .withPathParams({ productId })
            .withRawBody(text, contentType),

    uploadPhoto: (productId: number, file: FileContent) =>
        ApiPost.to(Endpoints.PRODUCT_PHOTO)
            .authenticated()
            .withPathParams({ productId })
            .withFileContent('file', file.name, file.type, file.content),

    downloadPhoto: (productId: number, asAttachment = false) =>
        ApiGet.to(Endpoints.PRODUCT_PHOTO)
            .withPathParams({ productId })
            .withQueryParams({ download: asAttachment || undefined })
            .withHeader('Accept', '*/*')
            .expectingBinary(),

    removePhoto: (productId: number) =>
        ApiDelete.to(Endpoints.PRODUCT_PHOTO).authenticated().withPathParams({ productId }),

    importCsv: (csv: string, options: { dryRun?: boolean; fileName?: string; type?: string } = {}) =>
        ApiPost.to(Endpoints.PRODUCTS_IMPORT)
            .authenticated()
            .withQueryParams({ dry_run: options.dryRun || undefined })
            .withFileContent(
                'file',
                options.fileName ?? 'products.csv',
                options.type ?? 'text/csv',
                new TextEncoder().encode(csv),
            ),
};
