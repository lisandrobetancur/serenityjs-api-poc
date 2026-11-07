import { Ensure, equals } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';

import type { ProductCreate } from '../../src/models/types';
import { type FileContent, Products, type QueryParams, TheStatusCode } from '../../src/screenplay';
import { step } from './step';

export const ProductSteps = {
    list: (actor: Actor, params: QueryParams = {}) =>
        step(
            actor,
            Object.keys(params).length
                ? `#actor lists the products by ${describe(params)}`
                : '#actor lists the products',
            Products.list(params),
        ),

    count: (actor: Actor) => step(actor, '#actor counts the products', Products.count()),

    fetch: (actor: Actor, productId: number) =>
        step(actor, `#actor fetches product #${productId}`, Products.fetch(productId)),

    fetchWithEtag: (actor: Actor, productId: number, etag: string) =>
        step(actor, `#actor fetches product #${productId} with the ETag ${etag}`, Products.fetch(productId, etag)),

    /** Precondition: fetch, check the gate and remember the ETag. */
    fetchAndRememberEtag: (actor: Actor, productId: number) =>
        step(
            actor,
            `#actor has fetched product #${productId} and remembered its ETag`,
            Products.fetchAndRememberItsEtag(productId),
            Ensure.that(TheStatusCode.was(), equals(200)),
        ),

    stockOf: (actor: Actor, productId: number) =>
        step(actor, `#actor checks the stock of product #${productId}`, Products.stockOf(productId)),

    ledgerOf: (actor: Actor, productId: number, warehouseId?: number) =>
        step(
            actor,
            `#actor reads the ledger of product #${productId}${warehouseId ? ` in warehouse #${warehouseId}` : ''}`,
            Products.ledgerOf(productId, warehouseId),
        ),

    create: (actor: Actor, payload: ProductCreate) =>
        step(actor, `#actor creates the product ${payload.sku}`, Products.create(payload)),

    replace: (actor: Actor, productId: number, payload: ProductCreate, etag: string) =>
        step(actor, `#actor replaces product #${productId}`, Products.replace(productId, payload, etag)),

    changePrice: (actor: Actor, productId: number, price: number, etag = 'none', contentType = 'application/json') =>
        step(
            actor,
            `#actor changes the price of product #${productId} to ${price}`,
            Products.update(productId, { unit_price: price }, etag, contentType),
        ),

    remove: (actor: Actor, productId: number) =>
        step(actor, `#actor deletes product #${productId}`, Products.remove(productId)),

    readDescription: (actor: Actor, productId: number) =>
        step(actor, `#actor reads the description of product #${productId}`, Products.readDescription(productId)),

    writeDescription: (actor: Actor, productId: number, text: string, contentType = 'text/plain') =>
        step(
            actor,
            `#actor writes the description of product #${productId} as ${contentType}`,
            Products.writeDescription(productId, text, contentType),
        ),

    downloadPhoto: (actor: Actor, productId: number, asAttachment = false) =>
        step(
            actor,
            `#actor downloads the photo of product #${productId}${asAttachment ? ' as an attachment' : ''}`,
            Products.downloadPhoto(productId, asAttachment),
        ),

    uploadPhoto: (actor: Actor, productId: number, file: FileContent) =>
        step(
            actor,
            `#actor uploads ${file.name} as the photo of product #${productId}`,
            Products.uploadPhoto(productId, file),
        ),

    removePhoto: (actor: Actor, productId: number) =>
        step(actor, `#actor removes the photo of product #${productId}`, Products.removePhoto(productId)),

    importCsv: (actor: Actor, csv: string, options: { dryRun?: boolean; fileName?: string; type?: string } = {}) =>
        step(
            actor,
            `#actor imports ${options.fileName ?? 'products.csv'}${options.dryRun ? ' as a dry run' : ''}`,
            Products.importCsv(csv, options),
        ),
};

function describe(params: QueryParams): string {
    return Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
}
