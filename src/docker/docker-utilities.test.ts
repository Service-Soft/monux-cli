import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, test } from '@jest/globals';

import { DockerUtilities } from './docker.utilities';
import { fakeComposeService, FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { ComposeDefinition, ComposeService } from './compose-file.model';
import { EnvUtilities } from '../env';

const mockConstants: MockConstants = getMockConstants('docker-utilities');

describe('DockerUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);

        const fakeEmail: string = faker.internet.email();
        await EnvUtilities.init(mockConstants.PROJECT_DIR);
        await DockerUtilities.createComposeFiles(fakeEmail, mockConstants.PROJECT_DIR);

        const initialDockerComposeContent: string[] = await FsUtilities.readFileLines(mockConstants.DOCKER_COMPOSE_YAML);
        expect(initialDockerComposeContent).toEqual([
            'services:',
            '',
            '    traefik:',
            '        image: traefik:v3.2',
            '        restart: unless-stopped',
            '        command:',
            '            - --providers.docker=true',
            '            - --providers.docker.exposedbydefault=false',
            '            - --entryPoints.web.address=:80',
            '            - --entrypoints.web.http.redirections.entrypoint.to=websecure',
            '            - --entryPoints.web.http.redirections.entrypoint.scheme=https',
            '            - --entryPoints.websecure.address=:443',
            '            - --entrypoints.websecure.asDefault=true',
            '            - --certificatesresolvers.sslresolver.acme.httpchallenge=true',
            '            - --certificatesresolvers.sslresolver.acme.httpchallenge.entrypoint=web',
            `            - --certificatesresolvers.sslresolver.acme.email=${fakeEmail}`,
            '            - --certificatesresolvers.sslresolver.acme.storage=/letsencrypt/acme.json',
            '        ports:',
            '            - 80:80',
            '            - 443:443',
            '        volumes:',
            '            - ./letsencrypt:/letsencrypt',
            '            - /var/run/docker.sock:/var/run/docker.sock:ro'
        ]);
    });

    test('createDockerCompose', async () => {
        const def: ComposeService = fakeComposeService();
        await DockerUtilities.addServiceToCompose(def, 'test.de', 'https://www.test.de', mockConstants.PROJECT_DIR);
        const fileContent: ComposeDefinition = await DockerUtilities['yamlToComposeDefinition'](mockConstants.DOCKER_COMPOSE_YAML);
        def.labels = def.labels?.map(l => l.replace('http:', 'https:'));
        const service: ComposeService = fileContent.services[1];
        expect(def).toEqual(service);
    });
});