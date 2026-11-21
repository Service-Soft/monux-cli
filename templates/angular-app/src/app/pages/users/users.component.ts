import { Component, computed, inject, resource, ResourceRef, signal, Signal, viewChild, WritableSignal } from '@angular/core';
import { EntityTableColumnInput, EntityTableComponent } from '@service-soft/ngx-entity/table';
import { ButtonComponent } from '@service-soft/ui/button';
import { ConfirmDialogComponent, ConfirmDialogData, DialogService } from '@service-soft/ui/dialog';
import { InputOption } from '@service-soft/ui/input';
import { InputAutocompleteComponent } from '@service-soft/ui/input-autocomplete';
import { Permissions, PlatformPermission, PlatformPermissions, USER_FILTER } from '{{=contractPackage}}';
import { FilterValue } from 'zibri-contract';

import { AppAuthService } from '../../app-auth.service';
import { Invitation } from '../../models/invitation.model';
import { User, UserMembership } from '../../models/user.model';
import { InvitationService } from '../../services/invitation.service';
import { TenantService } from '../../services/tenant.service';
import { UserService } from '../../services/user.service';
import { InvitationDialogComponent, InvitationDialogData } from './invitation-dialog.component';
import { MembershipDialogComponent, MembershipDialogData } from './membership-dialog.component';

/**
 * The users and invitations. In a tenant its members, whose memberships its administrators change. In "All tenants"
 * every user, whose accounts the administrators of the application change, and the members of the tenant they choose.
 * What a button needs is what the api checks again.
 */
@Component({
    selector: 'app-users',
    templateUrl: './users.component.html',
    imports: [EntityTableComponent, ButtonComponent, InputAutocompleteComponent]
})
export class UsersComponent {
    private readonly dialogService: DialogService = inject(DialogService);

    private readonly tenantService: TenantService = inject(TenantService);

    private readonly usersTable: Signal<EntityTableComponent<User, typeof USER_FILTER>> = viewChild.required('usersTable');

    private readonly invitationsTable: Signal<EntityTableComponent<Invitation> | undefined> = viewChild('invitationsTable');

    protected readonly userService: UserService = inject(UserService);

    protected readonly invitationService: InvitationService = inject(InvitationService);

    protected readonly authService: AppAuthService = inject(AppAuthService);

    // the tenant the user acts in, undefined in "All tenants". The page is created again for another one, see
    // app.component.html
    protected readonly activeTenantId: string | undefined = this.authService.activeTenantId();

    // the tenant whose members an administrator of the application looks at in "All tenants"
    protected readonly chosenTenantId: WritableSignal<string | undefined> = signal(undefined);

    protected readonly tenantQuery: WritableSignal<string> = signal('');

    protected readonly mayChooseTenant: boolean = this.activeTenantId == undefined
        && this.authService.hasPlatformPermission(PlatformPermissions.TENANTS_READ);

    // the tenants by the name typed into the filter, as there can be many
    private readonly tenants: ResourceRef<InputOption<string>[] | undefined> = resource({
        params: () => this.mayChooseTenant ? this.tenantQuery() : undefined,
        loader: async ({ params }) => (await this.tenantService.resolvePage({ page: 1, limit: 20, filter: { name: params } }))
            .items
            .map(tenant => ({ label: tenant.name, value: tenant.id }))
    });

    protected readonly tenantOptions: Signal<InputOption<string>[]> = computed(() => this.tenants.hasValue() ? this.tenants.value() : []);

    // the members of the tenant the user acts in, or of the one they chose in "All tenants"
    protected readonly membershipTenantId: Signal<string | undefined> = computed(() => this.activeTenantId ?? this.chosenTenantId());

    // what "All tenants" asks the api for, see the USER_FILTER of the contract library
    protected readonly fixedFilter: Signal<FilterValue<User, typeof USER_FILTER>> = computed(() => {
        const tenantId: string | undefined = this.chosenTenantId();
        return tenantId == undefined ? {} : { memberships: { tenantId } };
    });

    protected readonly columns: Signal<EntityTableColumnInput<User>[]> = computed(() => this.membershipTenantId() == undefined
        ? [
            'name',
            'email',
            'roles',
            { key: 'memberships', label: $localize`:@@users.tenantsColumn:Tenants`, value: user => this.resolveTenantsText(user) }
        ]
        : [
            'name',
            'email',
            { key: 'memberships', label: $localize`:@@users.rolesColumn:Roles`, value: user => this.resolveMembershipText(user) }
        ]);

    // the tenant of each invitation in "All tenants"
    protected readonly invitationColumns: EntityTableColumnInput<Invitation>[] = this.activeTenantId == undefined
        ? ['email', 'name', 'tenantName', 'roles', 'tokenExpiresAt']
        : ['email', 'name', 'roles', 'tokenExpiresAt'];

    // the accounts are the administrators' of the application, in "All tenants", where every account shows
    protected readonly mayCreate: boolean = this.isAllTenants(PlatformPermissions.USERS_CREATE);

    protected readonly mayUpdate: boolean = this.isAllTenants(PlatformPermissions.USERS_UPDATE);

    protected readonly mayDelete: boolean = this.isAllTenants(PlatformPermissions.USERS_DELETE);

    protected readonly mayImport: boolean = this.isAllTenants(PlatformPermissions.USERS_IMPORT);

    protected readonly mayInvite: boolean = this.authService.hasAnyLevelPermission({
        permission: Permissions.MEMBERS_INVITE,
        platformPermission: PlatformPermissions.USERS_CREATE
    });

    protected readonly mayUpdateMemberships: boolean = this.authService.hasAnyLevelPermission({
        permission: Permissions.MEMBERS_UPDATE,
        platformPermission: PlatformPermissions.MEMBERSHIPS_MANAGE
    });

    protected readonly mayRemoveMembers: boolean = this.authService.hasAnyLevelPermission({
        permission: Permissions.MEMBERS_REMOVE,
        platformPermission: PlatformPermissions.MEMBERSHIPS_MANAGE
    });

    /**
     * Finds the membership of a user the page shows, in the tenant of membershipTenantId.
     * @param user - The user.
     * @returns The membership, undefined in "All tenants" without a chosen tenant.
     */
    protected findMembership(user: User): UserMembership | undefined {
        return user.memberships.find(membership => membership.tenantId === this.membershipTenantId());
    }

    /**
     * Resolves what screen readers call the button that changes the roles of a member, with their name, as every row
     * has one.
     * @param user - The member.
     * @returns The name of the button.
     */
    protected resolveRolesLabel(user: User): string {
        return $localize`:@@users.rolesLabel:Roles of ${user.name}:name:`;
    }

    /**
     * Resolves what the button that deactivates or reactivates a membership says.
     * @param membership - The membership in the tenant the page shows.
     * @returns The text of the button.
     */
    protected resolveToggleText(membership: UserMembership): string {
        return membership.deactivatedAt == undefined
            ? $localize`:@@users.deactivate:Deactivate`
            : $localize`:@@users.reactivate:Reactivate`;
    }

    /**
     * Resolves what screen readers call the button that deactivates or reactivates a membership, with the name of the
     * member.
     * @param user - The member.
     * @param membership - Their membership in the tenant the page shows.
     * @returns The name of the button.
     */
    protected resolveToggleLabel(user: User, membership: UserMembership): string {
        return membership.deactivatedAt == undefined
            ? $localize`:@@users.deactivateLabel:Deactivate ${user.name}:name:`
            : $localize`:@@users.reactivateLabel:Reactivate ${user.name}:name:`;
    }

    /**
     * Resolves what screen readers call the button that takes a member out of the tenant, with their name.
     * @param user - The member.
     * @returns The name of the button.
     */
    protected resolveRemoveLabel(user: User): string {
        return $localize`:@@users.removeLabel:Remove ${user.name}:name:`;
    }

    /**
     * Resolves what screen readers call the button that mails an invitation again, with its email.
     * @param invitation - The invitation.
     * @returns The name of the button.
     */
    protected resolveResendLabel(invitation: Invitation): string {
        return $localize`:@@users.resendLabel:Send again to ${invitation.email}:email:`;
    }

    /**
     * Changes the roles of a member in a dialog.
     * @param user - The member.
     * @param membership - Their membership in the tenant the page shows.
     */
    protected async changeRoles(user: User, membership: UserMembership): Promise<void> {
        const data: MembershipDialogData = { user, membership };
        if (await this.dialogService.open<boolean>(MembershipDialogComponent, data).closed === true) {
            this.usersTable().reload();
        }
    }

    /**
     * Deactivates a membership, which keeps its roles, or reactivates it.
     * @param user - The member.
     * @param membership - Their membership in the tenant the page shows.
     */
    protected async toggleDeactivated(user: User, membership: UserMembership): Promise<void> {
        await this.userService.updateMembership(user, membership.tenantId, { deactivated: membership.deactivatedAt == undefined });
        this.usersTable().reload();
    }

    /**
     * Takes a member out of the tenant, after asking.
     * @param user - The member.
     * @param membership - Their membership in the tenant the page shows.
     */
    protected async remove(user: User, membership: UserMembership): Promise<void> {
        const data: ConfirmDialogData = {
            title: $localize`:@@users.removeTitle:Remove ${user.name}:user: from ${membership.tenantName}:tenant:?`,
            paragraphs: [$localize`:@@users.removeText:They lose their roles there. Their account stays.`],
            confirmButtonLabel: $localize`:@@users.removeConfirm:Remove`,
            cancelButtonLabel: $localize`:@@users.removeCancel:Cancel`,
            confirmButtonColor: 'error'
        };
        if (await this.dialogService.open<boolean>(ConfirmDialogComponent, data).closed === true) {
            await this.userService.deleteMembership(user, membership.tenantId);
            this.usersTable().reload();
        }
    }

    /**
     * Invites somebody in a dialog: to the tenant the page shows, or to the application only.
     */
    protected async invite(): Promise<void> {
        const data: InvitationDialogData = { activeTenantId: this.activeTenantId, tenantId: this.chosenTenantId() };
        if (await this.dialogService.open<boolean>(InvitationDialogComponent, data).closed === true) {
            this.invitationsTable()?.reload();
        }
    }

    /**
     * Mails an invitation again, with a new link.
     * @param invitation - The invitation.
     */
    protected async resend(invitation: Invitation): Promise<void> {
        await this.invitationService.resend(invitation);
        this.invitationsTable()?.reload();
    }

    private resolveTenantsText(user: User): string {
        return user.memberships.map(membership => membership.tenantName).join(', ');
    }

    private resolveMembershipText(user: User): string {
        const membership: UserMembership | undefined = this.findMembership(user);
        if (membership == undefined) {
            return '';
        }
        const roles: string = membership.roles.join(', ');
        return membership.deactivatedAt == undefined ? roles : $localize`:@@users.deactivatedRoles:${roles}:roles: (deactivated)`;
    }

    private isAllTenants(permission: PlatformPermission): boolean {
        return this.activeTenantId == undefined && this.authService.hasPlatformPermission(permission);
    }
}
