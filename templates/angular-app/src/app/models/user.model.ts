import { Property } from '@service-soft/ngx-entity/entity';
import { PASSWORD_MIN_LENGTH, UserMembershipData, UserRowData } from '{{=contractPackage}}';

/**
 * The membership of a user in a tenant, as their row shows it.
 */
export class UserMembership implements UserMembershipData {
    @Property.string({ displayName: 'Tenant id', format: 'uuid', display: false })
    tenantId!: string;

    @Property.string({ displayName: 'Tenant' })
    tenantName!: string;

    @Property.array({ displayName: 'Roles', items: { type: 'string' } })
    roles!: string[];

    @Property.date({ displayName: 'Deactivated', required: false })
    deactivatedAt?: Date | null;
}

/**
 * A user of the api, as the admin app shows and edits them. Its properties are the ones of the UserRowData the api
 * answers with, see the contract library: to an administrator of a tenant without their own roles, and with only the
 * membership in that tenant.
 */
export class User implements UserRowData {
    @Property.string({ displayName: 'Id', format: 'uuid', omitForCreate: true, readonly: true, display: false })
    id!: string;

    @Property.string({ displayName: 'Name', position: { row: 1, order: 1 } })
    name!: string;

    @Property.string({ displayName: 'Email', format: 'email', position: { row: 1, order: 2 } })
    email!: string;

    // the first password, which the user changes at their first login. The api never answers it
    @Property.string({ displayName: 'Password', password: true, minLength: PASSWORD_MIN_LENGTH, omitForUpdate: true, position: { row: 2 } })
    password?: string;

    // the api gives a new user its default role
    @Property.array({ displayName: 'Platform roles', items: { type: 'string' }, required: false, omitForCreate: true, readonly: true })
    roles?: string[];

    // changed by the actions of a row, see the UserService
    @Property.array({
        displayName: 'Memberships',
        items: { type: 'object', cls: () => UserMembership },
        omitForCreate: true,
        omitForUpdate: true,
        display: false
    })
    memberships!: UserMembership[];

    @Property.date({ displayName: 'Email verified', required: false, omitForCreate: true, readonly: true })
    emailVerifiedAt?: Date | null;

    @Property.date({ displayName: 'Deactivated', required: false, omitForCreate: true, readonly: true })
    deactivatedAt?: Date | null;
}
