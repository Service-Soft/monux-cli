import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { JsonUtilities, Log, LogLevel, PaginationResult } from 'zibri';
import { StartedTestServer, startTestServer } from 'zibri-testing';

import { createRoles, createTenant, loggedIn, loggedInMember, request } from './admin.helper';
import { testApplicationOptions } from './test-application-options';
import { LOG_APPLICATIONS } from '../log-applications';
import { PlatformRoles, Roles, Tenant } from '../models';

/**
 * The logs the apps send and the admin app reads: every log by the administrators of the application, the logs of a
 * tenant by its administrators.
 */

let server: StartedTestServer;
let baseUrl: string;
let adminToken: string;
let tenant: Tenant;
let tenantAdminToken: string;

/**
 * Sends a log as an app does.
 * @param application - The app the log is from.
 * @param message - What the log says.
 * @param from - The access token and the tenant of a logged in user, if one sends it.
 * @param from.token - The access token.
 * @param from.tenantId - The tenant of the request.
 * @returns The status of the answer.
 */
async function sendLog(application: string, message: string, from?: { token: string, tenantId: string }): Promise<number> {
    const res: Response = await fetch(`${baseUrl}/logs`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...from == undefined ? {} : { authorization: `Bearer ${from.token}`, 'x-tenant-id': from.tenantId }
        },
        body: JsonUtilities.stringify({ application, level: LogLevel.ERROR, message, context: { origin: 'TaskPageComponent' } })
    });
    await res.arrayBuffer();
    return res.status;
}

/**
 * Reads the messages of the logs of the admin app, as the given user.
 * @param token - The access token of the user.
 * @param tenantId - The tenant of the request, if any.
 * @returns The messages.
 */
async function readMessages(token: string, tenantId?: string): Promise<string[]> {
    const res: Response = await request(baseUrl, token, '/logs?page=1&limit=10&applications=admin', { tenantId });
    expect(res.status).toBe(200);
    return (await res.json() as PaginationResult<Log>).items.map(l => l.message);
}

beforeAll(async () => {
    LOG_APPLICATIONS.push('admin');
    server = await startTestServer({ application: testApplicationOptions });
    baseUrl = await server.start();
    await createRoles();
    adminToken = await loggedIn(baseUrl, 'ada@example.com', PlatformRoles.ADMIN);
    tenant = await createTenant('Acme');
    tenantAdminToken = await loggedInMember(baseUrl, 'tim@example.com', tenant.id, Roles.ADMIN);
}, 30000);

afterAll(async () => {
    await server.shutdown();
}, 30000);

describe('the logs', () => {

    it('are sent by a known app without a login, and read by an administrator of the application', async () => {
        expect(await sendLog('admin', 'Cannot read properties of undefined')).toBe(204);

        expect(await readMessages(adminToken)).toContain('Cannot read properties of undefined');
    });

    it('of a logged in user belong to the tenant of the request, which its administrators read alone', async () => {
        expect(await sendLog('admin', 'The tasks did not load', { token: tenantAdminToken, tenantId: tenant.id })).toBe(204);

        expect(await readMessages(tenantAdminToken, tenant.id)).toEqual(['The tasks did not load']);
    });

    it('of an anonymous caller naming a tenant belong to none', async () => {
        const res: Response = await fetch(`${baseUrl}/logs`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-tenant-id': tenant.id },
            body: JsonUtilities.stringify({ application: 'admin', level: LogLevel.ERROR, message: 'Spam', context: { origin: 'nowhere' } })
        });
        await res.arrayBuffer();

        expect(res.status).toBe(204);
        expect(await readMessages(tenantAdminToken, tenant.id)).not.toContain('Spam');
    });

    it('are refused from an application that is no app of this api', async () => {
        expect(await sendLog('somewhere-else', 'Cannot read properties of undefined')).toBe(400);
    });

    it('are not read by the administrators of a tenant naming none', async () => {
        const res: Response = await request(baseUrl, tenantAdminToken, '/logs?page=1&limit=10');
        await res.arrayBuffer();

        expect(res.status).toBe(403);
    });

    it('are not read without a login', async () => {
        const res: Response = await fetch(`${baseUrl}/logs?page=1&limit=10`);
        await res.arrayBuffer();

        expect(res.status).toBe(401);
    });
});
