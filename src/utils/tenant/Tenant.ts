/**
 * Tenants (countries, regions, brands) the API serves. The tenant decides the default `X-Tenant` header.
 *
 * A scenario selects its tenant with a tag such as `@acme_land`; `TenantHook` stores the values in notes.
 * Projects adopting this base replace the catalog below with their own.
 */
export interface TenantDefinition {
    tag: string;
    displayName: string;
    code: string;
    dialCode: string;
    timeZone: string;
}

export const Tenants: readonly TenantDefinition[] = [
    { tag: '@acme_land', displayName: 'Acme Land', code: 'AC', dialCode: '+999', timeZone: 'UTC' },
];

export class Tenant {
    static fromTags(tags: readonly string[]): TenantDefinition | undefined {
        return Tenants.find(tenant => tags.includes(tenant.tag));
    }

    static from(displayName: string): TenantDefinition {
        const tenant = Tenants.find(candidate => candidate.displayName.toLowerCase() === displayName.toLowerCase());
        if (!tenant) {
            throw new Error(
                `Unknown tenant "${displayName}". Known tenants: ${Tenants.map(t => t.displayName).join(', ')}`,
            );
        }
        return tenant;
    }
}
