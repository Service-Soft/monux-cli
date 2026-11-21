import { describe, beforeEach, jest, test, expect, afterEach } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants, inquireMock, MAX_FAST_TIME } from '../../__testing__';
import { DockerUtilities, FullyParsedDockerService } from '../../docker';
import { InquirerUtilities } from '../../encapsulation';
import { UpCommand } from '../up';
import { DownCommand } from './down.command';

const mockConstants: MockConstants = getMockConstants('down-command');

describe('DownCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants, undefined, {
            DEV_DOCKER_COMPOSE_YAML: [
                'services:',
                '',
                '    adminer:',
                '        image: adminer',
                '        restart: unless-stopped',
                '        ports:',
                '            - 8080:8080'
            ]
        });
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            fileName: 'dev.docker-compose.yaml'
        }));
    });

    test('should run', async () => {
        const runningDockerServicesBeforeUp: FullyParsedDockerService[] = await DockerUtilities.findServices(false);

        const upCommand: UpCommand = new UpCommand();
        await upCommand.start(['u']);

        const runningDockerServicesAfterUp: FullyParsedDockerService[] = await DockerUtilities.findServices(false);
        expect(runningDockerServicesBeforeUp.length + 1).toEqual(runningDockerServicesAfterUp.length);

        const command: DownCommand = new DownCommand();
        await command.start(['d']);

        const runningDockerServicesAfterDown: FullyParsedDockerService[] = await DockerUtilities.findServices(false);

        expect(runningDockerServicesAfterDown.length).toEqual(runningDockerServicesBeforeUp.length);
    }, 1000 + (MAX_FAST_TIME * 2) /** We call up and down. */);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});