import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MockConstants } from '../../../__testing__';
import { DbType } from '../../../db';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddLoopbackCommand } from './add-loopback.command';

const mockConstants: MockConstants = getMockConstants('add-loopback-command');

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
    }, MAX_ADD_TIME * 3);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});