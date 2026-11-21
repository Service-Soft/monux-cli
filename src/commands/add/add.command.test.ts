import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, inquireMock, MockConstants } from '../../__testing__';
import { FsUtilities, InquirerUtilities, PathUtilities, ProcessUtilities, Question } from '../../encapsulation';
import { AddCommand } from './add.command';
import { AddType } from './models';

const mockConstants: MockConstants = getMockConstants('add-command');

// what mx add is answered with, a library, until the question that fails
const ANSWERS: Record<string, unknown> = { type: AddType.TS_LIBRARY, name: 'shared', scope: '@shop' };

/**
 * Reads every file of the workspace, by its path.
 * @returns The files and their content.
 */
async function readWorkspace(): Promise<Record<string, string>> {
    const files: string[] = await FsUtilities.findFilesRecursive(mockConstants.PROJECT_DIR);
    const contents: string[] = await Promise.all(files.map(f => FsUtilities.readFile(PathUtilities.resolve(mockConstants.PROJECT_DIR, f))));
    return Object.fromEntries(files.map((f, i) => [f, contents[i]]));
}

/**
 * Answers the questions of mx add until the one about the projects that use the library, which fails.
 * @param error - What the failing question throws.
 */
function failAtProjects(error: Error): void {
    InquirerUtilities['inquire'] = jest.fn((question: Question) => {
        if (question.name === 'projects') {
            throw error;
        }
        return inquireMock(ANSWERS)(question);
    });
}

// how Monux ends its process, which waits for the output jest keeps open
const exitGracefully: (code: number) => Promise<never> = ProcessUtilities['exitGracefully'];

describe('AddCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        // Monux exits after it was interrupted, which a test cannot
        ProcessUtilities['exitGracefully'] = jest.fn((code: number) => Promise.reject(new Error(`exited with ${code}`)));
    });

    test('leaves the workspace as it was when it is interrupted, like with Ctrl+C during a question', async () => {
        const before: Record<string, string> = await readWorkspace();
        // what inquirer throws for Ctrl+C
        const interrupt: Error = new Error('User force closed the prompt');
        interrupt.name = 'ExitPromptError';
        failAtProjects(interrupt);

        await expect(new AddCommand().start(['a'])).rejects.toThrow('exited with 130');
        expect(await readWorkspace()).toEqual(before);
    });

    test('leaves the workspace as it was when it crashes', async () => {
        const before: Record<string, string> = await readWorkspace();
        failAtProjects(new Error('The library could not be generated'));

        await expect(new AddCommand().start(['a'])).rejects.toThrow('The library could not be generated');
        expect(await readWorkspace()).toEqual(before);
    });

    afterEach(() => {
        ProcessUtilities['exitGracefully'] = exitGracefully;
        jest.restoreAllMocks();
    });
});