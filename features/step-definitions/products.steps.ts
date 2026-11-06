import { DataTable, Given, When } from '@cucumber/cucumber';
import { Actor } from '@serenity-js/core';

import type { ProductCreate } from '../../src/api/types';
import { Products } from '../../src/screenplay';
import { objectFrom } from '../support/values';

// A valid 1x1 transparent PNG
const PNG_PIXEL = Uint8Array.from(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
));

const toCsv = (table: DataTable) =>
    table.raw().map(row => row.join(',')).join('\n') + '\n';

// ---------------------------------------------------------------------------------------------------------------------
// Browsing
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} lists the products', (actor: Actor) =>
    actor.attemptsTo(
        Products.list(),
    ));

When('{actor} lists the products filtered by {word} {string}', (actor: Actor, filter: string, value: string) =>
    actor.attemptsTo(
        Products.list({ [filter]: value }),
    ));

When('{actor} lists the products priced between {float} and {float}', (actor: Actor, min: number, max: number) =>
    actor.attemptsTo(
        Products.list({ min_price: min, max_price: max }),
    ));

When('{actor} lists the products sorted by {string}', (actor: Actor, sort: string) =>
    actor.attemptsTo(
        Products.list({ sort }),
    ));

When('{actor} lists page {int} of the products with {int} per page', (actor: Actor, page: number, perPage: number) =>
    actor.attemptsTo(
        Products.list({ limit: perPage, offset: (page - 1) * perPage }),
    ));

When('{actor} counts the products', (actor: Actor) =>
    actor.attemptsTo(
        Products.count(),
    ));

When('{actor} fetches product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.fetch(id),
    ));

Given('{actor} has fetched product {int} and remembered its ETag', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.fetchAndRememberEtag(id),
    ));

When('{actor} fetches product {int} again with the remembered ETag', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.fetch(id, 'remembered'),
    ));

When('{actor} fetches product {int} with the ETag {string}', (actor: Actor, id: number, etag: string) =>
    actor.attemptsTo(
        Products.fetch(id, etag),
    ));

When('{actor} checks the stock of product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.stockOf(id),
    ));

When('{actor} reads the ledger of product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.ledgerOf(id),
    ));

When('{actor} reads the ledger of product {int} in warehouse {int}', (actor: Actor, id: number, warehouseId: number) =>
    actor.attemptsTo(
        Products.ledgerOf(id, warehouseId),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Managing
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} creates a product with:', (actor: Actor, table: DataTable) =>
    actor.attemptsTo(
        Products.create(objectFrom(table.rowsHash()) as ProductCreate),
    ));

When('{actor} replaces product {int} using the remembered ETag with:', (actor: Actor, id: number, table: DataTable) =>
    actor.attemptsTo(
        Products.replace(id, objectFrom(table.rowsHash()) as ProductCreate, 'remembered'),
    ));

When('{actor} replaces product {int} using the ETag {string} with:', (actor: Actor, id: number, etag: string, table: DataTable) =>
    actor.attemptsTo(
        Products.replace(id, objectFrom(table.rowsHash()) as ProductCreate, etag),
    ));

When('{actor} changes the price of product {int} to {float}', (actor: Actor, id: number, price: number) =>
    actor.attemptsTo(
        Products.update(id, { unit_price: price }),
    ));

When('{actor} changes the price of product {int} to {float} using a merge patch', (actor: Actor, id: number, price: number) =>
    actor.attemptsTo(
        Products.update(id, { unit_price: price }, 'none', 'application/merge-patch+json'),
    ));

When('{actor} changes the price of product {int} to {float} using the ETag {string}', (actor: Actor, id: number, price: number, etag: string) =>
    actor.attemptsTo(
        Products.update(id, { unit_price: price }, etag),
    ));

When('{actor} deletes product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.remove(id),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} reads the description of product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.readDescription(id),
    ));

When('{actor} writes the description of product {int} as {string}', (actor: Actor, id: number, text: string) =>
    actor.attemptsTo(
        Products.writeDescription(id, text),
    ));

When('{actor} writes the description of product {int} as JSON', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.writeDescription(id, JSON.stringify({ description: 'JSON is not plain text' }), 'application/json'),
    ));

When('{actor} downloads the photo of product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.downloadPhoto(id),
    ));

When('{actor} downloads the photo of product {int} as an attachment', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.downloadPhoto(id, true),
    ));

When('{actor} uploads a PNG photo for product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.uploadPhoto(id, { name: 'prop.png', type: 'image/png', content: PNG_PIXEL }),
    ));

When('{actor} uploads a text file as the photo of product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.uploadPhoto(id, { name: 'notes.txt', type: 'text/plain', content: new TextEncoder().encode('not an image') }),
    ));

When('{actor} uploads a {int} MB photo for product {int}', (actor: Actor, megabytes: number, id: number) => {
    const content = new Uint8Array(megabytes * 1024 * 1024);
    content.set(PNG_PIXEL);
    return actor.attemptsTo(
        Products.uploadPhoto(id, { name: 'huge.png', type: 'image/png', content }),
    );
});

When('{actor} removes the photo of product {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Products.removePhoto(id),
    ));

When('{actor} imports the following products as a dry run:', (actor: Actor, table: DataTable) =>
    actor.attemptsTo(
        Products.importCsv(toCsv(table), { dryRun: true }),
    ));

When('{actor} imports the following products:', (actor: Actor, table: DataTable) =>
    actor.attemptsTo(
        Products.importCsv(toCsv(table)),
    ));

When('{actor} imports a CSV file with the header {string}', (actor: Actor, header: string) =>
    actor.attemptsTo(
        Products.importCsv(`${ header }\nCrown,5\n`),
    ));

When('{actor} imports a JSON file as products', (actor: Actor) =>
    actor.attemptsTo(
        Products.importCsv('[{"sku":"JSON-001"}]', { fileName: 'products.json', type: 'application/json' }),
    ));
