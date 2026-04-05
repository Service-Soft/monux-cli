import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { InitCommand } from './init.command';
import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../__testing__';
import { InquirerUtilities } from '../../encapsulation';

const mockConstants: MockConstants = getMockConstants('init-command');

describe('InitCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants, []);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            prodRootDomain: 'test.com',
            stageRootDomain: 'test-staging.com',
            email: 'user@test.com',
            setupGithubActions: true
        }));
    });

    test('should run', async () => {
        const command: InitCommand = new InitCommand();
        await command.start(['i']);
        expect(true).toBe(true);
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});