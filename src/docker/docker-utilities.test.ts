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
        await FileMockUtilities.clearTemp(mockConstants);

        const fakeEmail: string = faker.internet.email();
        await EnvUtilities.init(mockConstants.PROJECT_DIR);
        await DockerUtilities.createDockerCompose(fakeEmail, mockConstants.PROJECT_DIR);

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
            '            - --entryPoints.websecure.address=:443',
            '            - --certificatesresolvers.${ssl_resolver:-placeholderresolver}.acme.httpchallenge=true',
            '            - --certificatesresolvers.${ssl_resolver:-placeholderresolver}.acme.httpchallenge.entrypoint=web',
            `            - --certificatesresolvers.\${ssl_resolver:-placeholderresolver}.acme.email=${fakeEmail}`,
            '            - --certificatesresolvers.${ssl_resolver:-placeholderresolver}.acme.storage=/letsencrypt/acme.json',
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
        await DockerUtilities.addServiceToCompose(def, 'test.de', mockConstants.PROJECT_DIR);
        const fileContent: ComposeDefinition = await DockerUtilities['yamlToComposeDefinition'](mockConstants.DOCKER_COMPOSE_YAML);

        const service: ComposeService = fileContent.services[1];
        expect(def).toEqual(service);
    });
});