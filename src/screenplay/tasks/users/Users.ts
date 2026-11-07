import type { UserRole } from '../../../models/types';
import { Endpoints } from '../../../utils/constants/Endpoints';
import { ApiDelete, ApiGet, ApiPatch } from '../../interactions/api/ApiCall';

export const Users = {
    list: (params: { role?: UserRole; limit?: number; offset?: number } = {}) =>
        ApiGet.to(Endpoints.USERS).authenticated().withQueryParams(params),

    fetch: (userId: number) => ApiGet.to(Endpoints.USER).authenticated().withPathParams({ userId }),

    update: (userId: number, payload: { name?: string; role?: UserRole }) =>
        ApiPatch.to(Endpoints.USER).authenticated().withPathParams({ userId }).withBody(payload),

    remove: (userId: number) => ApiDelete.to(Endpoints.USER).authenticated().withPathParams({ userId }),
};
