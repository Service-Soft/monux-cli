import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MockConstants } from '../../../__testing__';
import { DbType } from '../../../db';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddNestCommand } from './add-nest.command';

const mockConstants: MockConstants = getMockConstants('add-nest-command');

describe('AddNestCommand', () => {
    const apiPath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'api');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            subDomain: 'api',
            port: 3000,
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'api',
            dbType: DbType.MARIADB
        }));
    });

    test('adds a Nest api that builds, lints and passes its tests, with its database read from the environment', async () => {
        const baseConfig: AddConfiguration = { name: 'api', type: AddType.NEST };
        await new AddNestCommand(baseConfig).add();

        // what nest new generates, with the database, the port and the image of the workspace
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'database.options.ts'))).toContain('type: \'mariadb\',');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'app.module.ts')))
            .toContain('TypeOrmModule.forRoot(DATABASE_OPTIONS)');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, '.env'))).toContain('db_db_host=localhost');
        expect(await FsUtilities.readFile(mockConstants.DOCKER_COMPOSE_YAML)).toContain('            - ./apps/api/.env');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'Dockerfile')))
            .toContain('CMD ["node", "--enable-source-maps", "dist/apps/api/src/main.js"]');

        // the unit tests of nest new, which need no database
        await GeneratedProjectUtilities.validate('api');
    }, MAX_ADD_TIME * 3);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});