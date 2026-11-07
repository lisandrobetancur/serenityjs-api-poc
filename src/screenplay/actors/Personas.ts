import type { UserRole } from '../../models/types';

export interface Persona {
    id: number;
    email: string;
    password: string;
    role: UserRole;
}

/**
 * Personas backed by the Prop Room API seed users.
 * The actor's name in a scenario decides which credentials they use.
 * Any other name is an anonymous guest with no credentials.
 */
export const personas: Record<string, Persona> = {
    Ada: { id: 1, email: 'admin@proproom.test', password: 'Admin123!', role: 'admin' },
    Carl: { id: 2, email: 'clerk@proproom.test', password: 'Clerk123!', role: 'warehouse_clerk' },
    Vera: { id: 3, email: 'viewer@proproom.test', password: 'Viewer123!', role: 'viewer' },
};
