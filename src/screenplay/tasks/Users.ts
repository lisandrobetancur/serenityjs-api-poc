import { Task } from '@serenity-js/core';

import type { UserRole } from '../../api/types';
import { query, Request } from '../interactions/Request';

export class Users {
    static list = (filters: { role?: UserRole, limit?: number, offset?: number } = {}) =>
        Task.where(`#actor lists the users`,
            Request.get(`/users${ query(filters) }`),
        );

    static fetch = (id: number) =>
        Task.where(`#actor fetches user #${ id }`,
            Request.get(`/users/${ id }`),
        );

    static who = () =>
        Task.where(`#actor asks who they are`,
            Request.get('/auth/me'),
        );

    static rename = (id: number, name: string) =>
        Task.where(`#actor renames user #${ id } to "${ name }"`,
            Request.patch(`/users/${ id }`, { name }),
        );

    static changeRole = (id: number, role: UserRole) =>
        Task.where(`#actor changes the role of user #${ id } to ${ role }`,
            Request.patch(`/users/${ id }`, { role }),
        );

    static remove = (id: number) =>
        Task.where(`#actor deletes user #${ id }`,
            Request.delete(`/users/${ id }`),
        );
}
