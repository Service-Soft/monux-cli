import { describe, beforeEach, jest, test, expect, afterEach } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants, inquireMock } from '../../__testing__';
import { DockerUtilities, FullyParsedDockerService } from '../../docker';
import { CPUtilities, InquirerUtilities, PathUtilities } from '../../encapsulation';
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
    }, 20000 /** We call up and down. */);

    test('starts and stops a workspace that ran before from another directory, with the environment of that workspace', async () => {
        await new UpCommand().start(['u']);
        await new DownCommand().start(['d']);
        const runningBefore: number = (await DockerUtilities.findServices(false)).length;

        // a directory with no .env, outside of the workspace
        CPUtilities['cwd'] = PathUtilities.getDirectory(mockConstants.PROJECT_DIR);
        await new UpCommand().start(['u', 'up-command']);
        expect((await DockerUtilities.findServices(false)).length).toEqual(runningBefore + 1);

        await new DownCommand().start(['d', 'up-command']);
        expect((await DockerUtilities.findServices(false)).length).toEqual(runningBefore);
    }, 40000 /** We call up and down twice. */);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});