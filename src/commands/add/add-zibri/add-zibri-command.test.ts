import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../../__testing__';
import { DbType } from '../../../db';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddZibriCommand } from './add-zibri.command';

const mockConstants: MockConstants = getMockConstants('add-zibri-command');

describe('AddZibriCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            'sub domain': 'api',
            port: 3000,
            'Email of the default user': 'test@test.com',
            'Password of the default user': 'stringstring',
            'Name of the frontend where the reset password ui is implemented': 'admin',
            'Database compose service': 'NEW',
            'Compose service name': 'db',
            'Database name': 'sandbox',
            'database type': DbType.POSTGRES
        }));
    });

    test('should run and add a new database', async () => {
        const baseConfig: AddConfiguration = { name: 'api', type: AddType.ZIBRI };
        const command: AddZibriCommand = new AddZibriCommand(baseConfig);
        await command.run();
        expect(true).toBe(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});