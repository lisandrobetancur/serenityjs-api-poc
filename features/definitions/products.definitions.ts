import { type DataTable } from '@cucumber/cucumber';
import { type Actor } from '@serenity-js/core';

import type { ProductCreate } from '../../src/models/types';
import { ProductSteps } from '../steps/ProductSteps';
import { objectFrom } from '../support/values';
import { given, when } from './define';

// A valid 1x1 transparent PNG
const PNG_PIXEL = Uint8Array.from(
    Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
    ),
);

const toCsv = (table: DataTable) =>
    `${table
        .raw()
        .map(row => row.join(','))
        .join('\n')}\n`;
const product = (table: DataTable) => objectFrom(table.rowsHash()) as unknown as ProductCreate;

// Browsing ------------------------------------------------------------------------------------------------------------

when('{actor} lists the products', (actor: Actor) => ProductSteps.list(actor));

when('{actor} lists the products filtered by {word} {string}', (actor: Actor, filter: string, value: string) =>
    ProductSteps.list(actor, { [filter]: value }),
);

when('{actor} lists the products priced between {float} and {float}', (actor: Actor, min: number, max: number) =>
    ProductSteps.list(actor, { min_price: min, max_price: max }),
);

when('{actor} lists the products sorted by {string}', (actor: Actor, sort: string) =>
    ProductSteps.list(actor, { sort }),
);

when('{actor} lists page {int} of the products with {int} per page', (actor: Actor, page: number, perPage: number) =>
    ProductSteps.list(actor, { limit: perPage, offset: (page - 1) * perPage }),
);

when('{actor} counts the products', (actor: Actor) => ProductSteps.count(actor));

when('{actor} fetches product {int}', (actor: Actor, productId: number) => ProductSteps.fetch(actor, productId));

given('{actor} has fetched product {int} and remembered its ETag', (actor: Actor, productId: number) =>
    ProductSteps.fetchAndRememberEtag(actor, productId),
);

when('{actor} fetches product {int} again with the remembered ETag', (actor: Actor, productId: number) =>
    ProductSteps.fetchWithEtag(actor, productId, 'remembered'),
);

when('{actor} fetches product {int} with the ETag {string}', (actor: Actor, productId: number, etag: string) =>
    ProductSteps.fetchWithEtag(actor, productId, etag),
);

when('{actor} checks the stock of product {int}', (actor: Actor, productId: number) =>
    ProductSteps.stockOf(actor, productId),
);

when('{actor} reads the ledger of product {int}', (actor: Actor, productId: number) =>
    ProductSteps.ledgerOf(actor, productId),
);

when(
    '{actor} reads the ledger of product {int} in warehouse {int}',
    (actor: Actor, productId: number, warehouseId: number) => ProductSteps.ledgerOf(actor, productId, warehouseId),
);

// Managing ------------------------------------------------------------------------------------------------------------

when('{actor} creates a product with:', (actor: Actor, table: DataTable) => ProductSteps.create(actor, product(table)));

when(
    '{actor} replaces product {int} using the remembered ETag with:',
    (actor: Actor, productId: number, table: DataTable) =>
        ProductSteps.replace(actor, productId, product(table), 'remembered'),
);

when(
    '{actor} replaces product {int} using the ETag {string} with:',
    (actor: Actor, productId: number, etag: string, table: DataTable) =>
        ProductSteps.replace(actor, productId, product(table), etag),
);

when('{actor} changes the price of product {int} to {float}', (actor: Actor, productId: number, price: number) =>
    ProductSteps.changePrice(actor, productId, price),
);

when(
    '{actor} changes the price of product {int} to {float} using a merge patch',
    (actor: Actor, productId: number, price: number) =>
        ProductSteps.changePrice(actor, productId, price, 'none', 'application/merge-patch+json'),
);

when(
    '{actor} changes the price of product {int} to {float} using the ETag {string}',
    (actor: Actor, productId: number, price: number, etag: string) =>
        ProductSteps.changePrice(actor, productId, price, etag),
);

when('{actor} deletes product {int}', (actor: Actor, productId: number) => ProductSteps.remove(actor, productId));

// Content -------------------------------------------------------------------------------------------------------------

when('{actor} reads the description of product {int}', (actor: Actor, productId: number) =>
    ProductSteps.readDescription(actor, productId),
);

when('{actor} writes the description of product {int} as {string}', (actor: Actor, productId: number, text: string) =>
    ProductSteps.writeDescription(actor, productId, text),
);

when('{actor} writes the description of product {int} as JSON', (actor: Actor, productId: number) =>
    ProductSteps.writeDescription(
        actor,
        productId,
        JSON.stringify({ description: 'JSON is not plain text' }),
        'application/json',
    ),
);

when('{actor} downloads the photo of product {int}', (actor: Actor, productId: number) =>
    ProductSteps.downloadPhoto(actor, productId),
);

when('{actor} downloads the photo of product {int} as an attachment', (actor: Actor, productId: number) =>
    ProductSteps.downloadPhoto(actor, productId, true),
);

when('{actor} uploads a PNG photo for product {int}', (actor: Actor, productId: number) =>
    ProductSteps.uploadPhoto(actor, productId, { name: 'prop.png', type: 'image/png', content: PNG_PIXEL }),
);

when('{actor} uploads a text file as the photo of product {int}', (actor: Actor, productId: number) =>
    ProductSteps.uploadPhoto(actor, productId, {
        name: 'notes.txt',
        type: 'text/plain',
        content: new TextEncoder().encode('not an image'),
    }),
);

when('{actor} uploads a {int} MB photo for product {int}', (actor: Actor, megabytes: number, productId: number) => {
    const content = new Uint8Array(megabytes * 1024 * 1024);
    content.set(PNG_PIXEL);
    return ProductSteps.uploadPhoto(actor, productId, { name: 'huge.png', type: 'image/png', content });
});

when('{actor} removes the photo of product {int}', (actor: Actor, productId: number) =>
    ProductSteps.removePhoto(actor, productId),
);

when('{actor} imports the following products as a dry run:', (actor: Actor, table: DataTable) =>
    ProductSteps.importCsv(actor, toCsv(table), { dryRun: true }),
);

when('{actor} imports the following products:', (actor: Actor, table: DataTable) =>
    ProductSteps.importCsv(actor, toCsv(table)),
);

when('{actor} imports a CSV file with the header {string}', (actor: Actor, header: string) =>
    ProductSteps.importCsv(actor, `${header}\nCrown,5\n`),
);

when('{actor} imports a JSON file as products', (actor: Actor) =>
    ProductSteps.importCsv(actor, '[{"sku":"JSON-001"}]', { fileName: 'products.json', type: 'application/json' }),
);
