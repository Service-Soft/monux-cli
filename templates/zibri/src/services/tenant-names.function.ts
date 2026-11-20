import { inject, Repository, repositoryTokenFor } from 'zibri';

import { Tenant } from '../models';

/**
 * Finds the names of tenants, for the rows the admin app shows them in.
 * @param tenantIds - The ids of the tenants, which may repeat.
 * @returns The name of each tenant, by its id.
 */
export async function findTenantNames(tenantIds: string[]): Promise<Map<string, string>> {
    if (!tenantIds.length) {
        return new Map();
    }
    const tenants: Tenant[] = await inject<Repository<Tenant>>(repositoryTokenFor(Tenant))
        .findAll({ where: { id: [...new Set(tenantIds)] }, limit: 'all' });
    return new Map(tenants.map(tenant => [tenant.id, tenant.name]));
}
