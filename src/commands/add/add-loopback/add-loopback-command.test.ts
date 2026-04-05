import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock, createMailServiceMock, createAdminFilesMock } from '../../../__testing__';
import { DbType } from '../../../db';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddLoopbackCommand } from './add-loopback.command';
import { LoopbackUtilities } from '../../../loopback';

const mockConstants: MockConstants = getMockConstants('add-loopback-command');

describe('AddLoopbackCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            port: 3000,
            subDomain: 'api',
            defaultUserEmail: 'test@test.com',
            defaultUserPassword: 'stringstring',
            frontendName: 'admin',
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'sandbox',
            dbType: DbType.POSTGRES
        }));
        LoopbackUtilities['createMailService'] = jest.fn(createMailServiceMock);
        LoopbackUtilities['createBiometricCredentialsService'] = jest.fn(async () => {});
        LoopbackUtilities['createAdminFiles'] = jest.fn(createAdminFilesMock);
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