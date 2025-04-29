import { beforeEach, describe, expect, test } from '@jest/globals';

import { fakeUpdatePackageJsonData, FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants } from '../__testing__';
import { NpmUtilities } from './npm.utilities';
import { FsUtilities } from '../encapsulation';
import { PackageJson } from './package-json.model';

const mockConstants: MockConstants = getMockConstants('npm-utilities');

describe('NpmUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('init', async () => {
        await NpmUtilities.init({ path: mockConstants.TS_LIBRARY_DIR, scope: mockConstants.TS_LIBRARY_SCOPE });
        const lines: string[] = await FsUtilities.readFileLines(mockConstants.TS_LIBRARY_PACKAGE_JSON);
        expect(lines).toEqual([
            '{',
            '    "name": "@library/library",',
            '    "version": "1.0.0",',
            '    "main": "index.js",',
            '    "scripts": {',
            '        "test": "echo \\\"Error: no test specified\\\" && exit 1"',
            '    },',
            '    "keywords": [],',
            '    "author": "",',
            '    "license": "ISC",',
            '    "description": ""',
            '}'
        ]);
    }, MAX_ADD_TIME);

    test('updatePackageJsonFile', async () => {
        const updateData: Partial<PackageJson> = fakeUpdatePackageJsonData();
        await NpmUtilities.updatePackageJsonFile(mockConstants.ROOT_PACKAGE_JSON, updateData);

        const packageJson: PackageJson = await FsUtilities.parseFileAs(mockConstants.ROOT_PACKAGE_JSON);
        expect(packageJson.main).toEqual(updateData.main);
        if (updateData.scripts == undefined) {
            expect(packageJson.scripts).toEqual(updateData.scripts);
        }
        else {
            expect(packageJson.scripts).toEqual({
                ...updateData.scripts,
                test: 'echo \"Error: no test specified\" && exit 1'
            });
        }

        expect(packageJson.workspaces).toEqual(updateData.workspaces);
    });
});