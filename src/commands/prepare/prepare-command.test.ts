import { describe, beforeEach, jest, test, afterEach, expect } from '@jest/globals';

import { PrepareCommand } from './prepare.command';
import { FileMockUtilities, getMockConstants, MAX_INSTANT_TIME, MockConstants, inquireMock } from '../../__testing__';
import { InquirerUtilities } from '../../encapsulation';

const mockConstants: MockConstants = getMockConstants('prepare-command');

describe('PrepareCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            env: 'dev.docker-compose.yaml'
        }));
    });

    test('should run', async () => {
        const command: PrepareCommand = new PrepareCommand();
        await command.start(['p']);
        expect(true).toEqual(true);
    }, MAX_INSTANT_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});