import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MAX_DOCKER_TIME, MockConstants, RunningWorkspaceUtilities, ServiceResponse } from '../../../__testing__';
import { DEV_DOCKER_COMPOSE_FILE_NAME, LOCAL_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType } from '../../../db';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddLoopbackCommand } from './add-loopback.command';

const mockConstants: MockConstants = getMockConstants('add-loopback-command');

// asks the database of the api whether it answers, from the folder of the api, on this machine or in its container
const PING_DATABASE: string = 'const { ApiApplication } = require(\'./dist/apps/api/src\'); (async () => { const app = new ApiApplication(); '
    + 'await app.boot(); await (await app.get(\'datasources.db\')).ping(); process.exit(0); })();';

describe('AddLoopbackCommand', () => {
    const apiPath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'api');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            port: 3000,
            subDomain: 'api',
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'api',
            dbType: DbType.POSTGRES
        }));
    });

    test('adds a LoopBack api that builds, lints and passes its tests, with its database read from the environment', async () => {
        const baseConfig: AddConfiguration = { name: 'api', type: AddType.LOOPBACK };
        await new AddLoopbackCommand(baseConfig).add();

        // what lb4 generates, with the database and the port of the workspace
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'datasources', 'db.datasource.ts')))
            .toContain('host: environment.db_db_host,');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'index.ts')))
            .toContain('environment.env === \'dev\' ? environment.api_port : 3000');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, '.env'))).toContain('db_db_host=localhost');

        const compose: string = await FsUtilities.readFile(mockConstants.DOCKER_COMPOSE_YAML);
        expect(compose).toContain('            - ./apps/api/.env');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'Dockerfile'))).toContain('RUN npm ci --workspace apps/api');

        // the tests of lb4 start the api and ask its routes, without a database, which it only connects to on a query
        await GeneratedProjectUtilities.validate('api');

        // in development the database runs in docker, and the api on this machine reaches it
        try {
            await RunningWorkspaceUtilities.up(DEV_DOCKER_COMPOSE_FILE_NAME);
            await RunningWorkspaceUtilities.waitForCommand(`cd ${apiPath} && node -e "${PING_DATABASE}"`);
        }
        finally {
            await RunningWorkspaceUtilities.down(DEV_DOCKER_COMPOSE_FILE_NAME, true);
        }

        // locally the api runs from its image, behind traefik, and reaches its database from there
        try {
            await RunningWorkspaceUtilities.up(LOCAL_DOCKER_COMPOSE_FILE_NAME);
            const ping: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { host: 'api.localhost', path: '/ping', port: 80 },
                response => response.status === 200
            );
            expect(ping.body).toContain('Hello from LoopBack');
            await RunningWorkspaceUtilities.execInService(LOCAL_DOCKER_COMPOSE_FILE_NAME, 'api', `node -e "${PING_DATABASE}"`);
        }
        finally {
            await RunningWorkspaceUtilities.down(LOCAL_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, (MAX_ADD_TIME * 3) + (MAX_DOCKER_TIME * 2));

    afterEach(() => {
        jest.restoreAllMocks();
    });
});