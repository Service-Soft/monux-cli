import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, test } from '@jest/globals';

import { DockerUtilities } from './docker.utilities';
import { fakeComposeService, FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { ComposeDefinition, ComposeService } from './compose-file.model';

const mockConstants: MockConstants = getMockConstants('docker-utilities');

describe('DockerUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp(mockConstants);

        const fakeEmail: string = faker.internet.email();
        await DockerUtilities.createDockerCompose(fakeEmail, mockConstants.DOCKER_COMPOSE_YAML);

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
            '            - --certificatesresolvers.myresolver.acme.httpchallenge=true',
            '            - --certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web',
            `            - --certificatesresolvers.myresolver.acme.email=${fakeEmail}`,
            '            - --certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json',
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
        await DockerUtilities.addServiceToCompose(def, undefined, mockConstants.DOCKER_COMPOSE_YAML);
        const fileContent: ComposeDefinition = await DockerUtilities['yamlToComposeDefinition'](mockConstants.DOCKER_COMPOSE_YAML);

        const service: ComposeService = fileContent.services[1];
        expect(def).toEqual(service);
    });
});