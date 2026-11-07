import { Ensure, equals } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import type { SupplierIn, SupplierUpdate } from '../../src/models/types';
import { type ApiKeyChoice, Categories, scene, Suppliers, TheStatusCode } from '../../src/screenplay';
import { Endpoints } from '../../src/utils/constants/Endpoints';
import { step } from './step';

export const CatalogSteps = {
    listCategories: (actor: Actor) => step(actor, '#actor lists the categories', Categories.list()),

    fetchCategory: (actor: Actor, categoryId: number) =>
        step(actor, `#actor fetches category #${categoryId}`, Categories.fetch(categoryId)),

    createCategory: (actor: Actor, name: string, description: string) =>
        step(actor, `#actor creates the category "${name}"`, Categories.create({ name, description })),

    /** Precondition: create, check the gate and remember the id (for later steps and the cleanup hook). */
    createCategoryAndRemember: (actor: Actor, name: string, description: string) =>
        step(
            actor,
            `#actor has created the category "${name}"`,
            Categories.create({ name, description }),
            Ensure.that(TheStatusCode.was(), equals(201)),
            scene().set('createdId', LastResponse.body<{ id: number }>().id),
            scene().set('createdResource', Endpoints.CATEGORY),
        ),

    renameCategory: (actor: Actor, categoryId: number, name: string) =>
        step(actor, `#actor renames category #${categoryId} to "${name}"`, Categories.replace(categoryId, { name })),

    deleteCategory: (actor: Actor, categoryId: number) =>
        step(actor, `#actor deletes category #${categoryId}`, Categories.remove(categoryId)),

    deleteCreatedCategory: (actor: Actor) =>
        step(actor, '#actor deletes the category they created', Categories.removeTheCreatedOne()),

    listSuppliers: (actor: Actor, params: { limit?: number; country?: string; cursor?: string } = {}) =>
        step(actor, '#actor lists the suppliers', Suppliers.list(params)),

    listSuppliersAndRememberCursor: (actor: Actor, limit: number) =>
        step(
            actor,
            `#actor lists the suppliers ${limit} at a time`,
            Suppliers.list({ limit }),
            scene().set('nextCursor', LastResponse.body<{ next_cursor: string }>().next_cursor),
        ),

    listNextSuppliers: (actor: Actor, limit: number) =>
        step(actor, `#actor lists the next ${limit} suppliers`, Suppliers.listTheNextPage(limit)),

    createSupplier: (actor: Actor, payload: SupplierIn, apiKey: ApiKeyChoice = 'valid') =>
        step(actor, `#actor creates the supplier "${payload.name}"`, Suppliers.create(payload, apiKey)),

    createSupplierAndRemember: (actor: Actor, payload: SupplierIn) =>
        step(
            actor,
            `#actor has created the supplier "${payload.name}"`,
            Suppliers.create(payload),
            Ensure.that(TheStatusCode.was(), equals(201)),
            scene().set('createdId', LastResponse.body<{ id: number }>().id),
            scene().set('createdResource', Endpoints.SUPPLIER),
        ),

    replaceSupplier: (actor: Actor, supplierId: number, payload: SupplierIn) =>
        step(actor, `#actor replaces supplier #${supplierId}`, Suppliers.replace(supplierId, payload)),

    updateSupplier: (actor: Actor, supplierId: number, changes: SupplierUpdate) =>
        step(actor, `#actor updates supplier #${supplierId}`, Suppliers.update(supplierId, changes)),

    deleteSupplier: (actor: Actor, supplierId: number) =>
        step(actor, `#actor deletes supplier #${supplierId}`, Suppliers.remove(supplierId)),

    deleteCreatedSupplier: (actor: Actor) =>
        step(actor, '#actor deletes the supplier they created', Suppliers.removeTheCreatedOne()),
};
