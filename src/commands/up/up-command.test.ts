import { describe, beforeEach, jest, test, expect, afterEach } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_BARELY_NOTICEABLE_TIME, MockConstants, inquireMock, MAX_FAST_TIME } from '../../__testing__';
import { FullyParsedDockerService, getDockerServices } from '../../docker';
import { InquirerUtilities } from '../../encapsulation';
import { DownCommand } from '../down';
import { UpCommand } from './up.command';

const mockConstants: MockConstants = getMockConstants('up-command');

describe('UpCommand', () => {
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
            env: 'dev.docker-compose.yaml'
        }));
    });

    test('should run', async () => {
        const runningDockerServicesBeforeUp: FullyParsedDockerService[] = await getDockerServices(false);

        const upCommand: UpCommand = new UpCommand();
        await upCommand.start(['u']);

        const runningDockerServicesAfterUp: FullyParsedDockerService[] = await getDockerServices(false);
        expect(runningDockerServicesBeforeUp.length + 1).toEqual(runningDockerServicesAfterUp.length);

        const command: DownCommand = new DownCommand();
        await command.start(['d']);

        const runningDockerServicesAfterDown: FullyParsedDockerService[] = await getDockerServices(false);

        expect(runningDockerServicesAfterDown.length).toEqual(runningDockerServicesBeforeUp.length);
    }, MAX_FAST_TIME + MAX_BARELY_NOTICEABLE_TIME /** We call up and down. */);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});