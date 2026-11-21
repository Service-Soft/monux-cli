import { Component, inject, Signal, viewChild } from '@angular/core';
import { EntityTableComponent } from '@service-soft/ngx-entity/table';
import { ButtonComponent } from '@service-soft/ui/button';
import { DialogService } from '@service-soft/ui/dialog';
import { PlatformPermissions, TENANT_FILTER } from '{{=contractPackage}}';

import { AppAuthService } from '../../app-auth.service';
import { Tenant } from '../../models/tenant.model';
import { TenantService } from '../../services/tenant.service';
import { DeleteTenantDialogComponent } from './delete-tenant-dialog.component';

/**
 * The tenants, which the administrators of the application create, rename, deactivate and delete. A tenant is
 * deactivated before it can be deleted: the api refuses its requests from then on.
 */
@Component({
    selector: 'app-tenants',
    templateUrl: './tenants.component.html',
    imports: [EntityTableComponent, ButtonComponent]
})
export class TenantsComponent {
    private readonly authService: AppAuthService = inject(AppAuthService);

    private readonly dialogService: DialogService = inject(DialogService);

    private readonly table: Signal<EntityTableComponent<Tenant, typeof TENANT_FILTER>> = viewChild.required('table');

    protected readonly tenantService: TenantService = inject(TenantService);

    protected readonly mayCreate: boolean = this.authService.hasPlatformPermission(PlatformPermissions.TENANTS_CREATE);

    protected readonly mayUpdate: boolean = this.authService.hasPlatformPermission(PlatformPermissions.TENANTS_UPDATE);

    protected readonly mayDelete: boolean = this.authService.hasPlatformPermission(PlatformPermissions.TENANTS_DELETE);

    /**
     * Resolves what the button that deactivates or reactivates a tenant says.
     * @param tenant - The tenant.
     * @returns The text of the button.
     */
    protected resolveToggleText(tenant: Tenant): string {
        return tenant.deactivatedAt == undefined
            ? $localize`:@@tenants.deactivate:Deactivate`
            : $localize`:@@tenants.reactivate:Reactivate`;
    }

    /**
     * Resolves what screen readers call the button that deactivates or reactivates a tenant, with its name, as every
     * row has one.
     * @param tenant - The tenant.
     * @returns The name of the button.
     */
    protected resolveToggleLabel(tenant: Tenant): string {
        return tenant.deactivatedAt == undefined
            ? $localize`:@@tenants.deactivateLabel:Deactivate ${tenant.name}:name:`
            : $localize`:@@tenants.reactivateLabel:Reactivate ${tenant.name}:name:`;
    }

    /**
     * Resolves what screen readers call the button that deletes a tenant, with its name.
     * @param tenant - The tenant.
     * @returns The name of the button.
     */
    protected resolveDeleteLabel(tenant: Tenant): string {
        return $localize`:@@tenants.deleteLabel:Delete ${tenant.name}:name:`;
    }

    /**
     * Deactivates a tenant, or reactivates it.
     * @param tenant - The tenant.
     */
    protected async toggleDeactivated(tenant: Tenant): Promise<void> {
        await (tenant.deactivatedAt == undefined ? this.tenantService.deactivate(tenant) : this.tenantService.reactivate(tenant));
        this.table().reload();
    }

    /**
     * Deletes a deactivated tenant in a dialog, which asks for its name first and shows how far it got.
     * @param tenant - The tenant.
     */
    protected async delete(tenant: Tenant): Promise<void> {
        await this.dialogService.open(DeleteTenantDialogComponent, tenant).closed;
        this.table().reload();
    }
}
