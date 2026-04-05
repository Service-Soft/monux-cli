import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { AddZibriCommand } from './add-zibri.command';
import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../../__testing__';
import { DbType } from '../../../db';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';

const mockConstants: MockConstants = getMockConstants('add-zibri-command');

describe('AddZibriCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            subDomain: 'api',
            port: 3000,
            defaultUserEmail: 'test@test.com',
            defaultUserPassword: 'stringstring',
            frontendName: 'admin',
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'sandbox',
            dbType: DbType.POSTGRES
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