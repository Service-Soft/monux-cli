import { describe, beforeEach, jest, test, afterEach, expect } from '@jest/globals';

import { RunAllCommand } from './run-all.command';
import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../__testing__';
import { InquirerUtilities } from '../../encapsulation';
import { AddTsLibraryCommand } from '../add/add-ts-library';
import { AddType } from '../add/models';

const mockConstants: MockConstants = getMockConstants('run-all-command');

describe('RunAllCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            scope: '@sandbox'
        }));
    });

    test('should run', async () => {
        const addCommand1: AddTsLibraryCommand = new AddTsLibraryCommand({ name: 'shared', type: AddType.TS_LIBRARY });
        await addCommand1.run();
        const addCommand2: AddTsLibraryCommand = new AddTsLibraryCommand({ name: 'shared2', type: AddType.TS_LIBRARY });
        await addCommand2.run();

        const command: RunAllCommand = new RunAllCommand();
        await command.start(['ra', 'build']);
        expect(true).toEqual(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});