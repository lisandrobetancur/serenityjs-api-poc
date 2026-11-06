import { Given, When } from '@cucumber/cucumber';
import { Actor } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import { Categories, remembered, Suppliers } from '../../src/screenplay';

const createdId = () => remembered().get('createdId');

// ---------------------------------------------------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} lists the categories', (actor: Actor) =>
    actor.attemptsTo(
        Categories.list(),
    ));

When('{actor} fetches category {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Categories.fetch(id),
    ));

When('{actor} creates the category {string} described as {string}', (actor: Actor, name: string, description: string) =>
    actor.attemptsTo(
        Categories.create({ name, description }),
    ));

Given('{actor} has created the category {string} described as {string}', (actor: Actor, name: string, description: string) =>
    actor.attemptsTo(
        Categories.create({ name, description }),
        remembered().set('createdId', LastResponse.body<{ id: number }>().id),
    ));

When('{actor} renames category {int} to {string}', (actor: Actor, id: number, name: string) =>
    actor.attemptsTo(
        Categories.replace(id, { name }),
    ));

When('{actor} deletes category {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Categories.remove(id),
    ));

When('{actor} deletes the category (he)(she)(they) created', async (actor: Actor) =>
    actor.attemptsTo(
        Categories.remove(await actor.answer(createdId())),
    ));

// ---------------------------------------------------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------------------------------------------------

When('{actor} lists the suppliers', (actor: Actor) =>
    actor.attemptsTo(
        Suppliers.list(),
    ));

When('{actor} lists the suppliers {int} at a time', (actor: Actor, limit: number) =>
    actor.attemptsTo(
        Suppliers.list({ limit }),
        remembered().set('nextCursor', LastResponse.body<{ next_cursor: string }>().next_cursor),
    ));

When('{actor} lists the next page of suppliers {int} at a time', (actor: Actor, limit: number) =>
    actor.attemptsTo(
        Suppliers.listNextPage(limit),
    ));

When('{actor} lists the suppliers from the cursor {string}', (actor: Actor, cursor: string) =>
    actor.attemptsTo(
        Suppliers.list({ cursor }),
    ));

When('{actor} lists the suppliers from {string}', (actor: Actor, country: string) =>
    actor.attemptsTo(
        Suppliers.list({ country }),
    ));

When('{actor} creates the supplier {string} with a valid API key', (actor: Actor, name: string) =>
    actor.attemptsTo(
        Suppliers.create({ name, email: 'orders@example.test', country: 'Spain' }),
    ));

Given('{actor} has created the supplier {string} with a valid API key', (actor: Actor, name: string) =>
    actor.attemptsTo(
        Suppliers.create({ name }),
        remembered().set('createdId', LastResponse.body<{ id: number }>().id),
    ));

When('{actor} creates the supplier {string} with no API key', (actor: Actor, name: string) =>
    actor.attemptsTo(
        Suppliers.create({ name }, 'none'),
    ));

When('{actor} creates the supplier {string} with the API key {string}', (actor: Actor, name: string, apiKey: string) =>
    actor.attemptsTo(
        Suppliers.create({ name }, apiKey),
    ));

When('{actor} replaces supplier {int} with the name {string} from {string}', (actor: Actor, id: number, name: string, country: string) =>
    actor.attemptsTo(
        Suppliers.replace(id, { name, country }),
    ));

When('{actor} changes the phone of supplier {int} to {string}', (actor: Actor, id: number, phone: string) =>
    actor.attemptsTo(
        Suppliers.update(id, { phone }),
    ));

When('{actor} deletes supplier {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Suppliers.remove(id),
    ));

When('{actor} deletes the supplier (he)(she)(they) created', async (actor: Actor) =>
    actor.attemptsTo(
        Suppliers.remove(await actor.answer(createdId())),
    ));
