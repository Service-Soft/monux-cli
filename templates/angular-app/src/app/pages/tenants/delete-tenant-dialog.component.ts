import { Component, computed, inject, OnDestroy, signal, Signal, WritableSignal } from '@angular/core';
import { AuthErrorUtilities } from '@service-soft/ngx-auth/auth';
import { ButtonComponent } from '@service-soft/ui/button';
import { DIALOG_DATA, DialogRef } from '@service-soft/ui/dialog';
import { FormComponent } from '@service-soft/ui/form';
import { InputStringComponent } from '@service-soft/ui/input-string';
import { TenantDeletion } from 'zibri-contract';

import { Tenant } from '../../models/tenant.model';
import { TenantService } from '../../services/tenant.service';

// how often the dialog asks how far the deletion got
const PROGRESS_INTERVAL_IN_MS: number = 1000;

/**
 * Deletes a deactivated tenant and every row of it, for good, once the user typed its name. The api deletes in the
 * background, and the dialog shows how far it got until the tenant is gone.
 */
@Component({
    selector: 'app-delete-tenant-dialog',
    templateUrl: './delete-tenant-dialog.component.html',
    imports: [ButtonComponent, FormComponent, InputStringComponent]
})
export class DeleteTenantDialogComponent implements OnDestroy {
    private readonly tenantService: TenantService = inject(TenantService);

    private interval: ReturnType<typeof setInterval> | undefined;

    protected readonly tenant: Tenant = inject<Tenant>(DIALOG_DATA);

    protected readonly dialogRef: DialogRef = inject(DialogRef);

    protected readonly typedName: WritableSignal<string> = signal('');

    protected readonly deletion: WritableSignal<TenantDeletion | undefined> = signal(undefined);

    protected readonly isFinished: Signal<boolean> = computed(() => this.deletion()?.finishedAt != undefined);

    // what the api answered a refused request with, empty while nothing was refused
    protected readonly errorParagraphs: WritableSignal<string[]> = signal([]);

    /**
     * Starts the deletion, and follows it until the tenant is gone.
     */
    protected async delete(): Promise<void> {
        this.errorParagraphs.set([]);
        try {
            this.deletion.set(await this.tenantService.startDeletion(this.tenant));
            this.interval = setInterval(() => void this.follow(), PROGRESS_INTERVAL_IN_MS);
        }
        catch (error) {
            this.errorParagraphs.set(AuthErrorUtilities.findErrorParagraphs(error) ?? ['The tenant could not be deleted.']);
        }
    }

    ngOnDestroy(): void {
        clearInterval(this.interval);
    }

    private async follow(): Promise<void> {
        const deletion: TenantDeletion = await this.tenantService.resolveDeletion(this.tenant);
        this.deletion.set(deletion);
        if (deletion.finishedAt != undefined) {
            clearInterval(this.interval);
        }
    }
}
