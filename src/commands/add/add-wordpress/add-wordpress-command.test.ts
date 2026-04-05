import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { AddWordpressCommand } from './add-wordpress.command';
import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../../__testing__';
import { DbType } from '../../../db';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';

const mockConstants: MockConstants = getMockConstants('add-wordpress-command');

describe('AddWordpressCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            subDomain: 'wordpress',
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'sandbox',
            dbType: DbType.MARIADB
        }));
    });

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'wordpress', type: AddType.WORDPRESS };
        const command: AddWordpressCommand = new AddWordpressCommand(baseConfig);
        await command.run();
        expect(true).toBe(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});