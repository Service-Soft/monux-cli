import { DefinedPermissions, definePermissions, DefinedPlatformPermissions, definePlatformPermissions, ZIBRI_PERMISSIONS, ZIBRI_PLATFORM_PERMISSIONS } from 'zibri-contract';

// every permission of {{=apiName}}: what its routes ask for, what its roles carry, and what its apps show and hide by.
// A permission is held through a membership in a tenant, a platform permission by the roles of the user themselves.
// zibri's own are spread in, and a name belongs to one level only, see the permissions docs of zibri

// what the administrators of a tenant may do in it: with its members, its invitations and its logs
// eslint-disable-next-line typescript/typedef
const PERMISSIONS = [
    ...ZIBRI_PERMISSIONS,
    'members.read',
    'members.invite',
    'members.update',
    'members.remove',
    'logs.read'
] as const;

// what the administrators of the application may do: with every user, tenant and log
// eslint-disable-next-line typescript/typedef
const PLATFORM_PERMISSIONS = [
    ...ZIBRI_PLATFORM_PERMISSIONS,
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'users.import',
    // the memberships of any tenant, such as for support adding somebody to a tenant right away
    'memberships.manage',
    'tenants.read',
    'tenants.create',
    'tenants.update',
    'tenants.delete',
    // the logs of every tenant, and of none
    'logs.read_all'
] as const;

/**
 * The permissions held through a membership in a tenant, by name: `Permissions.MEMBERS_READ` is 'members.read'.
 */
export const Permissions: DefinedPermissions<typeof PERMISSIONS> = definePermissions(PERMISSIONS);

/**
 * The permissions held by the roles of the user themselves, whichever tenant a request is for, by name.
 */
export const PlatformPermissions: DefinedPlatformPermissions<typeof PLATFORM_PERMISSIONS> = definePlatformPermissions(PLATFORM_PERMISSIONS);

/**
 * A permission held through a membership in a tenant.
 */
export type Permission = typeof Permissions[keyof typeof Permissions];

/**
 * A permission held by the roles of the user themselves, whichever tenant a request is for.
 */
export type PlatformPermission = typeof PlatformPermissions[keyof typeof PlatformPermissions];
