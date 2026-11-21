import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { inject, JsonUtilities, PaginationResult } from 'zibri';
import { StartedTestServer, startTestServer } from 'zibri-testing';

import { createRoles, createTenant, loggedIn, loggedInMember, request } from './admin.helper';
import { testApplicationOptions } from './test-application-options';
import { InvitationRow } from '../controllers';
import { PlatformRoles, Roles, Tenant, User } from '../models';
import { UserRepository } from '../repositories';

/**
 * The invitations of the admin app: to a tenant by its administrators, to any tenant or to the application by the
 * administrators of the application.
 */

let server: StartedTestServer;
let baseUrl: string;
let adminToken: string;
let tenant: Tenant;
let otherTenant: Tenant;
let tenantAdminToken: string;

/**
 * Invites somebody, as the given user.
 * @param token - The access token of the user.
 * @param data - Who is invited where.
 * @param tenantId - The tenant of the request, if any.
 * @returns The answer.
 */
async function invite(token: string, data: object, tenantId?: string): Promise<Response> {
    return await request(baseUrl, token, '/invitations', {
        method: 'POST',
        tenantId,
        body: JsonUtilities.stringify({ roles: [Roles.USER], createOn: 'accept', declinable: true, ...data })
    });
}

beforeAll(async () => {
    server = await startTestServer({ application: testApplicationOptions });
    baseUrl = await server.start();
    await createRoles();
    adminToken = await loggedIn(baseUrl, 'ada@example.com', PlatformRoles.ADMIN);
    tenant = await createTenant('Acme');
    otherTenant = await createTenant('Bakery');
    tenantAdminToken = await loggedInMember(baseUrl, 'tim@example.com', tenant.id, Roles.ADMIN);
}, 30000);

afterAll(async () => {
    await server.shutdown();
}, 30000);

describe('the invitations', () => {

    it('are sent by the administrators of a tenant to it, and listed there', async () => {
        const res: Response = await invite(tenantAdminToken, { email: 'mia@example.com', name: 'Mia' }, tenant.id);

        expect(res.status).toBe(201);
        expect((await res.json() as InvitationRow).tenantName).toBe('Acme');
        const list: Response = await request(baseUrl, tenantAdminToken, '/invitations?page=1&limit=10', { tenantId: tenant.id });
        expect((await list.json() as PaginationResult<InvitationRow>).items.map(i => i.email)).toEqual(['mia@example.com']);
    });

    it('are not sent by the administrators of a tenant to another tenant', async () => {
        const res: Response = await invite(tenantAdminToken, { email: 'sam@example.com', name: 'Sam', tenantId: otherTenant.id }, tenant.id);

        expect(res.status).toBe(403);
    });

    it('create the account of the invited person right away when asked to', async () => {
        const res: Response = await invite(adminToken, { email: 'kim@example.com', name: 'Kim', tenantId: otherTenant.id, createOn: 'invite' });

        expect(res.status).toBe(201);
        const user: User = await inject(UserRepository).findOne({ where: { email: 'kim@example.com' } });
        expect(user.name).toBe('Kim');
    });

    it('of every tenant are read and revoked by an administrator of the application naming none', async () => {
        const list: Response = await request(baseUrl, adminToken, '/invitations?page=1&limit=10');
        const invitations: InvitationRow[] = (await list.json() as PaginationResult<InvitationRow>).items;
        expect(new Set(invitations.map(i => i.tenantName))).toEqual(new Set(['Acme', 'Bakery']));

        const res: Response = await request(baseUrl, adminToken, `/invitations/${invitations[0].id}`, { method: 'DELETE' });

        expect(res.status).toBe(204);
    });

    it('are not sent by a user without the permission', async () => {
        const token: string = await loggedIn(baseUrl, 'margaret@example.com', PlatformRoles.USER);

        const res: Response = await invite(token, { email: 'olaf@example.com', name: 'Olaf', roles: [] });

        expect(res.status).toBe(403);
    });
});
