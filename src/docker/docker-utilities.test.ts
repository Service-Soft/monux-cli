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
        await EnvUtilities.init('test.com');
        await DockerUtilities.createComposeFiles(fakeEmail);

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

    test('createDockerCompose with prod service', async () => {
        const def: ComposeService = fakeComposeService();
        await DockerUtilities.addServiceToCompose(def, 4200, true, def.name);
        const fileContent: ComposeDefinition = await DockerUtilities['yamlToComposeDefinition'](mockConstants.DOCKER_COMPOSE_YAML);
        const service: ComposeService = fileContent.services[1];
        expect({
            ...def,
            labels: [
                ...def.labels ?? [],
                'traefik.enable=true',
                `traefik.http.routers.${def.name}.rule=Host(\`\${${def.name}_sub_domain}.\${prod_root_domain}\`)`,
                `traefik.http.routers.${def.name}.entrypoints=web_secure`,
                `traefik.http.routers.${def.name}.tls.certresolver=ssl_resolver`,
                `traefik.http.services.${def.name}.loadbalancer.server.port=4200`,
                'traefik.http.middlewares.compression.compress=true',
                `traefik.http.routers.${def.name}.middlewares=compression`
            ]
        }).toEqual(service);

        const localFileContent: ComposeDefinition = await DockerUtilities['yamlToComposeDefinition'](mockConstants.LOCAL_DOCKER_COMPOSE_YAML);
        const localService: ComposeService = localFileContent.services[1];
        expect({
            ...def,
            labels: [
                ...def.labels ?? [],
                'traefik.enable=true',
                `traefik.http.routers.${def.name}.rule=Host(\`\${${def.name}_sub_domain}.localhost\`)`,
                `traefik.http.routers.${def.name}.entrypoints=web`,
                `traefik.http.services.${def.name}.loadbalancer.server.port=4200`,
                'traefik.http.middlewares.compression.compress=true',
                `traefik.http.routers.${def.name}.middlewares=compression`
            ]
        }).toEqual(localService);
    });

    test('createDockerCompose with dev service', async () => {
        //TODO
    });
});