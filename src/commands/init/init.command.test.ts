import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../__testing__';
import { FsUtilities, InquirerUtilities, PathUtilities } from '../../encapsulation';
import { InitCommand } from './init.command';

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

        // the workflow runs on the Node the workspace is built for, rather than on what the runner has
        const workflow: string = await FsUtilities.readFile(PathUtilities.resolve(mockConstants.GITHUB_WORKFLOW_DIR, 'main.yml'));
        expect(workflow).toContain('uses: actions/setup-node@v4');
        expect(workflow).toMatch(/node-version: '?24'?\n/);
        expect(workflow.indexOf('setup-node')).toBeLessThan(workflow.indexOf('npm ci'));
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});