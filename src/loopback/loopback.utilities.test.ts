
import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { LoopbackUtilities } from './loopback.utilities';
import { FsUtilities } from '../encapsulation';
import { getPath } from '../utilities';

const mockConstants: MockConstants = getMockConstants('loopback-utilities');

// let npmInstallMock: jest.SpiedFunction<typeof NpmUtilities.install>;
// let cpExecSyncMock: jest.SpiedFunction<typeof CPUtilities.execSync>;

describe('LoopbackUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('run new command', async () => {
        await LoopbackUtilities.runCommand(mockConstants.APPS_DIR, 'new api', {
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

        const dirExists: boolean = await FsUtilities.exists(getPath(mockConstants.APPS_DIR, 'api'));
        expect(dirExists).toBe(true);
    }, 50000);
});