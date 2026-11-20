import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_DOCKER_TIME, MockConstants, RunningWorkspaceUtilities, ServiceResponse } from '../__testing__';
import { STAGE_DOCKER_COMPOSE_FILE_NAME } from '../constants';
import { DockerUtilities } from './docker.utilities';

const mockConstants: MockConstants = getMockConstants('docker-traefik-utilities');

// the host of the service below on stage: its sub domain and the stage_root_domain of the mock environment
const HOST: string = 'whoami.test-staging.com';

describe('DockerTraefikUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('lets traefik on stage answer a service with basic auth only with the credentials of the workspace', async () => {
        // a service that answers every request with what it got
        await DockerUtilities.addServiceToCompose({ name: 'whoami', image: 'traefik/whoami:v1.11' }, 80, 8081, true, true, 'whoami');
        try {
            await RunningWorkspaceUtilities.up(STAGE_DOCKER_COMPOSE_FILE_NAME);

            // traefik starts and routes the service, which answers once its container runs
            const anonymous: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { host: HOST, path: '/', port: 443, https: true },
                response => response.status === 401 || response.status === 200
            );
            expect(anonymous.status).toBe(401);

            // the basic_auth_user and basic_auth_password of the mock environment
            const authorized: ServiceResponse = await RunningWorkspaceUtilities.request(
                { host: HOST, path: '/', port: 443, https: true, auth: { user: 'user', password: 'password' } }
            );
            expect(authorized.status).toBe(200);
            expect(authorized.body).toContain(`Host: ${HOST}`);
        }
        finally {
            await RunningWorkspaceUtilities.down(STAGE_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, MAX_DOCKER_TIME);
});