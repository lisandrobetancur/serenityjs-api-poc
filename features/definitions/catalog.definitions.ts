import { type Actor } from '@serenity-js/core';

import { CatalogSteps } from '../steps/CatalogSteps';
import { given, when } from './define';

// Categories ----------------------------------------------------------------------------------------------------------

when('{actor} lists the categories', (actor: Actor) => CatalogSteps.listCategories(actor));

when('{actor} fetches category {int}', (actor: Actor, categoryId: number) =>
    CatalogSteps.fetchCategory(actor, categoryId),
);

when('{actor} creates the category {string} described as {string}', (actor: Actor, name: string, description: string) =>
    CatalogSteps.createCategory(actor, name, description),
);

given(
    '{actor} has created the category {string} described as {string}',
    (actor: Actor, name: string, description: string) =>
        CatalogSteps.createCategoryAndRemember(actor, name, description),
);

when('{actor} renames category {int} to {string}', (actor: Actor, categoryId: number, name: string) =>
    CatalogSteps.renameCategory(actor, categoryId, name),
);

when('{actor} deletes category {int}', (actor: Actor, categoryId: number) =>
    CatalogSteps.deleteCategory(actor, categoryId),
);

when('{actor} deletes the category [he|she|they] created', (actor: Actor) => CatalogSteps.deleteCreatedCategory(actor));

// Suppliers -----------------------------------------------------------------------------------------------------------

when('{actor} lists the suppliers', (actor: Actor) => CatalogSteps.listSuppliers(actor));

when('{actor} lists the suppliers {int} at a time', (actor: Actor, limit: number) =>
    CatalogSteps.listSuppliersAndRememberCursor(actor, limit),
);

when('{actor} lists the next page of suppliers {int} at a time', (actor: Actor, limit: number) =>
    CatalogSteps.listNextSuppliers(actor, limit),
);

when('{actor} lists the suppliers from the cursor {string}', (actor: Actor, cursor: string) =>
    CatalogSteps.listSuppliers(actor, { cursor }),
);

when('{actor} lists the suppliers from {string}', (actor: Actor, country: string) =>
    CatalogSteps.listSuppliers(actor, { country }),
);

when('{actor} creates the supplier {string} with a valid API key', (actor: Actor, name: string) =>
    CatalogSteps.createSupplier(actor, { name, email: 'orders@example.test', country: 'Spain' }),
);

given('{actor} has created the supplier {string} with a valid API key', (actor: Actor, name: string) =>
    CatalogSteps.createSupplierAndRemember(actor, { name }),
);

when('{actor} creates the supplier {string} with no API key', (actor: Actor, name: string) =>
    CatalogSteps.createSupplier(actor, { name }, 'none'),
);

when('{actor} creates the supplier {string} with the API key {string}', (actor: Actor, name: string, apiKey: string) =>
    CatalogSteps.createSupplier(actor, { name }, apiKey),
);

when(
    '{actor} replaces supplier {int} with the name {string} from {string}',
    (actor: Actor, supplierId: number, name: string, country: string) =>
        CatalogSteps.replaceSupplier(actor, supplierId, { name, country }),
);

when('{actor} changes the phone of supplier {int} to {string}', (actor: Actor, supplierId: number, phone: string) =>
    CatalogSteps.updateSupplier(actor, supplierId, { phone }),
);

when('{actor} deletes supplier {int}', (actor: Actor, supplierId: number) =>
    CatalogSteps.deleteSupplier(actor, supplierId),
);

when('{actor} deletes the supplier [he|she|they] created', (actor: Actor) => CatalogSteps.deleteCreatedSupplier(actor));
