import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { ChangeSet, JsonUtilities, PaginationResult } from 'zibri';
import { StartedTestServer, startTestServer } from 'zibri-testing';

import { addMember, createRoles, createTenant, createUser, loggedIn, loggedInMember, request } from './admin.helper';
import { testApplicationOptions } from './test-application-options';
import { RoleRow } from '../controllers';
import { PlatformRoles, Roles, Tenant, User, UserRow } from '../models';

/**
 * The users as the admin app manages them: every user by the administrators of the application, the members of a
 * tenant by its administrators.
 */

let server: StartedTestServer;
let baseUrl: string;
let adminToken: string;
let tenant: Tenant;
let otherTenant: Tenant;
let tenantAdminToken: string;
let member: User;

/**
 * Sends a request to the users of the api, as the given user.
 * @param token - The access token of the user.
 * @param path - The path below /users.
 * @param init - The method and body of the request, and the tenant it is for.
 * @returns The answer.
 */
async function users(token: string, path: string, init: RequestInit & { tenantId?: string } = {}): Promise<Response> {
    return await request(baseUrl, token, `/users${path}`, init);
}

beforeAll(async () => {
    server = await startTestServer({ application: testApplicationOptions });
    baseUrl = await server.start();
    await createRoles();
    adminToken = await loggedIn(baseUrl, 'ada@example.com', PlatformRoles.ADMIN);
    tenant = await createTenant('Acme');
    otherTenant = await createTenant('Bakery');
    tenantAdminToken = await loggedInMember(baseUrl, 'tim@example.com', tenant.id, Roles.ADMIN);
    member = await createUser('mia@example.com', PlatformRoles.USER);
    await addMember(member.id, tenant.id, Roles.USER);
    await addMember(member.id, otherTenant.id, Roles.USER);
}, 30000);

afterAll(async () => {
    await server.shutdown();
}, 30000);

describe('the users', () => {

    it('are created by an administrator, with the change set of their creation', async () => {
        const res: Response = await users(adminToken, '', {
            method: 'POST',
            body: JsonUtilities.stringify({ name: 'Grace', email: 'grace@example.com', password: 'a password long enough' })
        });

        expect(res.status).toBe(201);
        const user: UserRow = await res.json() as UserRow;
        expect(user.name).toBe('Grace');
        expect(user.changeSets).toHaveLength(1);
    });

    it('can have a change undone', async () => {
        const created: UserRow = await (await users(adminToken, '', {
            method: 'POST',
            body: JsonUtilities.stringify({ name: 'Linus', email: 'linus@example.com', password: 'a password long enough' })
        })).json() as UserRow;
        const updated: UserRow = await (await users(adminToken, `/${created.id}`, {
            method: 'PATCH',
            body: JsonUtilities.stringify({ name: 'Linus T.' })
        })).json() as UserRow;
        expect(updated.name).toBe('Linus T.');
        const update: ChangeSet | undefined = updated.changeSets?.find(c => created.changeSets?.some(original => original.id === c.id) !== true);

        const res: Response = await users(adminToken, `/${created.id}/reset`, {
            method: 'POST',
            body: JsonUtilities.stringify({ changeSetId: update?.id })
        });

        expect(res.status).toBe(200);
        expect((await res.json() as { entity: UserRow }).entity.name).toBe('Linus');
    });

    it('are imported from a json file', async () => {
        const form: FormData = new FormData();
        const file: string = JsonUtilities.stringify([{ name: 'Alan', email: 'alan@example.com' }, { name: 'Barbara', email: 'barbara@example.com' }]);
        form.append('import', new Blob([file], { type: 'application/json' }), 'users.json');

        const res: Response = await users(adminToken, '/import', { method: 'POST', body: form });

        expect(res.status).toBe(200);
        expect((await res.json() as UserRow[]).map(u => u.email)).toEqual(['alan@example.com', 'barbara@example.com']);
    });

    it('are read by an administrator of the application with their own roles and every membership', async () => {
        const res: Response = await users(adminToken, `?page=1&limit=10&filter=${encodeURIComponent('{"email":"mia"}')}`);

        expect(res.status).toBe(200);
        const [row] = (await res.json() as PaginationResult<UserRow>).items;
        expect(row.roles).toEqual([PlatformRoles.USER]);
        expect(new Set(row.memberships.map(m => m.tenantName))).toEqual(new Set(['Acme', 'Bakery']));
    });

    it('of one tenant are read by an administrator of the application naming no tenant', async () => {
        const filter: string = encodeURIComponent(`{"memberships":{"tenantId":"${otherTenant.id}"}}`);
        const res: Response = await users(adminToken, `?page=1&limit=10&filter=${filter}`);

        expect(res.status).toBe(200);
        expect((await res.json() as PaginationResult<UserRow>).items.map(u => u.email)).toEqual(['mia@example.com']);
    });

    it('of a tenant are read by its administrators, without their own roles and other memberships', async () => {
        const res: Response = await users(tenantAdminToken, '?page=1&limit=10', { tenantId: tenant.id });

        expect(res.status).toBe(200);
        const rows: UserRow[] = (await res.json() as PaginationResult<UserRow>).items;
        expect(new Set(rows.map(u => u.email))).toEqual(new Set(['mia@example.com', 'tim@example.com']));
        const row: UserRow | undefined = rows.find(u => u.id === member.id);
        expect(row?.roles).toBeUndefined();
        expect(row?.memberships.map(m => m.tenantName)).toEqual(['Acme']);
    });

    it('are not read by the administrators of a tenant naming none', async () => {
        const res: Response = await users(tenantAdminToken, '?page=1&limit=10');

        expect(res.status).toBe(403);
    });

    it('are not found by the administrators of a tenant they are no member of', async () => {
        const outsider: User = await createUser('olaf@example.com', PlatformRoles.USER);

        const res: Response = await users(tenantAdminToken, `/${outsider.id}`, { tenantId: tenant.id });

        expect(res.status).toBe(404);
    });

    it('get their roles in a tenant from its administrators', async () => {
        const res: Response = await users(tenantAdminToken, `/${member.id}/memberships/${tenant.id}`, {
            method: 'PATCH',
            tenantId: tenant.id,
            body: JsonUtilities.stringify({ roles: [Roles.ADMIN] })
        });

        expect(res.status).toBe(200);
        expect((await res.json() as UserRow).memberships[0].roles).toEqual([Roles.ADMIN]);
    });

    it('keep their memberships in other tenants from the administrators of a tenant', async () => {
        const res: Response = await users(tenantAdminToken, `/${member.id}/memberships/${otherTenant.id}`, {
            method: 'DELETE',
            tenantId: tenant.id
        });

        expect(res.status).toBe(403);
    });

    it('get a membership in any tenant from an administrator of the application', async () => {
        const user: User = await createUser('sam@example.com', PlatformRoles.USER);

        const res: Response = await users(adminToken, `/${user.id}/memberships`, {
            method: 'POST',
            body: JsonUtilities.stringify({ tenantId: otherTenant.id, roles: [Roles.USER] })
        });

        expect(res.status).toBe(201);
        expect((await res.json() as UserRow).memberships.map(m => m.tenantName)).toEqual(['Bakery']);
    });

    it('are taken out of a tenant by its administrators', async () => {
        const user: User = await createUser('kim@example.com', PlatformRoles.USER);
        await addMember(user.id, tenant.id, Roles.USER);

        const res: Response = await users(tenantAdminToken, `/${user.id}/memberships/${tenant.id}`, {
            method: 'DELETE',
            tenantId: tenant.id
        });

        expect(res.status).toBe(204);
        expect((await (await users(adminToken, `/${user.id}`)).json() as UserRow).memberships).toEqual([]);
    });

    it('get the tenant roles from the administrators of a tenant, who are offered no other', async () => {
        const res: Response = await request(baseUrl, tenantAdminToken, '/roles', { tenantId: tenant.id });

        expect(res.status).toBe(200);
        expect(new Set((await res.json() as RoleRow[]).map(r => r.name))).toEqual(new Set([Roles.USER, Roles.ADMIN]));
    });

    it('are not shown to a user without the permission', async () => {
        const token: string = await loggedIn(baseUrl, 'margaret@example.com', PlatformRoles.USER);

        const res: Response = await users(token, '?page=1&limit=10');

        expect(res.status).toBe(403);
    });
});
