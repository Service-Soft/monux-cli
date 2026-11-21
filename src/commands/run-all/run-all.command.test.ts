import { describe, beforeEach, jest, test, afterEach, expect } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../__testing__';
import { FsUtilities, InquirerUtilities, ProcessUtilities } from '../../encapsulation';
import { AddTsLibraryCommand } from '../add/add-ts-library';
import { AddType } from '../add/models';
import { RunAllCommand } from './run-all.command';

const mockConstants: MockConstants = getMockConstants('run-all-command');

describe('RunAllCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            scope: '@sandbox',
            projects: []
        }));
    });

    test('should run', async () => {
        const addCommand1: AddTsLibraryCommand = new AddTsLibraryCommand({ name: 'shared', type: AddType.TS_LIBRARY });
        await addCommand1.add();
        const addCommand2: AddTsLibraryCommand = new AddTsLibraryCommand({ name: 'shared2', type: AddType.TS_LIBRARY });
        await addCommand2.add();

        const command: RunAllCommand = new RunAllCommand();
        await command.start(['ra', 'build']);
        expect(true).toEqual(true);
    }, MAX_ADD_TIME);

    test('refuses to run outside of a workspace, where npm would run in whatever project the directory is', async () => {
        await FsUtilities.rm(mockConstants.WORKSPACE_JSON);
        jest.spyOn(ProcessUtilities, 'exitWithError').mockImplementation(message => Promise.reject(new Error(message)));

        await expect(new RunAllCommand().start(['ra', 'build'])).rejects.toThrow('This command needs to be run inside a workspace.');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
});