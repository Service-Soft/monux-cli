import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { TsUtilities } from './ts.utilities';
import { FsUtilities } from '../encapsulation';

const mockConstants: MockConstants = getMockConstants('ts-utilities');

describe('TsUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp(mockConstants);
        await FileMockUtilities.createAppComponentTsFile(mockConstants);
    });

    test('addImportStatementsToFile', async () => {
        await TsUtilities.addImportStatements(mockConstants.ANGULAR_COMPONENT_TS, [
            {
                defaultImport: true,
                element: 'path',
                path: 'path'
            },
            {
                defaultImport: false,
                element: 'join',
                path: 'path'
            }
        ]);
        const lines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_COMPONENT_TS);
        expect(lines[0]).toEqual('import { join }, path from \'path\';');
    });

    test('add import to existing import statement', async () => {
        await TsUtilities.addImportStatements(mockConstants.ANGULAR_COMPONENT_TS, [
            {
                defaultImport: false,
                element: 'join',
                path: 'path'
            }
        ]);
        await TsUtilities.addImportStatements(mockConstants.ANGULAR_COMPONENT_TS, [
            {
                defaultImport: true,
                element: 'path',
                path: 'path'
            }
        ]);
        const lines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_COMPONENT_TS);
        expect(lines[0]).toEqual('import path, { join } from \'path\';');
    });
});