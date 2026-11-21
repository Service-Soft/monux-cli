import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { JsonUtilities, PaginationResult, TenantDeletion } from 'zibri';
import { StartedTestServer, startTestServer } from 'zibri-testing';

import { createRoles, createTenant, loggedIn, loggedInMember, request } from './admin.helper';
import { testApplicationOptions } from './test-application-options';
import { OwnTenant } from '../controllers';
import { PlatformRoles, Roles, Tenant } from '../models';

/**
 * The tenants, as the administrators of the application manage them and every user chooses one.
 */

let server: StartedTestServer;
let baseUrl: string;
let adminToken: string;

/**
 * Sends a request to the tenants of the api, as the given user.
 * @param token - The access token of the user.
 * @param path - The path below /tenants.
 * @param init - The method and body of the request, and the tenant it is for.
 * @returns The answer.
 */
async function tenants(token: string, path: string, init: RequestInit & { tenantId?: string } = {}): Promise<Response> {
    return await request(baseUrl, token, `/tenants${path}`, init);
}

beforeAll(async () => {
    server = await startTestServer({ application: testApplicationOptions });
    baseUrl = await server.start();
    await createRoles();
    adminToken = await loggedIn(baseUrl, 'ada@example.com', PlatformRoles.ADMIN);
}, 30000);

afterAll(async () => {
    await server.shutdown();
}, 30000);

describe('the tenants', () => {

    it('are created and renamed by an administrator of the application, and found by their name', async () => {
        const created: Tenant = await (await tenants(adminToken, '', {
            method: 'POST',
            body: JsonUtilities.stringify({ name: 'Garage' })
        })).json() as Tenant;

        const renamed: Response = await tenants(adminToken, `/${created.id}`, {
            method: 'PATCH',
            body: JsonUtilities.stringify({ name: 'Workshop' })
        });
        expect(renamed.status).toBe(200);

        const res: Response = await tenants(adminToken, `?page=1&limit=10&filter=${encodeURIComponent('{"name":"works"}')}`);
        expect((await res.json() as PaginationResult<Tenant>).items.map(t => t.name)).toEqual(['Workshop']);
    });

    it('of a user are the ones they are a member of, for choosing the one to act in', async () => {
        const tenant: Tenant = await createTenant('Acme');
        await createTenant('Bakery');
        const token: string = await loggedInMember(baseUrl, 'tim@example.com', tenant.id, Roles.USER);

        const res: Response = await tenants(token, '/mine');

        expect(res.status).toBe(200);
        expect(await res.json() as OwnTenant[]).toEqual([{ id: tenant.id, name: 'Acme' }]);
    });

    it('refuse the requests of their members while they are deactivated', async () => {
        const tenant: Tenant = await createTenant('Florist');
        const token: string = await loggedInMember(baseUrl, 'gavin@example.com', tenant.id, Roles.ADMIN);

        expect((await tenants(adminToken, `/${tenant.id}/deactivate`, { method: 'POST' })).status).toBe(200);
        expect((await request(baseUrl, token, '/users?page=1&limit=10', { tenantId: tenant.id })).status).toBe(403);

        expect((await tenants(adminToken, `/${tenant.id}/reactivate`, { method: 'POST' })).status).toBe(200);
        expect((await request(baseUrl, token, '/users?page=1&limit=10', { tenantId: tenant.id })).status).toBe(200);
    });

    it('are deleted once they are deactivated, in the background', async () => {
        const tenant: Tenant = await createTenant('Library');
        expect((await tenants(adminToken, `/${tenant.id}`, { method: 'DELETE' })).status).toBe(400);
        await tenants(adminToken, `/${tenant.id}/deactivate`, { method: 'POST' });

        const res: Response = await tenants(adminToken, `/${tenant.id}`, { method: 'DELETE' });

        expect(res.status).toBe(202);
        expect((await res.json() as TenantDeletion).tenantId).toBe(tenant.id);
        expect((await tenants(adminToken, `/${tenant.id}/deletion`)).status).toBe(200);
    });

    it('are not managed by a user without the permission', async () => {
        const token: string = await loggedIn(baseUrl, 'margaret@example.com', PlatformRoles.USER);

        const res: Response = await tenants(token, '?page=1&limit=10');

        expect(res.status).toBe(403);
    });
});
