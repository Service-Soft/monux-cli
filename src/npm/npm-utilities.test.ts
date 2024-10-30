import { beforeEach, describe, expect, test } from '@jest/globals';

import { fakeUpdatePackageJsonData, FileMockUtilities, mockConstants } from '../__testing__';
import { NpmUtilities } from './npm.utilities';
import { FsUtilities } from '../encapsulation';
import { PackageJson } from './package-json.model';

describe('NpmUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp();
        await FileMockUtilities.createPackageJson();
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
    });

    test.only('update', async () => {
        const updateData: Partial<PackageJson> = fakeUpdatePackageJsonData();
        await NpmUtilities['update'](mockConstants.PACKAGE_JSON, updateData);

        const packageJson: PackageJson = await FsUtilities.parseFileAs(mockConstants.PACKAGE_JSON);
        expect(packageJson.main).toEqual(updateData.main ?? 'index.js');
        expect(packageJson.scripts).toEqual({ ...updateData.scripts, test: 'echo \"Error: no test specified\" && exit 1' });
        expect(packageJson.workspaces).toEqual(updateData.workspaces ?? undefined);
    });
});