import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, mockInquire } from '../../../__testing__';
import { InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddAngularLibraryCommand } from './add-angular-library.command';

const mockConstants: MockConstants = getMockConstants('add-angular-library-command');

describe('AddAngularLibraryCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(mockInquire({
            scope: '@sandbox'
        }));
    });

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'ui', type: AddType.ANGULAR_LIBRARY };
        const command: AddAngularLibraryCommand = new AddAngularLibraryCommand(baseConfig);
        await command.run();
        expect(true).toBe(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});