import { Service } from '@angular/core';
import { EntityClass } from '@service-soft/ngx-entity/entity';
import { EntityService } from '@service-soft/ngx-entity/service';
import { ApiRoute, TENANT_FILTER } from '{{=contractPackage}}';
import { firstValueFrom } from 'rxjs';
import { TenantDeletion } from 'zibri-contract';

import { environment } from '../../environment/environment';
import { Tenant } from '../models/tenant.model';

/**
 * Reads, creates and renames the tenants of the api, deactivates and deletes them, see its TenantController.
 */
@Service()
export class TenantService extends EntityService<Tenant, typeof TENANT_FILTER> {
    readonly entity: EntityClass<Tenant> = Tenant;
    readonly baseUrl: string = `${environment.{{=apiPrefix}}_base_url}/${ApiRoute.TENANTS}`;
    override readonly filter: typeof TENANT_FILTER = TENANT_FILTER;

    // what the sync dialog shows of a change made offline
    override getLabel(tenant: Partial<Tenant>): string {
        return tenant.name ?? 'New tenant';
    }

    /**
     * Deactivates a tenant: the api refuses every request for it until it is reactivated.
     * @param tenant - The tenant.
     */
    async deactivate(tenant: Tenant): Promise<void> {
        await firstValueFrom(this.http.post(`${this.baseUrl}/${tenant.id}/deactivate`, {}));
    }

    /**
     * Reactivates a tenant.
     * @param tenant - The tenant.
     */
    async reactivate(tenant: Tenant): Promise<void> {
        await firstValueFrom(this.http.post(`${this.baseUrl}/${tenant.id}/reactivate`, {}));
    }

    /**
     * Starts deleting a deactivated tenant and every row of it, which goes on in the background.
     * @param tenant - The tenant.
     * @returns The deletion, with how far it got.
     */
    async startDeletion(tenant: Tenant): Promise<TenantDeletion> {
        return await firstValueFrom(this.http.delete<TenantDeletion>(`${this.baseUrl}/${tenant.id}`));
    }

    /**
     * Resolves how far the deletion of a tenant got.
     * @param tenant - The tenant.
     * @returns The deletion.
     */
    async resolveDeletion(tenant: Tenant): Promise<TenantDeletion> {
        return await firstValueFrom(this.http.get<TenantDeletion>(`${this.baseUrl}/${tenant.id}/deletion`));
    }
}
