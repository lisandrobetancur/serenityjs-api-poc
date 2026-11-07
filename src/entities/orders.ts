import { Databases } from '../utils/database/DatabaseNames';
import { type TableDefinition } from '../utils/database/TableDefinition';

/**
 * Row types of the fictitious example database (`<environment>_orders`), the counterpart of Hibernate entities.
 * Native types are cast explicitly in SQL when needed (e.g. `:status::text`).
 */
export interface OrderRow extends Record<string, unknown> {
    id: string;
    reference: string;
    status: string;
    total: string;
    customer_email: string;
    notes: string | null;
    expires_at: Date | null;
    updated_at: Date;
}

export interface AppUserRow extends Record<string, unknown> {
    id: string;
    email: string;
    password: string;
    tenant: string;
}

export const OrdersTable: TableDefinition<OrderRow> = {
    table: 'public.orders',
    primaryKey: 'id',
    database: Databases.ORDERS,
};

export const AppUsersTable: TableDefinition<AppUserRow> = {
    table: 'public.app_users',
    primaryKey: 'id',
    maskedColumns: ['password'],
    database: Databases.ORDERS,
};
