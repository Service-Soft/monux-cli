import path from 'path';

import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { GithubUtilities } from './github.utilities';

const mockConstants: MockConstants = getMockConstants('github-utilities');

describe('GithubUtilities', () => {

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('createWorkflow', async () => {
        const WORKFLOW_FILE: string = path.join(mockConstants.GITHUB_WORKFLOW_DIR, 'main.yml');
        await GithubUtilities['createWorkflowFile'](WORKFLOW_FILE, {
            name: 'main',
            on: 'push',
            jobs: {
                test: {
                    'runs-on': 'ubuntu-latest',
                    steps: [
                        { uses: 'actions/checkout@v4' },
                        { name: 'npm i', run: 'npm ci' },
                        { name: 'Linting', run: 'npm run lint --workspaces --if-present' },
                        { name: 'Unit Tests', run: 'npm run test --workspaces --if-present' }
                    ]
                }
            }
        });
        const lines: string[] = await FsUtilities.readFileLines(WORKFLOW_FILE);
        expect(lines).toEqual([
            'name: main',
            'on: push',
            'jobs:',
            '    test:',
            '        runs-on: ubuntu-latest',
            '        steps:',
            '            -',
            '                uses: actions/checkout@v4',
            '            -',
            '                name: npm i',
            '                run: npm ci',
            '            -',
            '                name: Linting',
            '                run: npm run lint --workspaces --if-present',
            '            -',
            '                name: Unit Tests',
            '                run: npm run test --workspaces --if-present'
        ]);
    });
});