import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { getPath } from '../utilities';
import { NestUtilities } from './nest.utilities';

const mockConstants: MockConstants = getMockConstants('nest-utilities');

describe('NestUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('run new command', async () => {
        NestUtilities.runCommand(mockConstants.APPS_DIR, 'new api', {
            '--language': 'TS',
            '--package-manager': 'npm',
            '--skip-git': true,
            '--skip-install': true
        });

        const dirExists: boolean = await FsUtilities.exists(getPath(mockConstants.APPS_DIR, 'api'));
        expect(dirExists).toBe(true);
    }, 50000);
});