import { Masked } from '@serenity-js/core';

import type { CategoryIn, SupplierIn, SupplierUpdate } from '../../../models/types';
import { EnvironmentConfig } from '../../../utils/config/EnvironmentConfig';
import { Endpoints } from '../../../utils/constants/Endpoints';
import { Headers } from '../../../utils/constants/Patterns';
import { type ApiCall, ApiDelete, ApiGet, ApiPatch, ApiPost, ApiPut } from '../../interactions/api/ApiCall';
import { scene } from '../../notes/Notes';

export const Categories = {
    list: () => ApiGet.to(Endpoints.CATEGORIES),

    fetch: (categoryId: number) => ApiGet.to(Endpoints.CATEGORY).withPathParams({ categoryId }),

    create: (payload: CategoryIn) => ApiPost.to(Endpoints.CATEGORIES).authenticated().withBody(payload),

    replace: (categoryId: number, payload: CategoryIn) =>
        ApiPut.to(Endpoints.CATEGORY).authenticated().withPathParams({ categoryId }).withBody(payload),

    remove: (categoryId: number) => ApiDelete.to(Endpoints.CATEGORY).authenticated().withPathParams({ categoryId }),

    removeTheCreatedOne: () =>
        ApiDelete.to(Endpoints.CATEGORY)
            .authenticated()
            .withPathParams({ categoryId: scene().get('createdId') }),
};

/** Supplier writes are authorised with an API key instead of a Bearer token. */
export type ApiKeyChoice = 'valid' | 'none' | string;

const withApiKey = (call: ApiCall, apiKey: ApiKeyChoice): ApiCall => {
    if (apiKey === 'none') {
        return call;
    }
    const value = apiKey === 'valid' ? (EnvironmentConfig.flag('API_KEY') ?? 'test-api-key-123') : apiKey;
    return call.withHeader(Headers.API_KEY, Masked.valueOf(value));
};

export const Suppliers = {
    list: (params: { limit?: number; country?: string; cursor?: string } = {}) =>
        ApiGet.to(Endpoints.SUPPLIERS).withQueryParams(params),

    listTheNextPage: (limit: number) =>
        ApiGet.to(Endpoints.SUPPLIERS).withQueryParams({ limit, cursor: scene().get('nextCursor') }),

    fetch: (supplierId: number) => ApiGet.to(Endpoints.SUPPLIER).withPathParams({ supplierId }),

    create: (payload: SupplierIn, apiKey: ApiKeyChoice = 'valid') =>
        withApiKey(ApiPost.to(Endpoints.SUPPLIERS).withBody(payload), apiKey),

    replace: (supplierId: number, payload: SupplierIn, apiKey: ApiKeyChoice = 'valid') =>
        withApiKey(ApiPut.to(Endpoints.SUPPLIER).withPathParams({ supplierId }).withBody(payload), apiKey),

    update: (supplierId: number, changes: SupplierUpdate, apiKey: ApiKeyChoice = 'valid') =>
        withApiKey(ApiPatch.to(Endpoints.SUPPLIER).withPathParams({ supplierId }).withBody(changes), apiKey),

    remove: (supplierId: number, apiKey: ApiKeyChoice = 'valid') =>
        withApiKey(ApiDelete.to(Endpoints.SUPPLIER).withPathParams({ supplierId }), apiKey),

    removeTheCreatedOne: () =>
        withApiKey(ApiDelete.to(Endpoints.SUPPLIER).withPathParams({ supplierId: scene().get('createdId') }), 'valid'),
};
