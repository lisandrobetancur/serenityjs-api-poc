import { Masked, Task } from '@serenity-js/core';

import type { CategoryIn, SupplierIn, SupplierUpdate } from '../../api/types';
import { environment } from '../../config/environment';
import { query, Request } from '../interactions/Request';
import { remembered } from '../notes/ApiNotes';

export class Categories {
    static list = () =>
        Task.where(`#actor lists the categories`,
            Request.get('/categories'),
        );

    static fetch = (id: number) =>
        Task.where(`#actor fetches category #${ id }`,
            Request.get(`/categories/${ id }`),
        );

    static create = (category: CategoryIn) =>
        Task.where(`#actor creates the category "${ category.name }"`,
            Request.post('/categories', category),
        );

    static replace = (id: number, category: CategoryIn) =>
        Task.where(`#actor replaces category #${ id }`,
            Request.put(`/categories/${ id }`, category),
        );

    static remove = (id: number) =>
        Task.where(`#actor deletes category #${ id }`,
            Request.delete(`/categories/${ id }`),
        );
}

/**
 * Supplier writes are authorised with an API key rather than a Bearer token.
 */
export type ApiKeyChoice = 'valid' | 'none' | string;

const apiKeyHeader = (apiKey: ApiKeyChoice) => {
    switch (apiKey) {
        case 'none':  return {};
        case 'valid': return { 'X-API-Key': Masked.valueOf(environment.apiKey) };
        default:      return { 'X-API-Key': Masked.valueOf(apiKey) };
    }
};

export class Suppliers {
    static list = (filters: { limit?: number, country?: string, cursor?: string } = {}) =>
        Task.where(`#actor lists the suppliers`,
            Request.get(`/suppliers${ query(filters) }`),
        );

    static listNextPage = (limit: number) =>
        Task.where(`#actor lists the next page of suppliers`,
            Request.get(remembered().get('nextCursor').as(cursor => `/suppliers${ query({ limit, cursor }) }`)),
        );

    static fetch = (id: number) =>
        Task.where(`#actor fetches supplier #${ id }`,
            Request.get(`/suppliers/${ id }`),
        );

    static create = (supplier: SupplierIn, apiKey: ApiKeyChoice = 'valid') =>
        Task.where(`#actor creates the supplier "${ supplier.name }"`,
            Request.post('/suppliers', supplier, { headers: apiKeyHeader(apiKey) }),
        );

    static replace = (id: number, supplier: SupplierIn, apiKey: ApiKeyChoice = 'valid') =>
        Task.where(`#actor replaces supplier #${ id }`,
            Request.put(`/suppliers/${ id }`, supplier, { headers: apiKeyHeader(apiKey) }),
        );

    static update = (id: number, changes: SupplierUpdate, apiKey: ApiKeyChoice = 'valid') =>
        Task.where(`#actor updates supplier #${ id }`,
            Request.patch(`/suppliers/${ id }`, changes, { headers: apiKeyHeader(apiKey) }),
        );

    static remove = (id: number, apiKey: ApiKeyChoice = 'valid') =>
        Task.where(`#actor deletes supplier #${ id }`,
            Request.delete(`/suppliers/${ id }`, { headers: apiKeyHeader(apiKey) }),
        );
}
