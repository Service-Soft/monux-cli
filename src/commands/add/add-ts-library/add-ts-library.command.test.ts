import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MockConstants } from '../../../__testing__';
import { CPUtilities, FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { NpmUtilities } from '../../../npm';
import { AddConfiguration, AddType } from '../models';
import { AddTsLibraryCommand } from './add-ts-library.command';

const mockConstants: MockConstants = getMockConstants('add-ts-library-command');

describe('AddTsLibraryCommand', () => {
    const libraryPath: Path = PathUtilities.resolve(mockConstants.LIBS_DIR, 'shared');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            scope: '@sandbox',
            projects: []
        }));
    });

    test('adds a library that builds for node and for the browser, and lints', async () => {
        const baseConfig: AddConfiguration = { name: 'shared', type: AddType.TS_LIBRARY };
        await new AddTsLibraryCommand(baseConfig).add();

        await FsUtilities.updateFile(
            PathUtilities.resolve(libraryPath, 'src', 'index.ts'),
            ['/**', ' * What the projects share.', ' */', 'export const SHARED: string = \'shared\';'],
            'replace'
        );
        await NpmUtilities.run('shared', 'build', false);
        await NpmUtilities.run('shared', 'lint', false);

        // node requires the CommonJS build by the name of the package, a bundler imports the ES modules
        const required: string = await CPUtilities.resolveOutput(
            `cd ${mockConstants.PROJECT_DIR} && node -e "console.log(require('@sandbox/shared').SHARED)"`
        );
        expect(required.trim()).toBe('shared');
        expect(await FsUtilities.readFile(PathUtilities.resolve(libraryPath, 'dist', 'esm', 'index.js')))
            .toContain('export const SHARED = \'shared\';');
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});