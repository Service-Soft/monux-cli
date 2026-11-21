import { beforeEach, describe, expect, test } from '@jest/globals';

import { defaultFoldersToMock, FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { BASE_TS_CONFIG_FILE_NAME, TS_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities, JsonUtilities, Path, PathUtilities } from '../encapsulation';
import { TsConfig } from './tsconfig.model';
import { TsConfigUtilities } from './tsconfig.utilities';

const mockConstants: MockConstants = getMockConstants('tsconfig-utilities');

describe('TsConfigUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(
            mockConstants,
            undefined,
            undefined,
            [...defaultFoldersToMock, 'TS_LIBRARY_DIR']
        );
    });

    test('update merges into the tsconfig, removes what is set to undefined and keeps the rest', async () => {
        const tsconfigPath: Path = PathUtilities.resolve(mockConstants.TS_LIBRARY_DIR, TS_CONFIG_FILE_NAME);
        await FsUtilities.createFile(tsconfigPath, JsonUtilities.stringify({
            compilerOptions: { strict: true, outDir: './dist' },
            include: ['src']
        }));

        await TsConfigUtilities.update(tsconfigPath, {
            extends: `../../${BASE_TS_CONFIG_FILE_NAME}`,
            compilerOptions: { composite: true, outDir: './build' },
            include: undefined
        });

        expect(await FsUtilities.parseFileAs<TsConfig>(tsconfigPath)).toEqual({
            extends: `../../${BASE_TS_CONFIG_FILE_NAME}`,
            compilerOptions: { strict: true, outDir: './build', composite: true }
        });
    });
});