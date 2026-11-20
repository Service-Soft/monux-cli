import { UserData, UserMembershipData, UserRowData } from '{{=contractPackage}}';
import { BaseUserEntity, ChangeSet, ChangeSetEntity, Entity, IntersectionClass, OmitClass, OmitStrict, PartialClass, PasswordCredentialsCreateData, PickClass, Property } from 'zibri';

// 'shared' because one user can be member in multiple tenants. Its roles are the names of roles.
// Its changes are recorded, so the admin app shows who changed what, and can undo it. What the apps read of it is the
// UserData of the contract library
@Entity({ tenant: 'shared' })
export class User extends BaseUserEntity(ChangeSetEntity) implements UserData {
    @Property.string()
    name!: string;
}

// what an administrator sends to create a user, who sets their own password at their first login. Roles, the change
// history and the dates of verifying and deactivating are the api's to set
export class UserCreateDto extends IntersectionClass(
    OmitClass(User, ['id', 'roles', 'changeSets', 'deactivatedAt', 'emailVerifiedAt']),
    PickClass(PasswordCredentialsCreateData, ['password'])
) {}

export class UserUpdateDto extends PartialClass(OmitClass(User, ['id', 'roles', 'changeSets', 'deactivatedAt', 'emailVerifiedAt'])) {}

export type UserCreateData = OmitStrict<User, 'id' | 'changeSets'>;

// the membership of a user in a tenant, as a row of the users shows it
export class UserMembershipRow implements UserMembershipData {
    @Property.string({ format: 'uuid' })
    tenantId!: string;

    @Property.string()
    tenantName!: string;

    @Property.array({ items: { type: 'string' } })
    roles!: string[];

    @Property.date({ required: false })
    deactivatedAt?: Date | null;
}

// a user as GET /users answers them, see the UserRowData of the contract library. A User can't have a relation to the
// memberships, which belong to a tenant, so the UserController puts the rows together
export class UserRow extends OmitClass(User, ['roles', 'changeSets']) implements UserRowData {
    // to a caller who may read every user
    @Property.array({ items: { type: 'string' }, required: false })
    roles?: string[];

    @Property.array({ items: { type: 'object', cls: () => UserMembershipRow } })
    memberships!: UserMembershipRow[];

    // every change made to the account, to a caller who may read every user and reads one
    @Property.array({ items: { type: 'object', cls: () => ChangeSet }, required: false })
    changeSets?: ChangeSet[];
}

// what changes the membership of a user in a tenant. Taking a role away and giving one is checked like the RoleService
// checks it, so nobody hands out a role with permissions they don't hold
export class MembershipUpdateDto {
    @Property.array({ items: { type: 'string' }, required: false })
    roles?: string[];

    // null reactivates the membership, with the roles it kept
    @Property.date({ required: false })
    deactivatedAt?: Date | null;
}

// what gives a user a membership in a tenant
export class MembershipCreateDto {
    @Property.string({ format: 'uuid' })
    tenantId!: string;

    @Property.array({ items: { type: 'string' } })
    roles!: string[];
}
