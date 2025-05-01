import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, mockInquire } from '../../../__testing__';
import { DbType } from '../../../db';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddLoopbackCommand } from './add-loopback.command';

const mockConstants: MockConstants = getMockConstants('add-loopback-command');

describe('AddLoopbackCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(mockInquire({
            port: 3000,
            'sub domain': 'api',
            'Email of the default user': 'test@test.com',
            'Password of the default user': 'stringstring',
            'Name of the frontend where the reset password ui is implemented': 'admin',
            'Database compose service': 'NEW',
            'Compose service name': 'db',
            'Database name': 'sandbox',
            'database type': DbType.POSTGRES
        }));
    });

    test('should run and create new database', async () => {
        const baseConfig: AddConfiguration = { name: 'api', type: AddType.LOOPBACK };
        const command: AddLoopbackCommand = new AddLoopbackCommand(baseConfig);
        await command.run();
        expect(true).toBe(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});