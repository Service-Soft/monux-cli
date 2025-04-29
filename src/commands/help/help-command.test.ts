import { beforeEach, describe, expect, test } from '@jest/globals';

import { HelpCommand } from './help.command';
import { FileMockUtilities, getMockConstants, MAX_INSTANT_TIME, MockConstants } from '../../__testing__';

const mockConstants: MockConstants = getMockConstants('help-command');

describe('GeneratePageCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('should run', async () => {
        const command: HelpCommand = new HelpCommand();
        await command.start(['h']);
        expect(true).toBe(true);
    }, MAX_INSTANT_TIME);
});