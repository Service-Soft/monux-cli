import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities, PathUtilities } from '../encapsulation';

import { NestUtilities } from './nest.utilities';

const mockConstants: MockConstants = getMockConstants('nest-utilities');

describe('NestUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('run new command', async () => {
        await NestUtilities.runCommand(mockConstants.APPS_DIR, 'new api', {
            '--language': 'TS',
            '--package-manager': 'npm',
            '--type': 'cjs',
            '--skip-git': true,
            '--skip-install': true,
            '--no-observe': true
        });

        const dirExists: boolean = await FsUtilities.exists(PathUtilities.resolve(mockConstants.APPS_DIR, 'api'));
        expect(dirExists).toBe(true);
    }, 50000);
});