import { FilterConfig } from 'zibri-contract';

/**
 * A tenant of the api: one customer, with its own members and rows.
 */
export type TenantData = {
    /**
     * The id of the tenant, which requests name in their x-tenant-id header.
     */
    id: string,
    /**
     * The name of the tenant.
     */
    name: string,
    /**
     * Since when the tenant is deactivated: every request for it is refused until it is reactivated, and only then can
     * it be deleted.
     */
    deactivatedAt?: Date | null
};

/**
 * A tenant the logged in user is a member of, as GET /tenants/mine answers it, for choosing the tenant to act in.
 */
export type OwnTenantData = Pick<TenantData, 'id' | 'name'>;

/**
 * What the list of tenants can be filtered by, which the api allows and the table of the app offers.
 */
// eslint-disable-next-line typescript/typedef
export const TENANT_FILTER = { name: 'iLike' } as const satisfies FilterConfig<TenantData>;
