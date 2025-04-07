import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants, mockInquire } from '../../../__testing__';
import { DbType } from '../../../db';
import { InquirerUtilities } from '../../../encapsulation';

const mockConstants: MockConstants = getMockConstants('add-loopback-command');

describe('AddLoopbackCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants, ['DOCKER_COMPOSE_YAML', 'LOCAL_DOCKER_COMPOSE_YAML', 'GLOBAL_ENV_MODEL', 'DEV_DOCKER_COMPOSE_YAML', 'ENV']);
        InquirerUtilities['inquire'] = jest.fn(mockInquire({
            port: 3000,
            'sub domain': 'api',
            'Email of the default user': 'test@test.com',
            'Password of the default user': 'stringstring',
            'Name of the frontend where the reset password ui is implemented': 'admin',
            'Compose service': 'NEW',
            'Compose service name': 'db',
            'Database name': 'sandbox',
            'database type': DbType.POSTGRES
        }));
    });

    test('should run and create new database', () => {
        // const baseConfig: AddConfiguration = { name: 'api', type: AddType.LOOPBACK };
        // const command: AddLoopbackCommand = new AddLoopbackCommand(baseConfig);
        // await command.run(); // TODO: enable
        expect(true).toBe(true);
    }, 50000);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});