import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, mockInquire } from '../../../__testing__';
import { AddConfiguration, AddType } from '../models';
import { AddTsLibraryCommand } from './add-ts-library.command';
import { InquirerUtilities } from '../../../encapsulation';

const mockConstants: MockConstants = getMockConstants('add-ts-library-command');

describe('AddTsLibraryCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(mockInquire({
            scope: '@sandbox'
        }));
    });

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'shared', type: AddType.TS_LIBRARY };
        const command: AddTsLibraryCommand = new AddTsLibraryCommand(baseConfig);
        await command.run();
        expect(true).toBe(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});