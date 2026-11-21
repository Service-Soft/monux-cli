import { inject, JsonUtilities, PasswordCredentials, PasswordCredentialsCreateData, Repository, repositoryTokenFor, ZIBRI_DI_TOKENS } from 'zibri';

import { Permissions, PlatformPermissions, PlatformRoles, Roles, Tenant, User } from '../models';
import { MembershipRepository, RoleRepository, UserRepository } from '../repositories';

const PASSWORD: string = 'a password long enough';

/**
 * Creates the roles a test starts with, as the default data does when the application starts.
 */
export async function createRoles(): Promise<void> {
    await inject(RoleRepository).createAll([
        { name: PlatformRoles.USER, level: 'platform', permissions: [], description: 'Everybody with an account' },
        {
            name: PlatformRoles.ADMIN,
            level: 'platform',
            permissions: Object.values(PlatformPermissions),
            description: 'Administers the application'
        },
        { name: Roles.USER, level: 'tenant', permissions: [], description: 'Everybody in a tenant' },
        { name: Roles.ADMIN, level: 'tenant', permissions: Object.values(Permissions), description: 'Administers a tenant' }
    ]);
}

/**
 * Creates a tenant.
 * @param name - The name of the tenant.
 * @returns The tenant.
 */
export async function createTenant(name: string): Promise<Tenant> {
    return await inject<Repository<Tenant>>(repositoryTokenFor(Tenant)).create({ name });
}

/**
 * Creates a user with the given platform role, who logs in with the password of the tests.
 * @param email - The email of the user, also their name.
 * @param role - The platform role of the user.
 * @returns The user.
 */
export async function createUser(email: string, role: PlatformRoles): Promise<User> {
    const user: User = await inject(UserRepository).create({ name: email, email, roles: [role] });
    await inject<Repository<PasswordCredentials, PasswordCredentialsCreateData>>(repositoryTokenFor(PasswordCredentials))
        .create({ userId: user.id, password: PASSWORD });
    return user;
}

/**
 * Makes a user a member of a tenant.
 * @param userId - The id of the user.
 * @param tenantId - The id of the tenant.
 * @param role - The tenant role of the user there.
 */
export async function addMember(userId: string, tenantId: string, role: Roles): Promise<void> {
    await inject(ZIBRI_DI_TOKENS.TENANT_SERVICE).runAs(tenantId, async () => {
        await inject(MembershipRepository).create({ userId, roles: [role] });
    });
}

/**
 * Logs a user in with the password of the tests.
 * @param baseUrl - Where the test server listens.
 * @param email - Who logs in.
 * @returns The access token of the login.
 */
export async function logIn(baseUrl: string, email: string): Promise<string> {
    const res: Response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JsonUtilities.stringify({ email, password: PASSWORD })
    });
    return (await res.json() as { accessToken: { value: string } }).accessToken.value;
}

/**
 * Creates a user with the given platform role and logs them in.
 * @param baseUrl - Where the test server listens.
 * @param email - Who logs in.
 * @param role - The platform role of the user.
 * @returns The access token of the login.
 */
export async function loggedIn(baseUrl: string, email: string, role: PlatformRoles): Promise<string> {
    await createUser(email, role);
    return await logIn(baseUrl, email);
}

/**
 * Creates a user without platform permissions, makes them a member of a tenant and logs them in.
 * @param baseUrl - Where the test server listens.
 * @param email - Who logs in.
 * @param tenantId - The tenant they are a member of.
 * @param role - Their tenant role there.
 * @returns The access token of the login.
 */
export async function loggedInMember(baseUrl: string, email: string, tenantId: string, role: Roles): Promise<string> {
    const user: User = await createUser(email, PlatformRoles.USER);
    await addMember(user.id, tenantId, role);
    return await logIn(baseUrl, email);
}

/**
 * Sends a request to the api, as the given user.
 * @param baseUrl - Where the test server listens.
 * @param token - The access token of the user.
 * @param path - The path, with its query.
 * @param init - The method and body of the request, and the tenant it is for.
 * @returns The answer.
 */
export async function request(
    baseUrl: string,
    token: string,
    path: string,
    init: RequestInit & { tenantId?: string } = {}
): Promise<Response> {
    const { tenantId, ...rest } = init;
    return await fetch(`${baseUrl}${path}`, {
        ...rest,
        headers: {
            authorization: `Bearer ${token}`,
            ...tenantId == undefined ? {} : { 'x-tenant-id': tenantId },
            ...rest.body == undefined || rest.body instanceof FormData ? {} : { 'content-type': 'application/json' }
        }
    });
}
