import { describe, beforeEach, jest, test, afterEach } from '@jest/globals';

import { ListCommand } from './list.command';
import { FileMockUtilities, getMockConstants, MAX_FAST_TIME, MockConstants, mockInquire } from '../../__testing__';
import { InquirerUtilities } from '../../encapsulation';
import { DownCommand } from '../down';
import { UpCommand } from '../up';

const mockConstants: MockConstants = getMockConstants('list-command');

describe('ListCommand', () => {
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
        InquirerUtilities['inquire'] = jest.fn(mockInquire({
            env: 'dev.docker-compose.yaml'
        }));
    });

    test('should run', async () => {
        const upCommand: UpCommand = new UpCommand();
        await upCommand.start(['u']);

        const listCommand: ListCommand = new ListCommand(true);
        await listCommand.start(['l']);

        const command: DownCommand = new DownCommand();
        await command.start(['d']);
    }, MAX_FAST_TIME * 3 /** We call up, list and down. */);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});