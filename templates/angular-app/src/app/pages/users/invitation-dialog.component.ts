import { Component, inject, resource, ResourceRef, signal, WritableSignal } from '@angular/core';
import { AuthErrorUtilities } from '@service-soft/ngx-auth/auth';
import { ButtonComponent } from '@service-soft/ui/button';
import { DIALOG_DATA, DialogRef } from '@service-soft/ui/dialog';
import { FormComponent } from '@service-soft/ui/form';
import { InputOption } from '@service-soft/ui/input';
import { InputBooleanComponent } from '@service-soft/ui/input-boolean';
import { InputChipsComponent } from '@service-soft/ui/input-chips';
import { InputSelectComponent } from '@service-soft/ui/input-select';
import { InputStringComponent } from '@service-soft/ui/input-string';
import { InvitationRequestData } from '{{=contractPackage}}';

import { InvitationService } from '../../services/invitation.service';
import { RoleService } from '../../services/role.service';

/**
 * Where the dialog invites to.
 */
export type InvitationDialogData = {
    /**
     * The tenant the user acts in, undefined in "All tenants".
     */
    activeTenantId: string | undefined,
    /**
     * The tenant chosen in "All tenants", undefined for an invitation to the application only.
     */
    tenantId: string | undefined
};

/**
 * Invites somebody by email: to the tenant the page shows, with tenant roles there, or to the application only, with
 * platform roles. Closes with true once the invitation was sent.
 */
@Component({
    selector: 'app-invitation-dialog',
    templateUrl: './invitation-dialog.component.html',
    imports: [ButtonComponent, FormComponent, InputBooleanComponent, InputChipsComponent, InputSelectComponent, InputStringComponent]
})
export class InvitationDialogComponent {
    private readonly invitationService: InvitationService = inject(InvitationService);

    private readonly roleService: RoleService = inject(RoleService);

    protected readonly data: InvitationDialogData = inject<InvitationDialogData>(DIALOG_DATA);

    protected readonly dialogRef: DialogRef<boolean> = inject<DialogRef<boolean>>(DialogRef);

    protected readonly toTenant: boolean = (this.data.activeTenantId ?? this.data.tenantId) != undefined;

    protected readonly email: WritableSignal<string> = signal('');

    protected readonly name: WritableSignal<string> = signal('');

    protected readonly roles: WritableSignal<string[]> = signal([]);

    // both are valid: an account once the invited person agreed, or one administrators manage before they answer
    protected readonly createOn: WritableSignal<InvitationRequestData['createOn'] | undefined> = signal('accept');

    protected readonly createOnOptions: InputOption<InvitationRequestData['createOn']>[] = [
        { label: 'When the invitation is accepted', value: 'accept' },
        { label: 'Right away', value: 'invite' }
    ];

    protected readonly declinable: WritableSignal<boolean> = signal(true);

    protected readonly roleOptions: ResourceRef<InputOption<string>[] | undefined> = resource({
        loader: async () => (await this.roleService.resolveRoles(this.toTenant ? 'tenant' : 'platform'))
            .map(role => ({ label: role.name, value: role.name }))
    });

    // what the api answered a refused request with, empty while nothing was refused
    protected readonly errorParagraphs: WritableSignal<string[]> = signal([]);

    /**
     * Sends the invitation, and closes the dialog.
     */
    protected async invite(): Promise<void> {
        this.errorParagraphs.set([]);
        try {
            await this.invitationService.invite({
                email: this.email(),
                name: this.name(),
                roles: this.roles(),
                createOn: this.createOn() ?? 'accept',
                declinable: this.declinable(),
                // without it, the tenant the user acts in, or the application only in "All tenants"
                tenantId: this.data.activeTenantId == undefined ? this.data.tenantId : undefined
            });
            this.dialogRef.close(true);
        }
        catch (error) {
            this.errorParagraphs.set(AuthErrorUtilities.findErrorParagraphs(error) ?? ['The invitation could not be sent.']);
        }
    }
}
