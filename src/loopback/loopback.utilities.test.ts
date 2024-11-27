import path from 'path';

import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { LoopbackUtilities } from './loopback.utilities';
import { FsUtilities } from '../encapsulation';

const mockConstants: MockConstants = getMockConstants('loopback-utilities');

// let npmInstallMock: jest.SpiedFunction<typeof NpmUtilities.install>;
// let cpExecSyncMock: jest.SpiedFunction<typeof CPUtilities.execSync>;

describe('LoopbackUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp(mockConstants);
    });

    test('run new command', async () => {
        LoopbackUtilities.runCommand(mockConstants.APPS_DIR, 'new api', {
            '--yes': true,
            '--config': {
                docker: true,
                eslint: false,
                mocha: true,
                loopbackBuild: true,
                prettier: false,
                vscode: false
            }
        });

        const dirExists: boolean = await FsUtilities.exists(path.join(mockConstants.APPS_DIR, 'api'));
        expect(dirExists).toBe(true);
    }, 15000);
});