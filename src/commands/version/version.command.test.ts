import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_INSTANT_TIME, MockConstants } from '../../__testing__';
import { VersionCommand } from './version.command';

const mockConstants: MockConstants = getMockConstants('version-command');

describe('VersionCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('should run', async () => {
        const command: VersionCommand = new VersionCommand();
        await command.start(['v']);
        expect(true).toBe(true);
    }, MAX_INSTANT_TIME);
});