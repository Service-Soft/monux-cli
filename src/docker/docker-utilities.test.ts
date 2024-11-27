import { beforeEach, describe, expect, test } from '@jest/globals';

import { DockerUtilities } from './docker.utilities';
import { fakeComposeService, FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { ComposeDefinition, ComposeService } from './compose-file.model';

const mockConstants: MockConstants = getMockConstants('docker-utilities');

describe('DockerUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp(mockConstants);
        await DockerUtilities.createDockerCompose(mockConstants.DOCKER_COMPOSE_YAML);

        const emptyDockerContent: string = await FsUtilities.readFile(mockConstants.DOCKER_COMPOSE_YAML);
        expect(emptyDockerContent).toEqual('');
    });

    test('createDockerCompose', async () => {
        const def: ComposeService = fakeComposeService();
        await DockerUtilities.addServiceToCompose(def, mockConstants.DOCKER_COMPOSE_YAML);
        const fileContent: ComposeDefinition = await DockerUtilities['yamlToComposeDefinition'](mockConstants.DOCKER_COMPOSE_YAML);

        const service: ComposeService = fileContent.services[0];
        expect(def).toEqual(service);
    });
});