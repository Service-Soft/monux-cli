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
        ? ['name', 'email', 'roles', { key: 'memberships', label: 'Tenants', value: user => this.resolveTenantsText(user) }]
        : ['name', 'email', { key: 'memberships', label: 'Roles', value: user => this.resolveMembershipText(user) }]);

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
        // null is how the api reactivates a membership, with the roles it kept
        // eslint-disable-next-line unicorn/no-null
        const deactivatedAt: Date | null = membership.deactivatedAt == undefined ? new Date() : null;
        await this.userService.updateMembership(user, membership.tenantId, { deactivatedAt });
        this.usersTable().reload();
    }

    /**
     * Takes a member out of the tenant, after asking.
     * @param user - The member.
     * @param membership - Their membership in the tenant the page shows.
     */
    protected async remove(user: User, membership: UserMembership): Promise<void> {
        const data: ConfirmDialogData = {
            title: `Remove ${user.name} from ${membership.tenantName}?`,
            paragraphs: ['They lose their roles there. Their account stays.'],
            confirmButtonLabel: 'Remove',
            cancelButtonLabel: 'Cancel',
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
        return membership.deactivatedAt == undefined ? membership.roles.join(', ') : `${membership.roles.join(', ')} (deactivated)`;
    }

    private isAllTenants(permission: PlatformPermission): boolean {
        return this.activeTenantId == undefined && this.authService.hasPlatformPermission(permission);
    }
}
