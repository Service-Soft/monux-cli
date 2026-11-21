import { describe, beforeEach, jest, test, afterEach, expect } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MAX_ADD_TIME, MockConstants, inquireMock } from '../../__testing__';
import { DbType } from '../../db';
import { FsUtilities, InquirerUtilities, JsonUtilities, Path, PathUtilities } from '../../encapsulation';
import { AddNestCommand } from '../add/add-nest';
import { AddConfiguration, AddType } from '../add/models';
import { RunCommand } from './run.command';

const mockConstants: MockConstants = getMockConstants('run-command');

describe('RunCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            subDomain: 'api',
            port: 3000,
            defaultUserEmail: 'test@test.com',
            defaultUserPassword: 'stringstring',
            frontendName: 'admin',
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'sandbox',
            dbType: DbType.POSTGRES
        }));
    });

    test('should run', async () => {
        const baseConfig: AddConfiguration = { name: 'api', type: AddType.NEST };
        const addNestCommand: AddNestCommand = new AddNestCommand(baseConfig);
        await addNestCommand.add();

        const command: RunCommand = new RunCommand();
        await command.start(['api', 'build']);
        expect(true).toEqual(true);
    }, MAX_ADD_TIME);

    test('hands the arguments after the script to the script, not to npm', async () => {
        // a project whose script writes down the arguments it got
        const projectPath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'echo');
        await FsUtilities.createFile(PathUtilities.resolve(projectPath, 'package.json'), JsonUtilities.stringify({
            name: 'echo',
            scripts: { args: 'node args.mjs' }
        }));
        await FsUtilities.createFile(
            PathUtilities.resolve(projectPath, 'args.mjs'),
            'import { writeFileSync } from \'node:fs\';\nwriteFileSync(\'args.txt\', process.argv.slice(2).join(\' \'));'
        );

        await new RunCommand().start(['echo', 'args', '--watch', 'false']);
        expect(await FsUtilities.readFile(PathUtilities.resolve(projectPath, 'args.txt'))).toBe('--watch false');
    }, MAX_ADD_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});