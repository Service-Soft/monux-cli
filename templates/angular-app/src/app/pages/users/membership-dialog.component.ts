import { Component, inject, resource, ResourceRef, signal, WritableSignal } from '@angular/core';
import { AuthErrorUtilities } from '@service-soft/ngx-auth/auth';
import { ButtonComponent } from '@service-soft/ui/button';
import { DIALOG_DATA, DialogRef } from '@service-soft/ui/dialog';
import { FormComponent } from '@service-soft/ui/form';
import { InputOption } from '@service-soft/ui/input';
import { InputChipsComponent } from '@service-soft/ui/input-chips';

import { User, UserMembership } from '../../models/user.model';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';

/**
 * The member whose roles the dialog changes, and their membership in the tenant the page shows.
 */
export type MembershipDialogData = {
    /**
     * The member.
     */
    user: User,
    /**
     * Their membership.
     */
    membership: UserMembership
};

/**
 * Changes the tenant roles of a member. The api hands out and takes away only what the user may, see the RoleService
 * of zibri. Closes with true once they were saved.
 */
@Component({
    selector: 'app-membership-dialog',
    templateUrl: './membership-dialog.component.html',
    imports: [ButtonComponent, FormComponent, InputChipsComponent]
})
export class MembershipDialogComponent {
    private readonly userService: UserService = inject(UserService);

    private readonly roleService: RoleService = inject(RoleService);

    protected readonly data: MembershipDialogData = inject<MembershipDialogData>(DIALOG_DATA);

    protected readonly dialogRef: DialogRef<boolean> = inject<DialogRef<boolean>>(DialogRef);

    protected readonly roles: WritableSignal<string[]> = signal([...this.data.membership.roles]);

    protected readonly roleOptions: ResourceRef<InputOption<string>[] | undefined> = resource({
        loader: async () => (await this.roleService.resolveRoles('tenant')).map(role => ({ label: role.name, value: role.name }))
    });

    // what the api answered a refused request with, empty while nothing was refused
    protected readonly errorParagraphs: WritableSignal<string[]> = signal([]);

    /**
     * Saves the roles, and closes the dialog.
     */
    protected async save(): Promise<void> {
        this.errorParagraphs.set([]);
        try {
            await this.userService.updateMembership(this.data.user, this.data.membership.tenantId, { roles: this.roles() });
            this.dialogRef.close(true);
        }
        catch (error) {
            this.errorParagraphs.set(AuthErrorUtilities.findErrorParagraphs(error) ?? ['The roles could not be saved.']);
        }
    }
}
