import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MAX_DOCKER_TIME, MockConstants, RunningProcess, RunningWorkspaceUtilities, ServiceResponse } from '../../../__testing__';
import { DEV_DOCKER_COMPOSE_FILE_NAME, LOCAL_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType } from '../../../db';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddNestCommand } from './add-nest.command';

const mockConstants: MockConstants = getMockConstants('add-nest-command');

describe('AddNestCommand', () => {
    const apiPath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'api');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    // Nest only listens once TypeORM reached the database, so an answer of the api is one of its database too
    test.each([DbType.MARIADB, DbType.POSTGRES])('adds a Nest api on %s that builds, lints, passes its tests and reaches its database', async dbType => {
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            subDomain: 'api',
            port: 3000,
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'api',
            dbType
        }));
        const baseConfig: AddConfiguration = { name: 'api', type: AddType.NEST };
        await new AddNestCommand(baseConfig).add();

        // what nest new generates, with the database, the port and the image of the workspace
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'database.options.ts'))).toContain(`type: '${dbType}',`);
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'app.module.ts')))
            .toContain('TypeOrmModule.forRoot(DATABASE_OPTIONS)');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, '.env'))).toContain('db_db_host=localhost');
        expect(await FsUtilities.readFile(mockConstants.DOCKER_COMPOSE_YAML)).toContain('            - ./apps/api/.env');

        // the unit tests of nest new, which need no database
        await GeneratedProjectUtilities.validate('api');

        // in development the database runs in docker, and the api on this machine
        let api: RunningProcess | undefined;
        try {
            await RunningWorkspaceUtilities.up(DEV_DOCKER_COMPOSE_FILE_NAME);
            api = RunningWorkspaceUtilities.startNodeProcess(apiPath, ['dist/apps/api/src/main.js']);
            const hello: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { host: 'localhost', path: '/', port: 3000 },
                response => response.status === 200
            );
            expect(hello.body).toBe('Hello World!');
        }
        finally {
            api?.stop();
            await RunningWorkspaceUtilities.down(DEV_DOCKER_COMPOSE_FILE_NAME, true);
        }

        // locally the api runs from its image, behind traefik, and documents itself with OpenAPI
        try {
            await RunningWorkspaceUtilities.up(LOCAL_DOCKER_COMPOSE_FILE_NAME);
            const hello: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { host: 'api.localhost', path: '/', port: 80 },
                response => response.status === 200
            );
            expect(hello.body).toBe('Hello World!');
            expect((await RunningWorkspaceUtilities.request({ host: 'api.localhost', path: '/api-json', port: 80 })).body).toContain('"openapi"');
        }
        finally {
            await RunningWorkspaceUtilities.down(LOCAL_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, (MAX_ADD_TIME * 3) + (MAX_DOCKER_TIME * 2));

    afterEach(() => {
        jest.restoreAllMocks();
    });
});