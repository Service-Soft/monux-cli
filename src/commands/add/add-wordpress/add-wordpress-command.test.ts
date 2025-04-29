import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, mockInquire } from '../../../__testing__';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddWordpressCommand } from './add-wordpress.command';
import { DbType } from '../../../db';

const mockConstants: MockConstants = getMockConstants('add-wordpress-command');

describe('AddWordpressCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(mockInquire({
            'sub domain': 'wordpress',
            'Database compose service': 'NEW',
            'Compose service name': 'db',
            'Database name': 'sandbox',
            'database type': DbType.MARIADB
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