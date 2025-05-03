import { describe, beforeEach, jest, test, afterEach, expect } from '@jest/globals';

import { RunCommand } from './run.command';
import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../__testing__';
import { DbType } from '../../db';
import { InquirerUtilities } from '../../encapsulation';
import { AddNestCommand } from '../add/add-nest';
import { AddConfiguration, AddType } from '../add/models';

const mockConstants: MockConstants = getMockConstants('run-command');

describe('RunCommand', () => {
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

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'api', type: AddType.NEST };
        const addNestCommand: AddNestCommand = new AddNestCommand(baseConfig);
        await addNestCommand.run();

        const command: RunCommand = new RunCommand();
        await command.start(['api', 'build']);
        expect(true).toEqual(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});