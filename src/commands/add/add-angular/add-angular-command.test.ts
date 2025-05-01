import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { AddAngularCommand } from './add-angular.command';
import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock, MAX_GEN_CODE_TIME } from '../../../__testing__';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';

const mockConstants: MockConstants = getMockConstants('add-angular-command');

describe('AddAngularCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            port: 4200,
            'sub domain': 'admin',
            'title suffix (eg. "| My Company")': '| Admin',
            'name of the api to use': 'api'
        }));
    });

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'admin', type: AddType.ANGULAR };
        const command: AddAngularCommand = new AddAngularCommand(baseConfig);
        await command.run();
        expect(true).toBe(true);
    }, MAX_ADD_TIME + MAX_GEN_CODE_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});