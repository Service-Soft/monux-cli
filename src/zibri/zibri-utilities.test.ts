import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { getPath } from '../utilities';
import { ZibriUtilities } from './zibri.utilities';

const mockConstants: MockConstants = getMockConstants('zibri-utilities');

describe('ZibriUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('run new command', async () => {
        await ZibriUtilities.runCommand(mockConstants.APPS_DIR, 'new api', {} as never);

        const dirExists: boolean = await FsUtilities.exists(getPath(mockConstants.APPS_DIR, 'api'));
        expect(dirExists).toBe(true);
    }, 50000);
});