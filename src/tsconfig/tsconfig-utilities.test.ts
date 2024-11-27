import path from 'path';

import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { TsConfigUtilities } from './tsconfig.utilities';
import { TS_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { TsConfig } from './tsconfig.model';

const mockConstants: MockConstants = getMockConstants('tsconfig-utilities');

describe('TsConfigUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp(mockConstants);
    });

    test('init', async () => {
        TsConfigUtilities.init(mockConstants.TS_LIBRARY_DIR);
        const content: TsConfig = await FsUtilities.parseFileAs(path.join(mockConstants.TS_LIBRARY_DIR, TS_CONFIG_FILE_NAME));
        expect(content).toEqual({
            compilerOptions: {
                target: 'es2016',
                module: 'commonjs',
                esModuleInterop: true,
                forceConsistentCasingInFileNames: true,
                strict: true,
                skipLibCheck: true
            }
        });
    });

    test('update', async () => {
        TsConfigUtilities.init(mockConstants.TS_LIBRARY_DIR);
        const tsconfigPath: string = path.join(mockConstants.TS_LIBRARY_DIR, TS_CONFIG_FILE_NAME);
        await TsConfigUtilities['update'](tsconfigPath, {
            extends: '../../tsconfig.base.json',
            compilerOptions: {
                composite: true,
                declaration: true,
                outDir: './build',
                rootDir: './src'
            },
            include: undefined
        });
        const content: TsConfig = await FsUtilities.parseFileAs(tsconfigPath);
        expect(content).toEqual({
            extends: '../../tsconfig.base.json',
            compilerOptions: {
                composite: true,
                declaration: true,
                outDir: './build',
                rootDir: './src',
                target: 'es2016',
                module: 'commonjs',
                esModuleInterop: true,
                forceConsistentCasingInFileNames: true,
                strict: true,
                skipLibCheck: true
            }
        });
    });
});