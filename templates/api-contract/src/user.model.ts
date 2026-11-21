import { FilterConfig } from 'zibri-contract';

/**
 * A user of the api, the account itself. The entity of the api implements it.
 */
export type UserData = {
    /**
     * The id of the user.
     */
    id: string,
    /**
     * The email they log in with.
     */
    email: string,
    /**
     * Their name.
     */
    name: string,
    /**
     * The names of their own roles, which carry their platform permissions.
     */
    roles: string[],
    /**
     * When they verified their email, if they did.
     */
    emailVerifiedAt?: Date | null,
    /**
     * Since when they can't log in anymore, if they can't.
     */
    deactivatedAt?: Date | null
};

/**
 * The membership of a user in a tenant, as a row of the users shows it.
 */
export type UserMembershipData = {
    /**
     * The id of the tenant.
     */
    tenantId: string,
    /**
     * The name of the tenant.
     */
    tenantName: string,
    /**
     * The names of the tenant roles the user holds there.
     */
    roles: string[],
    /**
     * Since when the user can't act in the tenant anymore, if they can't. They keep their roles.
     */
    deactivatedAt?: Date | null
};

/**
 * A user as GET /users answers them, which the model of the apps implements. To the administrators of the application
 * the account with its own roles and every membership. To the administrators of a tenant the account without its own
 * roles, and only the membership in their tenant.
 */
export type UserRowData = Omit<UserData, 'roles'> & {
    /**
     * The names of their own roles, to a caller who may read every user.
     */
    roles?: string[],
    /**
     * Their memberships: in every tenant to an administrator of the application naming none, else in the tenant of
     * the request.
     */
    memberships: UserMembershipData[]
};

/**
 * What the list of users can be filtered by, which the api allows and the table of the app offers. The tenant of a
 * membership narrows it to the members of one tenant, for a request naming none.
 */
// eslint-disable-next-line typescript/typedef
export const USER_FILTER = {
    email: 'iLike',
    name: 'iLike',
    memberships: { tenantId: 'equals' }
} as const satisfies FilterConfig<UserRowData>;

/**
 * One user in a file of users to import: a json array of these.
 */
export type ImportedUser = Pick<UserData, 'name' | 'email'>;
